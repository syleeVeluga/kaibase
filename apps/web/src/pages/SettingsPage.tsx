import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import type { Language } from '@kaibase/shared';
import { useAuth } from '../lib/auth-context.js';
import { useWorkspace } from '../lib/workspace-context.js';
import * as shared from '../theme/shared.css.js';
import * as sourceStyles from './sources/SourcesPage.css.js';
import * as styles from './SettingsPage.css.js';

export function SettingsPage(): React.ReactElement {
  const { t } = useTranslation(['common', 'settings']);

  return (
    <div>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>{t('common:nav.settings')}</h1>
      </div>

      <WorkspaceSettings />
      <hr className={styles.divider} />
      <section>
        <h2 className={styles.sectionHeading}>
          {t('settings:templates.title')}
        </h2>
        <Link to="/settings/templates" className={shared.primaryButton}>
          {t('settings:templates.title')}
        </Link>
      </section>
      <hr className={styles.divider} />
      <section>
        <h2 className={styles.sectionHeading}>
          {t('settings:promptStudio.title')}
        </h2>
        <Link to="/settings/ai-prompts" className={shared.primaryButton}>
          {t('settings:promptStudio.title')}
        </Link>
      </section>
      <hr className={styles.divider} />
      <AccountSettings />
    </div>
  );
}

function WorkspaceSettings(): React.ReactElement {
  const { t } = useTranslation(['common', 'settings']);
  const { workspace, workspaces, selectWorkspace, updateWorkspace } = useWorkspace();
  const [name, setName] = useState(workspace?.name ?? '');
  const [defaultLanguage, setDefaultLanguage] = useState<Language>(workspace?.defaultLanguage ?? 'en');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(workspace?.name ?? '');
    setDefaultLanguage(workspace?.defaultLanguage ?? 'en');
    setSaved(false);
  }, [workspace?.id, workspace?.name, workspace?.defaultLanguage]);

  const mutation = useMutation({
    mutationFn: () =>
      updateWorkspace(workspace?.id ?? '', { name, defaultLanguage }),
    onSuccess: () => setSaved(true),
  });

  return (
    <section>
      <h2 className={styles.sectionHeading}>
        {t('settings:workspace.title')}
      </h2>

      {workspaces.length > 1 && (
        <div className={sourceStyles.formGroup}>
          <label className={sourceStyles.formLabel}>{t('settings:workspace.current')}</label>
          <select
            className={sourceStyles.formInput}
            value={workspace?.id ?? ''}
            onChange={(e) => selectWorkspace(e.target.value)}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      )}

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className={sourceStyles.formGroup}>
          <label className={sourceStyles.formLabel}>{t('settings:workspace.name')}</label>
          <input
            className={sourceStyles.formInput}
            value={name}
            onChange={(e) => { setName(e.target.value); setSaved(false); }}
          />
        </div>
        <div className={sourceStyles.formGroup}>
          <label className={sourceStyles.formLabel}>{t('settings:workspace.language')}</label>
          <select
            className={sourceStyles.formInput}
            value={defaultLanguage}
            onChange={(e) => {
              setDefaultLanguage(e.target.value as Language);
              setSaved(false);
            }}
          >
            <option value="en">{t('common:languages.en')}</option>
            <option value="ko">{t('common:languages.ko')}</option>
          </select>
        </div>
        <button className={shared.primaryButton} type="submit" disabled={mutation.isPending}>
          {saved ? t('settings:workspace.saved') : mutation.isPending ? t('settings:workspace.saving') : t('common:actions.save')}
        </button>
      </form>
    </section>
  );
}

function AccountSettings(): React.ReactElement {
  const { t } = useTranslation(['common', 'settings']);
  const { user, logout } = useAuth();

  return (
    <section>
      <h2 className={styles.sectionHeading}>
        {t('settings:account.title')}
      </h2>
      <p className={styles.accountDescription}>
        {t('settings:account.signedInAs')} <strong>{user?.email}</strong>
      </p>
      <button className={shared.secondaryButton} onClick={logout}>
        {t('common:actions.signOut')}
      </button>
    </section>
  );
}
