import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../lib/auth-context.js';
import { useWorkspace } from '../../lib/workspace-context.js';
import * as styles from './Sidebar.css.js';

const navItems = [
  { path: '/inbox', labelKey: 'nav.inbox' },
  { path: '/pages', labelKey: 'nav.pages' },
  { path: '/reviews', labelKey: 'nav.reviews' },
  { path: '/sources', labelKey: 'nav.sources' },
  { path: '/settings', labelKey: 'nav.settings' },
] as const;

export function Sidebar(): React.ReactElement {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { workspace } = useWorkspace();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>{t('app.name')}</div>

      {workspace && (
        <div className={styles.workspaceName}>{workspace.name}</div>
      )}

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? styles.navLinkActive : styles.navLink
            }
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className={styles.userSection}>
        <div className={styles.userName}>{user?.name ?? user?.email}</div>
        <button className={styles.logoutButton} onClick={logout}>
          {t('actions.signOut')}
        </button>
      </div>
    </aside>
  );
}
