import {
  pgTable,
  pgEnum,
  uuid,
  text,
  jsonb,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspace.js';
import { canonicalPages } from './page.js';
import { sources } from './source.js';
import { users } from './user.js';

// Enums

export const reviewTaskTypeEnum = pgEnum('review_task_type', [
  'page_creation',
  'page_update',
  'classification',
  'contradiction',
  'stale_content',
  'lint_issue',
]);

export const reviewTaskStatusEnum = pgEnum('review_task_status', [
  'pending',
  'approved',
  'rejected',
  'expired',
]);

// Table

export const reviewTasks = pgTable(
  'review_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    taskType: reviewTaskTypeEnum('task_type').notNull(),
    status: reviewTaskStatusEnum('status').notNull().default('pending'),
    targetPageId: uuid('target_page_id').references(() => canonicalPages.id, {
      onDelete: 'set null',
    }),
    targetSourceId: uuid('target_source_id').references(() => sources.id, {
      onDelete: 'set null',
    }),
    proposedChange: jsonb('proposed_change').notNull().default({}),
    aiReasoning: text('ai_reasoning').notNull(),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNotes: text('review_notes'),
    policyRuleId: varchar('policy_rule_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_review_workspace_status').on(t.workspaceId, t.status),
    index('idx_review_target_page').on(t.targetPageId),
    index('idx_review_assigned').on(t.assignedTo, t.status),
    index('idx_review_expires').on(t.expiresAt),
  ],
);

export type ReviewTask = typeof reviewTasks.$inferSelect;
export type NewReviewTask = typeof reviewTasks.$inferInsert;
