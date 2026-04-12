import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspace.js';
import { channelEndpoints } from './notification.js';
import { users } from './user.js';

export const savedQueries = pgTable(
  'saved_queries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    queryText: varchar('query_text', { length: 2000 }).notNull(),
    filters: jsonb('filters').notNull().default({}),
    scheduleCron: varchar('schedule_cron', { length: 100 }),
    outputChannelId: uuid('output_channel_id').references(() => channelEndpoints.id, {
      onDelete: 'set null',
    }),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_saved_query_workspace').on(t.workspaceId),
    index('idx_saved_query_schedule').on(t.scheduleCron),
  ],
);

export type SavedQuery = typeof savedQueries.$inferSelect;
export type NewSavedQuery = typeof savedQueries.$inferInsert;
