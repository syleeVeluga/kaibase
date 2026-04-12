import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { db } from '@kaibase/db/client';
import {
  canonicalPages,
  sources,
  collections,
  activityEvents,
  reviewTasks,
} from '@kaibase/db/schema';
import { eq, and, sql, count, lt } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const dashboardRoutes = new Hono<AppEnv>();

dashboardRoutes.use('*', authMiddleware());
dashboardRoutes.use('*', workspaceMiddleware());

// GET /stats — aggregated workspace statistics
dashboardRoutes.get('/stats', async (c) => {
  const workspaceId = c.get('workspaceId');

  // Run all stat queries in parallel
  const [
    pagesByStatus,
    pagesByType,
    sourcesByStatus,
    collectionCount,
    recentActivityCount,
    reviewStats,
  ] = await Promise.all([
    // Pages by status
    db
      .select({
        status: canonicalPages.status,
        count: count(),
      })
      .from(canonicalPages)
      .where(eq(canonicalPages.workspaceId, workspaceId))
      .groupBy(canonicalPages.status),

    // Pages by type
    db
      .select({
        pageType: canonicalPages.pageType,
        count: count(),
      })
      .from(canonicalPages)
      .where(eq(canonicalPages.workspaceId, workspaceId))
      .groupBy(canonicalPages.pageType),

    // Sources by status
    db
      .select({
        status: sources.status,
        count: count(),
      })
      .from(sources)
      .where(eq(sources.workspaceId, workspaceId))
      .groupBy(sources.status),

    // Collections count
    db
      .select({ count: count() })
      .from(collections)
      .where(eq(collections.workspaceId, workspaceId)),

    // Recent activity (last 7 days)
    db
      .select({ count: count() })
      .from(activityEvents)
      .where(
        and(
          eq(activityEvents.workspaceId, workspaceId),
          sql`${activityEvents.createdAt} > now() - interval '7 days'`,
        ),
      ),

    // Review stats
    db
      .select({
        status: reviewTasks.status,
        count: count(),
      })
      .from(reviewTasks)
      .where(eq(reviewTasks.workspaceId, workspaceId))
      .groupBy(reviewTasks.status),
  ]);

  const totalPages = pagesByStatus.reduce((sum, r) => sum + Number(r.count), 0);
  const totalSources = sourcesByStatus.reduce((sum, r) => sum + Number(r.count), 0);

  return c.json({
    pages: {
      total: totalPages,
      byStatus: Object.fromEntries(pagesByStatus.map((r) => [r.status, Number(r.count)])),
      byType: Object.fromEntries(pagesByType.map((r) => [r.pageType, Number(r.count)])),
    },
    sources: {
      total: totalSources,
      byStatus: Object.fromEntries(sourcesByStatus.map((r) => [r.status, Number(r.count)])),
    },
    collections: { total: Number(collectionCount[0]?.count ?? 0) },
    activity: { recentCount: Number(recentActivityCount[0]?.count ?? 0) },
    reviews: {
      byStatus: Object.fromEntries(reviewStats.map((r) => [r.status, Number(r.count)])),
    },
  });
});

// GET /health — knowledge base health indicators
dashboardRoutes.get('/health', async (c) => {
  const workspaceId = c.get('workspaceId');

  const [
    stalePages,
    totalPublished,
    pagesWithEmbeddings,
    pendingReviews,
  ] = await Promise.all([
    // Pages published more than 30 days ago with no update
    db
      .select({ count: count() })
      .from(canonicalPages)
      .where(
        and(
          eq(canonicalPages.workspaceId, workspaceId),
          eq(canonicalPages.status, 'published'),
          lt(canonicalPages.updatedAt, sql`now() - interval '30 days'`),
        ),
      ),

    // Total published pages
    db
      .select({ count: count() })
      .from(canonicalPages)
      .where(
        and(
          eq(canonicalPages.workspaceId, workspaceId),
          eq(canonicalPages.status, 'published'),
        ),
      ),

    // Pages that have at least one embedding
    db.execute<{ count: number }>(sql`
      SELECT COUNT(DISTINCT pe.page_id) AS count
      FROM page_embeddings pe
      JOIN canonical_pages cp ON cp.id = pe.page_id
      WHERE cp.workspace_id = ${workspaceId}
    `),

    // Pending reviews count
    db
      .select({ count: count() })
      .from(reviewTasks)
      .where(
        and(
          eq(reviewTasks.workspaceId, workspaceId),
          eq(reviewTasks.status, 'pending'),
        ),
      ),
  ]);

  const publishedCount = Number(totalPublished[0]?.count ?? 0);
  const embeddedCount = Number(pagesWithEmbeddings[0]?.count ?? 0);
  const embeddingCoverage = publishedCount > 0 ? embeddedCount / publishedCount : 1;

  return c.json({
    stalePages: Number(stalePages[0]?.count ?? 0),
    publishedPages: publishedCount,
    embeddingCoverage: Math.round(embeddingCoverage * 100),
    pendingReviews: Number(pendingReviews[0]?.count ?? 0),
  });
});
