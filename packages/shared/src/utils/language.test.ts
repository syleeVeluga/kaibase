import { describe, expect, it } from 'vitest';
import {
  detectLanguage,
  normalizeLanguageTag,
  resolveLanguageFromText,
} from './language.js';

describe('language utils', () => {
  it('detects Korean-heavy text even with numbers and punctuation', () => {
    expect(
      detectLanguage('2026년 4월 보고서: 매출은 15% 증가했고, 프로젝트 상태는 안정적입니다.'),
    ).toBe('ko');
  });

  it('detects mixed text when Korean and English are both substantial', () => {
    expect(
      detectLanguage('프로젝트 kickoff notes 와 action items 를 함께 정리했습니다.'),
    ).toBe('mixed');
  });

  it('resolves text language using fallback only for mixed content', () => {
    expect(
      resolveLanguageFromText(
        '프로젝트 kickoff notes 와 action items 를 함께 정리했습니다.',
        'ko',
      ),
    ).toBe('ko');
    expect(resolveLanguageFromText('The weekly report is ready for review.', 'ko')).toBe('en');
  });

  it('normalizes browser and accept-language tags', () => {
    expect(normalizeLanguageTag('ko-KR')).toBe('ko');
    expect(normalizeLanguageTag('en-US,en;q=0.9')).toBe('en');
    expect(normalizeLanguageTag('ja-JP')).toBeUndefined();
  });
});