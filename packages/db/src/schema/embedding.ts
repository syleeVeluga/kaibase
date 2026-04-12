import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  index,
  customType,
} from 'drizzle-orm/pg-core';
import { canonicalPages } from './page.js';
import { sources } from './source.js';

/**
 * pgvector custom column type.
 * Drizzle ORM does not have a native vector type; we define it via customType.
 * The SQL type is `vector(dim)` where dim is the embedding dimension.
 * Data is passed as a float array and serialised to Postgres vector literal format.
 */
export const vector = customType<{
  data: number[];
  config: { dimensions: number };
  configRequired: true;
  driverData: string;
}>({
  dataType(config) {
    return `vector(${config.dimensions})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    // Postgres returns vector literals as "[0.1,0.2,...]"
    return value
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map(Number);
  },
});

// Tables

export const pageEmbeddings = pgTable(
  'page_embeddings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => canonicalPages.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    chunkText: text('chunk_text').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_page_embedding_page').on(t.pageId, t.chunkIndex),
    // NOTE: The IVFFlat index for vector_cosine_ops cannot be expressed via
    // Drizzle's index() API. Add it as a raw SQL step in the migration:
    //   CREATE INDEX idx_page_embedding_vector
    //     ON page_embeddings USING ivfflat (embedding vector_cosine_ops)
    //     WITH (lists = 100);
  ],
);

export const sourceEmbeddings = pgTable(
  'source_embeddings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    chunkText: text('chunk_text').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_source_embedding_source').on(t.sourceId, t.chunkIndex),
    // NOTE: IVFFlat index must be added as raw SQL in the migration:
    //   CREATE INDEX idx_source_embedding_vector
    //     ON source_embeddings USING ivfflat (embedding vector_cosine_ops)
    //     WITH (lists = 100);
  ],
);

export type PageEmbedding = typeof pageEmbeddings.$inferSelect;
export type NewPageEmbedding = typeof pageEmbeddings.$inferInsert;
export type SourceEmbedding = typeof sourceEmbeddings.$inferSelect;
export type NewSourceEmbedding = typeof sourceEmbeddings.$inferInsert;
