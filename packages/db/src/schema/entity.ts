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
import { workspaces } from './workspace.js';
import { canonicalPages } from './page.js';

// Enums

export const entityTypeEnum = pgEnum('entity_type', [
  'person',
  'organization',
  'product',
  'technology',
  'location',
  'event',
  'custom',
]);

// Tables

export const entities = pgTable(
  'entities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    entityType: entityTypeEnum('entity_type').notNull(),
    name: varchar('name', { length: 500 }).notNull(),
    nameKo: varchar('name_ko', { length: 500 }),
    // Postgres text[] array for aliases
    aliases: text('aliases').array().notNull().default([]),
    description: text('description'),
    canonicalPageId: uuid('canonical_page_id').references(() => canonicalPages.id, {
      onDelete: 'set null',
    }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_entity_workspace_type').on(t.workspaceId, t.entityType),
    index('idx_entity_name').on(t.workspaceId, t.name),
    index('idx_entity_canonical_page').on(t.canonicalPageId),
  ],
);

export const concepts = pgTable(
  'concepts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 500 }).notNull(),
    nameKo: varchar('name_ko', { length: 500 }),
    description: text('description'),
    canonicalPageId: uuid('canonical_page_id').references(() => canonicalPages.id, {
      onDelete: 'set null',
    }),
    // Self-referential FK declared as plain uuid
    parentConceptId: uuid('parent_concept_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_concept_workspace').on(t.workspaceId),
    index('idx_concept_name').on(t.workspaceId, t.name),
    index('idx_concept_canonical_page').on(t.canonicalPageId),
    index('idx_concept_parent').on(t.parentConceptId),
  ],
);

export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;
export type Concept = typeof concepts.$inferSelect;
export type NewConcept = typeof concepts.$inferInsert;
