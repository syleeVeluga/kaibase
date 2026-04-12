import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { apiClient } from '../lib/api-client.js';
import { useWorkspace } from '../lib/workspace-context.js';
import { StatusBadge } from '../components/StatusBadge.js';
import * as shared from '../theme/shared.css.js';

interface Source {
  id: string;
  sourceType: string;
  title: string;
  status: string;
  ingestedAt: string;
}

interface Page {
  id: string;
  title: string;
  pageType: string;
  status: string;
  createdAt: string;
}

export function InboxPage(): React.ReactElement {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const wid = workspace?.id;

  const sourcesQuery = useQuery({
    queryKey: ['sources', wid],
    queryFn: () => apiClient.get<{ sources: Source[] }>(`/workspaces/${wid}/sources`),
    enabled: !!wid,
  });

  const pagesQuery = useQuery({
    queryKey: ['pages', wid],
    queryFn: () => apiClient.get<{ pages: Page[] }>(`/workspaces/${wid}/pages`),
    enabled: !!wid,
  });

  const recentSources = sourcesQuery.data?.sources.slice(0, 10) ?? [];
  const recentPages = pagesQuery.data?.pages.slice(0, 10) ?? [];

  if (!wid) return <div className={shared.loading}>Select a workspace</div>;

  return (
    <div>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>{t('nav.inbox')}</h1>
      </div>

      {/* Recent Sources */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
          Recent Sources
        </h2>
        {sourcesQuery.isLoading && <div className={shared.loading}>Loading...</div>}
        {recentSources.length === 0 && !sourcesQuery.isLoading && (
          <div className={shared.emptyState}>
            <p>No sources yet.</p>
            <p>
              <Link to="/sources">Upload a file or connect a folder</Link> to get started.
            </p>
          </div>
        )}
        {recentSources.length > 0 && (
          <table className={shared.table}>
            <thead>
              <tr>
                <th className={shared.th}>Title</th>
                <th className={shared.th}>Type</th>
                <th className={shared.th}>Status</th>
                <th className={shared.th}>Ingested</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Recent Pages */}
      <section>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
          Generated Pages
        </h2>
        {pagesQuery.isLoading && <div className={shared.loading}>Loading...</div>}
        {recentPages.length === 0 && !pagesQuery.isLoading && (
          <div className={shared.emptyState}>
            <p>No pages generated yet. Pages will appear here once AI compiles your sources.</p>
          </div>
        )}
        {recentPages.length > 0 && (
          <table className={shared.table}>
            <thead>
              <tr>
                <th className={shared.th}>Title</th>
                <th className={shared.th}>Type</th>
                <th className={shared.th}>Status</th>
                <th className={shared.th}>Created</th>
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

