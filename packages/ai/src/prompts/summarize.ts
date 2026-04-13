/**
 * Source summarization prompt — v2.
 *
 * The summarizer extracts structured knowledge signals from a source document.
 * Unlike a generic summary, Kaibase summarization is designed for downstream
 * knowledge compilation: the output feeds page creation, citation building,
 * search indexing, and the review queue.
 *
 * Model tier: mid-tier.
 */

import type { LLMMessage } from '../providers/provider.interface.js';

export const PROMPT_VERSION = 'v2';

/* ------------------------------------------------------------------ */
/*  Input / Output interfaces                                         */
/* ------------------------------------------------------------------ */

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
  /** Optional classification result from the upstream classify step. */
  classificationHint?: {
    contentType?: string;
    section?: string;
  };
}

export interface SummarizeSourceResult {
  /** The generated summary text. */
  summary: string;
  /** Key points extracted from the source (3-7 bullet points). */
  keyPoints: string[];
  /** The language the summary was written in. */
  language: 'en' | 'ko';
  /** Specific factual claims that can be cited in canonical pages. */
  factualClaims?: Array<{
    claim: string;
    evidence: string;
  }>;
  /** Temporal references found in the source (dates, deadlines, periods). */
  temporalReferences?: Array<{
    reference: string;
    context: string;
  }>;
  /** Key decisions or conclusions stated in the source. */
  keyDecisions?: string[];
  /** Open questions or information gaps identified in the source. */
  openQuestions?: string[];
}

/* ------------------------------------------------------------------ */
/*  Prompt builder                                                     */
/* ------------------------------------------------------------------ */

export function summarizeSourcePrompt(
  input: SummarizeSourceInput,
): LLMMessage[] {
  const sentenceGuidance = input.maxSentences
    ? `Keep the summary to ${input.maxSentences} sentences or fewer.`
    : 'Keep the summary to 3–5 sentences.';

  const languageLabel = input.language === 'ko' ? 'Korean' : 'English';

  const workspaceCtx = input.workspaceContext
    ? `\n\nWorkspace context and terminology:\n${input.workspaceContext}`
    : '';

  const titleInfo = input.sourceTitle
    ? `\nSource title: ${input.sourceTitle}`
    : '';

  const classificationCtx = input.classificationHint
    ? `\nUpstream classification: content type "${input.classificationHint.contentType ?? 'unknown'}", section "${input.classificationHint.section ?? 'unknown'}".`
    : '';

  const systemMessage: LLMMessage = {
    role: 'system',
    content: `You are the Summarization Engine of Kaibase, an AI knowledge operating system.

Your role in the pipeline: You receive source documents that users have connected from their folders, cloud storage, or communication channels. Your summary becomes a permanent part of the source's metadata — it powers search results, preview cards, page-creation input, and the review queue. A good summary preserves every piece of knowledge that matters; a bad one loses information that can never be recovered downstream.

──────────────────────────────────────────
TASK: Extract structured knowledge from the source
──────────────────────────────────────────

Produce ALL of the following:

1. summary — A dense, factual paragraph capturing the essential content.
   • ${sentenceGuidance}
   • Lead with the most important finding, decision, or conclusion.
   • Include specific names, numbers, dates, and outcomes — never generalize when the source is specific.
   • Write for someone who will NOT read the original source — your summary is their only view.

2. keyPoints — 3 to 7 bullet points, each one a self-contained fact or insight.
   • Each point should be useful on its own, without needing the summary for context.
   • Order by importance, not by position in the source.
   • Prefer actionable information (decisions, deadlines, assignments) over background.

3. factualClaims — Specific, verifiable statements from the source.
   • Each claim has a "claim" (the statement) and "evidence" (the verbatim or near-verbatim phrase from the source that supports it).
   • These become citation candidates when canonical pages are built. Precision matters.
   • Include 3–10 claims. Prioritize:
     (a) Quantitative facts (metrics, dates, budgets, versions)
     (b) Decisions and their rationale
     (c) Attributions (who said/did what)
     (d) Technical specifications or requirements
   • Do NOT fabricate claims. If the source is vague, extract fewer claims rather than inventing precision.

4. temporalReferences — Dates, deadlines, time periods, and milestones mentioned in the source.
   • Format: { "reference": "2026-Q2 launch target", "context": "Product team committed to Q2 launch for v3.0 during the March planning meeting" }
   • Normalize dates to ISO format when possible (YYYY-MM-DD).
   • Include relative time references with their anchor context (e.g., "next sprint" → include what date/period this refers to if determinable).
   • Return an empty array if no temporal references are found.

5. keyDecisions — Decisions, conclusions, or commitments stated in the source.
   • Include only decisions that are explicitly stated, not inferred.
   • Each entry is a single sentence capturing what was decided and by whom (if stated).
   • Return an empty array if no decisions are found.

6. openQuestions — Questions raised but not answered, information gaps, or unresolved issues.
   • These signal to the knowledge base what is NOT yet known.
   • Return an empty array if none are found.

──────────────────────────────────────────
CONSTRAINTS
──────────────────────────────────────────
- Write ALL output in ${languageLabel}.
- Preserve the source's specificity: if it says "47% increase" do not write "significant increase."
- Preserve proper nouns exactly as written in the source. Do not translate names, product names, or technical terms.
- Never add information not present in the source. If the source is short or low-content, produce a shorter summary — do not pad.
- When the source is ambiguous or contradictory, note the ambiguity in openQuestions rather than picking a side.${workspaceCtx}${classificationCtx}

Respond ONLY with valid JSON matching this schema:
{
  "summary": string,
  "keyPoints": string[],
  "language": "${input.language}",
  "factualClaims": [{ "claim": string, "evidence": string }],
  "temporalReferences": [{ "reference": string, "context": string }],
  "keyDecisions": string[],
  "openQuestions": string[]
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
