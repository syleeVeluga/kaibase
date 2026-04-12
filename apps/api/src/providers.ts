import { EmbeddingProvider, OpenAIProvider } from '@kaibase/ai';

let embeddingProvider: EmbeddingProvider | undefined;
let qaLlmProvider: OpenAIProvider | undefined;

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!embeddingProvider) {
    embeddingProvider = new EmbeddingProvider({
      apiKey: process.env['OPENAI_API_KEY'] ?? '',
    });
  }
  return embeddingProvider;
}

export function getQALLM(): OpenAIProvider {
  if (!qaLlmProvider) {
    qaLlmProvider = new OpenAIProvider({
      apiKey: process.env['OPENAI_API_KEY'] ?? '',
      model: process.env['QA_MODEL'] ?? 'gpt-4o',
    });
  }
  return qaLlmProvider;
}
