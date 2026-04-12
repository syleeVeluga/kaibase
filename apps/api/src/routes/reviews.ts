import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { AppError } from '../middleware/error-handler.js';
import { db } from '@kaibase/db/client';
import { reviewTasks } from '@kaibase/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const reviewRoutes = new Hono<AppEnv>();

reviewRoutes.use('*', authMiddleware());
reviewRoutes.use('*', workspaceMiddleware());

reviewRoutes.get('/', async (c) => {
  const workspaceId = c.get('workspaceId');

  const result = await db
    .select({
      id: reviewTasks.id,
      workspaceId: reviewTasks.workspaceId,
      taskType: reviewTasks.taskType,
      status: reviewTasks.status,
      targetPageId: reviewTasks.targetPageId,
      targetSourceId: reviewTasks.targetSourceId,
      assignedTo: reviewTasks.assignedTo,
      reviewedBy: reviewTasks.reviewedBy,
      reviewedAt: reviewTasks.reviewedAt,
      policyRuleId: reviewTasks.policyRuleId,
      createdAt: reviewTasks.createdAt,
      expiresAt: reviewTasks.expiresAt,
    })
    .from(reviewTasks)
    .where(eq(reviewTasks.workspaceId, workspaceId))
    .orderBy(desc(reviewTasks.createdAt))
    .limit(100);

  return c.json({ reviews: result });
});

reviewRoutes.get('/:id', async (c) => {
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');

  const rows = await db
    .select()
    .from(reviewTasks)
    .where(and(eq(reviewTasks.id, id), eq(reviewTasks.workspaceId, workspaceId)))
    .limit(1);

  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json(rows[0]);
});

for (const action of ['approve', 'reject'] as const) {
  reviewRoutes.post(`/:id/${action}`, async (c) => {
    const workspaceId = c.get('workspaceId');
    const id = c.req.param('id');
    const user = c.get('user');

    const status = action === 'approve' ? 'approved' : 'rejected';
    const updated = await db
      .update(reviewTasks)
      .set({
        status,
        reviewedBy: user.userId,
        reviewedAt: new Date(),
      })
      .where(and(eq(reviewTasks.id, id), eq(reviewTasks.workspaceId, workspaceId)))
      .returning();

    if (updated.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
    }

    return c.json(updated[0]);
  });
}
