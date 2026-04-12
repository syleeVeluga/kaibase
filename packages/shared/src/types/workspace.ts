export type Language = 'en' | 'ko';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  defaultLanguage: Language;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
