import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client.js';
import { useWorkspace } from '../lib/workspace-context.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import * as shared from '../theme/shared.css.js';
import * as styles from './CollectionsPage.css.js';

interface Collection {
  id: string;
  name: string;
  nameKo: string | null;
  collectionType: string;
  description: string | null;
  sortOrder: number;
}

export function CollectionsPage(): React.ReactElement {
  const { t, i18n } = useTranslation(['collections', 'common']);
  const { workspace } = useWorkspace();
  const wid = workspace?.id;

  const query = useQuery({
    queryKey: ['collections', wid],
    queryFn: () =>
      apiClient.get<{ collections: Collection[] }>(`/workspaces/${wid}/collections`),
    enabled: !!wid,
  });

  if (!wid) return <div className={shared.loading}>Select a workspace</div>;

  const items = query.data?.collections ?? [];
  const isKo = i18n.language === 'ko';

  return (
    <div>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>{t('collections:title')}</h1>
      </div>

      {query.isLoading && <div className={shared.loading}>Loading...</div>}

      {query.isError && <ErrorBanner error={query.error} onRetry={() => void query.refetch()} />}

      {!query.isLoading && !query.isError && items.length === 0 && (
        <div className={shared.emptyState}>{t('collections:empty')}</div>
      )}

      {items.length > 0 && (
        <div className={styles.grid}>
          {items.map((col) => (
            <Link
              key={col.id}
              to={`/collections/${col.id}`}
              className={styles.collectionCard}
            >
              <div className={styles.cardName}>
                {isKo && col.nameKo ? col.nameKo : col.name}
              </div>
              {col.description && (
                <div className={styles.cardDescription}>{col.description}</div>
              )}
              <div className={styles.cardMeta}>
                <span className={shared.badge}>
                  {t(`collections:type.${col.collectionType}`, col.collectionType)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
