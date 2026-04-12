import { z } from 'zod';

export const askQuestionSchema = z.object({
  question: z.string().min(1).max(5000),
  language: z.enum(['en', 'ko']).optional(),
  pageFilter: z.array(z.string().uuid()).optional(),
});

export type AskQuestionInput = z.infer<typeof askQuestionSchema>;
