import type { Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { db } from '@kaibase/db';
import { canonicalPages, pageEmbeddings } from '@kaibase/db';
import { EmbeddingProvider } from '@kaibase/ai';
import pino from 'pino';

const logger = pino({ name: 'embedding-worker' });

/** Target chunk size in characters. Actual chunks may be slightly larger to avoid mid-sentence splits. */
const CHUNK_TARGET_SIZE = 500;

/** Minimum chunk length worth embedding. Very short fragments add noise. */
const MIN_CHUNK_LENGTH = 20;

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

interface ContentBlock {
  content?: string;
  text?: string;
  [key: string]: unknown;
}

/**
 * Extract plain text from a page's `contentSnapshot`.
 *
 * The snapshot may be:
 *  - A JSON array of block objects (each with a `content` or `text` field)
 *  - A JSON string that parses to such an array
 *  - Plain text
 *
 * Returns the concatenated text or the raw string as-is.
 */
function extractText(contentSnapshot: string): string {
  if (!contentSnapshot || contentSnapshot.trim().length === 0) {
    return '';
  }

  try {
    const parsed: unknown = JSON.parse(contentSnapshot);

    if (Array.isArray(parsed)) {
      const lines: string[] = [];
      for (const block of parsed as ContentBlock[]) {
        const blockText = block.content ?? block.text ?? '';
        if (typeof blockText === 'string' && blockText.trim().length > 0) {
          lines.push(blockText.trim());
        }
      }
      return lines.join('\n');
    }

    // If it parsed as a non-array value (object, number, etc.), stringify back to text
    if (typeof parsed === 'string') {
      return parsed;
    }

    return contentSnapshot;
  } catch {
    // Not JSON — treat as plain text
    return contentSnapshot;
  }
}

// ---------------------------------------------------------------------------
// Text chunking
// ---------------------------------------------------------------------------

/**
 * Split text into chunks of roughly `CHUNK_TARGET_SIZE` characters, splitting
 * at sentence boundaries (`. ` or `\n`) when possible.
 *
 * Each chunk is trimmed and filtered to exclude very short fragments.
 */
function chunkText(text: string): string[] {
  if (text.length <= CHUNK_TARGET_SIZE) {
    const trimmed = text.trim();
    return trimmed.length >= MIN_CHUNK_LENGTH ? [trimmed] : [];
  }

  // Split into sentences / paragraphs first
  const segments = text.split(/(?<=\. |\n)/);

  const chunks: string[] = [];
  let current = '';

  for (const segment of segments) {
    if (current.length + segment.length > CHUNK_TARGET_SIZE && current.length > 0) {
      const trimmed = current.trim();
      if (trimmed.length >= MIN_CHUNK_LENGTH) {
        chunks.push(trimmed);
      }
      current = segment;
    } else {
      current += segment;
    }
  }

  // Flush remaining text
  const remaining = current.trim();
  if (remaining.length >= MIN_CHUNK_LENGTH) {
    chunks.push(remaining);
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Lazy singleton embedding provider
// ---------------------------------------------------------------------------

let _embedder: EmbeddingProvider | undefined;

function getEmbedder(): EmbeddingProvider {
  if (!_embedder) {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for embedding generation');
    }
    _embedder = new EmbeddingProvider({ apiKey });
  }
  return _embedder;
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export async function processEmbeddingJob(job: Job): Promise<{ pageId: string; embedded: boolean; chunkCount?: number; reason?: string }> {
    const { pageId, workspaceId } = job.data as { pageId: string; workspaceId: string };
    logger.info({ pageId, workspaceId }, 'Generating embeddings');

    // 1. Fetch page content and verify workspace ownership
    const page = await db.query.canonicalPages.findFirst({
      where: and(
        eq(canonicalPages.id, pageId),
        eq(canonicalPages.workspaceId, workspaceId),
      ),
      columns: {
        id: true,
        contentSnapshot: true,
      },
    });

    if (!page) {
      logger.warn({ pageId, workspaceId }, 'Page not found or workspace mismatch — skipping');
      return { pageId, embedded: false, reason: 'page_not_found' };
    }

    // 2. Extract and chunk text
    const text = extractText(page.contentSnapshot);
    if (text.length === 0) {
      logger.warn({ pageId }, 'Page has no extractable text — skipping');
      return { pageId, embedded: false, reason: 'empty_content' };
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      logger.warn({ pageId }, 'No chunks produced after splitting — skipping');
      return { pageId, embedded: false, reason: 'no_chunks' };
    }

    logger.info({ pageId, chunkCount: chunks.length }, 'Chunks prepared');

    // 3. Generate embeddings via @kaibase/ai
    const embedder = getEmbedder();
    const vectors = await embedder.generateEmbeddings(chunks);

    // 4. Store in page_embeddings table (delete-then-insert for idempotency)
    await db.transaction(async (tx) => {
      await tx.delete(pageEmbeddings).where(eq(pageEmbeddings.pageId, pageId));

      await tx.insert(pageEmbeddings).values(
        chunks.map((chunkContent, idx) => ({
          pageId,
          chunkIndex: idx,
          chunkText: chunkContent,
          embedding: vectors[idx] as number[],
        })),
      );
    });

    logger.info({ pageId, chunkCount: chunks.length }, 'Embeddings stored successfully');

    return { pageId, embedded: true, chunkCount: chunks.length };
}
