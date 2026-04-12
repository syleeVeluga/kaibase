import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createConnectorSchema, generateId, sha256 } from '@kaibase/shared';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { AppError } from '../middleware/error-handler.js';
import { isPgUniqueViolation } from '../middleware/db-errors.js';
import { db } from '@kaibase/db/client';
import { sourceConnectors, sources, activityEvents } from '@kaibase/db/schema';
import { eq, and } from 'drizzle-orm';
import { ingestQueue } from '../queues.js';
import { logger } from '../logger.js';
import type { AppEnv } from '../types.js';

export const connectorRoutes = new Hono<AppEnv>();

connectorRoutes.use('*', authMiddleware());
connectorRoutes.use('*', workspaceMiddleware());

// List connectors
connectorRoutes.get('/', async (c) => {
  const workspaceId = c.get('workspaceId');

  const result = await db
    .select()
    .from(sourceConnectors)
    .where(eq(sourceConnectors.workspaceId, workspaceId));

  return c.json({ connectors: result });
});

// Create connector
connectorRoutes.post('/', zValidator('json', createConnectorSchema), async (c) => {
  const workspaceId = c.get('workspaceId');
  const user = c.get('user');
  const input = c.req.valid('json');

  const id = generateId();

  await db.transaction(async (tx) => {
    await tx.insert(sourceConnectors).values({
      id,
      workspaceId,
      connectorType: input.connectorType,
      name: input.name,
      config: input.config,
      syncStatus: 'active',
      createdBy: user.userId,
    });

    await tx.insert(activityEvents).values({
      id: generateId(),
      workspaceId,
      eventType: 'ingest',
      actorType: 'user',
      actorId: user.userId,
      targetType: 'source',
      targetId: id,
      detail: {
        action: 'connector_created',
        connectorType: input.connectorType,
        name: input.name,
      },
    });
  });

  return c.json({ id }, 201);
});

// Trigger manual sync (scan) for a connector
connectorRoutes.post('/:id/sync', async (c) => {
  const workspaceId = c.get('workspaceId');
  const user = c.get('user');
  const id = c.req.param('id');

  const rows = await db
    .select()
    .from(sourceConnectors)
    .where(and(eq(sourceConnectors.id, id), eq(sourceConnectors.workspaceId, workspaceId)))
    .limit(1);

  const connector = rows[0];
  if (!connector) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  if (connector.connectorType !== 'local_folder') {
    throw new AppError(400, 'UNSUPPORTED_CONNECTOR', 'errors.unsupportedConnector');
  }

  const config = connector.config as { folderPath?: string };
  if (!config.folderPath) {
    throw new AppError(400, 'INVALID_CONFIG', 'errors.invalidConnectorConfig');
  }

  // Dynamic import to avoid loading chokidar at API startup
  const { LocalFolderConnector } = await import('@kaibase/connectors');

  const folderConnector = new LocalFolderConnector({
    id: connector.id,
    workspaceId,
    name: connector.name,
    config: { path: config.folderPath },
  });

  const files = await folderConnector.scan();

  let ingested = 0;
  for (const file of files) {
    const contentHash = await sha256(file.filePath);

    // Check for existing source with same path for this connector
    const existing = await db
      .select({ id: sources.id })
      .from(sources)
      .where(
        and(
          eq(sources.workspaceId, workspaceId),
          eq(sources.sourceUri, file.filePath),
        ),
      )
      .limit(1);

    if (existing.length > 0) continue;

    const sourceId = generateId();
    try {
      await db.insert(sources).values({
        id: sourceId,
        workspaceId,
        sourceType: 'connector',
        channel: 'connector',
        connectorId: connector.id,
        sourceUri: file.filePath,
        title: file.relativePath,
        contentHash,
        rawMetadata: {
          filename: file.relativePath,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          connectorType: 'local_folder',
          folderPath: config.folderPath,
        },
        ingestedBy: user.userId,
        status: 'pending',
      });
    } catch (err: unknown) {
      if (isPgUniqueViolation(err)) {
        logger.info({ filePath: file.filePath }, 'Skipping duplicate source during sync');
        continue;
      }
      throw err;
    }

    await ingestQueue.add('parse', {
      sourceId,
      workspaceId,
      filePath: file.filePath,
      mimeType: file.mimeType,
    });

    ingested++;
  }

  // Update connector metadata
  const now = new Date();
  await db
    .update(sourceConnectors)
    .set({
      lastSyncedAt: now,
      fileCount: files.length,
      updatedAt: now,
    })
    .where(eq(sourceConnectors.id, id));

  logger.info(
    { connectorId: id, totalFiles: files.length, newFiles: ingested },
    'Connector sync completed',
  );

  return c.json({
    syncedAt: now.toISOString(),
    totalFiles: files.length,
    newFilesIngested: ingested,
  });
});

// Update connector status (pause/resume)
const updateConnectorSchema = z.object({
  syncStatus: z.enum(['active', 'paused', 'error']),
});

connectorRoutes.patch('/:id', zValidator('json', updateConnectorSchema), async (c) => {
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');

  const { syncStatus } = c.req.valid('json');

  const updated = await db
    .update(sourceConnectors)
    .set({
      syncStatus,
      updatedAt: new Date(),
    })
    .where(and(eq(sourceConnectors.id, id), eq(sourceConnectors.workspaceId, workspaceId)))
    .returning();

  if (updated.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json(updated[0]);
});

// Delete connector
connectorRoutes.delete('/:id', async (c) => {
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');

  const deleted = await db
    .delete(sourceConnectors)
    .where(and(eq(sourceConnectors.id, id), eq(sourceConnectors.workspaceId, workspaceId)))
    .returning();

  if (deleted.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json({ deleted: true });
});
