/**
 * Source summarization prompt.
 *
 * Generates a concise summary of source content in the specified language.
 * Uses the mid-tier model.
 */

import type { LLMMessage } from '../providers/provider.interface.js';

export const PROMPT_VERSION = 'v1';

export interface SummarizeSourceInput {
  /** The raw text content of the source. */
  sourceText: string;
  /** Optional source title. */
  sourceTitle?: string;
  /** Target language for the summary. */
  language: 'en' | 'ko';
  /** Maximum summary length in sentences. Default guidance: 3-5 sentences. */
  maxSentences?: number;
  /** Optional workspace context to inform terminology and tone. */
  workspaceContext?: string;
}

export interface SummarizeSourceResult {
  /** The generated summary text. */
  summary: string;
  /** Key points extracted from the source (3-7 bullet points). */
  keyPoints: string[];
  /** The language the summary was written in. */
  language: 'en' | 'ko';
}

/**
 * Build the prompt messages for source summarization.
 *
 * @param input - The summarization input parameters.
 * @returns LLMMessage array ready to send to a provider.
 */
export function summarizeSourcePrompt(
  input: SummarizeSourceInput,
): LLMMessage[] {
  const sentenceGuidance = input.maxSentences
    ? `Keep the summary to ${input.maxSentences} sentences or fewer.`
    : 'Keep the summary to 3-5 sentences.';

  const languageLabel = input.language === 'ko' ? 'Korean' : 'English';

  const workspaceCtx = input.workspaceContext
    ? `\n\nWorkspace context and terminology:\n${input.workspaceContext}`
    : '';

  const titleInfo = input.sourceTitle
    ? `\nSource title: ${input.sourceTitle}`
    : '';

  const systemMessage: LLMMessage = {
    role: 'system',
    content: `You are Kaibase, an AI knowledge compiler. Your task is to summarize a source document.

Generate a clear, factual summary that captures the essential information. Also extract the key points as bullet items.

Requirements:
- Write the summary and key points in ${languageLabel}.
- ${sentenceGuidance}
- Extract 3-7 key points as concise bullet items.
- Focus on facts, decisions, and actionable information.
- Do not include opinions or speculation unless they are explicitly stated in the source.
- Preserve important names, numbers, and dates.${workspaceCtx}

Respond ONLY with valid JSON matching this schema:
{
  "summary": string,
  "keyPoints": string[],
  "language": "${input.language}"
}

Prompt version: ${PROMPT_VERSION}`,
  };

  const userMessage: LLMMessage = {
    role: 'user',
    content: `Summarize the following source:${titleInfo}

--- SOURCE CONTENT ---
${input.sourceText}
--- END SOURCE CONTENT ---`,
  };

  return [systemMessage, userMessage];
}
