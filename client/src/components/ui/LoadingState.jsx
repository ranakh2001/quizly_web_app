import { useT } from '../../i18n/useT.js';

export function LoadingState() {
  const { t } = useT();
  return (
    <div className="state-message" role="status" aria-live="polite">
      {t('common.loading')}
    </div>
  );
}
