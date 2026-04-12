import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client.js';
import { useWorkspace } from '../lib/workspace-context.js';
import type { ContentBlock } from '@kaibase/shared';
import { BlockContentViewer } from '../components/BlockContentViewer.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { parseBlocks } from '../lib/parse-blocks.js';
import * as shared from '../theme/shared.css.js';
import * as styles from './ReviewDetailPage.css.js';

interface ReviewDetail {
  id: string;
  taskType: string;
  status: string;
  targetPageId: string | null;
  targetSourceId: string | null;
  proposedChange: { blocks?: ContentBlock[] } | null;
  aiReasoning: string;
  reviewNotes: string | null;
  assignedTo: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  policyRuleId: string | null;
  createdAt: string;
  targetPage: { id: string; title: string; contentSnapshot: string | null; status: string } | null;
}

export function ReviewDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(['reviews', 'common']);
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const wid = workspace?.id;

  const [reviewNotes, setReviewNotes] = useState('');

  const reviewQuery = useQuery({
    queryKey: ['review', wid, id],
    queryFn: () => apiClient.get<ReviewDetail>(`/workspaces/${wid}/reviews/${id}`),
    enabled: !!wid && !!id,
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/workspaces/${wid}/reviews/${id}/approve`, {
        reviewNotes: reviewNotes || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reviews', wid] });
      void queryClient.invalidateQueries({ queryKey: ['pages', wid] });
      void navigate('/reviews');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/workspaces/${wid}/reviews/${id}/reject`, {
        reviewNotes: reviewNotes || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reviews', wid] });
      void queryClient.invalidateQueries({ queryKey: ['pages', wid] });
      void navigate('/reviews');
    },
  });

  if (!wid) return <div className={shared.loading}>Select a workspace</div>;
  if (reviewQuery.isLoading) return <div className={shared.loading}>{t('common:status.processing')}</div>;

  if (reviewQuery.isError || !reviewQuery.data) {
    return (
      <div>
        <Link to="/reviews" className={shared.backLink}>
          &larr; {t('common:actions.back')}
        </Link>
        <div className={shared.emptyState}>
          <p>{t('common:errors.notFound', 'Review not found')}</p>
        </div>
      </div>
    );
  }

  const review = reviewQuery.data;
  const isPending = review.status === 'pending';

  const proposedBlocks: ContentBlock[] = review.proposedChange?.blocks ?? [];
  const currentBlocks = useMemo(
    () => review.targetPage?.contentSnapshot
      ? parseBlocks(review.targetPage.contentSnapshot)
      : [],
    [review.targetPage?.contentSnapshot],
  );

  const isNewPage = review.taskType === 'page_creation';

  return (
    <div>
      <Link to="/reviews" className={shared.backLink}>
        &larr; {t('common:actions.back')}
      </Link>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.headerTitle}>
            {t(`reviews:taskType.${review.taskType}`, review.taskType)}
          </h1>
          <StatusBadge status={review.status} />
          <span className={shared.textMeta}>
            {new Date(review.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {review.aiReasoning && (
        <div className={styles.reasoningCard}>
          <div className={styles.reasoningLabel}>
            {t('reviews:detail.aiReasoning')}
          </div>
          <div className={styles.reasoningText}>{review.aiReasoning}</div>
        </div>
      )}

      <div className={styles.diffContainer}>
        <div className={styles.diffPanel}>
          <div className={styles.diffPanelHeader}>
            {t('reviews:detail.currentContent', 'Current Content')}
          </div>
          <div className={styles.diffPanelBody}>
            {isNewPage ? (
              <div className={styles.noContentMessage}>
                {t(
                  'reviews:detail.noExistingContent',
                  'New page — no existing content',
                )}
              </div>
            ) : (
              <BlockContentViewer
                blocks={currentBlocks}
                emptyMessage={t(
                  'reviews:detail.noExistingContent',
                  'No existing content',
                )}
              />
            )}
          </div>
        </div>

        <div className={styles.diffPanel}>
          <div className={styles.diffPanelHeader}>
            {t('reviews:detail.proposedChange')}
          </div>
          <div className={styles.diffPanelBody}>
            <BlockContentViewer
              blocks={proposedBlocks}
              emptyMessage={t('reviews:detail.noProposedContent', 'No proposed content')}
            />
          </div>
        </div>
      </div>

      {isPending && (
        <div className={styles.notesSection}>
          <div className={styles.notesLabel}>
            {t('reviews:detail.reviewNotes', 'Review Notes')}
          </div>
          <textarea
            className={styles.notesTextarea}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder={t(
              'reviews:detail.reviewNotesPlaceholder',
              'Add notes about your decision...',
            )}
          />
        </div>
      )}

      {!isPending && review.reviewNotes && (
        <div className={styles.reasoningCard}>
          <div className={styles.reasoningLabel}>
            {t('reviews:detail.reviewNotes', 'Review Notes')}
          </div>
          <div className={styles.reasoningText}>{review.reviewNotes}</div>
        </div>
      )}

      {isPending && (
        <div className={styles.actionBar}>
          <button
            className={shared.secondaryButton}
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending || approveMutation.isPending}
          >
            {t('common:actions.reject')}
          </button>
          <button
            className={shared.primaryButton}
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending || rejectMutation.isPending}
          >
            {t('common:actions.approve')}
          </button>
        </div>
      )}

      {!isPending && review.reviewedAt && (
        <div className={styles.dateMeta}>
          {t('reviews:detail.reviewedAt', { date: new Date(review.reviewedAt).toLocaleDateString() })}
        </div>
      )}
    </div>
  );
}

