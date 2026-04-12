const KOREAN_RANGE = /[\u3131-\u3163\uac00-\ud7a3]/;

export function detectLanguage(text: string): 'en' | 'ko' | 'mixed' {
  let koreanChars = 0;
  let total = 0;

  for (const ch of text) {
    if (/\S/.test(ch)) {
      total++;
      if (KOREAN_RANGE.test(ch)) koreanChars++;
    }
  }

  if (total === 0) return 'en';

  const koreanRatio = koreanChars / total;
  if (koreanRatio > 0.3) return koreanRatio > 0.7 ? 'ko' : 'mixed';
  return 'en';
}
