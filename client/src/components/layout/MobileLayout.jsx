import { NavLink } from 'react-router-dom';
import { useT } from '../../i18n/useT.js';
import { Button } from '../ui/Button.jsx';
import { UserMenu } from '../ui/UserMenu.jsx';

const NAV_ITEMS = [
  { to: '/student', labelKey: 'nav.quizzes', end: true },
  { to: '/student/results', labelKey: 'nav.results' },
  { to: '/student/profile', labelKey: 'nav.profile' },
];

// Responsive shell for every student screen. Tablet/desktop chrome is the same on every
// page: logo, the three nav links with an active state, language toggle + user menu - no
// page title, no duplicate "Home" link. On phone, a top-level page (Home/Results/Profile,
// no `onBack`) shows a bottom nav with the same three items; a detail page (`onBack` set,
// e.g. quiz intro/taking/result) shows a back button + page title instead (phone only, via
// CSS - see responsive.css), and no bottom nav, since it isn't one of the three destinations.
export function MobileLayout({ title, onBack, children }) {
  const { t, language, setLanguage } = useT();
  const isDetailPage = Boolean(onBack);

  return (
    <div className={`app-shell${isDetailPage ? ' app-shell--detail' : ''}`}>
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

        <NavLink to="/student" end className="app-shell__logo">
          {t('appName')}
        </NavLink>

        {isDetailPage && <h1 className="app-shell__title">{title}</h1>}

        <nav className="app-shell__nav" aria-label={t('nav.quizzes')}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `app-shell__nav-link${isActive ? ' app-shell__nav-link--active' : ''}`
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="app-shell__actions">
          <Button
            type="button"
            variant="secondary"
            className="app-shell__lang-toggle"
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          >
            {t('common.languageToggle')}
          </Button>
          <UserMenu />
        </div>
      </header>

      <main className="app-shell__content">
        <div className="app-shell__container">{children}</div>
      </main>

      {!isDetailPage && (
        <nav className="app-shell__bottom-nav glass glass--bar" aria-label={t('nav.quizzes')}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `app-shell__bottom-nav-link${isActive ? ' app-shell__bottom-nav-link--active' : ''}`
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
