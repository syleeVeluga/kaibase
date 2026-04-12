import { Worker } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { QUEUE_NAMES, queues, connection } from '../queues.js';
import { parseFile } from '@kaibase/connectors';
import { db } from '@kaibase/db/client';
import { sources } from '@kaibase/db/schema';
import { sha256 } from '@kaibase/shared';
import pino from 'pino';

const logger = pino({ name: 'parse-worker' });

interface ParseJobData {
  sourceId: string;
  filePath: string;
  mimeType: string;
  workspaceId: string;
}

export const parseWorker = new Worker(
  QUEUE_NAMES.AI_INGEST,
  async (job) => {
    if (job.name !== 'parse') return;

    const { sourceId, filePath, mimeType, workspaceId } = job.data as ParseJobData;
    logger.info({ sourceId, filePath, mimeType, workspaceId }, 'Parsing file');

    const whereClause = and(
      eq(sources.id, sourceId),
      eq(sources.workspaceId, workspaceId),
    );

    try {
      // 1. Parse the file to extract plain text
      const contentText = await parseFile(filePath, mimeType);

      // 2. Compute content hash for deduplication
      const contentHash = sha256(contentText);

      // 3. Update source record: content_text, content_hash, status = 'processed'
      const [updated] = await db
        .update(sources)
        .set({
          contentText,
          contentHash,
          status: 'processed',
        })
        .where(whereClause)
        .returning({ id: sources.id });

      if (!updated) {
        logger.warn({ sourceId, workspaceId }, 'Source not found — skipping');
        return { sourceId, parsed: false };
      }

      // 4. Enqueue classify job for the next pipeline stage
      await queues.aiIngest.add('classify', { sourceId, workspaceId });

      logger.info({ sourceId, workspaceId, contentHash }, 'Parse complete — classify job enqueued');
      return { sourceId, parsed: true };
    } catch (error) {
      // On any parse failure, mark the source as failed
      logger.error({ sourceId, workspaceId, err: error }, 'Parse failed');

      await db
        .update(sources)
        .set({ status: 'failed' })
        .where(whereClause);

      throw error;
    }
  },
  {
    connection,
    concurrency: 3,
  },
);
