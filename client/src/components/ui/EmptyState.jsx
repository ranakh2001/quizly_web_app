import { useT } from '../../i18n/useT.js';
import { Button } from './Button.jsx';

// Glass card with an icon, a title, one helpful sentence and an optional action - the shared
// shape for every "nothing here" screen (see CLAUDE.md's "every data screen has an empty
// state" rule). title falls back to a generic i18n string, same pattern as ErrorState.
export function EmptyState({ icon = '🗒️', title, message, actionLabel, onAction }) {
  const { t } = useT();
  return (
    <div className="state-card glass">
      <span className="state-card__icon" aria-hidden="true">
        {icon}
      </span>
      <h2 className="state-card__title">{title ?? t('common.emptyTitle')}</h2>
      {message && <p className="state-card__message">{message}</p>}
      {actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
