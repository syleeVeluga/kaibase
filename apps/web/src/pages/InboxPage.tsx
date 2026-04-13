import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { apiClient } from '../lib/api-client.js';
import { useWorkspace } from '../lib/workspace-context.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import * as shared from '../theme/shared.css.js';

interface Source {
  id: string;
  sourceType: string;
  title: string;
  status: string;
  ingestedAt: string;
}

function hasActiveSources(sources: Source[] | undefined): boolean {
  return sources?.some((s) => s.status === 'pending' || s.status === 'processing') ?? false;
}

interface Page {
  id: string;
  title: string;
  pageType: string;
  status: string;
  createdAt: string;
}

export function InboxPage(): React.ReactElement {
  const { t } = useTranslation(['pages', 'common', 'errors']);
  const { workspace } = useWorkspace();
  const wid = workspace?.id;
  const queryClient = useQueryClient();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sourcesQuery = useQuery({
    queryKey: ['sources', wid],
    queryFn: () => apiClient.get<{ sources: Source[] }>(`/workspaces/${wid}/sources`),
    enabled: !!wid,
    refetchInterval: (query) =>
      hasActiveSources(query.state.data?.sources) ? 3000 : false,
  });

  const pagesQuery = useQuery({
    queryKey: ['pages', wid],
    queryFn: () => apiClient.get<{ pages: Page[] }>(`/workspaces/${wid}/pages`),
    enabled: !!wid,
    refetchInterval: (query) => {
      if (hasActiveSources(sourcesQuery.data?.sources)) return 5000;
      const pages = query.state.data?.pages;
      return sourcesQuery.data?.sources?.length && pages?.length === 0 ? 5000 : false;
    },
  });

  const deleteSource = useMutation({
    mutationFn: (sourceId: string) =>
      apiClient.delete<{ deleted: boolean }>(`/workspaces/${wid}/sources/${sourceId}`),
    onSuccess: () => {
      setDeleteError(null);
      void queryClient.invalidateQueries({ queryKey: ['sources', wid] });
    },
    onError: () => setDeleteError(t('internal', { ns: 'errors' })),
  });

  const bulkDeletePending = useMutation({
    mutationFn: () =>
      apiClient.delete<{ deleted: number }>(`/workspaces/${wid}/sources?status=pending,failed`),
    onSuccess: () => {
      setDeleteError(null);
      void queryClient.invalidateQueries({ queryKey: ['sources', wid] });
    },
    onError: () => setDeleteError(t('internal', { ns: 'errors' })),
  });

  const recentSources = sourcesQuery.data?.sources.slice(0, 10) ?? [];
  const recentPages = pagesQuery.data?.pages.slice(0, 10) ?? [];
  const pendingOrFailedCount = recentSources.filter(
    (s) => s.status === 'pending' || s.status === 'failed',
  ).length;

  if (!wid) return <div className={shared.loading}>Select a workspace</div>;

  return (
    <div>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>{t('nav.inbox', { ns: 'common' })}</h1>
      </div>

      {deleteError && (
        <div className={shared.errorBanner}>{deleteError}</div>
      )}

      {/* Recent Sources */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
            {t('inbox.recentSources')}
          </h2>
          {pendingOrFailedCount > 0 && (
            <button
              className={shared.secondaryButton}
              style={{ color: '#991b1b', borderColor: '#fecaca' }}
              onClick={() => {
                if (window.confirm(t('inbox.confirmClearPending'))) {
                  bulkDeletePending.mutate();
                }
              }}
              disabled={bulkDeletePending.isPending}
            >
              {bulkDeletePending.isPending
                ? t('actions.deleting', { ns: 'common' })
                : t('inbox.clearPending', { count: pendingOrFailedCount, ns: 'pages' })}
            </button>
          )}
        </div>
        {sourcesQuery.isLoading && <div className={shared.loading}>Loading...</div>}
        {sourcesQuery.isError && <ErrorBanner error={sourcesQuery.error} onRetry={() => void sourcesQuery.refetch()} />}
        {recentSources.length === 0 && !sourcesQuery.isLoading && !sourcesQuery.isError && (
          <div className={shared.emptyState}>
            <p>{t('inbox.noSources')}</p>
            <p>
              <Link to="/sources">{t('inbox.uploadLink')}</Link>
            </p>
          </div>
        )}
        {recentSources.length > 0 && (
          <table className={shared.table}>
            <thead>
              <tr>
                <th className={shared.th}>{t('inbox.colTitle')}</th>
                <th className={shared.th}>{t('inbox.colType')}</th>
                <th className={shared.th}>{t('inbox.colStatus')}</th>
                <th className={shared.th}>{t('inbox.colIngested')}</th>
                <th className={shared.th}></th>
              </tr>
            </thead>
            <tbody>
              {recentSources.map((s) => (
                <tr key={s.id}>
                  <td className={shared.td}>{s.title}</td>
                  <td className={shared.td}>{s.sourceType}</td>
                  <td className={shared.td}>
                    <StatusBadge status={s.status} />
                  </td>
                  <td className={shared.td}>
                    {new Date(s.ingestedAt).toLocaleDateString()}
                  </td>
                  <td className={shared.td}>
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#991b1b',
                        fontSize: '12px',
                        padding: '2px 6px',
                      }}
                      onClick={() => {
                        if (window.confirm(t('inbox.confirmDelete', { title: s.title }))) {
                          deleteSource.mutate(s.id);
                        }
                      }}
                      disabled={deleteSource.isPending}
                    >
                      {t('actions.delete', { ns: 'common' })}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Recent Pages */}
      <section>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
          {t('inbox.recentPages')}
        </h2>
        {pagesQuery.isLoading && <div className={shared.loading}>Loading...</div>}
        {pagesQuery.isError && <ErrorBanner error={pagesQuery.error} onRetry={() => void pagesQuery.refetch()} />}
        {recentPages.length === 0 && !pagesQuery.isLoading && !pagesQuery.isError && (
          <div className={shared.emptyState}>
            <p>{t('inbox.noPages')}</p>
          </div>
        )}
        {recentPages.length > 0 && (
          <table className={shared.table}>
            <thead>
              <tr>
                <th className={shared.th}>{t('inbox.colTitle')}</th>
                <th className={shared.th}>{t('inbox.colType')}</th>
                <th className={shared.th}>{t('inbox.colStatus')}</th>
                <th className={shared.th}>{t('inbox.colCreated')}</th>
              </tr>
            </thead>
            <tbody>
              {recentPages.map((p) => (
                <tr key={p.id}>
                  <td className={shared.td}>
                    <Link to={`/pages/${p.id}`}>{p.title}</Link>
                  </td>
                  <td className={shared.td}>{p.pageType}</td>
                  <td className={shared.td}>
                    <StatusBadge status={p.status} />
                  </td>
                  <td className={shared.td}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
