import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../lib/api-client.js';
import { useWorkspace } from '../lib/workspace-context.js';
import * as styles from './CommandPalette.css.js';

interface SearchResult {
  pageId: string;
  title: string;
  pageType: string;
  status: string;
  slug: string;
  snippet: string;
  score: number;
}

export function CommandPalette(): React.ReactElement | null {
  const { t } = useTranslation(['search', 'common']);
  const { workspace } = useWorkspace();
  const navigate = useNavigate();
  const wid = workspace?.id;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  const doSearch = useCallback(
    async (q: string) => {
      if (!wid || q.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await apiClient.post<{ results: SearchResult[]; total: number }>(
          `/workspaces/${wid}/search`,
          { query: q, limit: 8 },
        );
        setResults(data.results);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [wid],
  );

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleSelect = (pageId: string) => {
    setOpen(false);
    navigate(`/pages/${pageId}`);
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputWrapper}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={t('search:placeholder')}
          />
        </div>

        <div className={styles.results}>
          {loading && (
            <div className={styles.hint}>{t('search:searching')}</div>
          )}

          {!loading && results.length === 0 && query.length >= 2 && (
            <div className={styles.hint}>{t('search:noResults')}</div>
          )}

          {results.map((r) => (
            <div
              key={r.pageId}
              className={styles.resultItem}
              onClick={() => handleSelect(r.pageId)}
            >
              <span className={styles.resultTitle}>{r.title}</span>
              <span className={styles.resultType}>{r.pageType}</span>
            </div>
          ))}
        </div>

        {!query && (
          <div className={styles.hint}>
            {t('search:hint')}
          </div>
        )}
      </div>
    </div>
  );
}
