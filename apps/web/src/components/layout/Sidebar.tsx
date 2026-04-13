import { useRef, useState, useEffect } from 'react';
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

function DashboardIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="5" height="5" rx="0.5" />
      <rect x="9" y="2" width="5" height="5" rx="0.5" />
      <rect x="2" y="9" width="5" height="5" rx="0.5" />
      <rect x="9" y="9" width="5" height="5" rx="0.5" />
    </svg>
  );
}

function SearchIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  );
}

function ActivityIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2 8 5 4 8 10 11 6 14 8" />
    </svg>
  );
}

function CollectionsIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <path d="M6 1v2M10 1v2" />
      <path d="M5 7h6M5 10h4" />
    </svg>
  );
}

function QAIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 3V3z" />
      <path d="M6 5h4M6 8h2" />
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
  { path: '/', labelKey: 'nav.dashboard', icon: <DashboardIcon /> },
  { path: '/inbox', labelKey: 'nav.inbox', icon: <InboxIcon /> },
  { path: '/pages', labelKey: 'nav.pages', icon: <PagesIcon /> },
  { path: '/reviews', labelKey: 'nav.reviews', icon: <ReviewsIcon /> },
  { path: '/collections', labelKey: 'nav.collections', icon: <CollectionsIcon /> },
  { path: '/qa', labelKey: 'nav.qa', icon: <QAIcon /> },
  { path: '/search', labelKey: 'nav.search', icon: <SearchIcon /> },
  { path: '/activity', labelKey: 'nav.activity', icon: <ActivityIcon /> },
  { path: '/sources', labelKey: 'nav.sources', icon: <SourcesIcon /> },
  { path: '/settings', labelKey: 'nav.settings', icon: <SettingsIcon /> },
] as const;

function ChevronDownIcon(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4l4 4 4-4" />
    </svg>
  );
}

function CheckIcon(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6l3 3 5-5" />
    </svg>
  );
}

export function Sidebar(): React.ReactElement {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { workspace, workspaces, selectWorkspace } = useWorkspace();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [dropdownOpen]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>{t('app.name')}</div>

      {workspace && (
        <div ref={switcherRef} className={styles.workspaceSwitcher}>
          <button
            className={styles.workspaceSwitcherButton}
            aria-label={t('workspace.switch')}
            aria-expanded={dropdownOpen}
            onClick={() => setDropdownOpen((o) => !o)}
          >
            <span className={styles.workspaceSwitcherName}>{workspace.name}</span>
            <span className={`${styles.workspaceSwitcherChevron}${dropdownOpen ? ` ${styles.workspaceSwitcherChevronOpen}` : ''}`}>
              <ChevronDownIcon />
            </span>
          </button>
          {dropdownOpen && (
            <div className={styles.workspaceDropdown}>
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  className={styles.workspaceDropdownItem}
                  onClick={() => { selectWorkspace(w.id); setDropdownOpen(false); }}
                >
                  <span className={styles.workspaceDropdownCheck}>
                    {w.id === workspace.id && <CheckIcon />}
                  </span>
                  <span>{w.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
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
