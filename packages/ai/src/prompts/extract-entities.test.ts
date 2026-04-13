import { describe, expect, it } from 'vitest';
import { extractEntitiesPrompt } from './extract-entities.js';

describe('extractEntitiesPrompt', () => {
  it('includes relation triple schema and guidance', () => {
    const messages = extractEntitiesPrompt({
      sourceText: '벨루가는 핵심 기술로 AI OCR 엔진을 보유한다.',
      sourceTitle: '벨루가 소개',
      language: 'ko',
      knownEntities: [
        {
          name: '벨루가',
          type: 'organization',
          aliases: ['Beluga'],
        },
      ],
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]?.content).toContain('"relations"');
    expect(messages[0]?.content).toContain('snake_case');
    expect(messages[0]?.content).toContain('source-local relation triples');
    expect(messages[1]?.content).toContain('벨루가 소개');
  });
});