import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client.js';
import { useWorkspace } from '../lib/workspace-context.js';
import * as shared from '../theme/shared.css.js';

interface ReviewTask {
  id: string;
  taskType: string;
  status: string;
  targetPageId: string | null;
  targetSourceId: string | null;
  assignedTo: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export function ReviewsPage(): React.ReactElement {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wid = workspace?.id;

  const query = useQuery({
    queryKey: ['reviews', wid],
    queryFn: () =>
      apiClient.get<{ reviews: ReviewTask[] }>(`/workspaces/${wid}/reviews`),
    enabled: !!wid,
  });

  const approveMutation = useMutation({
    mutationFn: (reviewId: string) =>
      apiClient.post(`/workspaces/${wid}/reviews/${reviewId}/approve`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reviews', wid] });
      void queryClient.invalidateQueries({ queryKey: ['pages', wid] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reviewId: string) =>
      apiClient.post(`/workspaces/${wid}/reviews/${reviewId}/reject`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reviews', wid] });
    },
  });

  const reviews = query.data?.reviews ?? [];

  if (!wid) return <div className={shared.loading}>Select a workspace</div>;

  return (
    <div>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>{t('nav.reviews')}</h1>
      </div>

      {query.isLoading && <div className={shared.loading}>Loading...</div>}

      {reviews.length === 0 && !query.isLoading && (
        <div className={shared.emptyState}>
          <p>No review tasks. Reviews appear when AI-generated pages require human approval.</p>
        </div>
      )}

      {reviews.length > 0 && (
        <table className={shared.table}>
          <thead>
            <tr>
              <th className={shared.th}>Type</th>
              <th className={shared.th}>Status</th>
              <th className={shared.th}>Created</th>
              <th className={shared.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id}>
                <td className={shared.td}>{r.taskType.replace('_', ' ')}</td>
                <td className={shared.td}>
                  <ReviewBadge status={r.status} />
                </td>
                <td className={shared.td}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td className={shared.td}>
                  {r.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className={shared.primaryButton}
                        onClick={() => approveMutation.mutate(r.id)}
                        disabled={approveMutation.isPending}
                      >
                        {t('actions.approve')}
                      </button>
                      <button
                        className={shared.secondaryButton}
                        onClick={() => rejectMutation.mutate(r.id)}
                        disabled={rejectMutation.isPending}
                      >
                        {t('actions.reject')}
                      </button>
                    </div>
                  )}
                  {r.status !== 'pending' && (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {r.reviewedAt
                        ? `Reviewed ${new Date(r.reviewedAt).toLocaleDateString()}`
                        : ''}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ReviewBadge({ status }: { status: string }): React.ReactElement {
  const classMap: Record<string, string> = {
    pending: shared.badgePending,
    approved: shared.badgeProcessed,
    rejected: shared.badgeFailed,
    expired: shared.badgeDraft,
  };

  return (
    <span className={classMap[status] ?? shared.badge}>
      {status}
    </span>
  );
}
