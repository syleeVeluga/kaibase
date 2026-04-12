/**
 * Anthropic LLM provider adapter.
 *
 * Wraps the @anthropic-ai/sdk (v0.86.1) with retry logic and token tracking.
 * Default model: claude-sonnet-4-20250514 for capable tasks.
 *
 * Note: The Anthropic API uses a separate system parameter rather than
 * a system message in the messages array. This provider extracts system
 * messages and passes them correctly.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMCompletionOptions,
  LLMMessage,
  LLMProvider,
  LLMProviderConfig,
  LLMResponse,
} from './provider.interface.js';
import { LLMProviderError } from './provider.interface.js';
import { withRetry, type RetryConfig } from './retry.js';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_TOKENS = 4096;

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic' as const;
  readonly model: string;

  private readonly client: Anthropic;
  private readonly retryConfig: RetryConfig;

  constructor(config: LLMProviderConfig) {
    this.model = config.model ?? DEFAULT_MODEL;
    this.retryConfig = {
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      baseDelayMs: config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS,
    };

    // Disable the SDK's built-in retry so we control retry logic ourselves
    this.client = new Anthropic({
      apiKey: config.apiKey,
      maxRetries: 0,
    });
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): Promise<LLMResponse> {
    // Separate system messages from conversation messages.
    // Anthropic API takes system as a top-level parameter.
    const systemMessages: string[] = [];
    const conversationMessages: Array<{
      role: 'user' | 'assistant';
      content: string;
    }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessages.push(msg.content);
      } else {
        conversationMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Anthropic requires at least one user message
    if (conversationMessages.length === 0) {
      throw new LLMProviderError(
        'Anthropic requires at least one user or assistant message',
        this.name,
      );
    }

    const response = await withRetry(async () => {
      const params: Anthropic.MessageCreateParams = {
        model: this.model,
        max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
        messages: conversationMessages,
      };

      if (systemMessages.length > 0) {
        params.system = systemMessages.join('\n\n');
      }

      if (options?.temperature !== undefined) {
        params.temperature = options.temperature;
      }

      return this.client.messages.create(params);
    }, this.retryConfig);

    // Extract text content from the response
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new LLMProviderError(
        'Anthropic returned no text content',
        this.name,
      );
    }

    return {
      content: textBlock.text,
      tokenUsage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      model: response.model,
    };
  }
}
