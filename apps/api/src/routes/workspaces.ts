import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createWorkspaceSchema, updateWorkspaceSchema, generateId } from '@kaibase/shared';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';
import { db } from '@kaibase/db/client';
import { workspaces, workspaceMembers } from '@kaibase/db/schema';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const workspaceRoutes = new Hono<AppEnv>();

workspaceRoutes.use('*', authMiddleware());

workspaceRoutes.post('/', zValidator('json', createWorkspaceSchema), async (c) => {
  const input = c.req.valid('json');
  const user = c.get('user');
  const id = generateId();

  await db.transaction(async (tx) => {
    await tx.insert(workspaces).values({
      id,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      defaultLanguage: input.defaultLanguage,
    });
    await tx.insert(workspaceMembers).values({
      workspaceId: id,
      userId: user.userId,
      role: 'owner',
    });
  });

  return c.json({ id, ...input }, 201);
});

workspaceRoutes.get('/', async (c) => {
  const user = c.get('user');

  const result = await db
    .select({ workspace: workspaces })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, user.userId));

  return c.json({ workspaces: result.map((r) => r.workspace) });
});

workspaceRoutes.get('/:wid', async (c) => {
  const wid = c.req.param('wid');
  const rows = await db.select().from(workspaces).where(eq(workspaces.id, wid)).limit(1);
  const workspace = rows[0];
  if (!workspace) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }
  return c.json(workspace);
});

workspaceRoutes.patch('/:wid', zValidator('json', updateWorkspaceSchema), async (c) => {
  const wid = c.req.param('wid');
  const input = c.req.valid('json');

  const updated = await db
    .update(workspaces)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(workspaces.id, wid))
    .returning();

  if (updated.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json(updated[0]);
});
