import { Dialog } from '../../../components/ui/Dialog.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { useT } from '../../../i18n/useT.js';

export function SubmitSheet({ open, unansweredCount, submitting, onConfirm, onCancel }) {
  const { t } = useT();

  return (
    <Dialog open={open} onClose={onCancel} titleId="submit-sheet-title" variant="sheet">
      <h2 id="submit-sheet-title" className="dialog__title">
        {t('student.submitSheet.title')}
      </h2>
      <p className="dialog__body">
        {unansweredCount > 0
          ? t('student.submitSheet.unansweredCount', { count: unansweredCount })
          : t('student.submitSheet.allAnswered')}
      </p>
      <div className="dialog__actions">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          {t('student.submitSheet.keepAnswering')}
        </Button>
        <Button onClick={onConfirm} disabled={submitting}>
          {t('student.submitSheet.confirm')}
        </Button>
      </div>
    </Dialog>
  );
}
