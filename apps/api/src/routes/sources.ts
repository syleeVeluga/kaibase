import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { submitUrlSchema, submitTextSchema, generateId, sha256 } from '@kaibase/shared';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { AppError } from '../middleware/error-handler.js';
import { db } from '@kaibase/db/client';
import { sources } from '@kaibase/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const sourceRoutes = new Hono<AppEnv>();

sourceRoutes.use('*', authMiddleware());
sourceRoutes.use('*', workspaceMiddleware());

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

sourceRoutes.get('/:id', async (c) => {
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');

  const rows = await db
    .select()
    .from(sources)
    .where(and(eq(sources.id, id), eq(sources.workspaceId, workspaceId)))
    .limit(1);

  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json(rows[0]);
});

sourceRoutes.post('/url', zValidator('json', submitUrlSchema), async (c) => {
  const workspaceId = c.get('workspaceId');
  const user = c.get('user');
  const { url, title } = c.req.valid('json');

  const id = generateId();
  const contentHash = sha256(url);

  await db.insert(sources).values({
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

  return c.json({ id }, 201);
});

sourceRoutes.post('/text', zValidator('json', submitTextSchema), async (c) => {
  const workspaceId = c.get('workspaceId');
  const user = c.get('user');
  const { title, content } = c.req.valid('json');

  const id = generateId();
  const contentHash = sha256(content);

  await db.insert(sources).values({
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

  return c.json({ id }, 201);
});
