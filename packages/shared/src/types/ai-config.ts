/**
 * AI Prompt Studio types.
 *
 * Defines the shape of per-workspace AI function configuration
 * stored in the ai_prompt_configs table.
 */

/** The 5 AI pipeline functions that can be individually configured. */
export type AiPromptFunctionId =
  | 'classify'
  | 'summarize'
  | 'extract-entities'
  | 'create-page'
  | 'answer-question';

/** Reasoning effort levels supported by LLM providers. */
export type AiReasoningEffort =
  | 'none'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh';

/** A persisted AI prompt configuration override for a single function. */
export interface AiPromptConfig {
  id: string;
  workspaceId: string;
  functionId: AiPromptFunctionId;
  model: string | null;
  temperature: number | null;
  reasoningEffort: AiReasoningEffort | null;
  systemPromptOverride: string | null;
  userPromptOverride: string | null;
  isActive: boolean;
  updatedAt: string;
  updatedBy: string;
}

/** Code-level defaults for a single AI function (returned by /defaults endpoint). */
export interface AiPromptFunctionDefault {
  functionId: AiPromptFunctionId;
  model: string;
  reasoningEffort: AiReasoningEffort;
  promptVersion: string;
  description: { en: string; ko: string };
  variables: string[];
}

/** Merged view: effective config for a function (DB override + defaults). */
export interface AiPromptConfigMerged {
  functionId: AiPromptFunctionId;
  model: string;
  temperature: number | null;
  reasoningEffort: AiReasoningEffort;
  systemPromptOverride: string | null;
  userPromptOverride: string | null;
  isActive: boolean;
  hasOverride: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}
