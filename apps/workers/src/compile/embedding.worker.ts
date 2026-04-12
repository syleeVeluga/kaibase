import { Worker } from 'bullmq';
import { QUEUE_NAMES, connection } from '../queues.js';
import pino from 'pino';

const logger = pino({ name: 'embedding-worker' });

export const embeddingWorker = new Worker(
  QUEUE_NAMES.AI_PAGE_COMPILE,
  async (job) => {
    if (job.name !== 'embedding') return;

    const { pageId, workspaceId } = job.data as { pageId: string; workspaceId: string };
    logger.info({ pageId, workspaceId }, 'Generating embeddings');

    // TODO: Implement embedding generation
    // 1. Fetch page content
    // 2. Chunk text
    // 3. Generate embeddings via @kaibase/ai
    // 4. Store in page_embeddings table

    return { pageId, embedded: true };
  },
  {
    connection,
    concurrency: 3,
  },
);
