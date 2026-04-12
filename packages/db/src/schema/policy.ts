import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspace.js';
import { users } from './user.js';

export const policyPacks = pgTable(
  'policy_packs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    version: integer('version').notNull().default(1),
    isActive: boolean('is_active').notNull().default(false),
    rules: jsonb('rules').notNull().default([]),
    defaultOutcome: varchar('default_outcome', { length: 50 }).notNull().default('REVIEW_REQUIRED'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
  },
  (t) => [
    index('idx_policy_workspace_active').on(t.workspaceId, t.isActive),
  ],
);

export type PolicyPack = typeof policyPacks.$inferSelect;
export type NewPolicyPack = typeof policyPacks.$inferInsert;
