import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Generic modal: a centred card (variant="center", e.g. Start/Publish/Reset confirms) or a
// bottom sheet (variant="sheet", e.g. the Submit sheet). Renders via a portal so it always
// sits above page content regardless of any parent's overflow/stacking context.
export function Dialog({ open, onClose, titleId, children, variant = 'center' }) {
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="dialog-overlay" role="presentation" onClick={onClose}>
      <div
        className={`dialog glass ${variant === 'sheet' ? 'dialog--sheet glass--sheet' : 'dialog--center'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
