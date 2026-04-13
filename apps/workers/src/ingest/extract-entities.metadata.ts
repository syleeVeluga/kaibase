import type { ExtractedRelation, LLMTokenUsage } from '@kaibase/ai';
import type { Language } from '@kaibase/shared';

export interface SourceEntityTriplesMetadata {
  version: 'v1';
  promptVersion: string;
  model: string;
  language: Language;
  generatedAt: string;
  tokenUsage: {
    input: number;
    output: number;
  };
  triples: ExtractedRelation[];
}

export function buildEntityTriplesMetadata(params: {
  promptVersion: string;
  model: string;
  language: Language;
  generatedAt?: string;
  tokenUsage: LLMTokenUsage;
  triples: ExtractedRelation[];
}): SourceEntityTriplesMetadata {
  return {
    version: 'v1',
    promptVersion: params.promptVersion,
    model: params.model,
    language: params.language,
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    tokenUsage: {
      input: params.tokenUsage.input,
      output: params.tokenUsage.output,
    },
    triples: params.triples,
  };
}

export function mergeSourceMetadataWithEntityTriples(
  existingMetadata: Record<string, unknown> | null | undefined,
  entityTriples: SourceEntityTriplesMetadata,
): Record<string, unknown> {
  return {
    ...(existingMetadata ?? {}),
    entityTriples,
  };
}