import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { AppError } from '../middleware/error-handler.js';
import { db } from '@kaibase/db/client';
import { activityEvents } from '@kaibase/db/schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const activityRoutes = new Hono<AppEnv>();

activityRoutes.use('*', authMiddleware());
activityRoutes.use('*', workspaceMiddleware());

// GET / — list events with filtering and cursor pagination
activityRoutes.get('/', async (c) => {
  const workspaceId = c.get('workspaceId');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50') || 50, 100);
  const cursor = c.req.query('cursor');
  const eventType = c.req.query('eventType');
  const actorType = c.req.query('actorType');
  const targetType = c.req.query('targetType');
  const targetId = c.req.query('targetId');
  const since = c.req.query('since');
  const until = c.req.query('until');

  const conditions = [eq(activityEvents.workspaceId, workspaceId)];

  if (cursor) {
    conditions.push(sql`${activityEvents.createdAt} < ${cursor}::timestamptz`);
  }
  if (eventType) {
    conditions.push(sql`${activityEvents.eventType} = ${eventType}`);
  }
  if (actorType) {
    conditions.push(sql`${activityEvents.actorType} = ${actorType}`);
  }
  if (targetType) {
    conditions.push(eq(activityEvents.targetType, targetType));
  }
  if (targetId) {
    conditions.push(eq(activityEvents.targetId, targetId));
  }
  if (since) {
    conditions.push(sql`${activityEvents.createdAt} >= ${since}::timestamptz`);
  }
  if (until) {
    conditions.push(sql`${activityEvents.createdAt} <= ${until}::timestamptz`);
  }

  const events = await db
    .select()
    .from(activityEvents)
    .where(and(...conditions))
    .orderBy(desc(activityEvents.createdAt))
    .limit(limit + 1);

  const hasMore = events.length > limit;
  if (hasMore) events.pop();

  const nextCursor =
    hasMore && events.length > 0
      ? events[events.length - 1]!.createdAt.toISOString()
      : null;

  return c.json({ events, nextCursor });
});

// GET /stats — aggregate counts by event type
activityRoutes.get('/stats', async (c) => {
  const workspaceId = c.get('workspaceId');

  const stats = await db
    .select({
      eventType: activityEvents.eventType,
      count: count(),
    })
    .from(activityEvents)
    .where(eq(activityEvents.workspaceId, workspaceId))
    .groupBy(activityEvents.eventType);

  return c.json({ stats });
});

// GET /:id — single event
activityRoutes.get('/:id', async (c) => {
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');

  const rows = await db
    .select()
    .from(activityEvents)
    .where(and(eq(activityEvents.id, id), eq(activityEvents.workspaceId, workspaceId)))
    .limit(1);

  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json(rows[0]);
});
