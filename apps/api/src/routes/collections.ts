import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createCollectionSchema, updateCollectionSchema, generateId } from '@kaibase/shared';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { AppError } from '../middleware/error-handler.js';
import { db } from '@kaibase/db/client';
import { collections } from '@kaibase/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const collectionRoutes = new Hono<AppEnv>();

collectionRoutes.use('*', authMiddleware());
collectionRoutes.use('*', workspaceMiddleware());

collectionRoutes.get('/', async (c) => {
  const workspaceId = c.get('workspaceId');

  const result = await db
    .select()
    .from(collections)
    .where(eq(collections.workspaceId, workspaceId))
    .orderBy(asc(collections.sortOrder), asc(collections.createdAt))
    .limit(200);

  return c.json({ collections: result });
});

collectionRoutes.get('/:id', async (c) => {
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');

  const rows = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.workspaceId, workspaceId)))
    .limit(1);

  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json(rows[0]);
});

collectionRoutes.post('/', zValidator('json', createCollectionSchema), async (c) => {
  const workspaceId = c.get('workspaceId');
  const input = c.req.valid('json');

  const id = generateId();

  await db.insert(collections).values({
    id,
    workspaceId,
    name: input.name,
    nameKo: input.nameKo ?? null,
    collectionType: input.collectionType,
    description: input.description ?? null,
  });

  return c.json({ id, name: input.name, collectionType: input.collectionType }, 201);
});

collectionRoutes.patch('/:id', zValidator('json', updateCollectionSchema), async (c) => {
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');
  const input = c.req.valid('json');

  const updated = await db
    .update(collections)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(collections.id, id), eq(collections.workspaceId, workspaceId)))
    .returning();

  if (updated.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json(updated[0]);
});
