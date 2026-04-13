import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from '../logger.js';
import { mapDbError } from './db-errors.js';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    return c.json<ApiError>(
      { code: err.code, message: err.message, details: err.details },
      err.statusCode as 400,
    );
  }

  if (err instanceof HTTPException) {
    return c.json<ApiError>(
      { code: 'HTTP_ERROR', message: err.message },
      err.status as 400,
    );
  }

  const dbError = mapDbError(err);
  if (dbError) {
    return c.json<ApiError>(
      { code: dbError.code, message: dbError.message },
      dbError.status as 400,
    );
  }

  logger.error({ err }, 'Unhandled error');

  return c.json<ApiError>(
    { code: 'INTERNAL_ERROR', message: 'errors.internal' },
    500,
  );
};
