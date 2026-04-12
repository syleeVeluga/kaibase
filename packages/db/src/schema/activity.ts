import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspace.js';

// Enums

export const activityEventTypeEnum = pgEnum('activity_event_type', [
  'ingest',
  'classify',
  'page_create',
  'page_update',
  'page_publish',
  'query',
  'answer',
  'review_create',
  'review_complete',
  'lint',
  'digest',
  'channel_send',
  'mcp_call',
]);

export const actorTypeEnum = pgEnum('actor_type', [
  'user',
  'ai',
  'system',
  'mcp_agent',
]);

// Table — append-only, no UPDATE or DELETE operations

export const activityEvents = pgTable(
  'activity_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    eventType: activityEventTypeEnum('event_type').notNull(),
    actorType: actorTypeEnum('actor_type').notNull(),
    actorId: varchar('actor_id', { length: 255 }),
    targetType: varchar('target_type', { length: 100 }),
    targetId: uuid('target_id'),
    detail: jsonb('detail').notNull().default({}),
    // No updatedAt — this table is append-only
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // DESC ordering on created_at for time-series queries
    index('idx_activity_workspace_time').on(t.workspaceId, t.createdAt),
    index('idx_activity_event_type').on(t.workspaceId, t.eventType),
    index('idx_activity_target').on(t.targetType, t.targetId),
  ],
);

export type ActivityEvent = typeof activityEvents.$inferSelect;
export type NewActivityEvent = typeof activityEvents.$inferInsert;
