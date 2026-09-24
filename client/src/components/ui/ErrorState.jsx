import { useT } from '../../i18n/useT.js';
import { Button } from './Button.jsx';

export function ErrorState({ message, onRetry }) {
  const { t } = useT();
  return (
    <div className="state-message state-message--error" role="alert">
      <p>{message ?? t('common.genericError')}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}
