import { z } from 'zod';
import { pageTypeSchema } from './page.schema.js';

export const askQuestionSchema = z.object({
  question: z.string().min(1).max(5000),
  language: z.enum(['en', 'ko']).optional(),
  pageFilter: z.array(z.string().uuid()).optional(),
});

export const promoteAnswerSchema = z.object({
  pageType: pageTypeSchema.default('answer'),
  collectionId: z.string().uuid().optional(),
  title: z.string().min(1).max(500).optional(),
  language: z.enum(['en', 'ko']).optional(),
});

export type AskQuestionInput = z.infer<typeof askQuestionSchema>;
export type PromoteAnswerInput = z.infer<typeof promoteAnswerSchema>;
