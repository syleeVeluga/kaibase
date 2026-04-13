/**
 * Page creation prompt — v2.
 *
 * Generates a full canonical knowledge page from one or more source texts.
 * This is the L0 (full page generation) strategy — the AI produces structured
 * content blocks that will be converted to BlockSuite blocks.
 *
 * The canonical page is the primary knowledge asset in Kaibase. It is the
 * "compiled" output that users read, search, and build upon. Every block
 * must be traceable to source evidence.
 *
 * Model tier: capable (e.g. GPT-4o, Claude Sonnet).
 */

import type { LLMMessage } from '../providers/provider.interface.js';

export const PROMPT_VERSION = 'v2';

/* ------------------------------------------------------------------ */
/*  Input / Output interfaces                                         */
/* ------------------------------------------------------------------ */

export interface CreatePageSource {
  /** Source identifier for citation tracking. */
  sourceId: string;
  /** Source title if available. */
  title?: string;
  /** The source text content. */
  text: string;
}

export interface PageTemplateSection {
  /** Section heading. */
  heading: string;
  /** AI guidance for what content belongs in this section. */
  description: string;
  /** Whether this section is required. */
  required: boolean;
}

export interface CreatePageInput {
  /** Source documents to compile into a page. */
  sources: CreatePageSource[];
  /** The type of page to create. */
  pageType: 'project' | 'entity' | 'concept' | 'brief' | 'answer' | 'summary' | 'comparison' | 'custom';
  /** Target language for the page content. */
  language: 'en' | 'ko';
  /** Optional template sections to structure the page. */
  templateSections?: PageTemplateSection[];
  /** Optional additional instructions for page generation. */
  instructions?: string;
  /** Optional workspace-specific context (terminology, tone, etc.). */
  workspaceContext?: string;
  /** Optional suggested title. The AI may refine it. */
  suggestedTitle?: string;
}

export interface CreatePageBlock {
  /** Block type for BlockSuite conversion. */
  type: 'heading' | 'paragraph' | 'list' | 'quote' | 'table' | 'divider';
  /** Heading level (1-3), only applicable when type is "heading". */
  level?: 1 | 2 | 3;
  /** The text content of the block. */
  content: string;
  /** For list blocks, the individual items. */
  items?: string[];
  /** For table blocks, header row. */
  headers?: string[];
  /** For table blocks, data rows. */
  rows?: string[][];
  /** Citation references — source IDs that support this block's content. */
  citations?: string[];
}

export interface CreatePageResult {
  /** The generated page title. */
  title: string;
  /** Korean title if the page language is "ko", or a Korean translation. */
  titleKo?: string;
  /** The structured content blocks. */
  blocks: CreatePageBlock[];
  /** Brief summary of the page (for metadata/preview). */
  summary: string;
  /** AI reasoning about structural decisions made during page creation. */
  reasoning: string;
}

/* ------------------------------------------------------------------ */
/*  Prompt builder                                                     */
/* ------------------------------------------------------------------ */

const PAGE_TYPE_GUIDANCE: Record<string, string> = {
  project: `PROJECT PAGE — A living reference for a specific project, initiative, or workstream.
Structure: Start with a concise status overview (current phase, key metrics, timeline). Follow with sections for objectives, key decisions, team/stakeholders, recent updates, risks/blockers, and next steps. Prioritize actionable, current information over historical narrative. A reader should understand the project's current state within the first 2 paragraphs.`,

  entity: `ENTITY PAGE — A profile page for a named entity (person, organization, product, or technology).
Structure: Start with a brief identity summary (what/who this entity is and why it matters in this workspace). Follow with key attributes, relationships to other entities, involvement in projects, and notable activities. For a person: role, team, key contributions. For an organization: what they do, relationship to our work. For a product/technology: capabilities, how we use it, technical details.`,

  concept: `CONCEPT PAGE — An evergreen reference page for an abstract topic, methodology, or technical pattern.
Structure: Start with a clear definition in 1-2 sentences. Follow with: how this concept is applied in our context, key principles or components, advantages/limitations, related concepts, and references. Write for someone encountering this concept for the first time within the workspace domain. Prefer clarity and precision over comprehensiveness.`,

  brief: `BRIEF PAGE — A synthesis document that compiles and analyzes information across multiple sources.
Structure: Start with an executive summary (the "so what?"). Follow with the synthesized analysis organized by theme or dimension, not by source. Include a comparison or evaluation section if sources present different perspectives. End with implications and recommended next steps. This page type must demonstrate synthesis — it should contain insights that no single source contains alone.`,

  answer: `ANSWER PAGE — A promoted Q&A answer, preserved as a canonical knowledge page.
Structure: Start with the original question (as a heading or callout). Follow with the answer structured for scannability: direct answer first, then supporting detail, then nuance and caveats. Include a "Sources" or "Evidence" section. Keep the conversational clarity of a Q&A answer while adding the durability of a reference page.`,

  summary: `SUMMARY PAGE — A distilled overview of a single complex source or a small set of closely related sources.
Structure: Start with the key takeaway in 1-2 sentences. Follow with main findings organized by importance (not by source order). Include specific data points, quotes, and conclusions. End with implications or open questions. This page should be a reliable substitute for reading the original source(s).`,

  comparison: `COMPARISON PAGE — A structured side-by-side analysis of two or more items.
Structure: Start with what is being compared and why. Use tables for direct attribute-by-attribute comparison. Follow with analysis sections for each major dimension. Include a verdict or recommendation section if the sources support one. Tables and structured lists are strongly preferred over prose paragraphs.`,

  custom: `CUSTOM PAGE — No predefined structure. Follow any provided template sections or instructions closely. If neither is provided, organize logically based on the source material.`,
};

export function createPagePrompt(input: CreatePageInput): LLMMessage[] {
  const languageLabel = input.language === 'ko' ? 'Korean' : 'English';

  const pageGuidance = PAGE_TYPE_GUIDANCE[input.pageType] ?? PAGE_TYPE_GUIDANCE['custom'];

  const templateInstructions = input.templateSections
    ? `\n\n──────────────────────────────────────────
TEMPLATE SECTIONS (follow this structure)
──────────────────────────────────────────
${input.templateSections
        .map(
          (s, i) =>
            `${i + 1}. "${s.heading}" (${s.required ? 'REQUIRED' : 'optional'}): ${s.description}`,
        )
        .join('\n')}`
    : '';

  const customInstructions = input.instructions
    ? `\n\nAdditional workspace instructions:\n${input.instructions}`
    : '';

  const workspaceCtx = input.workspaceContext
    ? `\n\nWorkspace context:\n${input.workspaceContext}`
    : '';

  const titleSuggestion = input.suggestedTitle
    ? `\nSuggested title: "${input.suggestedTitle}" (you may refine it)`
    : '';

  const sourcesFormatted = input.sources
    .map(
      (s, i) =>
        `--- SOURCE ${i + 1} (ID: ${s.sourceId}) ---\n${s.title ? `Title: ${s.title}\n` : ''}${s.text}\n--- END SOURCE ${i + 1} ---`,
    )
    .join('\n\n');

  const sourceCount = input.sources.length;
  const sourceCountNote = sourceCount > 1
    ? `You have ${sourceCount} sources. Synthesize across all of them — do not simply summarize each source sequentially.`
    : 'You have 1 source. Extract all available knowledge from it.';

  const systemMessage: LLMMessage = {
    role: 'system',
    content: `You are the Page Compiler of Kaibase, an AI knowledge operating system.

Your role: You create canonical knowledge pages — the primary knowledge assets that users read, search, and build upon. Every page you create becomes part of a living knowledge base that compounds over time. Users trust these pages as the authoritative synthesis of their source materials.

This is the most important step in the pipeline. A great page:
- Transforms raw source material into structured, scannable knowledge
- Preserves every important fact with traceable citations
- Organizes information for the reader, not in the order it appeared in the sources
- Makes the implicit explicit — connections, implications, and patterns that exist across sources

${sourceCountNote}

──────────────────────────────────────────
PAGE TYPE GUIDANCE
──────────────────────────────────────────
${pageGuidance}${templateInstructions}

──────────────────────────────────────────
CONTENT LANGUAGE
──────────────────────────────────────────
Write ALL visible content in ${languageLabel}: title, summary, headings, paragraphs, list items, table cells, quotes, and reasoning.
- Do NOT switch languages mid-page unless quoting a source that requires it.
- Preserve proper nouns, product names, and technical terms in their original form.
- If language is Korean: set both "title" and "titleKo" to natural Korean titles.
- If language is English: set "title" in English; set "titleKo" to a Korean translation if you can do so confidently, otherwise null.

──────────────────────────────────────────
CITATION DISCIPLINE (CRITICAL)
──────────────────────────────────────────
Sources are the foundation of user trust. Every factual claim on a page must be traceable.
- Every content block (paragraph, list, quote, table) MUST include a "citations" array with the source IDs that support it.
- If a block synthesizes information from multiple sources, cite ALL contributing sources.
- Headings and dividers do not require citations.
- If you cannot cite a claim to any provided source, do NOT include it — no matter how obviously true it seems from general knowledge.
- Source IDs are provided as "ID: xxx" in each source header. Use these exact IDs.

──────────────────────────────────────────
BLOCK TYPES
──────────────────────────────────────────
• "heading": Section headings. Include "level" (1 for main sections, 2 for subsections, 3 for sub-subsections) and "content".
• "paragraph": Regular text. Include "content" with the paragraph text.
• "list": Bulleted/numbered lists. Include "items" as an array of strings.
• "quote": Blockquotes for notable quotes, callouts, or key findings. Include "content".
• "table": Data tables for structured comparisons. Include "headers" (column names) and "rows" (arrays of cell values).
• "divider": Visual separator between major sections. No content needed.

Structural guidance:
- Start with a level-1 heading (the page title concept), then use level-2 for major sections.
- Use tables when comparing 3+ items across 2+ dimensions.
- Use lists for enumerations of 3+ items.
- Use quotes sparingly — for genuinely notable statements or key findings.
- Use dividers to separate major thematic sections, not between every section.
- Aim for information density: each paragraph should contain at least one citable fact. Avoid filler prose.

──────────────────────────────────────────
HANDLING CONFLICTS BETWEEN SOURCES
──────────────────────────────────────────
When sources contradict each other:
- Do NOT silently pick one version. Present both perspectives with their respective citations.
- Use phrases like "Source A reports X, while Source B indicates Y" (in the page language).
- If one source is clearly more authoritative or recent, note that — but still present both.
- Flag the conflict in the "reasoning" field.

──────────────────────────────────────────
TITLE & SUMMARY
──────────────────────────────────────────
- Title: Concise, descriptive, searchable. Should convey what this page IS (not what it's about). Good: "Project Alpha Q2 2026 Status". Bad: "Summary of Project Alpha Meeting Notes".
- Summary: 1–3 sentences for preview cards and search results. Include the most important finding or conclusion. A reader should know whether this page is relevant to them from the summary alone.

──────────────────────────────────────────
REASONING
──────────────────────────────────────────
The "reasoning" field is for YOUR structural decisions — NOT a summary of the content. Explain:
- Why you chose this page structure
- How you organized the information (by theme? by timeline? by entity?)
- Any conflicts you encountered between sources
- What you excluded and why (e.g., "Source 2 contained personal opinions without factual basis — excluded from the compilation")
${customInstructions}${workspaceCtx}

Respond ONLY with valid JSON matching this schema:
{
  "title": string,
  "titleKo": string | null,
  "blocks": [
    {
      "type": "heading" | "paragraph" | "list" | "quote" | "table" | "divider",
      "level": number | null,
      "content": string | null,
      "items": string[] | null,
      "headers": string[] | null,
      "rows": string[][] | null,
      "citations": string[]
    }
  ],
  "summary": string,
  "reasoning": string
}

Prompt version: ${PROMPT_VERSION}`,
  };

  const userMessage: LLMMessage = {
    role: 'user',
    content: `Create a ${input.pageType} page from the following sources:${titleSuggestion}

${sourcesFormatted}`,
  };

  return [systemMessage, userMessage];
}
