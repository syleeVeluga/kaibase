import {
  pgTable,
  uuid,
  text,
  real,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { canonicalPages } from './page.js';
import { sources } from './source.js';

export const citations = pgTable(
  'citations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => canonicalPages.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    excerpt: text('excerpt').notNull(),
    locationHint: varchar('location_hint', { length: 255 }),
    // confidence is a float 0.0 - 1.0
    confidence: real('confidence').notNull().default(1.0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_citation_page').on(t.pageId),
    index('idx_citation_source').on(t.sourceId),
  ],
);

export type Citation = typeof citations.$inferSelect;
export type NewCitation = typeof citations.$inferInsert;
