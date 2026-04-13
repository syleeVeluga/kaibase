import { EmbeddingProvider, OpenAIProvider } from '@kaibase/ai';

let embeddingProvider: EmbeddingProvider | undefined;

/** Model-keyed cache for QA LLM providers. */
const qaProviderCache = new Map<string, OpenAIProvider>();

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!embeddingProvider) {
    embeddingProvider = new EmbeddingProvider({
      apiKey: process.env['OPENAI_API_KEY'] ?? '',
    });
  }
  return embeddingProvider;
}

/**
 * Get or create an OpenAI provider for the given model.
 * Supports per-workspace model overrides from the AI Prompt Studio.
 */
export function getOrCreateQAProvider(model: string): OpenAIProvider {
  let provider = qaProviderCache.get(model);
  if (!provider) {
    provider = new OpenAIProvider({
      apiKey: process.env['OPENAI_API_KEY'] ?? '',
      model,
    });
    qaProviderCache.set(model, provider);
  }
  return provider;
}
