import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client.js';
import { useAuth } from '../lib/auth-context.js';
import { useWorkspace } from '../lib/workspace-context.js';
import * as shared from '../theme/shared.css.js';
import * as sourceStyles from './sources/SourcesPage.css.js';

export function SettingsPage(): React.ReactElement {
  const { t } = useTranslation(['common', 'settings']);

  return (
    <div>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>{t('common:nav.settings')}</h1>
      </div>

      <WorkspaceSettings />
      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '24px 0' }} />
      <section>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
          {t('settings:templates.title')}
        </h2>
        <Link to="/settings/templates" className={shared.primaryButton}>
          {t('settings:templates.title')}
        </Link>
      </section>
      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '24px 0' }} />
      <AccountSettings />
    </div>
  );
}

function WorkspaceSettings(): React.ReactElement {
  const { workspace, workspaces, selectWorkspace } = useWorkspace();
  const [name, setName] = useState(workspace?.name ?? '');
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.patch(`/workspaces/${workspace?.id ?? ''}`, { name }),
    onSuccess: () => setSaved(true),
  });

  return (
    <section>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
        Workspace
      </h2>

      {workspaces.length > 1 && (
        <div className={sourceStyles.formGroup}>
          <label className={sourceStyles.formLabel}>Current workspace</label>
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
          <label className={sourceStyles.formLabel}>Workspace name</label>
          <input
            className={sourceStyles.formInput}
            value={name}
            onChange={(e) => { setName(e.target.value); setSaved(false); }}
          />
        </div>
        <button className={shared.primaryButton} type="submit" disabled={mutation.isPending}>
          {saved ? 'Saved!' : mutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </form>
    </section>
  );
}

function AccountSettings(): React.ReactElement {
  const { user, logout } = useAuth();

  return (
    <section>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
        Account
      </h2>
      <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px' }}>
        Signed in as <strong>{user?.email}</strong>
      </p>
      <button className={shared.secondaryButton} onClick={logout}>
        Sign out
      </button>
    </section>
  );
}
