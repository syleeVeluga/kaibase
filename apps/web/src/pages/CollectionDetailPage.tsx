import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client.js';
import { useWorkspace } from '../lib/workspace-context.js';
import { StatusBadge } from '../components/StatusBadge.js';
import * as shared from '../theme/shared.css.js';
import * as styles from './CollectionDetailPage.css.js';

interface Collection {
  id: string;
  name: string;
  nameKo: string | null;
  collectionType: string;
  description: string | null;
}

interface Page {
  id: string;
  title: string;
  pageType: string;
  status: string;
  updatedAt: string;
}

export function CollectionDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(['collections', 'common']);
  const { workspace } = useWorkspace();
  const wid = workspace?.id;

  const collectionQuery = useQuery({
    queryKey: ['collection', wid, id],
    queryFn: () =>
      apiClient.get<Collection>(`/workspaces/${wid}/collections/${id}`),
    enabled: !!wid && !!id,
  });

  const pagesQuery = useQuery({
    queryKey: ['pages', wid, { collectionId: id }],
    queryFn: () =>
      apiClient.get<{ pages: Page[] }>(
        `/workspaces/${wid}/pages?collectionId=${id}`,
      ),
    enabled: !!wid && !!id,
  });

  if (!wid) return <div className={shared.loading}>Select a workspace</div>;

  const collection = collectionQuery.data;
  const pages = pagesQuery.data?.pages ?? [];

  return (
    <div>
      <Link to="/collections" className={shared.backLink}>
        {t('common:actions.back')}
      </Link>

      {collectionQuery.isLoading && <div className={shared.loading}>Loading...</div>}

      {collection && (
        <>
          <div className={styles.header}>
            <h1 className={shared.pageTitle}>{collection.name}</h1>
            <span className={shared.badge}>
              {t(`collections:type.${collection.collectionType}`, collection.collectionType)}
            </span>
          </div>
          {collection.description && (
            <div className={styles.description}>{collection.description}</div>
          )}
        </>
      )}

      {pagesQuery.isLoading && <div className={shared.loading}>Loading...</div>}

      {!pagesQuery.isLoading && pages.length === 0 && (
        <div className={shared.emptyState}>{t('collections:detail.empty')}</div>
      )}

      {pages.length > 0 && (
        <table className={shared.table}>
          <thead>
            <tr>
              <th className={shared.th}>{t('collections:detail.title')}</th>
              <th className={shared.th}>{t('collections:detail.type')}</th>
              <th className={shared.th}>{t('collections:detail.status')}</th>
              <th className={shared.th}>{t('collections:detail.updated')}</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id}>
                <td className={shared.td}>
                  <Link to={`/pages/${page.id}`}>{page.title}</Link>
                </td>
                <td className={shared.td}>{page.pageType}</td>
                <td className={shared.td}>
                  <StatusBadge status={page.status} />
                </td>
                <td className={shared.td}>
                  {new Date(page.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
