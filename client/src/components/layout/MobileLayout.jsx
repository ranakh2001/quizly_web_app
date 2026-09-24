import { useT } from '../../i18n/useT.js';
import { Button } from '../ui/Button.jsx';

// Mobile-first shell (max ~440px column, centred) used by every student screen: a sticky
// glass top bar (optional back button + title + language toggle) over a scrollable content
// area.
export function MobileLayout({ title, onBack, children }) {
  const { t, language, setLanguage } = useT();

  return (
    <div className="mobile-shell">
      <header className="mobile-shell__bar glass glass--bar">
        {onBack ? (
          <button
            type="button"
            className="mobile-shell__back"
            onClick={onBack}
            aria-label={t('common.back')}
          >
            <span className="mobile-shell__back-icon" aria-hidden="true">
              &#8592;
            </span>
          </button>
        ) : (
          <span className="mobile-shell__back-spacer" />
        )}
        <h1 className="mobile-shell__title">{title}</h1>
        <Button
          type="button"
          variant="secondary"
          className="mobile-shell__lang"
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
        >
          {t('common.languageToggle')}
        </Button>
      </header>
      <main className="mobile-shell__content">{children}</main>
    </div>
  );
}
