import pino from 'pino';
import { classifyWorker } from './ingest/classify.worker.js';
import { summarizeWorker } from './ingest/summarize.worker.js';
import { parseWorker } from './ingest/parse.worker.js';
import { pageCreateWorker } from './compile/page-create.worker.js';
import { embeddingWorker } from './compile/embedding.worker.js';

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport:
    process.env['NODE_ENV'] !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

const workers = [
  classifyWorker,
  summarizeWorker,
  parseWorker,
  pageCreateWorker,
  embeddingWorker,
];

logger.info(`Started ${workers.length} workers`);

function shutdown(): void {
  logger.info('Shutting down workers...');
  Promise.all(workers.map((w) => w.close()))
    .then(() => {
      logger.info('All workers stopped');
      process.exit(0);
    })
    .catch((err: unknown) => {
      logger.error({ err }, 'Error shutting down workers');
      process.exit(1);
    });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
