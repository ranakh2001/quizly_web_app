import { useT } from '../../i18n/useT.js';
import { Button } from './Button.jsx';

// Same glass-card shape as EmptyState, for the "could not load this" case. message is the
// screen-specific sentence (e.g. "Could not load your quizzes."); title stays generic.
export function ErrorState({ title, message, onRetry }) {
  const { t } = useT();
  return (
    <div className="state-card glass" role="alert">
      <span className="state-card__icon" aria-hidden="true">
        ⚠️
      </span>
      <h2 className="state-card__title">{title ?? t('common.errorTitle')}</h2>
      <p className="state-card__message">{message ?? t('common.genericError')}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}
