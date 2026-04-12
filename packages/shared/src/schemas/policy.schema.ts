import { z } from 'zod';

export const policyOutcomeSchema = z.enum([
  'AUTO_PUBLISH',
  'DRAFT_ONLY',
  'REVIEW_REQUIRED',
  'BLOCKED',
]);

export const policyConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'contains', 'matches', 'gt', 'lt', 'in', 'not_in']),
  value: z.unknown(),
});

export const policyRuleSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  conditions: z.array(policyConditionSchema),
  outcome: policyOutcomeSchema,
  priority: z.number().int().min(0),
  enabled: z.boolean(),
});

export const createPolicyPackSchema = z.object({
  name: z.string().min(1).max(255),
  rules: z.array(policyRuleSchema),
});

export type CreatePolicyPackInput = z.infer<typeof createPolicyPackSchema>;
