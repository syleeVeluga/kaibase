import pino from 'pino';
import { ingestWorker } from './ingest/ingest-queue.worker.js';
import { compileWorker } from './compile/compile-queue.worker.js';

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport:
    process.env['NODE_ENV'] !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

const workers = [
  ingestWorker,
  compileWorker,
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
