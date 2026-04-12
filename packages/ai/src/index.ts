// Provider adapters and core types
export type {
  LLMMessage,
  LLMTokenUsage,
  LLMResponse,
  LLMCompletionOptions,
  LLMProviderConfig,
  LLMProvider,
} from './providers/index.js';
export { LLMProviderError, OpenAIProvider, AnthropicProvider, withRetry } from './providers/index.js';
export type { RetryConfig } from './providers/index.js';

// Embedding provider
export { EmbeddingProvider } from './embeddings.js';
export type {
  EmbeddingProviderConfig,
  EmbeddingResult,
  BatchEmbeddingResult,
} from './embeddings.js';

// Prompt templates
export {
  classifySourcePrompt,
  CLASSIFY_PROMPT_VERSION,
  summarizeSourcePrompt,
  SUMMARIZE_PROMPT_VERSION,
  extractEntitiesPrompt,
  EXTRACT_ENTITIES_PROMPT_VERSION,
  createPagePrompt,
  CREATE_PAGE_PROMPT_VERSION,
  answerQuestionPrompt,
  ANSWER_QUESTION_PROMPT_VERSION,
} from './prompts/index.js';

export type {
  ClassifySourceInput,
  ClassifySourceResult,
  SummarizeSourceInput,
  SummarizeSourceResult,
  ExtractEntitiesInput,
  ExtractedEntity,
  ExtractedConcept,
  ExtractEntitiesResult,
  CreatePageInput,
  CreatePageSource,
  PageTemplateSection,
  CreatePageBlock,
  CreatePageResult,
  AnswerQuestionInput,
  AnswerContextPage,
  AnswerContextSource,
  AnswerCitation,
  AnswerQuestionResult,
} from './prompts/index.js';
