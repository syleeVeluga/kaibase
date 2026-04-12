import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createCollectionSchema, updateCollectionSchema, generateId } from '@kaibase/shared';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { db } from '@kaibase/db/client';
import { collections } from '@kaibase/db/schema';
import { eq, asc } from 'drizzle-orm';
import { findOne, updateOne } from '../route-helpers.js';
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
  const row = await findOne(collections, c.req.param('id'), c.get('workspaceId'));
  return c.json(row);
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
  const result = await updateOne(collections, c.req.param('id'), c.get('workspaceId'), c.req.valid('json'));
  return c.json(result);
});
