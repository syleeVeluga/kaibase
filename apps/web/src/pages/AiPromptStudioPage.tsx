import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AiPromptConfigMerged, AiPromptFunctionDefault, AiPromptFunctionId } from '@kaibase/shared';
import { apiClient } from '../lib/api-client.js';
import { useWorkspace } from '../lib/workspace-context.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { MutationError } from '../components/MutationError.js';
import * as shared from '../theme/shared.css.js';
import * as styles from './AiPromptStudioPage.css.js';

const REASONING_LEVELS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'] as const;

export function AiPromptStudioPage(): React.ReactElement {
  const { t } = useTranslation(['settings', 'common']);
  const { workspace } = useWorkspace();
  const wid = workspace?.id;

  const configsQuery = useQuery({
    queryKey: ['ai-config', wid],
    queryFn: () =>
      apiClient.get<{ configs: AiPromptConfigMerged[] }>(`/workspaces/${wid}/ai-config`),
    enabled: !!wid,
  });

  const defaultsQuery = useQuery({
    queryKey: ['ai-config-defaults', wid],
    queryFn: () =>
      apiClient.get<{ defaults: AiPromptFunctionDefault[] }>(`/workspaces/${wid}/ai-config/defaults`),
    enabled: !!wid,
  });

  if (!wid) return <div className={shared.loading}>Select a workspace</div>;

  const configs = configsQuery.data?.configs ?? [];
  const defaults = defaultsQuery.data?.defaults ?? [];
  const defaultsMap = new Map(defaults.map((d) => [d.functionId, d]));
  const customizedFunctions = new Set(
    configs.filter((c) => c.hasOverride).map((c) => c.functionId),
  );

  return (
    <div>
      <Link to="/settings" className={shared.backLink}>
        {t('common:actions.back')}
      </Link>

      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>{t('settings:promptStudio.title')}</h1>
      </div>

      {/* Pipeline Visualization */}
      <PipelineVisualization customizedFunctions={customizedFunctions} />

      {configsQuery.isLoading && <div className={shared.loading}>Loading...</div>}
      {configsQuery.isError && <ErrorBanner error={configsQuery.error} onRetry={() => void configsQuery.refetch()} />}

      {/* Function Grid */}
      {configs.length > 0 && (
        <div className={styles.functionGrid}>
          {configs.map((config) => (
            <FunctionCard
              key={config.functionId}
              config={config}
              functionDefault={defaultsMap.get(config.functionId)}
              wid={wid}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pipeline Visualization                                             */
/* ------------------------------------------------------------------ */

function PipelineVisualization({
  customizedFunctions,
}: {
  customizedFunctions: Set<string>;
}): React.ReactElement {
  const { t } = useTranslation(['settings']);

  const node = (id: string, label: string, configurable: boolean): React.ReactElement => {
    const isCustomized = configurable && customizedFunctions.has(id);
    const cls = !configurable
      ? styles.pipelineNodeStatic
      : isCustomized
        ? styles.pipelineNodeCustomized
        : styles.pipelineNode;

    return (
      <span className={cls}>
        {isCustomized && <span className={styles.pipelineDot} />}
        {label}
      </span>
    );
  };

  return (
    <div className={styles.pipelineContainer}>
      <div className={styles.pipelineTitle}>{t('settings:promptStudio.pipeline.title')}</div>

      <div className={styles.pipelineRow}>
        {node('parse', t('settings:promptStudio.pipeline.parse'), false)}
        <span className={styles.pipelineArrow}>&rarr;</span>
        {node('classify', t('settings:promptStudio.pipeline.classify'), true)}
        <span className={styles.pipelineArrow}>&rarr;</span>

        <div className={styles.pipelineBranch}>
          {node('summarize', t('settings:promptStudio.pipeline.summarize'), true)}
          {node('extract-entities', t('settings:promptStudio.pipeline.extractEntities'), true)}
        </div>

        <span className={styles.pipelineArrow}>&rarr;</span>
        {node('create-page', t('settings:promptStudio.pipeline.createPage'), true)}
        <span className={styles.pipelineArrow}>&rarr;</span>
        {node('embedding', t('settings:promptStudio.pipeline.embedding'), false)}
      </div>

      <div className={styles.pipelineStandalone}>
        {node('answer-question', t('settings:promptStudio.pipeline.answerQuestion'), true)}
        <span className={styles.standaloneLabel}>(standalone)</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Function Config Card                                                */
/* ------------------------------------------------------------------ */

interface FunctionCardProps {
  config: AiPromptConfigMerged;
  functionDefault: AiPromptFunctionDefault | undefined;
  wid: string;
}

function FunctionCard({ config, functionDefault, wid }: FunctionCardProps): React.ReactElement {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDefaultTemplate, setShowDefaultTemplate] = useState(false);

  // Form state
  const [model, setModel] = useState(config.model);
  const [temperature, setTemperature] = useState<string>(
    config.temperature != null ? String(config.temperature) : '',
  );
  const [reasoningEffort, setReasoningEffort] = useState(config.reasoningEffort);
  const [systemPrompt, setSystemPrompt] = useState(config.systemPromptOverride ?? '');
  const [userPrompt, setUserPrompt] = useState(config.userPromptOverride ?? '');

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.put(`/workspaces/${wid}/ai-config/${config.functionId}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-config', wid] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      apiClient.delete(`/workspaces/${wid}/ai-config/${config.functionId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-config', wid] });
      setEditing(false);
      // Reset form to defaults
      if (functionDefault) {
        setModel(functionDefault.model);
        setTemperature('');
        setReasoningEffort(functionDefault.reasoningEffort);
        setSystemPrompt('');
        setUserPrompt('');
      }
    },
  });

  const handleSave = (): void => {
    const tempVal = temperature.trim() ? parseFloat(temperature) : null;
    updateMutation.mutate({
      model: model || null,
      temperature: tempVal != null && !isNaN(tempVal) ? tempVal : null,
      reasoningEffort: reasoningEffort || null,
      systemPromptOverride: systemPrompt.trim() || null,
      userPromptOverride: userPrompt.trim() || null,
      isActive: true,
    });
  };

  const handleReset = (): void => {
    if (!config.hasOverride) return;
    resetMutation.mutate();
  };

  const lang = i18n.language === 'ko' ? 'ko' : 'en';
  const description = functionDefault?.description[lang] ?? '';
  const variables = functionDefault?.variables ?? [];
  const fnKey = config.functionId as AiPromptFunctionId;

  return (
    <div className={config.hasOverride ? styles.functionCardCustomized : styles.functionCard} id={`fn-${config.functionId}`}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          {t(`settings:promptStudio.functions.${fnKey}.name`)}
        </span>
        <span className={config.hasOverride ? styles.badgeCustomized : styles.badgeDefault}>
          {config.hasOverride
            ? t('settings:promptStudio.status.customized')
            : t('settings:promptStudio.status.default')}
        </span>
      </div>

      <div className={styles.cardDescription}>{description}</div>

      <div className={styles.configSummary}>
        {functionDefault && (
          <span className={styles.versionTag}>{functionDefault.promptVersion}</span>
        )}
        <span className={styles.configTag}>
          <span className={styles.configTagLabel}>{t('settings:promptStudio.fields.model')}:</span> {config.model}
        </span>
        {config.temperature != null && (
          <span className={styles.configTag}>
            <span className={styles.configTagLabel}>{t('settings:promptStudio.fields.temperature')}:</span> {config.temperature}
          </span>
        )}
        <span className={styles.configTag}>
          <span className={styles.configTagLabel}>{t('settings:promptStudio.fields.reasoningEffort')}:</span>{' '}
          {t(`settings:promptStudio.reasoningLevels.${config.reasoningEffort}`)}
        </span>
      </div>

      <button
        className={shared.secondaryButton}
        onClick={() => {
          if (!editing) {
            // Sync form with current config
            setModel(config.model);
            setTemperature(config.temperature != null ? String(config.temperature) : '');
            setReasoningEffort(config.reasoningEffort);
            setSystemPrompt(config.systemPromptOverride ?? '');
            setUserPrompt(config.userPromptOverride ?? '');
          }
          setEditing(!editing);
          setSaved(false);
        }}
      >
        {editing ? t('common:actions.cancel') : t('settings:promptStudio.actions.edit')}
      </button>

      {editing && (
        <div className={styles.editForm}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('settings:promptStudio.fields.model')}</label>
              <input
                className={styles.formInput}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={functionDefault?.model ?? ''}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('settings:promptStudio.fields.reasoningEffort')}</label>
              <select
                className={styles.formSelect}
                value={reasoningEffort}
                onChange={(e) => setReasoningEffort(e.target.value as typeof reasoningEffort)}
              >
                {REASONING_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {t(`settings:promptStudio.reasoningLevels.${level}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('settings:promptStudio.fields.temperature')}</label>
            <input
              className={styles.formInput}
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="Default (provider decides)"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('settings:promptStudio.fields.systemPrompt')}</label>
            <textarea
              className={styles.formTextarea}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={t('settings:promptStudio.fields.systemPromptPlaceholder')}
              rows={8}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('settings:promptStudio.fields.userPrompt')}</label>
            <textarea
              className={styles.formTextarea}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder={t('settings:promptStudio.fields.userPromptPlaceholder')}
              rows={8}
            />
          </div>

          {functionDefault && (
            <div className={styles.defaultTemplateSection}>
              <button
                className={styles.defaultTemplateToggle}
                onClick={() => setShowDefaultTemplate(!showDefaultTemplate)}
              >
                <span>{showDefaultTemplate ? '▾' : '▸'}</span>
                {showDefaultTemplate
                  ? t('settings:promptStudio.actions.hideDefaultTemplate')
                  : t('settings:promptStudio.actions.viewDefaultTemplate')}
                {' '}
                <span className={styles.versionTag}>{functionDefault.promptVersion}</span>
              </button>
              {showDefaultTemplate && (
                <div className={styles.defaultTemplateContent}>
                  <div className={styles.defaultTemplateLabel}>
                    {t('settings:promptStudio.fields.systemPrompt')}
                  </div>
                  <pre className={styles.defaultTemplateText}>{functionDefault.defaultSystemPrompt}</pre>
                  <div className={styles.defaultTemplateLabel}>
                    {t('settings:promptStudio.fields.userPrompt')}
                  </div>
                  <pre className={styles.defaultTemplateText}>{functionDefault.defaultUserPrompt}</pre>
                </div>
              )}
            </div>
          )}

          {variables.length > 0 && (
            <div className={styles.variablesSection}>
              <strong>{t('settings:promptStudio.variables.title')}:</strong>{' '}
              {variables.map((v) => (
                <span key={v} className={styles.variableTag}>{v}</span>
              ))}
            </div>
          )}

          <div className={styles.formActions}>
            <button
              className={shared.primaryButton}
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? '...' : t('common:actions.save')}
            </button>
            {config.hasOverride && (
              <button
                className={shared.secondaryButton}
                onClick={handleReset}
                disabled={resetMutation.isPending}
              >
                {t('settings:promptStudio.actions.resetToDefault')}
              </button>
            )}
          </div>

          {saved && (
            <div className={styles.savedMessage}>{t('settings:promptStudio.status.saved')}</div>
          )}
          <MutationError error={updateMutation.error ?? resetMutation.error} />
        </div>
      )}
    </div>
  );
}
