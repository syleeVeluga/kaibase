import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { submitUrlSchema, submitTextSchema, generateId, sha256 } from '@kaibase/shared';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { AppError } from '../middleware/error-handler.js';
import { db } from '@kaibase/db/client';
import { sources, sourceAttachments, activityEvents } from '@kaibase/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { findOne } from '../route-helpers.js';
import { ingestQueue } from '../queues.js';
import { logger } from '../logger.js';
import type { AppEnv } from '../types.js';

export const sourceRoutes = new Hono<AppEnv>();

sourceRoutes.use('*', authMiddleware());
sourceRoutes.use('*', workspaceMiddleware());

function buildUploadRawMetadata(file: File, rawFileContent: string): Record<string, unknown> {
  return {
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    fileContent: rawFileContent,
  };
}

function resolveUploadTitle(params: {
  requestedTitle: unknown;
  existingTitle?: string | null;
  filename: string;
}): string {
  if (typeof params.requestedTitle === 'string' && params.requestedTitle.trim().length > 0) {
    return params.requestedTitle;
  }

  return params.existingTitle ?? params.filename;
}

async function enqueueFileParseJob(params: {
  sourceId: string;
  workspaceId: string;
  file: File;
  rawFileContent: string;
}): Promise<void> {
  await ingestQueue.add('parse', {
    sourceId: params.sourceId,
    workspaceId: params.workspaceId,
    filename: params.file.name,
    mimeType: params.file.type,
    rawFileContent: params.rawFileContent,
  });
}

async function prepareUploadedSourceForReingest(params: {
  sourceId: string;
  workspaceId: string;
  userId: string;
  file: File;
  title: string;
  contentHash: string;
  rawFileContent: string;
  activityDetail: Record<string, unknown>;
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(sources)
      .set({
        title: params.title,
        contentHash: params.contentHash,
        rawMetadata: buildUploadRawMetadata(params.file, params.rawFileContent),
        ingestedBy: params.userId,
        ingestedAt: new Date(),
        contentText: null,
        status: 'pending',
        version: sql`${sources.version} + 1`,
      })
      .where(
        and(
          eq(sources.id, params.sourceId),
          eq(sources.workspaceId, params.workspaceId),
        ),
      );

    const existingAttachment = await tx
      .select({ id: sourceAttachments.id })
      .from(sourceAttachments)
      .where(eq(sourceAttachments.sourceId, params.sourceId))
      .limit(1);

    if (existingAttachment[0]) {
      await tx
        .update(sourceAttachments)
        .set({
          filename: params.file.name,
          mimeType: params.file.type,
          sizeBytes: params.file.size,
          storageKey: `uploads/${params.workspaceId}/${params.sourceId}/${params.file.name}`,
          contentText: null,
        })
        .where(eq(sourceAttachments.sourceId, params.sourceId));
    } else {
      await tx.insert(sourceAttachments).values({
        id: generateId(),
        sourceId: params.sourceId,
        filename: params.file.name,
        mimeType: params.file.type,
        sizeBytes: params.file.size,
        storageKey: `uploads/${params.workspaceId}/${params.sourceId}/${params.file.name}`,
        contentText: null,
      });
    }

    await tx.insert(activityEvents).values({
      id: generateId(),
      workspaceId: params.workspaceId,
      eventType: 'ingest',
      actorType: 'user',
      actorId: params.userId,
      targetType: 'source',
      targetId: params.sourceId,
      detail: params.activityDetail,
    });
  });
}

// List sources
sourceRoutes.get('/', async (c) => {
  const workspaceId = c.get('workspaceId');

  const result = await db
    .select({
      id: sources.id,
      workspaceId: sources.workspaceId,
      sourceType: sources.sourceType,
      channel: sources.channel,
      connectorId: sources.connectorId,
      sourceUri: sources.sourceUri,
      title: sources.title,
      contentHash: sources.contentHash,
      ingestedAt: sources.ingestedAt,
      ingestedBy: sources.ingestedBy,
      status: sources.status,
      version: sources.version,
      lastSyncedAt: sources.lastSyncedAt,
    })
    .from(sources)
    .where(eq(sources.workspaceId, workspaceId))
    .orderBy(desc(sources.ingestedAt))
    .limit(100);

  return c.json({ sources: result });
});

// Get single source
sourceRoutes.get('/:id', async (c) => {
  const row = await findOne(sources, c.req.param('id'), c.get('workspaceId'));
  return c.json(row);
});

// Upload file
sourceRoutes.post('/upload', async (c) => {
  const workspaceId = c.get('workspaceId');
  const user = c.get('user');

  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    throw new AppError(400, 'MISSING_FILE', 'errors.missingFile');
  }

  if (file.size > 100 * 1024 * 1024) {
    throw new AppError(400, 'FILE_TOO_LARGE', 'errors.fileTooLarge');
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const rawFileContent = buffer.toString('base64');
  const contentHash = await sha256(arrayBuffer);
  const requestedTitle = body['title'];
  const title = resolveUploadTitle({ requestedTitle, filename: file.name });
  const replaceExisting = body['replaceExisting'] === 'true';
  const replaceSourceId =
    typeof body['replaceSourceId'] === 'string' ? body['replaceSourceId'] : null;

  // Check for duplicate
  const existing = await db
    .select({ id: sources.id, status: sources.status, title: sources.title })
    .from(sources)
    .where(
      and(
        eq(sources.workspaceId, workspaceId),
        eq(sources.contentHash, contentHash),
      ),
    )
    .limit(1);

  const existingMatch = existing[0];
  if (existingMatch) {
    if (existingMatch.status === 'failed') {
      await prepareUploadedSourceForReingest({
        sourceId: existingMatch.id,
        workspaceId,
        userId: user.userId,
        file,
        title: resolveUploadTitle({
          requestedTitle,
          existingTitle: existingMatch.title,
          filename: file.name,
        }),
        contentHash,
        rawFileContent,
        activityDetail: {
          channel: 'web',
          sourceType: 'file_upload',
          filename: file.name,
          retried: true,
        },
      });

      await enqueueFileParseJob({
        sourceId: existingMatch.id,
        workspaceId,
        file,
        rawFileContent,
      });

      logger.info(
        { sourceId: existingMatch.id, filename: file.name },
        'Failed file upload re-enqueued for parsing',
      );

      return c.json({ id: existingMatch.id, retried: true }, 202);
    }

    return c.json(
      { id: existingMatch.id, deduplicated: true },
      200,
    );
  }

  const filenameMatches = await db
    .select({
      id: sources.id,
      title: sources.title,
      status: sources.status,
      version: sources.version,
      ingestedAt: sources.ingestedAt,
    })
    .from(sources)
    .where(
      and(
        eq(sources.workspaceId, workspaceId),
        eq(sources.sourceType, 'file_upload'),
        sql<boolean>`coalesce(${sources.rawMetadata} ->> 'filename', ${sources.title}) = ${file.name}`,
      ),
    )
    .orderBy(desc(sources.ingestedAt))
    .limit(10);

  const filenameConflict =
    filenameMatches.find((match) => match.status !== 'failed') ??
    filenameMatches[0];

  if (filenameConflict) {
    if (!replaceExisting || replaceSourceId !== filenameConflict.id) {
      throw new AppError(409, 'SOURCE_FILENAME_CONFLICT', 'errors.sourceFilenameConflict', {
        existingSource: {
          id: filenameConflict.id,
          title: filenameConflict.title,
          status: filenameConflict.status,
          version: filenameConflict.version,
          ingestedAt: filenameConflict.ingestedAt,
        },
      });
    }

    await prepareUploadedSourceForReingest({
      sourceId: filenameConflict.id,
      workspaceId,
      userId: user.userId,
      file,
      title: resolveUploadTitle({
        requestedTitle,
        existingTitle: filenameConflict.title,
        filename: file.name,
      }),
      contentHash,
      rawFileContent,
      activityDetail: {
        channel: 'web',
        sourceType: 'file_upload',
        filename: file.name,
        replaced: true,
      },
    });

    await enqueueFileParseJob({
      sourceId: filenameConflict.id,
      workspaceId,
      file,
      rawFileContent,
    });

    logger.info(
      { sourceId: filenameConflict.id, filename: file.name },
      'Existing uploaded source replaced and re-enqueued for parsing',
    );

    return c.json({ id: filenameConflict.id, replaced: true }, 202);
  }

  const sourceId = generateId();
  const attachmentId = generateId();

  await db.transaction(async (tx) => {
    await tx.insert(sources).values({
      id: sourceId,
      workspaceId,
      sourceType: 'file_upload',
      channel: 'web',
      title,
      contentHash,
      // Store file content as base64 in rawMetadata for the parse worker to use.
      // In production, this would go to MinIO/S3.
      rawMetadata: buildUploadRawMetadata(file, rawFileContent),
      ingestedBy: user.userId,
      status: 'pending',
    });

    await tx.insert(sourceAttachments).values({
      id: attachmentId,
      sourceId,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey: `uploads/${workspaceId}/${sourceId}/${file.name}`,
      contentText: null,
    });

    await tx.insert(activityEvents).values({
      id: generateId(),
      workspaceId,
      eventType: 'ingest',
      actorType: 'user',
      actorId: user.userId,
      targetType: 'source',
      targetId: sourceId,
      detail: { channel: 'web', sourceType: 'file_upload', filename: file.name },
    });
  });

  // Enqueue parse job
  await enqueueFileParseJob({ sourceId, workspaceId, file, rawFileContent });

  logger.info({ sourceId, filename: file.name }, 'File upload enqueued for parsing');

  return c.json({ id: sourceId }, 201);
});

// Submit URL
sourceRoutes.post('/url', zValidator('json', submitUrlSchema), async (c) => {
  const workspaceId = c.get('workspaceId');
  const user = c.get('user');
  const { url, title } = c.req.valid('json');

  const id = generateId();
  const contentHash = await sha256(url);

  // Check for duplicate
  const existing = await db
    .select({ id: sources.id })
    .from(sources)
    .where(
      and(
        eq(sources.workspaceId, workspaceId),
        eq(sources.contentHash, contentHash),
      ),
    )
    .limit(1);

  const urlMatch = existing[0];
  if (urlMatch) {
    return c.json({ id: urlMatch.id, deduplicated: true }, 200);
  }

  await db.transaction(async (tx) => {
    await tx.insert(sources).values({
      id,
      workspaceId,
      sourceType: 'url',
      channel: 'web',
      title: title ?? url,
      contentHash,
      rawMetadata: { url },
      ingestedBy: user.userId,
      status: 'pending',
    });

    await tx.insert(activityEvents).values({
      id: generateId(),
      workspaceId,
      eventType: 'ingest',
      actorType: 'user',
      actorId: user.userId,
      targetType: 'source',
      targetId: id,
      detail: { channel: 'web', sourceType: 'url', url },
    });
  });

  // Enqueue parse job for URL fetching
  await ingestQueue.add('parse', {
    sourceId: id,
    workspaceId,
    url,
    mimeType: 'text/html',
  });

  logger.info({ sourceId: id, url }, 'URL submission enqueued for parsing');

  return c.json({ id }, 201);
});

// Delete a single source
sourceRoutes.delete('/:id', async (c) => {
  const workspaceId = c.get('workspaceId');
  const sourceId = c.req.param('id');

  const [deleted] = await db
    .delete(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.workspaceId, workspaceId)))
    .returning({ id: sources.id });

  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  logger.info({ sourceId, workspaceId }, 'Source deleted');
  return c.json({ deleted: true });
});

// Bulk delete sources (optional ?status=pending,failed filter)
sourceRoutes.delete('/', async (c) => {
  const workspaceId = c.get('workspaceId');
  const statusParam = c.req.query('status');

  let whereClause;
  if (statusParam) {
    const statuses = statusParam.split(',').filter(Boolean) as ('pending' | 'processing' | 'processed' | 'failed')[];
    const { inArray } = await import('drizzle-orm');
    whereClause = and(
      eq(sources.workspaceId, workspaceId),
      inArray(sources.status, statuses),
    );
  } else {
    whereClause = eq(sources.workspaceId, workspaceId);
  }

  const deleted = await db
    .delete(sources)
    .where(whereClause)
    .returning({ id: sources.id });

  logger.info({ workspaceId, count: deleted.length, statusFilter: statusParam }, 'Bulk sources deleted');
  return c.json({ deleted: deleted.length });
});

// Submit text
sourceRoutes.post('/text', zValidator('json', submitTextSchema), async (c) => {
  const workspaceId = c.get('workspaceId');
  const user = c.get('user');
  const { title, content } = c.req.valid('json');

  const id = generateId();
  const contentHash = await sha256(content);

  // Check for duplicate
  const existing = await db
    .select({ id: sources.id })
    .from(sources)
    .where(
      and(
        eq(sources.workspaceId, workspaceId),
        eq(sources.contentHash, contentHash),
      ),
    )
    .limit(1);

  const textMatch = existing[0];
  if (textMatch) {
    return c.json({ id: textMatch.id, deduplicated: true }, 200);
  }

  await db.transaction(async (tx) => {
    await tx.insert(sources).values({
      id,
      workspaceId,
      sourceType: 'text_input',
      channel: 'web',
      title,
      contentText: content,
      contentHash,
      rawMetadata: {},
      ingestedBy: user.userId,
      status: 'processed',
    });

    await tx.insert(activityEvents).values({
      id: generateId(),
      workspaceId,
      eventType: 'ingest',
      actorType: 'user',
      actorId: user.userId,
      targetType: 'source',
      targetId: id,
      detail: { channel: 'web', sourceType: 'text_input' },
    });
  });

  // Text input is already processed — go directly to classify
  await ingestQueue.add('classify', {
    sourceId: id,
    workspaceId,
  });

  logger.info({ sourceId: id }, 'Text submission enqueued for classification');

  return c.json({ id }, 201);
});
