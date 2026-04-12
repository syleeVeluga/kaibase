import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createPageSchema, updatePageSchema, generateId } from '@kaibase/shared';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { db } from '@kaibase/db/client';
import { canonicalPages } from '@kaibase/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { findOne, updateOne } from '../route-helpers.js';
import type { AppEnv } from '../types.js';

export const pageRoutes = new Hono<AppEnv>();

pageRoutes.use('*', authMiddleware());
pageRoutes.use('*', workspaceMiddleware());

pageRoutes.get('/', async (c) => {
  const workspaceId = c.get('workspaceId');
  const collectionId = c.req.query('collectionId');

  const conditions = [eq(canonicalPages.workspaceId, workspaceId)];
  if (collectionId) {
    conditions.push(eq(canonicalPages.collectionId, collectionId));
  }

  const result = await db
    .select({
      id: canonicalPages.id,
      workspaceId: canonicalPages.workspaceId,
      pageType: canonicalPages.pageType,
      title: canonicalPages.title,
      titleKo: canonicalPages.titleKo,
      slug: canonicalPages.slug,
      status: canonicalPages.status,
      createdBy: canonicalPages.createdBy,
      collectionId: canonicalPages.collectionId,
      language: canonicalPages.language,
      createdAt: canonicalPages.createdAt,
      updatedAt: canonicalPages.updatedAt,
      publishedAt: canonicalPages.publishedAt,
    })
    .from(canonicalPages)
    .where(and(...conditions))
    .orderBy(desc(canonicalPages.updatedAt))
    .limit(100);

  return c.json({ pages: result });
});

pageRoutes.get('/:id', async (c) => {
  const row = await findOne(canonicalPages, c.req.param('id'), c.get('workspaceId'));
  return c.json(row);
});

pageRoutes.post('/', zValidator('json', createPageSchema), async (c) => {
  const workspaceId = c.get('workspaceId');
  const user = c.get('user');
  const input = c.req.valid('json');

  const id = generateId();
  const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100);

  await db.insert(canonicalPages).values({
    id,
    workspaceId,
    pageType: input.pageType,
    title: input.title,
    titleKo: input.titleKo ?? null,
    slug,
    contentSnapshot: '',
    status: 'draft',
    createdBy: 'user',
    createdByUserId: user.userId,
    collectionId: input.collectionId ?? null,
    language: 'en',
  });

  return c.json({ id, slug }, 201);
});

pageRoutes.patch('/:id', zValidator('json', updatePageSchema), async (c) => {
  const result = await updateOne(canonicalPages, c.req.param('id'), c.get('workspaceId'), c.req.valid('json'));
  return c.json(result);
});

pageRoutes.post('/:id/publish', async (c) => {
  const result = await updateOne(canonicalPages, c.req.param('id'), c.get('workspaceId'), { status: 'published', publishedAt: new Date() });
  return c.json(result);
});

pageRoutes.post('/:id/archive', async (c) => {
  const result = await updateOne(canonicalPages, c.req.param('id'), c.get('workspaceId'), { status: 'archived' });
  return c.json(result);
});
