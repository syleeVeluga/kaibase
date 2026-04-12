import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar.js';
import * as styles from './Layout.css.js';

export function Layout(): React.ReactElement {
  return (
    <div className={styles.container}>
      <Sidebar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
