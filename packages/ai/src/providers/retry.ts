/**
 * Shared retry logic with exponential backoff for LLM provider calls.
 *
 * Retries on transient errors (rate limits, server errors, network issues).
 * Non-retryable errors (auth failures, bad requests) are thrown immediately.
 */

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
}

/**
 * Determine whether an error is transient and should be retried.
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    // Check for status code on SDK error objects
    const statusCode = (error as unknown as Record<string, unknown>)['status'] ??
      (error as unknown as Record<string, unknown>)['statusCode'];
    if (typeof statusCode === 'number') {
      return RETRYABLE_STATUS_CODES.has(statusCode);
    }

    // Network errors are retryable
    const message = error.message.toLowerCase();
    if (
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('socket hang up') ||
      message.includes('network') ||
      message.includes('fetch failed')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an async function with exponential backoff retry.
 *
 * @param fn - The async function to execute.
 * @param config - Retry configuration.
 * @returns The result of the function.
 * @throws The last error if all retries are exhausted, or any non-retryable error immediately.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error)) {
        throw error;
      }

      if (attempt < config.maxRetries) {
        // Exponential backoff with jitter: base * 2^attempt * (0.5 to 1.5)
        const jitter = 0.5 + Math.random();
        const delayMs = config.baseDelayMs * Math.pow(2, attempt) * jitter;
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}
