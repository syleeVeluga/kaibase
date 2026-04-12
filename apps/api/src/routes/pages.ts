import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createPageSchema, updatePageSchema, generateId } from '@kaibase/shared';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { AppError } from '../middleware/error-handler.js';
import { db } from '@kaibase/db/client';
import { canonicalPages } from '@kaibase/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const pageRoutes = new Hono<AppEnv>();

pageRoutes.use('*', authMiddleware());
pageRoutes.use('*', workspaceMiddleware());

pageRoutes.get('/', async (c) => {
  const workspaceId = c.get('workspaceId');

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
    .where(eq(canonicalPages.workspaceId, workspaceId))
    .orderBy(desc(canonicalPages.updatedAt))
    .limit(100);

  return c.json({ pages: result });
});

pageRoutes.get('/:id', async (c) => {
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');

  const rows = await db
    .select()
    .from(canonicalPages)
    .where(and(eq(canonicalPages.id, id), eq(canonicalPages.workspaceId, workspaceId)))
    .limit(1);

  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json(rows[0]);
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
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');
  const input = c.req.valid('json');

  const updated = await db
    .update(canonicalPages)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(canonicalPages.id, id), eq(canonicalPages.workspaceId, workspaceId)))
    .returning();

  if (updated.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json(updated[0]);
});

pageRoutes.post('/:id/publish', async (c) => {
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');

  const updated = await db
    .update(canonicalPages)
    .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(canonicalPages.id, id), eq(canonicalPages.workspaceId, workspaceId)))
    .returning();

  if (updated.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json(updated[0]);
});
