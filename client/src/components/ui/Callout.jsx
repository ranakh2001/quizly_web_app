// A teal note for a single helpful message (e.g. "the review unlocks once the quiz closes"),
// or variant="danger" for a risk-carrying one (e.g. negative marking) - a neutral card with a
// danger left border and icon instead of a filled red block. Not an error and not a confirm
// dialog - just an inline heads-up.
export function Callout({ icon = 'ℹ', variant = 'info', children }) {
  return (
    <div className={`callout glass callout--${variant}`} role="note">
      <span className="callout__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="callout__text">{children}</p>
    </div>
  );
}
