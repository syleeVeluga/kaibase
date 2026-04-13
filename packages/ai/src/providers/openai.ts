/**
 * OpenAI LLM provider adapter.
 *
 * Uses the OpenAI Responses API with retry logic and token tracking.
 * Default model: gpt-5.4 for capable tasks.
 */

import type {
  LLMCompletionOptions,
  LLMMessage,
  LLMProvider,
  LLMProviderConfig,
  LLMResponse,
} from './provider.interface.js';
import { LLMProviderError } from './provider.interface.js';
import { withRetry, type RetryConfig } from './retry.js';

const DEFAULT_MODEL = 'gpt-5.4';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

interface OpenAIResponsesRequest {
  model: string;
  input: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_output_tokens?: number;
  reasoning?: {
    effort: NonNullable<LLMCompletionOptions['reasoningEffort']>;
  };
  text?: {
    format: {
      type: 'json_object';
    };
  };
}

interface OpenAIResponsesResponse {
  error?: {
    message?: string;
    code?: string;
  } | null;
  incomplete_details?: {
    reason?: string;
  } | null;
  model: string;
  output?: Array<{
    type?: string;
    role?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
  output_text?: string;
  status?: string;
  usage?: {
    input_tokens?: number;
    total_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: {
      cached_tokens?: number;
    };
    output_tokens_details?: {
      reasoning_tokens?: number;
    };
  };
}

function isReasoningModel(model: string): boolean {
  return /^(gpt-5|o[1-9])/.test(model);
}

function supportsTemperature(model: string): boolean {
  return !isReasoningModel(model);
}

function extractResponseText(response: OpenAIResponsesResponse): string {
  if (typeof response.output_text === 'string' && response.output_text.trim().length > 0) {
    return response.output_text;
  }

  const outputTexts: string[] = [];
  for (const item of response.output ?? []) {
    if (item.type !== 'message') {
      continue;
    }

    for (const contentPart of item.content ?? []) {
      if (contentPart.type === 'output_text' && contentPart.text) {
        outputTexts.push(contentPart.text);
      }
      if (contentPart.type === 'refusal' && contentPart.refusal) {
        throw new LLMProviderError(contentPart.refusal, 'openai');
      }
    }
  }

  return outputTexts.join('');
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai' as const;
  readonly model: string;

  private readonly apiKey: string;
  private readonly retryConfig: RetryConfig;

  constructor(config: LLMProviderConfig) {
    this.model = config.model ?? DEFAULT_MODEL;
    this.apiKey = config.apiKey;
    this.retryConfig = {
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      baseDelayMs: config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS,
    };
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): Promise<LLMResponse> {
    const response = await withRetry(async () => {
      const requestBody: OpenAIResponsesRequest = {
        model: this.model,
        input: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      if (options?.temperature !== undefined && supportsTemperature(this.model)) {
        requestBody.temperature = options.temperature;
      }

      if (options?.maxTokens !== undefined) {
        requestBody.max_output_tokens = options.maxTokens;
      }

      if (options?.jsonMode) {
        requestBody.text = {
          format: {
            type: 'json_object',
          },
        };
      }

      if (options?.reasoningEffort && isReasoningModel(this.model)) {
        requestBody.reasoning = {
          effort: options.reasoningEffort,
        };
      }

      const apiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!apiResponse.ok) {
        let errorMessage = `OpenAI request failed with status ${apiResponse.status}`;
        try {
          const errorBody = (await apiResponse.json()) as {
            error?: { message?: string };
          };
          errorMessage = errorBody.error?.message ?? errorMessage;
        } catch {
          // Ignore JSON parse failures and use the generic message above.
        }

        throw new LLMProviderError(errorMessage, this.name, apiResponse.status);
      }

      return (await apiResponse.json()) as OpenAIResponsesResponse;
    }, this.retryConfig);

    if (response.error?.message) {
      throw new LLMProviderError(
        response.error.message,
        this.name,
      );
    }

    if (response.status && response.status !== 'completed') {
      const incompleteReason = response.incomplete_details?.reason;
      throw new LLMProviderError(
        incompleteReason
          ? `OpenAI response was incomplete: ${incompleteReason}`
          : `OpenAI response did not complete successfully: ${response.status}`,
        this.name,
      );
    }

    const content = extractResponseText(response);
    if (!content) {
      throw new LLMProviderError('OpenAI returned an empty response', this.name);
    }

    return {
      content,
      tokenUsage: {
        input: response.usage?.input_tokens ?? 0,
        output: response.usage?.output_tokens ?? 0,
        total: response.usage?.total_tokens ?? 0,
        reasoning: response.usage?.output_tokens_details?.reasoning_tokens ?? 0,
        cached: response.usage?.input_tokens_details?.cached_tokens ?? 0,
      },
      model: response.model,
    };
  }
}
