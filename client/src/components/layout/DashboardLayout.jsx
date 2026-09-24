import { NavLink } from 'react-router-dom';
import { useT } from '../../i18n/useT.js';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { Button } from '../ui/Button.jsx';

// Desktop sidebar shell for teacher/admin (per the design brief - students get the mobile
// shell, staff get a sidebar). Narrower than ~600px it becomes a plain top bar instead of a
// side column (see styles/responsive.css) so it isn't unusable on a small screen, but this
// area is designed desktop-first, unlike the student screens.
const NAV_ITEMS = {
  teacher: [{ to: '/teacher', label: 'nav.dashboard', end: true }],
  admin: [
    { to: '/admin', label: 'nav.overview', end: true },
    { to: '/admin/import', label: 'nav.import' },
    { to: '/admin/quizzes', label: 'nav.results' },
  ],
};

export function DashboardLayout({ title, children }) {
  const { t, language, setLanguage } = useT();
  const { user, logout } = useAuth();
  const navItems = NAV_ITEMS[user?.role] ?? [];

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-shell__sidebar glass glass--bar">
        <div className="dashboard-shell__brand">{t('appName')}</div>

        <nav className="dashboard-shell__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `dashboard-shell__nav-link${isActive ? ' dashboard-shell__nav-link--active' : ''}`
              }
            >
              {t(item.label)}
            </NavLink>
          ))}
        </nav>

        <div className="dashboard-shell__footer">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          >
            {t('common.languageToggle')}
          </Button>
          <p className="dashboard-shell__user-name">{user?.name}</p>
          <Button type="button" variant="secondary" onClick={logout}>
            {t('common.logout')}
          </Button>
        </div>
      </aside>

      <div className="dashboard-shell__body">
        <header className="dashboard-shell__header glass glass--bar">
          <h1 className="dashboard-shell__title">{title}</h1>
        </header>
        <main className="dashboard-shell__content">
          <div className="dashboard-shell__container">{children}</div>
        </main>
      </div>
    </div>
  );
}
