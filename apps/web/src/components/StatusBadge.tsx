import * as shared from '../theme/shared.css.js';

const statusClassMap: Record<string, string> = {
  draft: shared.badgeDraft,
  published: shared.badgePublished,
  review_pending: shared.badgePending,
  archived: shared.badgeDraft,
  pending: shared.badgePending,
  approved: shared.badgeProcessed,
  rejected: shared.badgeFailed,
  expired: shared.badgeDraft,
  processing: shared.badgeProcessing,
  processed: shared.badgeProcessed,
  failed: shared.badgeFailed,
};

export function StatusBadge({ status }: { status: string }): React.ReactElement {
  return (
    <span className={statusClassMap[status] ?? shared.badge}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}
