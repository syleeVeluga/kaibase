import { z } from 'zod';

export const aiPromptFunctionIdSchema = z.enum([
  'classify',
  'summarize',
  'extract-entities',
  'create-page',
  'answer-question',
]);

export const aiReasoningEffortSchema = z.enum([
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
]);

export const upsertAiPromptConfigSchema = z.object({
  model: z.string().max(100).nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  reasoningEffort: aiReasoningEffortSchema.nullable().optional(),
  systemPromptOverride: z.string().max(50_000).nullable().optional(),
  userPromptOverride: z.string().max(50_000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpsertAiPromptConfigInput = z.infer<typeof upsertAiPromptConfigSchema>;
