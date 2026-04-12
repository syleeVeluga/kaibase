import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { reviewActionSchema } from '@kaibase/shared';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { AppError } from '../middleware/error-handler.js';
import { db } from '@kaibase/db/client';
import { reviewTasks, canonicalPages } from '@kaibase/db/schema';
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

  const review = rows[0];
  if (!review) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  let targetPage: { id: string; title: string; contentSnapshot: string | null; status: string } | null = null;
  if (review.targetPageId) {
    const pageRows = await db
      .select({
        id: canonicalPages.id,
        title: canonicalPages.title,
        contentSnapshot: canonicalPages.contentSnapshot,
        status: canonicalPages.status,
      })
      .from(canonicalPages)
      .where(
        and(
          eq(canonicalPages.id, review.targetPageId),
          eq(canonicalPages.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    targetPage = pageRows[0] ?? null;
  }

  return c.json({ ...review, targetPage });
});

async function resolveReviewAction(
  id: string,
  workspaceId: string,
  userId: string,
  status: 'approved' | 'rejected',
  reviewNotes: string | undefined,
) {
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(reviewTasks)
      .set({
        status,
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes ?? null,
      })
      .where(
        and(eq(reviewTasks.id, id), eq(reviewTasks.workspaceId, workspaceId)),
      )
      .returning();

    const review = updated[0];
    if (!review) {
      throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
    }

    if (review.targetPageId) {
      if (status === 'approved') {
        const proposedChange = review.proposedChange as Record<string, unknown>;
        const blocks = proposedChange?.blocks;
        const contentUpdate: Record<string, unknown> = {
          status: 'published',
          publishedAt: new Date(),
          updatedAt: new Date(),
        };
        if (blocks) {
          contentUpdate['contentSnapshot'] = JSON.stringify(blocks);
        }
        await tx
          .update(canonicalPages)
          .set(contentUpdate)
          .where(
            and(
              eq(canonicalPages.id, review.targetPageId),
              eq(canonicalPages.workspaceId, workspaceId),
            ),
          );
      } else {
        await tx
          .update(canonicalPages)
          .set({ status: 'draft', updatedAt: new Date() })
          .where(
            and(
              eq(canonicalPages.id, review.targetPageId),
              eq(canonicalPages.workspaceId, workspaceId),
            ),
          );
      }
    }

    return review;
  });
}

reviewRoutes.post(
  '/:id/approve',
  zValidator('json', reviewActionSchema),
  async (c) => {
    const { reviewNotes } = c.req.valid('json');
    const result = await resolveReviewAction(
      c.req.param('id'),
      c.get('workspaceId'),
      c.get('user').userId,
      'approved',
      reviewNotes,
    );
    return c.json(result);
  },
);

reviewRoutes.post(
  '/:id/reject',
  zValidator('json', reviewActionSchema),
  async (c) => {
    const { reviewNotes } = c.req.valid('json');
    const result = await resolveReviewAction(
      c.req.param('id'),
      c.get('workspaceId'),
      c.get('user').userId,
      'rejected',
      reviewNotes,
    );
    return c.json(result);
  },
);
