-- Enable the pgvector extension.
-- This must run before any table with a vector() column is created.
CREATE EXTENSION IF NOT EXISTS vector;

-- IVFFlat indexes for approximate nearest-neighbour (ANN) vector search.
-- These cannot be expressed via Drizzle's index() API and must be applied
-- as a manual SQL step AFTER the embedding tables are created by drizzle-kit.
--
-- Run this file once against the database after all Drizzle migrations complete:
--   psql $DATABASE_URL -f src/migrations/0000_pgvector_setup.sql
--
-- Tune `lists` based on row count:
--   rows < 1M  -> lists = 100
--   rows >= 1M -> lists = sqrt(rows)

CREATE INDEX IF NOT EXISTS idx_page_embedding_vector
  ON page_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_source_embedding_vector
  ON source_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
