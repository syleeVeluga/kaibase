/**
 * lwc:review-status — Page review status indicator.
 *
 * Displays the current review state of a page. Appears at the top of
 * a page to indicate whether it is in draft, pending review, approved,
 * or rejected state. Links to the corresponding review task.
 *
 * This is a NEW file under our own license. It does NOT modify
 * any BlockSuite source files (MPL 2.0 safe).
 *
 * Phase 0a: Schema definition only. Full rendering will be
 * implemented with the frontend.
 */

/**
 * Valid review status values.
 *
 * These correspond to the page lifecycle states defined in PRD-06:
 * - draft: Initial AI-generated or user-created content
 * - pending_review: Waiting for human review (REVIEW_REQUIRED policy)
 * - approved: Review passed, page published
 * - rejected: Review failed, returned to draft with feedback
 * - archived: Page archived (manual or stale detection)
 */
export type ReviewStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'archived';

/**
 * Properties for the lwc:review-status block.
 *
 * @property status       - Current review status
 * @property reviewTaskId - UUID of the associated review task (empty if none)
 * @property reviewedBy   - User ID of the reviewer (null if not yet reviewed)
 */
export interface ReviewStatusBlockProps {
  status: string;
  reviewTaskId: string;
  reviewedBy: string | null;
}

/**
 * Default property values for a new review status block.
 */
export const reviewStatusBlockDefaultProps: ReviewStatusBlockProps = {
  status: 'draft',
  reviewTaskId: '',
  reviewedBy: null,
};

/**
 * Block flavour identifier for the review status block.
 */
export const REVIEW_STATUS_BLOCK_FLAVOUR = 'lwc:review-status' as const;

/**
 * Review status block schema definition.
 *
 * TODO: Once BlockSuite 0.19.5 is installed, replace with defineBlockSchema()
 * if the API requires it. See citation-block.ts for the pattern.
 */
export const ReviewStatusBlockSchema = {
  flavour: REVIEW_STATUS_BLOCK_FLAVOUR,
  props: (): ReviewStatusBlockProps => ({ ...reviewStatusBlockDefaultProps }),
  metadata: {
    version: 1,
    role: 'content' as const,
    /** Review status appears inside note blocks, typically at the top of the page */
    parent: ['affine:note'],
  },
};
