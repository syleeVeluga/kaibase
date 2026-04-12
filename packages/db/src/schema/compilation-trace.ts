import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { canonicalPages, pageTemplates } from './page.js';

// Enum

export const compilationLevelEnum = pgEnum('compilation_level', ['L0', 'L1', 'L2']);

// Table

export const compilationTraces = pgTable(
  'compilation_traces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => canonicalPages.id, { onDelete: 'cascade' }),
    // source_ids is a UUID array; stored as Postgres uuid[] native array
    sourceIds: uuid('source_ids').array().notNull().default([]),
    templateId: uuid('template_id').references(() => pageTemplates.id, {
      onDelete: 'set null',
    }),
    compilationLevel: compilationLevelEnum('compilation_level').notNull(),
    reasoning: text('reasoning').notNull(),
    decisions: jsonb('decisions').notNull().default({}),
    modelUsed: varchar('model_used', { length: 255 }).notNull(),
    // { input: number, output: number, total: number }
    tokenUsage: jsonb('token_usage').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_compilation_trace_page').on(t.pageId),
    index('idx_compilation_trace_level').on(t.compilationLevel),
  ],
);

export type CompilationTrace = typeof compilationTraces.$inferSelect;
export type NewCompilationTrace = typeof compilationTraces.$inferInsert;
