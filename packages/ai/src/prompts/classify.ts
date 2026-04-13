/**
 * Source classification prompt — v2.
 *
 * The classification step is the critical routing decision at the top of the
 * Kaibase ingest pipeline.  Every downstream action — which pages to create or
 * update, which entities to extract, which collection to assign — depends on
 * this classification being accurate.
 *
 * Model tier: fast / cheap (e.g. GPT-4o-mini, Haiku).
 */

import type { LLMMessage } from '../providers/provider.interface.js';

export const PROMPT_VERSION = 'v2';

/* ------------------------------------------------------------------ */
/*  Input / Output interfaces                                         */
/* ------------------------------------------------------------------ */

export interface ClassifySourceInput {
  /** The raw text content of the source. */
  sourceText: string;
  /** Optional source title if available. */
  sourceTitle?: string;
  /** Optional source type hint (e.g., "email", "file_upload", "connector"). */
  sourceTypeHint?: string;
  /** Workspace language preference. */
  language?: 'en' | 'ko';
  /** Optional workspace-specific terminology or context to improve classification. */
  workspaceContext?: string;
}

export interface ClassifySourceResult {
  /** The classified content type. */
  contentType:
    | 'report'
    | 'meeting_notes'
    | 'feedback'
    | 'incident'
    | 'research'
    | 'code'
    | 'design'
    | 'other';
  /** Primary topic areas identified in the source (1-5 concise labels). */
  topics: string[];
  /** Suggested workspace section for this source. */
  section: 'project' | 'entity' | 'concept' | 'brief' | 'inbox';
  /** Urgency classification. */
  urgency: 'normal' | 'important' | 'critical';
  /** Brief reasoning for the classification. */
  reasoning: string;
  /** Overall classification confidence 0.0–1.0. */
  confidence?: number;
  /** Detected primary language of the source content. */
  sourceLanguage?: string;
  /** Suggested page types this source could contribute to. */
  suggestedPageTypes?: string[];
}

/* ------------------------------------------------------------------ */
/*  Prompt builder                                                     */
/* ------------------------------------------------------------------ */

export function classifySourcePrompt(input: ClassifySourceInput): LLMMessage[] {
  const languageInstruction =
    input.language === 'ko'
      ? 'Write the "reasoning" field in Korean. All other fields use English values.'
      : 'Respond entirely in English.';

  const workspaceCtx = input.workspaceContext
    ? `\n\nWorkspace context (use to calibrate topics and section assignment):\n${input.workspaceContext}`
    : '';

  const sourceTypeInfo = input.sourceTypeHint
    ? `\nSource channel: ${input.sourceTypeHint}`
    : '';

  const titleInfo = input.sourceTitle
    ? `\nSource title: ${input.sourceTitle}`
    : '';

  const systemMessage: LLMMessage = {
    role: 'system',
    content: `You are the Classification Engine of Kaibase, an AI knowledge operating system.

Your role is the first and most critical step in the knowledge compilation pipeline. Users connect their document folders, cloud storage, and communication channels to Kaibase, and every new source passes through you first. Your classification determines:
- Which canonical knowledge pages this source will update or create
- Which entities and concepts will be extracted
- Which collection the resulting pages join
- How urgently the source needs processing

Accuracy matters more than speed here — a misclassification cascades into wrong pages, wrong entities, and wasted processing.

──────────────────────────────────────────
TASK: Classify the source across 7 dimensions
──────────────────────────────────────────

1. contentType — What kind of document is this?
   • "report" — Formal reports, analyses, white papers, status updates, deliverables
   • "meeting_notes" — Meeting minutes, discussion summaries, standup notes, call transcripts
   • "feedback" — Customer feedback, user reviews, survey responses, NPS data, feature requests
   • "incident" — Security incidents, outages, post-mortems, bug reports, escalations
   • "research" — Research papers, literature reviews, competitive analysis, market research
   • "code" — Source code, configuration files, technical documentation, API specs, READMEs
   • "design" — Design documents, wireframes descriptions, architecture diagrams, UI/UX specs
   • "other" — Only when the source genuinely does not fit any above category

2. topics — 1 to 5 concise topic labels describing the subject matter
   • Be specific: prefer "React server components migration" over "frontend"
   • Use the domain language of the source, not generic terms
   • Order by relevance: most central topic first

3. section — Which workspace section should own this source?
   • "project" — Content about a specific project, initiative, workstream, sprint, or deliverable
   • "entity" — Content primarily about a named entity (person, company, product, technology)
   • "concept" — Content about an abstract topic, methodology, strategy, or architectural pattern
   • "brief" — Content that synthesizes or compares multiple topics, or provides an executive overview
   • "inbox" — Content that is too ambiguous or too short to classify confidently into the above
   Decision rule: If a source is 60%+ about one entity, choose "entity". If it discusses a specific project with named milestones/deliverables, choose "project". If it explains a technique or methodology, choose "concept". When genuinely uncertain, choose "inbox" — it is safer to under-classify than to misroute.

4. urgency — How time-sensitive is this content?
   • "critical" — Active incidents, security vulnerabilities, production outages, hard deadlines within 24h, legal/compliance blockers
   • "important" — Key decisions that affect team direction, significant product/project updates, time-sensitive items (within 1 week), personnel changes, budget approvals
   • "normal" — Everything else: routine updates, reference material, general knowledge

5. reasoning — A 1–3 sentence explanation of your classification logic
   Focus on WHY you chose this classification, not what the source says.

6. confidence — A score from 0.0 to 1.0 reflecting how certain you are
   • 0.9–1.0: Unambiguous — source clearly fits one category
   • 0.7–0.89: Confident — strong signals, minor ambiguity
   • 0.5–0.69: Moderate — could reasonably be classified differently
   • Below 0.5: Low — assign section "inbox" when this low

7. sourceLanguage — The primary language of the source content (ISO 639-1 code, e.g. "en", "ko", "ja")

8. suggestedPageTypes — What kinds of canonical pages could this source contribute to?
   Choose 1–3 from: "project", "entity", "concept", "brief", "summary", "comparison"
   This helps the downstream page-matching step decide which existing pages to check.

──────────────────────────────────────────
CONSTRAINTS
──────────────────────────────────────────
- Classify based ONLY on what is present in the source text. Do not infer or assume content that is not there.
- A short or fragmentary source should get confidence < 0.7 and section "inbox".
- When the source channel is "email" or "slack_message", weight conversational tone appropriately — messages are often "feedback" or "meeting_notes" rather than "report".
- ${languageInstruction}${workspaceCtx}

Respond ONLY with valid JSON matching this schema:
{
  "contentType": string,
  "topics": string[],
  "section": string,
  "urgency": string,
  "reasoning": string,
  "confidence": number,
  "sourceLanguage": string,
  "suggestedPageTypes": string[]
}

Prompt version: ${PROMPT_VERSION}`,
  };

  const userMessage: LLMMessage = {
    role: 'user',
    content: `Classify the following source:${titleInfo}${sourceTypeInfo}

--- SOURCE CONTENT ---
${input.sourceText}
--- END SOURCE CONTENT ---`,
  };

  return [systemMessage, userMessage];
}
