/**
 * Q&A answer generation prompt — v2.
 *
 * Generates an answer to a user question using provided canonical pages
 * and/or raw sources, with mandatory citations. Answers are the primary
 * user-facing AI interaction and the entry point for the accumulation loop:
 * valuable answers get promoted to canonical pages, enriching the knowledge
 * base for future queries.
 *
 * Model tier: capable (e.g. GPT-4o, Claude Sonnet).
 */

import type { LLMMessage } from '../providers/provider.interface.js';

export const PROMPT_VERSION = 'v2';

/* ------------------------------------------------------------------ */
/*  Input / Output interfaces                                         */
/* ------------------------------------------------------------------ */

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
  /** Suggested follow-up questions the user might ask next. */
  followUpQuestions?: string[];
  /** Knowledge gaps — topics the knowledge base lacks to give a better answer. */
  knowledgeGaps?: string[];
  /** Whether this answer is a candidate for promotion to a canonical page. */
  promotionCandidate?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Prompt builder                                                     */
/* ------------------------------------------------------------------ */

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

  const contextStats = {
    pageCount: input.contextPages.length,
    sourceCount: input.contextSources?.length ?? 0,
  };

  const systemMessage: LLMMessage = {
    role: 'system',
    content: `You are the Q&A Engine of Kaibase, an AI knowledge operating system.

Your role: You answer user questions using ONLY the knowledge base evidence provided below. In Kaibase, every answer is potentially a future knowledge asset — high-quality answers can be promoted to canonical pages, enriching the knowledge base for all future queries. This is the accumulation loop.

You have ${contextStats.pageCount} canonical page(s) and ${contextStats.sourceCount} raw source(s) as context.

──────────────────────────────────────────
ANSWER PRINCIPLES
──────────────────────────────────────────

1. EVIDENCE-ONLY ANSWERS
   - Use ONLY information from the provided canonical pages and raw sources.
   - NEVER use general knowledge, training data, or information not present in the context.
   - If the context does not contain enough information, say so clearly and specifically: explain what IS known and what is MISSING.
   - It is far better to give a partial answer with honest gaps than a complete-sounding answer with fabricated details.

2. SOURCE HIERARCHY
   - Canonical pages are PRIMARY evidence — they represent the workspace's compiled, reviewed knowledge.
   - Raw sources are SECONDARY evidence — use them when canonical pages are insufficient.
   - When both a canonical page and raw source address the same point, prefer the canonical page.
   - Set "canonicalOnly" to true ONLY if the answer uses exclusively canonical pages.

3. CITATION RIGOR
   - Every factual claim MUST have at least one citation using numbered markers: [1], [2], etc.
   - Citations must be ordered sequentially as they first appear in the answer.
   - Each citation references a specific canonical page or raw source by ID.
   - The "excerpt" field should contain the most relevant 1–2 sentences from the cited material — close to verbatim.
   - If you synthesize across multiple sources, cite ALL contributing sources for that claim.

4. ANSWER STRUCTURE
   Adapt your answer structure to the question intent:
   • Factual — Direct answer first, then supporting evidence. Be concise.
   • Comparative — Use structured comparison (table or parallel points). State dimensions of comparison explicitly.
   • Exploratory — Provide a comprehensive overview organized by subtopic. Include pointers to where the user can dig deeper.
   • Actionable — Lead with recommended steps/actions, then explain rationale. Number steps if appropriate.

5. ANSWER LANGUAGE
   Write the ENTIRE answer in ${languageLabel}, matching the user's question language.
   - Preserve proper nouns, product names, and technical terms in their original form.
   - Citations' "excerpt" fields should be verbatim from the source (in whatever language the source is in).

──────────────────────────────────────────
CONFIDENCE CALIBRATION
──────────────────────────────────────────
Rate your confidence from 0.0 to 1.0 honestly:
• 0.9–1.0: Answer is fully supported by clear, specific evidence in the context. No ambiguity.
• 0.7–0.89: Answer is well-supported but some aspects are inferred from partial evidence.
• 0.5–0.69: Answer addresses the question but significant parts lack direct evidence. Some extrapolation required.
• 0.3–0.49: Context is tangentially related — answer is more "here's what we know that's adjacent" than a direct response.
• Below 0.3: Context is insufficient. State this honestly.

──────────────────────────────────────────
FOLLOW-UP QUESTIONS
──────────────────────────────────────────
Suggest 2–4 natural follow-up questions that:
- Are answerable from the knowledge base (based on what you've seen in the context)
- Deepen the user's understanding of the topic
- Explore related topics or implications
Write follow-ups in ${languageLabel}.

──────────────────────────────────────────
KNOWLEDGE GAPS
──────────────────────────────────────────
Identify 0–3 knowledge gaps — specific topics or facts that the knowledge base does NOT contain but WOULD improve the answer quality. These signal to the user (and the system) where new sources would be most valuable.
Examples: "No data on competitor pricing after 2025", "No technical architecture documentation for Service B".
Write in ${languageLabel}. Return an empty array if no significant gaps are apparent.

──────────────────────────────────────────
PROMOTION CANDIDACY
──────────────────────────────────────────
Set "promotionCandidate" to true when the answer:
- Synthesizes information from 3+ different sources/pages, OR
- Provides a structured analysis that doesn't exist as a standalone page, OR
- Answers a question that seems foundational to the workspace's domain
Set to false for simple factual lookups or trivial questions.${workspaceCtx}

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
  "canonicalOnly": boolean,
  "followUpQuestions": string[],
  "knowledgeGaps": string[],
  "promotionCandidate": boolean
}

Prompt version: ${PROMPT_VERSION}`,
  };

  const messages: LLMMessage[] = [systemMessage];

  if (input.conversationHistory) {
    for (const msg of input.conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

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
