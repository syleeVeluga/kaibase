import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pageTypeSchema } from '@kaibase/shared';
import { apiClient } from '../lib/api-client.js';
import { useWorkspace } from '../lib/workspace-context.js';
import * as shared from '../theme/shared.css.js';
import * as styles from './TemplatesPage.css.js';

interface PageTemplate {
  id: string;
  name: string;
  pageType: string;
  sections: Array<{ name: string; description?: string; required: boolean }>;
  aiInstructions: string | null;
  isActive: boolean;
  createdAt: string;
}

export function TemplatesPage(): React.ReactElement {
  const { t } = useTranslation(['settings', 'common']);
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wid = workspace?.id;

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [pageType, setPageType] = useState('project');
  const [aiInstructions, setAiInstructions] = useState('');

  const query = useQuery({
    queryKey: ['templates', wid],
    queryFn: () =>
      apiClient.get<{ templates: PageTemplate[] }>(`/workspaces/${wid}/templates`),
    enabled: !!wid,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; pageType: string; aiInstructions?: string }) =>
      apiClient.post(`/workspaces/${wid}/templates`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['templates', wid] });
      setShowForm(false);
      setName('');
      setPageType('project');
      setAiInstructions('');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/workspaces/${wid}/templates/${id}`, { isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['templates', wid] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/workspaces/${wid}/templates/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['templates', wid] });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      pageType,
      aiInstructions: aiInstructions.trim() || undefined,
    });
  };

  if (!wid) return <div className={shared.loading}>Select a workspace</div>;

  const templates = query.data?.templates ?? [];

  return (
    <div>
      <Link to="/settings" className={shared.backLink}>
        {t('common:actions.back')}
      </Link>

      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>{t('settings:templates.title')}</h1>
        <button
          className={shared.primaryButton}
          onClick={() => setShowForm(!showForm)}
        >
          {t('settings:templates.create')}
        </button>
      </div>

      {showForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('settings:templates.name')}</label>
            <input
              className={styles.formInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('settings:templates.pageType')}</label>
            <select
              className={styles.formSelect}
              value={pageType}
              onChange={(e) => setPageType(e.target.value)}
            >
              {pageTypeSchema.options.map((pt) => (
                <option key={pt} value={pt}>{pt}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('settings:templates.aiInstructions')}</label>
            <textarea
              className={styles.formTextarea}
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
            />
          </div>
          <div className={styles.formActions}>
            <button
              className={shared.secondaryButton}
              type="button"
              onClick={() => setShowForm(false)}
            >
              {t('common:actions.cancel')}
            </button>
            <button
              className={shared.primaryButton}
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
            >
              {createMutation.isPending ? '...' : t('common:actions.save')}
            </button>
          </div>
        </form>
      )}

      {query.isLoading && <div className={shared.loading}>Loading...</div>}

      {!query.isLoading && templates.length === 0 && !showForm && (
        <div className={shared.emptyState}>{t('settings:templates.empty')}</div>
      )}

      {templates.length > 0 && (
        <div className={styles.list}>
          {templates.map((tmpl) => (
            <div key={tmpl.id} className={styles.templateRow}>
              <div>
                <div className={styles.templateName}>{tmpl.name}</div>
                <span className={shared.textMeta}>{tmpl.pageType}</span>
              </div>
              <div className={styles.templateMeta}>
                <span className={tmpl.isActive ? shared.badgePublished : shared.badgeDraft}>
                  {tmpl.isActive ? t('settings:templates.active') : t('settings:templates.inactive')}
                </span>
                <button
                  className={shared.secondaryButton}
                  onClick={() => toggleMutation.mutate({ id: tmpl.id, isActive: !tmpl.isActive })}
                >
                  {tmpl.isActive ? t('settings:templates.inactive') : t('settings:templates.active')}
                </button>
                <button
                  className={shared.secondaryButton}
                  onClick={() => deleteMutation.mutate(tmpl.id)}
                >
                  {t('common:actions.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
