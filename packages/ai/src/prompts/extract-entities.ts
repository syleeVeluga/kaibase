/**
 * Entity, concept, and relation extraction prompt — v3.
 *
 * Extracts named entities (people, organizations, products, technologies,
 * locations, events), abstract concepts, and source-local relation triples.
 * The extracted data feeds entity/concept DB records, the knowledge graph,
 * and page-matching for the compilation step.
 *
 * Model tier: fast / cheap (e.g. GPT-4o-mini, Haiku).
 */

import type { LLMMessage } from '../providers/provider.interface.js';

export const PROMPT_VERSION = 'v3';

/* ------------------------------------------------------------------ */
/*  Input / Output interfaces                                         */
/* ------------------------------------------------------------------ */

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
  /** The entity name as it appears in the source (canonical form). */
  name: string;
  /** Entity type classification. */
  type: 'person' | 'organization' | 'product' | 'technology' | 'location' | 'event';
  /** Alternative names or spellings found in the source. */
  aliases: string[];
  /** Brief description based on context in the source. */
  description: string;
  /** If this matches a known entity, the matched name. */
  matchedKnownEntity?: string;
  /** Confidence that this entity is correctly identified and typed (0.0–1.0). */
  confidence?: number;
  /** The role or relevance of this entity in the source context. */
  contextRole?: string;
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

/* ------------------------------------------------------------------ */
/*  Prompt builder                                                     */
/* ------------------------------------------------------------------ */

export function extractEntitiesPrompt(
  input: ExtractEntitiesInput,
): LLMMessage[] {
  const languageInstruction =
    input.language === 'ko'
      ? 'Write descriptions and contextRole in Korean. Entity and concept names should be in their original language as they appear in the source.'
      : 'Write descriptions and contextRole in English.';

  const workspaceCtx = input.workspaceContext
    ? `\n\nWorkspace context:\n${input.workspaceContext}`
    : '';

  const knownEntitiesCtx =
    input.knownEntities && input.knownEntities.length > 0
      ? `\n\n──────────────────────────────────────────
KNOWN ENTITIES IN THIS WORKSPACE
──────────────────────────────────────────
Match extracted entities against these when names or aliases overlap.
When a match is found, set matchedKnownEntity to the known entity's name.
When uncertain, leave matchedKnownEntity as null — false matches are worse than missed matches.

${JSON.stringify(input.knownEntities, null, 2)}`
      : '';

  const titleInfo = input.sourceTitle
    ? `\nSource title: ${input.sourceTitle}`
    : '';

  const systemMessage: LLMMessage = {
    role: 'system',
    content: `You are the Entity & Relation Extraction Engine of Kaibase, an AI knowledge operating system.

Your role in the pipeline: After a source is classified and summarized, you extract the structural knowledge — the WHO, WHAT, WHERE, and HOW things relate. Your output directly populates the workspace's entity registry, concept index, and knowledge graph. Precision is paramount: a false entity clutters the graph; a missed entity creates knowledge gaps that compound over time.

──────────────────────────────────────────
TASK 1: Extract Named Entities
──────────────────────────────────────────

For each entity, provide:
• name — The most complete, canonical form as it appears in the source. If someone is referred to as both "Dr. Kim" and "Sunghee Kim", use "Sunghee Kim" as the name and "Dr. Kim" as an alias.
• type — One of:
  - "person": Named individuals. NOT job titles, roles, or unnamed groups.
  - "organization": Companies, teams, departments, agencies, institutions.
  - "product": Named products, services, tools, platforms, applications.
  - "technology": Programming languages, frameworks, protocols, standards, algorithms.
  - "location": Physical places — cities, offices, regions, countries.
  - "event": Named events, conferences, incidents, milestones with specific identifiers.
• aliases — All alternative names, abbreviations, or references found in the source.
• description — 1–2 sentences explaining this entity's role IN THIS SOURCE (not general knowledge). What did they do? What is their relevance?
• confidence — How certain you are (0.0–1.0):
  - 0.9–1.0: Explicitly named, unambiguous type
  - 0.7–0.89: Named but type could be debated (e.g., is "Kubernetes" a product or technology?)
  - 0.5–0.69: Implied or partially named (e.g., "the client" when context makes identity clear)
  - Below 0.5: Do not extract — too uncertain.
• contextRole — The entity's function in this source (e.g., "project lead", "vendor under evaluation", "technology being deprecated", "meeting organizer").

ENTITY EXTRACTION RULES:
- Only extract entities that are explicitly named or clearly identifiable in the source.
- Do NOT extract generic roles without names (e.g., "the team lead" without a name is NOT an entity; "Sarah Chen, team lead" IS).
- Do NOT extract common nouns as entities (e.g., "database", "server" are not entities unless they are specifically named products).
- When the same entity is referred to differently (acronyms, first name vs full name, Korean vs English name), consolidate into one entity with aliases.
- If the source text is in Korean and an entity has both Korean and English names (e.g., "삼성전자" and "Samsung Electronics"), use the more complete form as name and the other as alias.

──────────────────────────────────────────
TASK 2: Extract Concepts
──────────────────────────────────────────

Concepts are abstract topics, methodologies, strategies, or patterns that are substantively discussed (not merely mentioned) in the source.

For each concept, provide:
• name — A concise, reusable label (e.g., "microservices architecture", "zero-trust security", "OKR methodology").
• description — 1–2 sentences explaining how this concept is discussed or applied in the source.
• relatedConcepts — Other concepts that co-occur or are logically connected in this source.

CONCEPT EXTRACTION RULES:
- Extract only concepts that receive substantive treatment — at least a paragraph of discussion or a key role in the source's argument.
- Do NOT extract trivial or ubiquitous terms (e.g., "software development", "communication").
- Limit to 2–5 most significant concepts. Quality over quantity.
- Prefer specific, searchable terms over vague ones.

──────────────────────────────────────────
TASK 3: Extract Relation Triples
──────────────────────────────────────────

Relations capture factual connections between entities and concepts as (subject, predicate, object) triples.

• subject / object — Each has:
  - text: The entity or concept name as it appears in the source.
  - type: Entity type, "concept", "value" (for quantities/dates), or "unknown".
  - matchedKnownEntity: If it matches a known workspace entity, that entity's name; otherwise null.
• predicate — A stable snake_case English identifier describing the relationship.
  Common predicates: "leads", "belongs_to", "uses", "develops", "acquired", "competes_with", "depends_on", "replaced_by", "scheduled_for", "budgeted_at", "authored", "located_in", "reports_to", "founded", "invested_in".
  Create domain-specific predicates when needed, but prefer reusable ones.
• confidence — 0.0 to 1.0 reflecting how directly the source supports this relation.
  - 0.9–1.0: Explicitly stated (e.g., "Alice leads Project Alpha")
  - 0.7–0.89: Strongly implied by context
  - 0.5–0.69: Reasonable inference from surrounding text
  - Below 0.5: Do not extract.
• evidence — A short verbatim snippet (under 150 chars) from the source that supports the triple. Include charStart/charEnd offsets on a best-effort basis.

RELATION EXTRACTION RULES:
- Extract only relations that are directly supported by the source text.
- Every relation must have evidence. If you cannot point to supporting text, do not extract it.
- Do NOT create relations from general world knowledge — only from what THIS source says.
- Keep relations source-local. Do not try to infer connections to pages or entities outside this source.
- Prefer specific, attributable relations over vague associations.

──────────────────────────────────────────
CONSTRAINTS
──────────────────────────────────────────
- ${languageInstruction}
- When in doubt, omit rather than guess. The downstream pipeline can handle missing data; it cannot handle wrong data.
- Total extraction budget: aim for the most informative set, not the largest.${workspaceCtx}${knownEntitiesCtx}

Respond ONLY with valid JSON matching this schema:
{
  "entities": [
    {
      "name": string,
      "type": "person" | "organization" | "product" | "technology" | "location" | "event",
      "aliases": string[],
      "description": string,
      "matchedKnownEntity": string | null,
      "confidence": number,
      "contextRole": string
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
        "type": string | null,
        "matchedKnownEntity": string | null
      },
      "predicate": string,
      "object": {
        "text": string,
        "type": string | null,
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
