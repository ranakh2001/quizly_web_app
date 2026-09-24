// A teal glass note for a single helpful message (e.g. "the review unlocks once the quiz
// closes"). Not an error and not a confirm dialog - just an inline heads-up.
export function Callout({ icon = 'ℹ', children }) {
  return (
    <div className="callout glass" role="note">
      <span className="callout__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="callout__text">{children}</p>
    </div>
  );
}
