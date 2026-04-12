import { Worker } from 'bullmq';
import { QUEUE_NAMES, connection } from '../queues.js';
import pino from 'pino';

const logger = pino({ name: 'classify-worker' });

export const classifyWorker = new Worker(
  QUEUE_NAMES.AI_INGEST,
  async (job) => {
    const { sourceId, workspaceId } = job.data as { sourceId: string; workspaceId: string };
    logger.info({ sourceId, workspaceId }, 'Classifying source');

    // TODO: Implement classification using @kaibase/ai classify prompt
    // 1. Fetch source from DB
    // 2. Call LLM with classify prompt
    // 3. Update source metadata with classification
    // 4. Add to ai-page-compile queue if appropriate

    return { sourceId, classified: true };
  },
  {
    connection,
    concurrency: 5,
  },
);
