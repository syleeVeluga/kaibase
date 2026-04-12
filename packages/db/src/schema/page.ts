import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { workspaces, languageEnum } from './workspace.js';
import { users } from './user.js';

// Enums

export const pageTypeEnum = pgEnum('page_type', [
  'project',
  'entity',
  'concept',
  'brief',
  'answer',
  'summary',
  'comparison',
  'custom',
]);

export const pageStatusEnum = pgEnum('page_status', [
  'draft',
  'published',
  'archived',
  'review_pending',
]);

export const pageCreatorTypeEnum = pgEnum('page_creator_type', ['ai', 'user']);

export const collectionTypeEnum = pgEnum('collection_type', [
  'inbox',
  'project',
  'entities',
  'concepts',
  'briefs',
  'review_queue',
  'knowledge_index',
  'activity_log',
  'custom',
]);

// Tables

export const collections = pgTable(
  'collections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    nameKo: varchar('name_ko', { length: 255 }),
    collectionType: collectionTypeEnum('collection_type').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_collection_workspace').on(t.workspaceId, t.collectionType)],
);

export const pageTemplates = pgTable(
  'page_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    pageType: pageTypeEnum('page_type').notNull(),
    triggerConditions: jsonb('trigger_conditions').notNull().default({}),
    sections: jsonb('sections').notNull().default([]),
    aiInstructions: text('ai_instructions'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
  },
  (t) => [index('idx_page_template_workspace').on(t.workspaceId, t.isActive)],
);

export const canonicalPages = pgTable(
  'canonical_pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    pageType: pageTypeEnum('page_type').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    titleKo: varchar('title_ko', { length: 500 }),
    slug: varchar('slug', { length: 500 }).notNull(),
    contentSnapshot: text('content_snapshot').notNull().default(''),
    ydocId: varchar('ydoc_id', { length: 255 }),
    status: pageStatusEnum('status').notNull().default('draft'),
    createdBy: pageCreatorTypeEnum('created_by').notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    // Self-referential FK — declared as plain uuid here; relation resolved at query time
    parentPageId: uuid('parent_page_id'),
    collectionId: uuid('collection_id').references(() => collections.id, {
      onDelete: 'set null',
    }),
    templateId: uuid('template_id').references(() => pageTemplates.id, {
      onDelete: 'set null',
    }),
    compilationTraceId: uuid('compilation_trace_id'),
    language: languageEnum('language').notNull().default('en'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_page_workspace_type').on(t.workspaceId, t.pageType, t.status),
    index('idx_page_slug').on(t.workspaceId, t.slug),
    index('idx_page_collection').on(t.collectionId),
    index('idx_page_status').on(t.workspaceId, t.status),
  ],
);

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type PageTemplate = typeof pageTemplates.$inferSelect;
export type NewPageTemplate = typeof pageTemplates.$inferInsert;
export type CanonicalPage = typeof canonicalPages.$inferSelect;
export type NewCanonicalPage = typeof canonicalPages.$inferInsert;
