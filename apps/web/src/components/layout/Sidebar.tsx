import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
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

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>{t('app.name')}</div>
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
    </aside>
  );
}
