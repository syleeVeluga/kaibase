import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { normalizeLanguageTag, type Language } from '@kaibase/shared';
import { apiClient } from '../lib/api-client.js';
import { useWorkspace } from '../lib/workspace-context.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import * as shared from '../theme/shared.css.js';
import * as styles from './DashboardPage.css.js';

interface DashboardStats {
  pages: { total: number; byStatus: Record<string, number>; byType: Record<string, number> };
  sources: { total: number; byStatus: Record<string, number> };
  collections: { total: number };
  activity: { recentCount: number };
  reviews: { byStatus: Record<string, number> };
}

interface HealthData {
  stalePages: number;
  publishedPages: number;
  embeddingCoverage: number;
  pendingReviews: number;
}

export function DashboardPage(): React.ReactElement {
  const { t, i18n } = useTranslation(['dashboard', 'common', 'errors']);
  const { workspace, createWorkspace } = useWorkspace();
  const wid = workspace?.id;
  const [name, setName] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState<Language>(
    normalizeLanguageTag(i18n.resolvedLanguage) ?? 'en',
  );
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats', wid],
    queryFn: () => apiClient.get<DashboardStats>(`/workspaces/${wid}/dashboard/stats`),
    enabled: !!wid,
  });

  const healthQuery = useQuery({
    queryKey: ['dashboard', 'health', wid],
    queryFn: () => apiClient.get<HealthData>(`/workspaces/${wid}/dashboard/health`),
    enabled: !!wid,
  });

  function toSlug(value: string): string {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);

    return slug || `workspace-${Date.now()}`;
  }

  async function handleCreateWorkspace(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setCreateError('');
    setIsCreating(true);

    try {
      await createWorkspace({
        name: name.trim(),
        slug: toSlug(name),
        defaultLanguage,
      });
      setName('');
    } catch {
      setCreateError(t('internal', { ns: 'errors' }));
    } finally {
      setIsCreating(false);
    }
  }

  if (!wid) {
    return (
      <div>
        <div className={shared.pageHeader}>
          <h1 className={shared.pageTitle}>{t('dashboard:title')}</h1>
        </div>

        <section className={styles.emptyStateCard}>
          <div className={styles.emptyStateContent}>
            <h2 className={styles.emptyStateTitle}>{t('dashboard:emptyState.title')}</h2>
            <p className={styles.emptyStateDescription}>{t('dashboard:emptyState.description')}</p>
          </div>

          <form className={styles.emptyStateForm} onSubmit={handleCreateWorkspace}>
            <label className={styles.emptyStateLabel} htmlFor="workspace-name">
              {t('dashboard:emptyState.nameLabel')}
            </label>
            <input
              id="workspace-name"
              className={styles.emptyStateInput}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('dashboard:emptyState.placeholder')}
              required
            />

            <label className={styles.emptyStateLabel} htmlFor="workspace-language">
              {t('dashboard:emptyState.languageLabel')}
            </label>
            <select
              id="workspace-language"
              className={styles.emptyStateInput}
              value={defaultLanguage}
              onChange={(event) => setDefaultLanguage(event.target.value as Language)}
            >
              <option value="en">{t('common:languages.en')}</option>
              <option value="ko">{t('common:languages.ko')}</option>
            </select>

            {createError && <div className={shared.errorBanner}>{createError}</div>}

            <button
              className={shared.primaryButton}
              type="submit"
              disabled={isCreating || !name.trim()}
            >
              {isCreating
                ? t('dashboard:emptyState.creating')
                : t('dashboard:emptyState.createAction')}
            </button>
          </form>
        </section>
      </div>
    );
  }

  const stats = statsQuery.data;
  const health = healthQuery.data;

  const coverageColor = (pct: number): string =>
    pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';

  return (
    <div>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>{t('dashboard:title')}</h1>
      </div>

      {statsQuery.isLoading && <div className={shared.loading}>Loading...</div>}

      {statsQuery.isError && <ErrorBanner error={statsQuery.error} onRetry={() => void statsQuery.refetch()} />}

      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.pages.total}</div>
            <div className={styles.statLabel}>{t('dashboard:stats.totalPages')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.sources.total}</div>
            <div className={styles.statLabel}>{t('dashboard:stats.totalSources')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.pages.byStatus['published'] ?? 0}</div>
            <div className={styles.statLabel}>{t('dashboard:stats.published')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.pages.byStatus['draft'] ?? 0}</div>
            <div className={styles.statLabel}>{t('dashboard:stats.drafts')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.activity.recentCount}</div>
            <div className={styles.statLabel}>{t('dashboard:stats.recentActivity')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.collections.total}</div>
            <div className={styles.statLabel}>{t('dashboard:stats.collections')}</div>
          </div>
        </div>
      )}

      {healthQuery.isError && <ErrorBanner error={healthQuery.error} onRetry={() => void healthQuery.refetch()} />}

      {health && (
        <div className={styles.healthSection}>
          <div className={styles.healthTitle}>{t('dashboard:health.title')}</div>
          <div className={styles.healthGrid}>
            <div className={styles.healthCard}>
              <div className={styles.healthLabel}>{t('dashboard:health.embeddingCoverage')}</div>
              <div className={styles.healthValue} style={{ color: coverageColor(health.embeddingCoverage) }}>
                {health.embeddingCoverage}%
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${health.embeddingCoverage}%`,
                    backgroundColor: coverageColor(health.embeddingCoverage),
                  }}
                />
              </div>
            </div>
            <div className={styles.healthCard}>
              <div className={styles.healthLabel}>{t('dashboard:health.stalePages')}</div>
              <div
                className={styles.healthValue}
                style={{ color: health.stalePages > 0 ? '#d97706' : '#16a34a' }}
              >
                {health.stalePages}
              </div>
            </div>
            <div className={styles.healthCard}>
              <div className={styles.healthLabel}>{t('dashboard:health.pendingReviews')}</div>
              <div className={styles.healthValue}>{health.pendingReviews}</div>
            </div>
            <div className={styles.healthCard}>
              <div className={styles.healthLabel}>{t('dashboard:health.publishedPages')}</div>
              <div className={styles.healthValue} style={{ color: '#16a34a' }}>
                {health.publishedPages}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
