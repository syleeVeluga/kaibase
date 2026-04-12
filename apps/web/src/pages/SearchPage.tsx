import { useState, useCallback } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client.js';
import { useWorkspace } from '../lib/workspace-context.js';
import { StatusBadge } from '../components/StatusBadge.js';
import * as shared from '../theme/shared.css.js';
import * as styles from './SearchPage.css.js';

interface SearchResult {
  pageId: string;
  title: string;
  pageType: string;
  status: string;
  slug: string;
  snippet: string;
  score: number;
}

export function SearchPage(): React.ReactElement {
  const { t } = useTranslation(['search', 'common']);
  const { workspace } = useWorkspace();
  const wid = workspace?.id;
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const query = useQuery({
    queryKey: ['search', wid, searchQuery],
    queryFn: () =>
      apiClient.post<{ results: SearchResult[]; total: number }>(
        `/workspaces/${wid}/search`,
        { query: searchQuery, limit: 20 },
      ),
    enabled: !!wid && searchQuery.length > 0,
  });

  const handleSearch = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed) setSearchQuery(trimmed);
  }, [input]);

  if (!wid) return <div className={shared.loading}>Select a workspace</div>;

  const results = query.data?.results ?? [];
  const total = query.data?.total ?? 0;

  return (
    <div>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>{t('search:title')}</h1>
      </div>

      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t('search:placeholder')}
        />
        <button className={shared.primaryButton} onClick={handleSearch}>
          {t('search:title')}
        </button>
      </div>

      {query.isLoading && <div className={shared.loading}>Searching...</div>}

      {searchQuery && !query.isLoading && (
        <div className={styles.resultCount}>
          {t('search:resultCount', { count: total })}
        </div>
      )}

      {searchQuery && !query.isLoading && results.length === 0 && (
        <div className={shared.emptyState}>{t('search:noResults')}</div>
      )}

      {results.length > 0 && (
        <div className={styles.resultsList}>
          {results.map((result) => (
            <Link
              key={result.pageId}
              to={`/pages/${result.pageId}`}
              className={styles.resultCard}
            >
              <div className={styles.resultTitle}>{result.title}</div>
              {result.snippet && (
                <div className={styles.resultSnippet}>{result.snippet}</div>
              )}
              <div className={styles.resultMeta}>
                <StatusBadge status={result.status} />
                <span className={shared.badge}>{result.pageType}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
