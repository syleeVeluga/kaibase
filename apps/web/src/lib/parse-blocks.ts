import type { ContentBlock } from '@kaibase/shared';

export function parseBlocks(snapshot: string): ContentBlock[] {
  try {
    const parsed: unknown = JSON.parse(snapshot || '[]');
    return Array.isArray(parsed) ? (parsed as ContentBlock[]) : [];
  } catch {
    return [];
  }
}
