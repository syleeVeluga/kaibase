/**
 * OpenAI LLM provider adapter.
 *
 * Wraps the openai SDK (v6.33.0) with retry logic and token tracking.
 * Default model: gpt-4o for capable tasks.
 */

import OpenAI from 'openai';
import type {
  LLMCompletionOptions,
  LLMMessage,
  LLMProvider,
  LLMProviderConfig,
  LLMResponse,
} from './provider.interface.js';
import { LLMProviderError } from './provider.interface.js';
import { withRetry, type RetryConfig } from './retry.js';

const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai' as const;
  readonly model: string;

  private readonly client: OpenAI;
  private readonly retryConfig: RetryConfig;

  constructor(config: LLMProviderConfig) {
    this.model = config.model ?? DEFAULT_MODEL;
    this.retryConfig = {
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      baseDelayMs: config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS,
    };

    // Disable the SDK's built-in retry so we control retry logic ourselves
    this.client = new OpenAI({
      apiKey: config.apiKey,
      maxRetries: 0,
    });
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): Promise<LLMResponse> {
    const response = await withRetry(async () => {
      const params: OpenAI.ChatCompletionCreateParams = {
        model: this.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      if (options?.temperature !== undefined) {
        params.temperature = options.temperature;
      }

      if (options?.maxTokens !== undefined) {
        params.max_tokens = options.maxTokens;
      }

      if (options?.jsonMode) {
        params.response_format = { type: 'json_object' };
      }

      return this.client.chat.completions.create(params);
    }, this.retryConfig);

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new LLMProviderError(
        'OpenAI returned an empty response',
        this.name,
      );
    }

    return {
      content: choice.message.content,
      tokenUsage: {
        input: response.usage?.prompt_tokens ?? 0,
        output: response.usage?.completion_tokens ?? 0,
      },
      model: response.model,
    };
  }
}
