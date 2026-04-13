/**
 * Entity, concept, and relation extraction prompt.
 *
 * Extracts named entities (people, organizations, products, technologies,
 * locations, events), abstract concepts, and source-local relation triples
 * from source text. Uses the fast/cheap model tier.
 */

import type { LLMMessage } from '../providers/provider.interface.js';

export const PROMPT_VERSION = 'v2';

export interface ExtractEntitiesInput {
  /** The raw text content of the source. */
  sourceText: string;
  /** Optional source title. */
  sourceTitle?: string;
  /** Workspace language preference. */
  language?: 'en' | 'ko';
  /** Optional list of known entities in the workspace for matching. */
  knownEntities?: Array<{
    name: string;
    type: string;
    aliases?: string[];
  }>;
  /** Optional workspace context. */
  workspaceContext?: string;
}

export interface ExtractedEntity {
  /** The entity name as it appears in the source. */
  name: string;
  /** Entity type classification. */
  type: 'person' | 'organization' | 'product' | 'technology' | 'location' | 'event';
  /** Alternative names or spellings found in the source. */
  aliases: string[];
  /** Brief description based on context in the source. */
  description: string;
  /** If this matches a known entity, the matched name. */
  matchedKnownEntity?: string;
}

export interface ExtractedConcept {
  /** The concept name. */
  name: string;
  /** Brief description based on context in the source. */
  description: string;
  /** Related concepts mentioned in the same context. */
  relatedConcepts: string[];
}

export interface ExtractedRelationNode {
  /** Source-local text for the subject or object node. */
  text: string;
  /** Best-effort node type classification. */
  type?: ExtractedEntity['type'] | 'concept' | 'value' | 'unknown';
  /** Matching known entity name when grounding succeeds. */
  matchedKnownEntity?: string | null;
}

export interface ExtractedRelationEvidence {
  /** Short supporting snippet from the source. */
  snippet: string;
  /** Best-effort character offset for the start of the evidence span. */
  charStart?: number | null;
  /** Best-effort character offset for the end of the evidence span. */
  charEnd?: number | null;
}

export interface ExtractedRelation {
  /** Triple subject node. */
  subject: ExtractedRelationNode;
  /** Stable predicate identifier, preferably snake_case. */
  predicate: string;
  /** Triple object node. */
  object: ExtractedRelationNode;
  /** Confidence score from 0.0 to 1.0. */
  confidence: number;
  /** Optional supporting evidence for the triple. */
  evidence?: ExtractedRelationEvidence | null;
}

export interface ExtractEntitiesResult {
  entities: ExtractedEntity[];
  concepts: ExtractedConcept[];
  relations: ExtractedRelation[];
}

/**
 * Build the prompt messages for entity and concept extraction.
 *
 * @param input - The extraction input parameters.
 * @returns LLMMessage array ready to send to a provider.
 */
export function extractEntitiesPrompt(
  input: ExtractEntitiesInput,
): LLMMessage[] {
  const languageInstruction =
    input.language === 'ko'
      ? 'Write descriptions in Korean. Entity and concept names should be in their original language as they appear in the source.'
      : 'Write descriptions in English.';

  const workspaceCtx = input.workspaceContext
    ? `\n\nWorkspace context:\n${input.workspaceContext}`
    : '';

  const knownEntitiesCtx =
    input.knownEntities && input.knownEntities.length > 0
      ? `\n\nKnown entities in this workspace (match against these when possible):\n${JSON.stringify(input.knownEntities, null, 2)}`
      : '';

  const titleInfo = input.sourceTitle
    ? `\nSource title: ${input.sourceTitle}`
    : '';

  const systemMessage: LLMMessage = {
    role: 'system',
    content: `You are Kaibase, an AI knowledge compiler. Your task is to extract named entities, abstract concepts, and source-local relation triples from a source document.

Entity types:
- "person": Individual people (by name)
- "organization": Companies, teams, departments, institutions
- "product": Products, services, tools, platforms
- "technology": Programming languages, frameworks, protocols, standards
- "location": Physical locations, regions, offices
- "event": Named events, conferences, incidents, milestones

Concept types:
- Abstract topics, methodologies, strategies, architectural patterns, business concepts

Extraction guidelines:
- Only extract entities that are explicitly named in the source.
- Do not infer entities that are not mentioned.
- For each entity, note any aliases or alternative references in the source.
- For concepts, identify the 2-5 most significant abstract topics discussed.
- If known entities are provided, match extracted entities to them when the names or aliases overlap.
- Extract only relations that are directly supported by the source text.
- Express predicates as concise English snake_case identifiers such as "belongs_to", "uses", or "has_core_technology".
- Keep relations source-local. Do not try to resolve page links or canonical graph edges here.
- Include a short evidence snippet for each relation whenever possible.
- ${languageInstruction}${workspaceCtx}${knownEntitiesCtx}

Respond ONLY with valid JSON matching this schema:
{
  "entities": [
    {
      "name": string,
      "type": "person" | "organization" | "product" | "technology" | "location" | "event",
      "aliases": string[],
      "description": string,
      "matchedKnownEntity": string | null
    }
  ],
  "concepts": [
    {
      "name": string,
      "description": string,
      "relatedConcepts": string[]
    }
  ],
  "relations": [
    {
      "subject": {
        "text": string,
        "type": "person" | "organization" | "product" | "technology" | "location" | "event" | "concept" | "value" | "unknown" | null,
        "matchedKnownEntity": string | null
      },
      "predicate": string,
      "object": {
        "text": string,
        "type": "person" | "organization" | "product" | "technology" | "location" | "event" | "concept" | "value" | "unknown" | null,
        "matchedKnownEntity": string | null
      },
      "confidence": number,
      "evidence": {
        "snippet": string,
        "charStart": number | null,
        "charEnd": number | null
      } | null
    }
  ]
}

Prompt version: ${PROMPT_VERSION}`,
  };

  const userMessage: LLMMessage = {
    role: 'user',
    content: `Extract entities, concepts, and relation triples from the following source:${titleInfo}

--- SOURCE CONTENT ---
${input.sourceText}
--- END SOURCE CONTENT ---`,
  };

  return [systemMessage, userMessage];
}
