import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client.js';
import { useWorkspace } from '../lib/workspace-context.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { MutationError } from '../components/MutationError.js';
import * as shared from '../theme/shared.css.js';

interface Page {
  id: string;
  title: string;
  pageType: string;
  status: string;
  createdBy: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export function PagesPage(): React.ReactElement {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wid = workspace?.id;

  const query = useQuery({
    queryKey: ['pages', wid],
    queryFn: () => apiClient.get<{ pages: Page[] }>(`/workspaces/${wid}/pages`),
    enabled: !!wid,
  });

  const publishMutation = useMutation({
    mutationFn: (pageId: string) =>
      apiClient.post(`/workspaces/${wid}/pages/${pageId}/publish`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pages', wid] });
    },
  });

  const pages = query.data?.pages ?? [];

  if (!wid) return <div className={shared.loading}>Select a workspace</div>;

  return (
    <div>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>{t('nav.pages')}</h1>
      </div>

      {query.isLoading && <div className={shared.loading}>Loading...</div>}

      {query.isError && <ErrorBanner error={query.error} onRetry={() => void query.refetch()} />}

      {pages.length === 0 && !query.isLoading && !query.isError && (
        <div className={shared.emptyState}>
          <p>No pages yet. Pages are generated when AI compiles your sources.</p>
        </div>
      )}

      {pages.length > 0 && (
        <table className={shared.table}>
          <thead>
            <tr>
              <th className={shared.th}>Title</th>
              <th className={shared.th}>Type</th>
              <th className={shared.th}>Created By</th>
              <th className={shared.th}>Status</th>
              <th className={shared.th}>Updated</th>
              <th className={shared.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <td className={shared.td}>
                  <Link to={`/pages/${p.id}`}>{p.title}</Link>
                </td>
                <td className={shared.td}>{p.pageType}</td>
                <td className={shared.td}>{p.createdBy}</td>
                <td className={shared.td}>
                  <StatusBadge status={p.status} />
                </td>
                <td className={shared.td}>
                  {new Date(p.updatedAt).toLocaleDateString()}
                </td>
                <td className={shared.td}>
                  {p.status === 'draft' && (
                    <button
                      className={shared.primaryButton}
                      onClick={() => publishMutation.mutate(p.id)}
                      disabled={publishMutation.isPending}
                    >
                      {t('actions.publish')}
                    </button>
                  )}
                  <MutationError error={publishMutation.error} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

