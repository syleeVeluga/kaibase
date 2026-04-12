import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../lib/auth-context.js';
import { useWorkspace } from '../../lib/workspace-context.js';
import * as styles from './Sidebar.css.js';

function InboxIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9h3.5l1.5 2h2l1.5-2H14" />
      <path d="M3.04 4.69L2 9v3a1 1 0 001 1h10a1 1 0 001-1V9l-1.04-4.31A1 1 0 0012 4H4a1 1 0 00-.96.69z" />
    </svg>
  );
}

function PagesIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5L9 1z" />
      <path d="M9 1v4h4" />
      <path d="M6 8h4M6 11h4" />
    </svg>
  );
}

function ReviewsIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 14.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13z" />
      <path d="M5.5 8l2 2 3.5-3.5" />
    </svg>
  );
}

function SourcesIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 13H2V3l2-1.5L6 3l2-1.5L10 3l2-1.5L14 3v10z" />
      <path d="M5 7h6M5 10h4" />
    </svg>
  );
}

function SettingsIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M13.3 9.7a1.1 1.1 0 00.2 1.2l.04.04a1.33 1.33 0 11-1.88 1.88l-.04-.04a1.1 1.1 0 00-1.2-.2 1.1 1.1 0 00-.67 1.01v.12a1.33 1.33 0 11-2.67 0v-.06A1.1 1.1 0 006.4 12.6a1.1 1.1 0 00-1.2.2l-.04.04a1.33 1.33 0 11-1.88-1.88l.04-.04a1.1 1.1 0 00.2-1.2 1.1 1.1 0 00-1.01-.67h-.12a1.33 1.33 0 010-2.67h.06A1.1 1.1 0 003.46 5.7a1.1 1.1 0 00-.2-1.2l-.04-.04a1.33 1.33 0 111.88-1.88l.04.04a1.1 1.1 0 001.2.2h.05a1.1 1.1 0 00.67-1.01v-.12a1.33 1.33 0 012.67 0v.06a1.1 1.1 0 00.67 1.01 1.1 1.1 0 001.2-.2l.04-.04a1.33 1.33 0 111.88 1.88l-.04.04a1.1 1.1 0 00-.2 1.2v.05a1.1 1.1 0 001.01.67h.12a1.33 1.33 0 010 2.67h-.06a1.1 1.1 0 00-1.01.67z" />
    </svg>
  );
}

const navItems = [
  { path: '/inbox', labelKey: 'nav.inbox', icon: <InboxIcon /> },
  { path: '/pages', labelKey: 'nav.pages', icon: <PagesIcon /> },
  { path: '/reviews', labelKey: 'nav.reviews', icon: <ReviewsIcon /> },
  { path: '/sources', labelKey: 'nav.sources', icon: <SourcesIcon /> },
  { path: '/settings', labelKey: 'nav.settings', icon: <SettingsIcon /> },
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
            <span className={styles.navLinkContent}>
              {item.icon}
              {t(item.labelKey)}
            </span>
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
