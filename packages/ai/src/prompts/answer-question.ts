/**
 * Q&A answer generation prompt.
 *
 * Generates an answer to a user question using provided context pages
 * and/or raw sources, with mandatory citations. Uses the capable model tier.
 */

import type { LLMMessage } from '../providers/provider.interface.js';

export const PROMPT_VERSION = 'v1';

export interface AnswerContextPage {
  /** Page identifier for citation references. */
  pageId: string;
  /** Page title. */
  title: string;
  /** Page content (or relevant excerpt). */
  content: string;
}

export interface AnswerContextSource {
  /** Source identifier for citation references. */
  sourceId: string;
  /** Source title if available. */
  title?: string;
  /** Source content (or relevant excerpt). */
  content: string;
}

export interface AnswerQuestionInput {
  /** The user's question. */
  question: string;
  /** Detected or specified language of the question. */
  language: 'en' | 'ko';
  /** Canonical pages relevant to the question (primary evidence). */
  contextPages: AnswerContextPage[];
  /** Raw sources relevant to the question (secondary evidence). */
  contextSources?: AnswerContextSource[];
  /** Optional conversation history for multi-turn context. */
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  /** Optional workspace context. */
  workspaceContext?: string;
}

export interface AnswerCitation {
  /** Whether this references a canonical page or a raw source. */
  type: 'canonical_page' | 'raw_source';
  /** The ID of the referenced page or source. */
  refId: string;
  /** The title of the referenced material. */
  title: string;
  /** A relevant excerpt that supports the claim. */
  excerpt: string;
}

export interface AnswerQuestionResult {
  /** The generated answer text with inline citation markers like [1], [2]. */
  answer: string;
  /** Ordered list of citations referenced in the answer. */
  citations: AnswerCitation[];
  /** The AI's confidence in the answer (0.0 to 1.0). */
  confidence: number;
  /** Detected intent type of the question. */
  intentType: 'factual' | 'comparative' | 'exploratory' | 'actionable';
  /** Whether the answer was fully resolved from canonical pages. */
  canonicalOnly: boolean;
}

/**
 * Build the prompt messages for question answering.
 *
 * @param input - The Q&A input parameters.
 * @returns LLMMessage array ready to send to a provider.
 */
export function answerQuestionPrompt(
  input: AnswerQuestionInput,
): LLMMessage[] {
  const languageLabel = input.language === 'ko' ? 'Korean' : 'English';

  const workspaceCtx = input.workspaceContext
    ? `\n\nWorkspace context:\n${input.workspaceContext}`
    : '';

  // Format canonical pages
  const pagesFormatted =
    input.contextPages.length > 0
      ? input.contextPages
          .map(
            (p, i) =>
              `--- CANONICAL PAGE ${i + 1} (ID: ${p.pageId}) ---\nTitle: ${p.title}\n${p.content}\n--- END PAGE ${i + 1} ---`,
          )
          .join('\n\n')
      : '(No canonical pages available)';

  // Format raw sources
  const sourcesFormatted =
    input.contextSources && input.contextSources.length > 0
      ? input.contextSources
          .map(
            (s, i) =>
              `--- RAW SOURCE ${i + 1} (ID: ${s.sourceId}) ---\n${s.title ? `Title: ${s.title}\n` : ''}${s.content}\n--- END SOURCE ${i + 1} ---`,
          )
          .join('\n\n')
      : '';

  const systemMessage: LLMMessage = {
    role: 'system',
    content: `You are Kaibase, an AI knowledge assistant. Your task is to answer the user's question using ONLY the provided context.

Answer language: ${languageLabel} (match the question's language)

Answer guidelines:
- Answer the question using ONLY information from the provided canonical pages and raw sources.
- Write the answer entirely in ${languageLabel}.
- Every factual claim MUST have at least one citation. Use numbered markers like [1], [2] in the answer text.
- If the context does not contain enough information to answer, state this clearly rather than making up information.
- Prefer information from canonical pages over raw sources.
- Be concise but thorough. Structure the answer for readability.
- Classify the question intent: "factual" (seeking specific facts), "comparative" (comparing items), "exploratory" (broad understanding), or "actionable" (seeking steps/recommendations).
- Rate your confidence from 0.0 to 1.0 based on how well the context supports the answer.
- Set "canonicalOnly" to true if the answer uses only canonical pages, false if raw sources were needed.${workspaceCtx}

Respond ONLY with valid JSON matching this schema:
{
  "answer": string,
  "citations": [
    {
      "type": "canonical_page" | "raw_source",
      "refId": string,
      "title": string,
      "excerpt": string
    }
  ],
  "confidence": number,
  "intentType": "factual" | "comparative" | "exploratory" | "actionable",
  "canonicalOnly": boolean
}

Prompt version: ${PROMPT_VERSION}`,
  };

  // Build conversation messages
  const messages: LLMMessage[] = [systemMessage];

  // Add conversation history if present (multi-turn support)
  if (input.conversationHistory) {
    for (const msg of input.conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // Build the user message with context
  let userContent = `Question: ${input.question}

CANONICAL PAGES (primary evidence):
${pagesFormatted}`;

  if (sourcesFormatted) {
    userContent += `

RAW SOURCES (secondary evidence):
${sourcesFormatted}`;
  }

  messages.push({
    role: 'user',
    content: userContent,
  });

  return messages;
}
