import { NavLink } from 'react-router-dom';
import { useT } from '../../i18n/useT.js';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { Button } from '../ui/Button.jsx';

// Responsive shell for every student screen, mobile-first: on phone, a sticky bar with a
// back button + page title + language toggle over a single-column content area (see
// styles/responsive.css for what changes at tablet/desktop - same markup throughout, CSS
// only, per the "don't duplicate components per breakpoint" rule). From tablet up, the same
// bar also shows the logo, a Home nav link and the signed-in user's name; the back button
// hides since the Home link does the same job once there's room for real navigation.
export function MobileLayout({ title, onBack, children }) {
  const { t, language, setLanguage } = useT();
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-shell__bar glass glass--bar">
        {onBack ? (
          <button
            type="button"
            className="app-shell__back"
            onClick={onBack}
            aria-label={t('common.back')}
          >
            <span className="app-shell__back-icon" aria-hidden="true">
              &#8592;
            </span>
          </button>
        ) : (
          <span className="app-shell__back-spacer" aria-hidden="true" />
        )}

        <span className="app-shell__logo">{t('appName')}</span>
        <h1 className="app-shell__title">{title}</h1>

        <nav className="app-shell__nav" aria-label={t('nav.home')}>
          <NavLink
            to="/student"
            end
            className={({ isActive }) =>
              `app-shell__nav-link${isActive ? ' app-shell__nav-link--active' : ''}`
            }
          >
            {t('nav.home')}
          </NavLink>
        </nav>

        <div className="app-shell__actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          >
            {t('common.languageToggle')}
          </Button>
          <span className="app-shell__user-name">{user?.name}</span>
          <Button type="button" variant="secondary" onClick={logout}>
            {t('common.logout')}
          </Button>
        </div>
      </header>
      <main className="app-shell__content">
        <div className="app-shell__container">{children}</div>
      </main>
    </div>
  );
}
