/**
 * Source classification prompt.
 *
 * Classifies a raw source into content type, topic areas, section assignment,
 * and urgency level. Uses the fast/cheap model tier (e.g., GPT-4o-mini, Haiku).
 */

import type { LLMMessage } from '../providers/provider.interface.js';

export const PROMPT_VERSION = 'v1';

export interface ClassifySourceInput {
  /** The raw text content of the source. */
  sourceText: string;
  /** Optional source title if available. */
  sourceTitle?: string;
  /** Optional source type hint (e.g., "email", "file_upload"). */
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
  /** Primary topic areas identified in the source. */
  topics: string[];
  /** Suggested workspace section for this source. */
  section: 'project' | 'entity' | 'concept' | 'brief' | 'inbox';
  /** Urgency classification. */
  urgency: 'normal' | 'important' | 'critical';
  /** Brief reasoning for the classification. */
  reasoning: string;
}

/**
 * Build the prompt messages for source classification.
 *
 * @param input - The classification input parameters.
 * @returns LLMMessage array ready to send to a provider.
 */
export function classifySourcePrompt(input: ClassifySourceInput): LLMMessage[] {
  const languageInstruction =
    input.language === 'ko'
      ? 'Respond in Korean for the reasoning field. All other fields use English values.'
      : 'Respond in English.';

  const workspaceCtx = input.workspaceContext
    ? `\n\nWorkspace context:\n${input.workspaceContext}`
    : '';

  const sourceTypeInfo = input.sourceTypeHint
    ? `\nSource type hint: ${input.sourceTypeHint}`
    : '';

  const titleInfo = input.sourceTitle
    ? `\nSource title: ${input.sourceTitle}`
    : '';

  const systemMessage: LLMMessage = {
    role: 'system',
    content: `You are Kaibase, an AI knowledge compiler. Your task is to classify a source document.

Classify the source into the following dimensions:
1. contentType: One of "report", "meeting_notes", "feedback", "incident", "research", "code", "design", "other"
2. topics: An array of 1-5 topic strings that describe the main subjects covered
3. section: Which workspace section this belongs to — "project", "entity", "concept", "brief", or "inbox"
4. urgency: "normal", "important", or "critical"
5. reasoning: A brief explanation of why you chose this classification

Classification guidelines:
- "project" section: Content about specific projects, initiatives, or workstreams
- "entity" section: Content primarily about a person, organization, product, or technology
- "concept" section: Content about abstract topics, methodologies, or technical concepts
- "brief" section: Content that synthesizes or summarizes multiple topics
- "inbox" section: Content that does not clearly fit other sections

Urgency guidelines:
- "critical": Security incidents, outages, urgent deadlines, blockers
- "important": Key decisions, significant updates, time-sensitive items
- "normal": Everything else

${languageInstruction}${workspaceCtx}

Respond ONLY with valid JSON matching this schema:
{
  "contentType": string,
  "topics": string[],
  "section": string,
  "urgency": string,
  "reasoning": string
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
