import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useWorkspace } from '../../lib/workspace-context.js';
import * as styles from './AuthPage.css.js';

export function WorkspaceSetupPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createWorkspace } = useWorkspace();

  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function toSlug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await createWorkspace({ name, slug: toSlug(name) });
      navigate('/inbox', { replace: true });
    } catch {
      setError(t('internal', { ns: 'errors' }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create Workspace</h1>
        <p className={styles.subtitle}>Set up your first knowledge workspace</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="wsname">Workspace name</label>
            <input
              id="wsname"
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Team"
              required
            />
          </div>

          <button className={styles.button} type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}
