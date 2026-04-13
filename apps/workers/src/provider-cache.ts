/**
 * Model-keyed LLM provider cache.
 *
 * Since different workspaces may use different models (via AI Prompt Studio
 * overrides), the old singleton pattern no longer works. This module maintains
 * a Map<modelName, OpenAIProvider> so that workspaces sharing the same model
 * reuse the same provider instance.
 */

import { OpenAIProvider } from '@kaibase/ai';

const providerCache = new Map<string, OpenAIProvider>();

export function getOrCreateProvider(model: string): OpenAIProvider {
  let provider = providerCache.get(model);
  if (!provider) {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    provider = new OpenAIProvider({ apiKey, model });
    providerCache.set(model, provider);
  }
  return provider;
}
