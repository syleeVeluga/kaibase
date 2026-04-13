import { describe, expect, it } from 'vitest';
import {
  buildEntityTriplesMetadata,
  mergeSourceMetadataWithEntityTriples,
} from './extract-entities.metadata.js';

describe('extract-entities metadata helpers', () => {
  it('builds source-local entity triple metadata', () => {
    const metadata = buildEntityTriplesMetadata({
      promptVersion: 'v2',
      model: 'gpt-5.4-nano',
      language: 'ko',
      generatedAt: '2026-04-13T00:00:00.000Z',
      tokenUsage: {
        input: 10,
        output: 20,
        total: 30,
      },
      triples: [
        {
          subject: { text: '벨루가', type: 'organization' },
          predicate: 'has_core_technology',
          object: { text: 'AI OCR 엔진', type: 'technology' },
          confidence: 0.88,
          evidence: {
            snippet: '벨루가는 핵심 기술로 AI OCR 엔진을 보유한다.',
            charStart: 0,
            charEnd: 24,
          },
        },
      ],
    });

    expect(metadata).toEqual({
      version: 'v1',
      promptVersion: 'v2',
      model: 'gpt-5.4-nano',
      language: 'ko',
      generatedAt: '2026-04-13T00:00:00.000Z',
      tokenUsage: {
        input: 10,
        output: 20,
      },
      triples: [
        {
          subject: { text: '벨루가', type: 'organization' },
          predicate: 'has_core_technology',
          object: { text: 'AI OCR 엔진', type: 'technology' },
          confidence: 0.88,
          evidence: {
            snippet: '벨루가는 핵심 기술로 AI OCR 엔진을 보유한다.',
            charStart: 0,
            charEnd: 24,
          },
        },
      ],
    });
  });

  it('preserves existing source metadata while adding triples', () => {
    const merged = mergeSourceMetadataWithEntityTriples(
      {
        classification: { section: 'summary' },
        summary: { text: 'existing summary' },
      },
      buildEntityTriplesMetadata({
        promptVersion: 'v2',
        model: 'gpt-5.4-nano',
        language: 'en',
        generatedAt: '2026-04-13T00:00:00.000Z',
        tokenUsage: {
          input: 1,
          output: 2,
        },
        triples: [],
      }),
    );

    expect(merged).toMatchObject({
      classification: { section: 'summary' },
      summary: { text: 'existing summary' },
      entityTriples: {
        version: 'v1',
        model: 'gpt-5.4-nano',
        triples: [],
      },
    });
  });
});