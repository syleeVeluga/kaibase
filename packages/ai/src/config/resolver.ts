/**
 * AI Prompt Config Resolver.
 *
 * Resolves effective AI configuration for a given function and workspace
 * using a 3-level precedence chain: DB override > env var > code default.
 */

import type { AiPromptFunctionId, AiReasoningEffort, AiPromptFunctionDefault } from '@kaibase/shared';
import type { LLMMessage, LLMReasoningEffort } from '../providers/provider.interface.js';
import {
  PROMPT_VERSION as CLASSIFY_PROMPT_VERSION,
} from '../prompts/classify.js';
import {
  PROMPT_VERSION as SUMMARIZE_PROMPT_VERSION,
} from '../prompts/summarize.js';
import {
  PROMPT_VERSION as EXTRACT_ENTITIES_PROMPT_VERSION,
} from '../prompts/extract-entities.js';
import {
  PROMPT_VERSION as CREATE_PAGE_PROMPT_VERSION,
} from '../prompts/create-page.js';
import {
  PROMPT_VERSION as ANSWER_QUESTION_PROMPT_VERSION,
} from '../prompts/answer-question.js';

/** Resolved config after merging DB override, env var, and code default. */
export interface ResolvedPromptConfig {
  model: string;
  temperature: number | undefined;
  reasoningEffort: LLMReasoningEffort;
  systemPromptOverride: string | null;
  userPromptOverride: string | null;
}

/** DB row shape expected by the resolver (avoids hard dependency on @kaibase/db). */
export interface AiPromptConfigRow {
  functionId: string;
  model: string | null;
  temperature: number | null;
  reasoningEffort: string | null;
  systemPromptOverride: string | null;
  userPromptOverride: string | null;
  isActive: boolean;
}

/** Env var mapping per function. */
const ENV_VAR_MAP: Record<AiPromptFunctionId, { model: string; reasoning: string }> = {
  'classify': { model: 'CLASSIFY_MODEL', reasoning: 'CLASSIFY_REASONING' },
  'summarize': { model: 'SUMMARIZE_MODEL', reasoning: 'SUMMARIZE_REASONING' },
  'extract-entities': { model: 'EXTRACT_ENTITIES_MODEL', reasoning: 'EXTRACT_ENTITIES_REASONING' },
  'create-page': { model: 'PAGE_CREATE_MODEL', reasoning: 'PAGE_CREATE_REASONING' },
  'answer-question': { model: 'QA_MODEL', reasoning: 'QA_REASONING' },
};

interface FunctionDefault {
  model: string;
  reasoningEffort: LLMReasoningEffort;
  promptVersion: string;
  description: { en: string; ko: string };
  variables: string[];
}

/** Code-level defaults for each AI function. */
export const FUNCTION_DEFAULTS: Record<AiPromptFunctionId, FunctionDefault> = {
  'classify': {
    model: 'gpt-5.4-mini',
    reasoningEffort: 'low',
    promptVersion: CLASSIFY_PROMPT_VERSION,
    description: {
      en: 'Classifies source documents by type, topic, section, and urgency',
      ko: '소스 문서를 유형, 주제, 섹션, 긴급도별로 분류합니다',
    },
    variables: ['sourceText', 'sourceTitle', 'sourceTypeHint', 'language', 'workspaceContext'],
  },
  'summarize': {
    model: 'gpt-5.4',
    reasoningEffort: 'medium',
    promptVersion: SUMMARIZE_PROMPT_VERSION,
    description: {
      en: 'Generates concise summaries with key points from sources',
      ko: '소스에서 핵심 요약과 주요 포인트를 생성합니다',
    },
    variables: ['sourceText', 'sourceTitle', 'language', 'maxSentences', 'workspaceContext'],
  },
  'extract-entities': {
    model: 'gpt-5.4-nano',
    reasoningEffort: 'low',
    promptVersion: EXTRACT_ENTITIES_PROMPT_VERSION,
    description: {
      en: 'Extracts entities, concepts, and relation triples from sources',
      ko: '소스에서 엔티티, 개념, 관계 트리플을 추출합니다',
    },
    variables: ['sourceText', 'sourceTitle', 'language', 'knownEntities', 'workspaceContext'],
  },
  'create-page': {
    model: 'gpt-5.4',
    reasoningEffort: 'medium',
    promptVersion: CREATE_PAGE_PROMPT_VERSION,
    description: {
      en: 'Generates canonical knowledge pages from source materials',
      ko: '소스 자료로부터 정식 지식 페이지를 생성합니다',
    },
    variables: ['sources', 'pageType', 'language', 'templateSections', 'instructions', 'workspaceContext', 'suggestedTitle'],
  },
  'answer-question': {
    model: 'gpt-5.4',
    reasoningEffort: 'medium',
    promptVersion: ANSWER_QUESTION_PROMPT_VERSION,
    description: {
      en: 'Answers user questions with cited evidence from knowledge base',
      ko: '지식 기반의 인용 근거와 함께 사용자 질문에 답변합니다',
    },
    variables: ['question', 'language', 'contextPages', 'contextSources', 'conversationHistory', 'workspaceContext'],
  },
};

/**
 * Resolve the effective prompt config for a function in a workspace.
 *
 * @param functionId - The AI function to resolve config for.
 * @param dbRow - The DB override row, or null if no override exists.
 * @returns The merged effective configuration.
 */
export function resolvePromptConfig(
  functionId: AiPromptFunctionId,
  dbRow: AiPromptConfigRow | null,
): ResolvedPromptConfig {
  const defaults = FUNCTION_DEFAULTS[functionId];
  const envVars = ENV_VAR_MAP[functionId];

  const isActive = dbRow != null && dbRow.isActive;

  // Model: DB (if active & non-null) > env var > code default
  const model =
    (isActive && dbRow.model) ||
    process.env[envVars.model] ||
    defaults.model;

  // Temperature: DB (if active & non-null) > undefined (let provider decide)
  const temperature =
    isActive && dbRow.temperature != null
      ? dbRow.temperature
      : undefined;

  // Reasoning effort: DB (if active & non-null) > env var > code default
  const reasoningEffort = (
    (isActive && dbRow.reasoningEffort) ||
    process.env[envVars.reasoning] ||
    defaults.reasoningEffort
  ) as LLMReasoningEffort;

  // Prompt overrides: DB (if active & non-null, using != null to allow empty strings) > null
  const systemPromptOverride =
    isActive && dbRow.systemPromptOverride != null
      ? dbRow.systemPromptOverride
      : null;

  const userPromptOverride =
    isActive && dbRow.userPromptOverride != null
      ? dbRow.userPromptOverride
      : null;

  return {
    model,
    temperature,
    reasoningEffort,
    systemPromptOverride,
    userPromptOverride,
  };
}

/**
 * Apply system/user prompt overrides to a message array.
 * Replaces the first system message and/or user message content
 * if the resolved config contains overrides.
 */
export function applyPromptOverrides(
  messages: LLMMessage[],
  config: ResolvedPromptConfig,
): LLMMessage[] {
  if (config.systemPromptOverride == null && config.userPromptOverride == null) {
    return messages;
  }

  return messages.map((msg) => {
    if (msg.role === 'system' && config.systemPromptOverride != null) {
      return { ...msg, content: config.systemPromptOverride };
    }
    if (msg.role === 'user' && config.userPromptOverride != null) {
      return { ...msg, content: config.userPromptOverride };
    }
    return msg;
  });
}

/**
 * Get the code-level defaults for all AI functions.
 * Used by the API to return defaults for the UI "Reset" functionality.
 */
export function getPromptFunctionDefaults(): AiPromptFunctionDefault[] {
  const functionIds: AiPromptFunctionId[] = [
    'classify',
    'summarize',
    'extract-entities',
    'create-page',
    'answer-question',
  ];

  return functionIds.map((functionId) => {
    const d = FUNCTION_DEFAULTS[functionId];
    return {
      functionId,
      model: d.model,
      reasoningEffort: d.reasoningEffort as AiReasoningEffort,
      promptVersion: d.promptVersion,
      description: d.description,
      variables: d.variables,
    };
  });
}
