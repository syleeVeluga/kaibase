export type ReviewTaskType =
  | 'page_creation'
  | 'page_update'
  | 'classification'
  | 'contradiction'
  | 'stale_content'
  | 'lint_issue';

export type ReviewTaskStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface ReviewTask {
  id: string;
  workspaceId: string;
  taskType: ReviewTaskType;
  status: ReviewTaskStatus;
  targetPageId: string | null;
  targetSourceId: string | null;
  proposedChange: Record<string, unknown>;
  aiReasoning: string;
  assignedTo: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  policyRuleId: string | null;
  createdAt: Date;
  expiresAt: Date | null;
}
