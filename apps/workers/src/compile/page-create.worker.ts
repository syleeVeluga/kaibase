import { Worker } from 'bullmq';
import { QUEUE_NAMES, connection } from '../queues.js';
import pino from 'pino';

const logger = pino({ name: 'page-create-worker' });

export const pageCreateWorker = new Worker(
  QUEUE_NAMES.AI_PAGE_COMPILE,
  async (job) => {
    const { sourceIds, workspaceId, pageType } = job.data as {
      sourceIds: string[];
      workspaceId: string;
      pageType: string;
    };
    logger.info({ sourceIds, workspaceId, pageType }, 'Creating page from sources');

    // TODO: Implement L0 page creation
    // 1. Fetch sources from DB
    // 2. Evaluate policy (AUTO_PUBLISH, DRAFT_ONLY, REVIEW_REQUIRED, BLOCKED)
    // 3. Call LLM with create-page prompt
    // 4. Create CanonicalPage record
    // 5. Create Citation records
    // 6. If REVIEW_REQUIRED, create ReviewTask
    // 7. Log activity event

    return { sourceIds, pageCreated: true };
  },
  {
    connection,
    concurrency: 2,
  },
);
