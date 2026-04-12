import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { submitUrlSchema, submitTextSchema, generateId, sha256 } from '@kaibase/shared';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { AppError } from '../middleware/error-handler.js';
import { db } from '@kaibase/db/client';
import { sources, sourceAttachments, activityEvents } from '@kaibase/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { findOne } from '../route-helpers.js';
import { ingestQueue } from '../queues.js';
import { logger } from '../logger.js';
import type { AppEnv } from '../types.js';

export const sourceRoutes = new Hono<AppEnv>();

sourceRoutes.use('*', authMiddleware());
sourceRoutes.use('*', workspaceMiddleware());

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
  const contentHash = await sha256(arrayBuffer);

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

  const existingMatch = existing[0];
  if (existingMatch) {
    return c.json(
      { id: existingMatch.id, deduplicated: true },
      200,
    );
  }

  const sourceId = generateId();
  const attachmentId = generateId();
  const title = (body['title'] as string) || file.name;

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
      rawMetadata: {
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        fileContent: buffer.toString('base64'),
      },
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
  await ingestQueue.add('parse', {
    sourceId,
    workspaceId,
    filename: file.name,
    mimeType: file.type,
    rawFileContent: buffer.toString('base64'),
  });

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
