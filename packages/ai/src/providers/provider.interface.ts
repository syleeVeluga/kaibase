/**
 * Core LLM provider interfaces for Kaibase AI package.
 *
 * All LLM calls in the system go through these abstractions.
 * Provider implementations handle retry logic, token tracking,
 * and SDK-specific details.
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMTokenUsage {
  input: number;
  output: number;
}

export interface LLMResponse {
  content: string;
  tokenUsage: LLMTokenUsage;
  model: string;
}

export interface LLMCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  /** Optional JSON mode — instructs the model to return valid JSON. */
  jsonMode?: boolean;
}

export interface LLMProviderConfig {
  apiKey: string;
  model?: string;
  /** Maximum number of retries on transient failures. Default: 3. */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff. Default: 1000. */
  baseDelayMs?: number;
}

export interface LLMProvider {
  /** The provider name (e.g., "openai", "anthropic"). */
  readonly name: string;

  /** The model identifier currently configured. */
  readonly model: string;

  /**
   * Send a chat completion request to the LLM.
   *
   * @param messages - The conversation messages to send.
   * @param options - Optional parameters for the completion.
   * @returns The model's response including content and token usage.
   */
  complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): Promise<LLMResponse>;
}

/**
 * Errors thrown by LLM providers on non-retryable failures.
 */
export class LLMProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LLMProviderError';
  }
}
