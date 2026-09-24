import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useT } from '../../i18n/useT.js';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { Button } from '../ui/Button.jsx';
import { UserMenu } from '../ui/UserMenu.jsx';

function OverviewIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" {...props}>
      <path
        d="M4 4h7v7H4zM13 4h7v7h-7zM13 13h7v7h-7zM4 13h7v7H4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ImportIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" {...props}>
      <path
        d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ResultsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" {...props}>
      <path
        d="M4 20V10m8 10V4m8 16v-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MenuIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" {...props}>
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Desktop sidebar shell for teacher/admin (per the design brief - students get the mobile
// shell, staff get a sidebar). On phone, the sidebar becomes an off-canvas drawer opened via
// the menu button in the top bar (see styles/responsive.css for the tablet+ breakpoint where
// it turns into a fixed vertical column instead).
const NAV_ITEMS = {
  teacher: [{ to: '/teacher', label: 'nav.dashboard', end: true, icon: OverviewIcon }],
  admin: [
    { to: '/admin', label: 'nav.overview', end: true, icon: OverviewIcon },
    { to: '/admin/import', label: 'nav.import', icon: ImportIcon },
    { to: '/admin/quizzes', label: 'nav.results', icon: ResultsIcon },
  ],
};

export function DashboardLayout({ title, children }) {
  const { t, language, setLanguage } = useT();
  const { user } = useAuth();
  const navItems = NAV_ITEMS[user?.role] ?? [];
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // Closes the drawer whenever the route changes, so navigating never leaves it open.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="dashboard-shell">
      <aside
        className={`dashboard-shell__sidebar glass glass--bar${
          navOpen ? ' dashboard-shell__sidebar--open' : ''
        }`}
      >
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
              <item.icon className="dashboard-shell__nav-icon" aria-hidden="true" />
              <span>{t(item.label)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {navOpen && (
        <button
          type="button"
          className="dashboard-shell__backdrop"
          aria-label={t('common.closeMenu')}
          onClick={() => setNavOpen(false)}
        />
      )}

      <div className="dashboard-shell__body">
        <header className="dashboard-shell__header glass glass--bar">
          <div className="dashboard-shell__header-start">
            <button
              type="button"
              className="dashboard-shell__menu-button"
              aria-label={t(navOpen ? 'common.closeMenu' : 'common.openMenu')}
              aria-expanded={navOpen}
              onClick={() => setNavOpen((value) => !value)}
            >
              <MenuIcon aria-hidden="true" />
            </button>
            <h1 className="dashboard-shell__title">{title}</h1>
          </div>

          <div className="dashboard-shell__header-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            >
              {t('common.languageToggle')}
            </Button>
            <UserMenu />
          </div>
        </header>

        <main className="dashboard-shell__content">
          <div className="dashboard-shell__container">{children}</div>
        </main>
      </div>
    </div>
  );
}
