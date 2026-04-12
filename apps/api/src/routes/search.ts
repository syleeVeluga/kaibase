import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { searchQuerySchema } from '@kaibase/shared';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { db } from '@kaibase/db/client';
import { canonicalPages } from '@kaibase/db/schema';
import { eq, and, sql, ilike, or } from 'drizzle-orm';
import { getEmbeddingProvider } from '../providers.js';
import type { AppEnv } from '../types.js';

export const searchRoutes = new Hono<AppEnv>();

searchRoutes.use('*', authMiddleware());
searchRoutes.use('*', workspaceMiddleware());

searchRoutes.post('/', zValidator('json', searchQuerySchema), async (c) => {
  const workspaceId = c.get('workspaceId');
  const { query, filters, limit, offset } = c.req.valid('json');

  // 1. Full-text search on pages (title + contentSnapshot)
  const escapedQuery = query.replace(/[%_\\]/g, '\\$&');
  const ftConditions = [
    eq(canonicalPages.workspaceId, workspaceId),
    or(
      ilike(canonicalPages.title, `%${escapedQuery}%`),
      ilike(canonicalPages.contentSnapshot, `%${escapedQuery}%`),
    ),
  ];

  if (filters?.pageType) {
    ftConditions.push(eq(canonicalPages.pageType, filters.pageType));
  }
  if (filters?.status) {
    ftConditions.push(eq(canonicalPages.status, filters.status));
  }
  if (filters?.collectionId) {
    ftConditions.push(eq(canonicalPages.collectionId, filters.collectionId));
  }

  const textResults = await db
    .select({
      id: canonicalPages.id,
      title: canonicalPages.title,
      pageType: canonicalPages.pageType,
      status: canonicalPages.status,
      slug: canonicalPages.slug,
      updatedAt: canonicalPages.updatedAt,
    })
    .from(canonicalPages)
    .where(and(...ftConditions))
    .limit(limit);

  // 2. Semantic search via pgvector
  let semanticResults: Array<{
    page_id: string;
    title: string;
    page_type: string;
    status: string;
    slug: string;
    chunk_text: string;
    score: number;
  }> = [];

  try {
    const queryEmbedding = await getEmbeddingProvider().generateEmbedding(query);
    const vecLiteral = `[${queryEmbedding.join(',')}]`;

    const filterClause = filters?.pageType
      ? sql`AND cp.page_type = ${filters.pageType}`
      : sql``;
    const statusClause = filters?.status
      ? sql`AND cp.status = ${filters.status}`
      : sql``;

    const vecRows = await db.execute<{
      page_id: string;
      title: string;
      page_type: string;
      status: string;
      slug: string;
      chunk_text: string;
      score: number;
    }>(sql`
      SELECT
        cp.id AS page_id,
        cp.title,
        cp.page_type,
        cp.status,
        cp.slug,
        pe.chunk_text,
        1 - (pe.embedding <=> ${vecLiteral}::vector) AS score
      FROM page_embeddings pe
      JOIN canonical_pages cp ON cp.id = pe.page_id
      WHERE cp.workspace_id = ${workspaceId}
        ${filterClause}
        ${statusClause}
      ORDER BY pe.embedding <=> ${vecLiteral}::vector
      LIMIT ${limit}
    `);

    semanticResults = [...vecRows];
  } catch {
    // If embedding fails (no API key), fall back to text-only results
  }

  // 3. Merge results — simple dedup and interleave by score
  const seen = new Set<string>();
  const merged: Array<{
    pageId: string;
    title: string;
    pageType: string;
    status: string;
    slug: string;
    snippet: string;
    score: number;
  }> = [];

  // Semantic results first (higher relevance)
  for (const row of semanticResults) {
    if (seen.has(row.page_id)) continue;
    seen.add(row.page_id);
    merged.push({
      pageId: row.page_id,
      title: row.title,
      pageType: row.page_type,
      status: row.status,
      slug: row.slug,
      snippet: row.chunk_text.slice(0, 200),
      score: row.score,
    });
  }

  // Text results as fallback
  for (const row of textResults) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push({
      pageId: row.id,
      title: row.title,
      pageType: row.pageType,
      status: row.status,
      slug: row.slug,
      snippet: '',
      score: 0.5,
    });
  }

  const paginated = merged.slice(offset, offset + limit);

  return c.json({ results: paginated, total: merged.length });
});
