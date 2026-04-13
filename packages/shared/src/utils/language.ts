import type { Language } from '../types/workspace.js';

const KOREAN_RANGE = /[\u3131-\u3163\uac00-\ud7a3]/;
const LATIN_RANGE = /[A-Za-z]/;

export type DetectedLanguage = 'en' | 'ko' | 'mixed';

export function detectLanguage(text: string): DetectedLanguage {
  let koreanChars = 0;
  let latinChars = 0;

  for (const ch of text) {
    if (KOREAN_RANGE.test(ch)) {
      koreanChars++;
      continue;
    }
    if (LATIN_RANGE.test(ch)) latinChars++;
  }

  const totalLetters = koreanChars + latinChars;
  if (totalLetters === 0) return 'en';
  if (koreanChars === 0) return 'en';
  if (latinChars === 0) return 'ko';

  const koreanRatio = koreanChars / totalLetters;
  if (koreanRatio >= 0.6) return 'ko';
  if (koreanRatio <= 0.15) return 'en';
  return 'mixed';
}

export function normalizeLanguageTag(value?: string | null): Language | undefined {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith('ko')) return 'ko';
  if (normalized.startsWith('en')) return 'en';

  return undefined;
}

export function resolveGenerationLanguage(
  detectedLanguage: DetectedLanguage,
  fallbackLanguage: Language,
): Language {
  return detectedLanguage === 'mixed' ? fallbackLanguage : detectedLanguage;
}

export function resolveLanguageFromText(
  text: string,
  fallbackLanguage: Language,
): Language {
  return resolveGenerationLanguage(detectLanguage(text), fallbackLanguage);
}
