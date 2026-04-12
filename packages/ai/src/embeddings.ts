/**
 * Embedding provider using OpenAI's text-embedding-3-small model.
 *
 * Generates vector embeddings for text content, used for semantic search
 * and page matching. Supports single and batch embedding generation.
 */

import OpenAI from 'openai';
import { LLMProviderError } from './providers/provider.interface.js';
import { withRetry, type RetryConfig } from './providers/retry.js';

const DEFAULT_MODEL = 'text-embedding-3-small';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

/** Maximum texts per batch call to avoid API limits. */
const MAX_BATCH_SIZE = 100;

export interface EmbeddingProviderConfig {
  apiKey: string;
  /** Embedding model to use. Default: text-embedding-3-small. */
  model?: string;
  /** Number of dimensions for the embedding. Default: model default (1536 for text-embedding-3-small). */
  dimensions?: number;
  maxRetries?: number;
  baseDelayMs?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  tokenUsage: number;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  totalTokenUsage: number;
}

export class EmbeddingProvider {
  readonly model: string;

  private readonly client: OpenAI;
  private readonly retryConfig: RetryConfig;
  private readonly dimensions: number | undefined;

  constructor(config: EmbeddingProviderConfig) {
    this.model = config.model ?? DEFAULT_MODEL;
    this.dimensions = config.dimensions;
    this.retryConfig = {
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      baseDelayMs: config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS,
    };

    this.client = new OpenAI({
      apiKey: config.apiKey,
      maxRetries: 0,
    });
  }

  /**
   * Generate an embedding vector for a single text string.
   *
   * @param text - The text to embed.
   * @returns The embedding vector and token usage.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.generateEmbeddingWithUsage(text);
    return result.embedding;
  }

  /**
   * Generate an embedding vector with token usage information.
   *
   * @param text - The text to embed.
   * @returns The embedding vector and token usage.
   */
  async generateEmbeddingWithUsage(text: string): Promise<EmbeddingResult> {
    const response = await withRetry(async () => {
      const params: OpenAI.EmbeddingCreateParams = {
        model: this.model,
        input: text,
      };

      if (this.dimensions !== undefined) {
        params.dimensions = this.dimensions;
      }

      return this.client.embeddings.create(params);
    }, this.retryConfig);

    const data = response.data[0];
    if (!data) {
      throw new LLMProviderError(
        'OpenAI embeddings returned no data',
        'openai-embeddings',
      );
    }

    return {
      embedding: data.embedding,
      tokenUsage: response.usage.prompt_tokens,
    };
  }

  /**
   * Generate embedding vectors for multiple texts in batch.
   *
   * Automatically chunks large batches to respect API limits.
   *
   * @param texts - Array of texts to embed.
   * @returns Array of embedding vectors (same order as input) and total token usage.
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const result = await this.generateEmbeddingsWithUsage(texts);
    return result.embeddings;
  }

  /**
   * Generate embedding vectors for multiple texts with token usage information.
   *
   * @param texts - Array of texts to embed.
   * @returns Embedding vectors and total token usage.
   */
  async generateEmbeddingsWithUsage(
    texts: string[],
  ): Promise<BatchEmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [], totalTokenUsage: 0 };
    }

    const allEmbeddings: number[][] = [];
    let totalTokens = 0;

    // Process in chunks to respect API batch size limits
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const chunk = texts.slice(i, i + MAX_BATCH_SIZE);

      const response = await withRetry(async () => {
        const params: OpenAI.EmbeddingCreateParams = {
          model: this.model,
          input: chunk,
        };

        if (this.dimensions !== undefined) {
          params.dimensions = this.dimensions;
        }

        return this.client.embeddings.create(params);
      }, this.retryConfig);

      // Sort by index to ensure order matches input
      const sorted = [...response.data].sort((a, b) => a.index - b.index);
      for (const item of sorted) {
        allEmbeddings.push(item.embedding);
      }

      totalTokens += response.usage.prompt_tokens;
    }

    return {
      embeddings: allEmbeddings,
      totalTokenUsage: totalTokens,
    };
  }
}
