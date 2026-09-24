import { useT } from '../../i18n/useT.js';
import { Dialog } from './Dialog.jsx';
import { Button } from './Button.jsx';

// A centred Dialog with a title, a body sentence, optional extra content (e.g. a reason
// field), an optional error line, and a Cancel/Confirm button pair - the shape every
// confirm prompt in the app shares (start a quiz, publish, delete a question, reset an
// attempt). Screens that need more than a plain body sentence pass it via `children`,
// which renders between the body and the error/actions.
export function ConfirmDialog({
  open,
  onClose,
  titleId,
  title,
  body,
  children,
  error,
  confirmLabel,
  confirmVariant = 'primary',
  confirmDisabled = false,
  cancelLabel,
  busy = false,
  onConfirm,
  variant = 'center',
}) {
  const { t } = useT();

  return (
    <Dialog open={open} onClose={onClose} titleId={titleId} variant={variant}>
      <h2 id={titleId} className="dialog__title">
        {title}
      </h2>
      {body && <p className="dialog__body">{body}</p>}
      {children}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog__actions">
        <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
          {cancelLabel ?? t('common.cancel')}
        </Button>
        <Button
          type="button"
          variant={confirmVariant}
          onClick={onConfirm}
          disabled={busy || confirmDisabled}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
