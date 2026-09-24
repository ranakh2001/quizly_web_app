import { Dialog } from '../../../components/ui/Dialog.jsx';
import { useT } from '../../../i18n/useT.js';

// No cancel/confirm here on purpose: once the deadline hits, submission is automatic
// (rule 7 handles auto-submit server-side regardless), this just tells the student why.
export function TimesUpDialog({ open }) {
  const { t } = useT();

  return (
    <Dialog open={open} titleId="times-up-title" variant="center">
      <h2 id="times-up-title" className="dialog__title">
        {t('student.timesUp.title')}
      </h2>
      <p className="dialog__body">{t('student.timesUp.body')}</p>
    </Dialog>
  );
}
