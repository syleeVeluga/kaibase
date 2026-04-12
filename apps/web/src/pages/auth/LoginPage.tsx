import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../lib/auth-context.js';
import { ApiError } from '../../lib/api-client.js';
import * as styles from './AuthPage.css.js';

export function LoginPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/inbox', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        const code = err.body['code'] as string | undefined;
        setError(code === 'INVALID_CREDENTIALS'
          ? t('invalidCredentials', { ns: 'errors' })
          : t('internal', { ns: 'errors' }));
      } else {
        setError(t('internal', { ns: 'errors' }));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('app.name')}</h1>
        <p className={styles.subtitle}>{t('auth.signInTitle')}</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="password">{t('auth.password')}</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? t('auth.signingIn') : t('actions.signIn')}
          </button>
        </form>

        <p className={styles.switchLink}>
          {t('auth.noAccount')} <Link to="/register">{t('actions.createAccount')}</Link>
        </p>
      </div>
    </div>
  );
}
