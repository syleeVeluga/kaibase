import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createTemplateSchema, updateTemplateSchema, generateId } from '@kaibase/shared';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { AppError } from '../middleware/error-handler.js';
import { db } from '@kaibase/db/client';
import { pageTemplates } from '@kaibase/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const templateRoutes = new Hono<AppEnv>();

templateRoutes.use('*', authMiddleware());
templateRoutes.use('*', workspaceMiddleware());

templateRoutes.get('/', async (c) => {
  const workspaceId = c.get('workspaceId');
  const isActive = c.req.query('isActive');

  const conditions = [eq(pageTemplates.workspaceId, workspaceId)];
  if (isActive === 'true') conditions.push(eq(pageTemplates.isActive, true));
  if (isActive === 'false') conditions.push(eq(pageTemplates.isActive, false));

  const result = await db
    .select()
    .from(pageTemplates)
    .where(and(...conditions))
    .orderBy(desc(pageTemplates.createdAt))
    .limit(200);

  return c.json({ templates: result });
});

templateRoutes.get('/:id', async (c) => {
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');

  const rows = await db
    .select()
    .from(pageTemplates)
    .where(and(eq(pageTemplates.id, id), eq(pageTemplates.workspaceId, workspaceId)))
    .limit(1);

  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json(rows[0]);
});

templateRoutes.post('/', zValidator('json', createTemplateSchema), async (c) => {
  const workspaceId = c.get('workspaceId');
  const user = c.get('user');
  const input = c.req.valid('json');

  const id = generateId();

  await db.insert(pageTemplates).values({
    id,
    workspaceId,
    name: input.name,
    pageType: input.pageType,
    sections: input.sections,
    triggerConditions: input.triggerConditions,
    aiInstructions: input.aiInstructions ?? null,
    createdBy: user.userId,
  });

  return c.json({ id, name: input.name }, 201);
});

templateRoutes.patch('/:id', zValidator('json', updateTemplateSchema), async (c) => {
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');
  const input = c.req.valid('json');

  const updated = await db
    .update(pageTemplates)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(pageTemplates.id, id), eq(pageTemplates.workspaceId, workspaceId)))
    .returning();

  if (updated.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json(updated[0]);
});

templateRoutes.delete('/:id', async (c) => {
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');

  const deleted = await db
    .delete(pageTemplates)
    .where(and(eq(pageTemplates.id, id), eq(pageTemplates.workspaceId, workspaceId)))
    .returning({ id: pageTemplates.id });

  if (deleted.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json({ deleted: true });
});
