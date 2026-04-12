import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { activityEventTypeSchema } from '@kaibase/shared';
import { apiClient } from '../lib/api-client.js';
import { useWorkspace } from '../lib/workspace-context.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import * as shared from '../theme/shared.css.js';
import * as styles from './ActivityPage.css.js';

interface ActivityEvent {
  id: string;
  eventType: string;
  actorType: string;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
}

const EVENT_ICONS: Record<string, string> = {
  ingest: 'IN',
  classify: 'CL',
  page_create: 'PC',
  page_update: 'PU',
  page_publish: 'PP',
  query: 'Q',
  answer: 'A',
  review_create: 'RC',
  review_complete: 'RD',
  lint: 'LT',
  policy_update: 'PO',
};

export function ActivityPage(): React.ReactElement {
  const { t } = useTranslation(['activity', 'common']);
  const { workspace } = useWorkspace();
  const wid = workspace?.id;
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (eventTypeFilter) params.set('eventType', eventTypeFilter);
    if (cursor) params.set('cursor', cursor);
    params.set('limit', '50');
    return params.toString();
  }, [eventTypeFilter, cursor]);

  const query = useQuery({
    queryKey: ['activity', wid, eventTypeFilter, cursor],
    queryFn: () =>
      apiClient.get<{ events: ActivityEvent[]; nextCursor: string | null }>(
        `/workspaces/${wid}/activity?${buildParams()}`,
      ),
    enabled: !!wid,
  });

  if (!wid) return <div className={shared.loading}>Select a workspace</div>;

  const events = query.data?.events ?? [];
  const nextCursor = query.data?.nextCursor;

  const formatTime = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const formatDetail = (event: ActivityEvent): string => {
    const d = event.detail;
    if (event.eventType === 'query' && d['question']) return String(d['question']);
    if (event.eventType === 'answer' && d['question']) return `Answer: ${String(d['question'])}`;
    if (d['title']) return String(d['title']);
    if (event.targetType && event.targetId) return `${event.targetType} ${event.targetId.slice(0, 8)}...`;
    return '';
  };

  return (
    <div>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>{t('activity:title')}</h1>
      </div>

      <div className={styles.filters}>
        <select
          className={styles.filterSelect}
          value={eventTypeFilter}
          onChange={(e) => {
            setEventTypeFilter(e.target.value);
            setCursor(undefined);
          }}
        >
          <option value="">{t('activity:filter.all')}</option>
          {activityEventTypeSchema.options.map((et) => (
            <option key={et} value={et}>
              {t(`activity:eventType.${et}`, et)}
            </option>
          ))}
        </select>
      </div>

      {query.isLoading && <div className={shared.loading}>Loading...</div>}

      {query.isError && <ErrorBanner error={query.error} onRetry={() => void query.refetch()} />}

      {!query.isLoading && !query.isError && events.length === 0 && (
        <div className={shared.emptyState}>{t('activity:empty')}</div>
      )}

      {events.length > 0 && (
        <div className={styles.timeline}>
          {events.map((event) => (
            <div key={event.id} className={styles.eventRow}>
              <div className={styles.eventIcon}>
                {EVENT_ICONS[event.eventType] ?? '?'}
              </div>
              <div className={styles.eventContent}>
                <div className={styles.eventType}>
                  {t(`activity:eventType.${event.eventType}`, event.eventType)}
                </div>
                <div className={styles.eventDetail}>{formatDetail(event)}</div>
              </div>
              <div className={styles.eventTime}>{formatTime(event.createdAt)}</div>
            </div>
          ))}
        </div>
      )}

      {nextCursor && (
        <div className={styles.loadMore}>
          <button
            className={shared.secondaryButton}
            onClick={() => setCursor(nextCursor)}
          >
            {t('activity:loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
