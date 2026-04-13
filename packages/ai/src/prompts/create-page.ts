/**
 * Page creation prompt.
 *
 * Generates a full canonical knowledge page from one or more source texts.
 * This is the L0 (full page generation) strategy — the AI produces structured
 * content blocks that will be converted to BlockSuite blocks.
 *
 * Uses the capable model tier (e.g., GPT-4o, Claude Sonnet).
 */

import type { LLMMessage } from '../providers/provider.interface.js';

export const PROMPT_VERSION = 'v1';

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

/**
 * Build the prompt messages for page creation.
 *
 * @param input - The page creation input parameters.
 * @returns LLMMessage array ready to send to a provider.
 */
export function createPagePrompt(input: CreatePageInput): LLMMessage[] {
  const languageLabel = input.language === 'ko' ? 'Korean' : 'English';

  const templateInstructions = input.templateSections
    ? `\n\nPage template — organize content using these sections:\n${input.templateSections
        .map(
          (s, i) =>
            `${i + 1}. "${s.heading}" (${s.required ? 'required' : 'optional'}): ${s.description}`,
        )
        .join('\n')}`
    : '';

  const customInstructions = input.instructions
    ? `\n\nAdditional instructions:\n${input.instructions}`
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

  const systemMessage: LLMMessage = {
    role: 'system',
    content: `You are Kaibase, an AI knowledge compiler. Your task is to create a canonical knowledge page from one or more source documents.

Page type: ${input.pageType}
Content language: ${languageLabel}

Page creation guidelines:
- Synthesize information from ALL provided sources into a cohesive, well-structured page.
- Every factual claim must be backed by at least one source. Include source IDs in the "citations" array of each block.
- Use clear headings to organize content logically.
- Prefer structured formats (lists, tables) for comparisons and enumerations.
- Write in a neutral, informative tone appropriate for a team knowledge base.
- Write all visible prose fields entirely in ${languageLabel}. This includes title, titleKo when populated, summary, reasoning, paragraph content, list items, headings, quotes, and table cells.
- Do not switch languages mid-page unless a quoted source requires it.
- If Content language is Korean, set both "title" and "titleKo" to natural Korean titles.
- If Content language is English, set "title" in English and set "titleKo" to a Korean translation when you can do so confidently; otherwise use null.
- Include a brief summary suitable for preview cards and search results.
- Provide reasoning about why you structured the page this way.${templateInstructions}${customInstructions}${workspaceCtx}

Block types available:
- "heading": Section headings. Include "level" (1, 2, or 3) and "content".
- "paragraph": Regular text paragraphs. Include "content".
- "list": Bulleted lists. Include "items" as an array of strings.
- "quote": Blockquotes for notable quotes or callouts. Include "content".
- "table": Data tables. Include "headers" and "rows".
- "divider": Visual separator. No content needed.

All blocks except "divider" should include a "citations" array with source IDs that support the content.

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
