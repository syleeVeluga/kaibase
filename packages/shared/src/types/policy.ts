import type { CollectionType } from './page.js';

export type PolicyOutcome = 'AUTO_PUBLISH' | 'DRAFT_ONLY' | 'REVIEW_REQUIRED' | 'BLOCKED';

export interface PolicyPack {
  id: string;
  workspaceId: string;
  name: string;
  version: number;
  isActive: boolean;
  defaultOutcome: PolicyOutcome;
  rules: PolicyRule[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  conditions: PolicyCondition[];
  outcome: PolicyOutcome;
  targetCollectionType?: CollectionType;
  priority: number;
  enabled: boolean;
}

export interface PolicyCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'matches' | 'gt' | 'lt' | 'in' | 'not_in' | 'exists' | 'not_exists';
  value: unknown;
}

export interface PolicyEvaluationResult {
  outcome: PolicyOutcome;
  matchedRuleId: string | null;
  matchedRuleName: string | null;
  reasoning: string;
  targetCollectionType: CollectionType | null;
}
