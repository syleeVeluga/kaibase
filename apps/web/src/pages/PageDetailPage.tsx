import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';

import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client.js';
import { useWorkspace } from '../lib/workspace-context.js';
import { BlockContentViewer } from '../components/BlockContentViewer.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { parseBlocks } from '../lib/parse-blocks.js';
import { MutationError } from '../components/MutationError.js';
import * as shared from '../theme/shared.css.js';
import * as styles from './PageDetailPage.css.js';

interface PageDetail {
  id: string;
  title: string;
  titleKo: string | null;
  pageType: string;
  status: string;
  slug: string;
  contentSnapshot: string;
  createdBy: string;
  language: string;
  collectionId: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

interface CollectionSummary {
  id: string;
  name: string;
  nameKo: string | null;
}

export function PageDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(['pages', 'common']);
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const wid = workspace?.id;

  const query = useQuery({
    queryKey: ['page', wid, id],
    queryFn: () => apiClient.get<PageDetail>(`/workspaces/${wid}/pages/${id}`),
    enabled: !!wid && !!id,
  });

  const publishMutation = useMutation({
    mutationFn: () => apiClient.post(`/workspaces/${wid}/pages/${id}/publish`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['page', wid, id] });
      void queryClient.invalidateQueries({ queryKey: ['pages', wid] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => apiClient.post(`/workspaces/${wid}/pages/${id}/archive`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pages', wid] });
      void navigate('/pages');
    },
  });

  const blocks = useMemo(
    () => (query.data ? parseBlocks(query.data.contentSnapshot) : []),
    [query.data?.contentSnapshot],
  );

  const collectionsQuery = useQuery({
    queryKey: ['collections', wid],
    queryFn: () => apiClient.get<{ collections: CollectionSummary[] }>(`/workspaces/${wid}/collections`),
    enabled: !!wid,
  });

  if (!wid) return <div className={shared.loading}>Select a workspace</div>;
  if (query.isLoading) return <div className={shared.loading}>{t('common:status.processing')}</div>;

  if (query.isError || !query.data) {
    return (
      <div>
        <Link to="/pages" className={shared.backLink}>
          &larr; {t('common:actions.back')}
        </Link>
        <div className={shared.emptyState}>
          <p>{t('common:errors.notFound', 'Page not found')}</p>
        </div>
      </div>
    );
  }

  const page = query.data;
  const collection = collectionsQuery.data?.collections.find((item) => item.id === page.collectionId) ?? null;

  const canPublish = page.status === 'draft' || page.status === 'review_pending';
  const canArchive = page.status !== 'archived';

  return (
    <div>
      <Link to="/pages" className={shared.backLink}>
        &larr; {t('common:actions.back')}
      </Link>

      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>{page.title}</h1>
          <div className={styles.meta}>
            <span className={shared.badge}>
              {t(`pages:type.${page.pageType}`, page.pageType)}
            </span>
            <StatusBadge status={page.status} />
            {page.titleKo && (
              <span>{page.titleKo}</span>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          {canPublish && (
            <button
              className={shared.primaryButton}
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              {t('common:actions.publish')}
            </button>
          )}
          {canArchive && (
            <button
              className={styles.archiveButton}
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
            >
              {t('common:actions.archive')}
            </button>
          )}
          <MutationError error={publishMutation.error ?? archiveMutation.error} />
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.content}>
          <BlockContentViewer
            blocks={blocks}
            emptyMessage={t('pages:detail.noContent', 'This page has no content yet.')}
          />
        </div>

        <div className={styles.sidebar}>
          <MetaCard
            label={t('pages:detail.createdBy')}
            value={page.createdBy === 'ai' ? 'AI' : 'User'}
          />
          <MetaCard
            label={t('pages:detail.lastUpdated')}
            value={new Date(page.updatedAt).toLocaleDateString()}
          />
          {page.publishedAt && (
            <MetaCard
              label={t('common:status.published')}
              value={new Date(page.publishedAt).toLocaleDateString()}
            />
          )}
          {collection && (
            <MetaCard
              label={t('pages:detail.collection', 'Collection')}
              value={collection.name}
              href={`/collections/${collection.id}`}
            />
          )}
          <MetaCard label={t('pages:detail.language')} value={page.language.toUpperCase()} />
        </div>
      </div>
    </div>
  );
}

function MetaCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}): React.ReactElement {
  return (
    <div className={styles.metaCard}>
      <div className={styles.metaLabel}>{label}</div>
      <div className={styles.metaValue}>
        {href ? <Link to={href}>{value}</Link> : value}
      </div>
    </div>
  );
}

