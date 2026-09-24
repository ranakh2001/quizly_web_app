import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { useT } from '../../../i18n/useT.js';

export function SubmitSheet({ open, unansweredCount, submitting, onConfirm, onCancel }) {
  const { t } = useT();

  return (
    <ConfirmDialog
      open={open}
      onClose={onCancel}
      titleId="submit-sheet-title"
      variant="sheet"
      title={t('student.submitSheet.title')}
      body={
        unansweredCount > 0
          ? t('student.submitSheet.unansweredCount', { count: unansweredCount })
          : t('student.submitSheet.allAnswered')
      }
      cancelLabel={t('student.submitSheet.keepAnswering')}
      confirmLabel={t('student.submitSheet.confirm')}
      busy={submitting}
      onConfirm={onConfirm}
    />
  );
}
