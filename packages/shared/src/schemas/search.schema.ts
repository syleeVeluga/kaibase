import { z } from 'zod';
import { pageTypeSchema, pageStatusSchema } from './page.schema.js';

export const searchQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  filters: z
    .object({
      pageType: pageTypeSchema.optional(),
      status: pageStatusSchema.optional(),
      collectionId: z.string().uuid().optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

export const searchResultSchema = z.object({
  pageId: z.string(),
  title: z.string(),
  pageType: z.string(),
  status: z.string(),
  slug: z.string(),
  snippet: z.string(),
  score: z.number(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;
