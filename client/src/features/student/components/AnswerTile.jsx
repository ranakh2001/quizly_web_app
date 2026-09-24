// Solid white answer tile (never glass, per the design system). States: idle / selected /
// disabled always; correct / wrong only apply once the review has unlocked (ResultPage).
// shortcutHint (e.g. "A") is an optional visual reminder of the keyboard shortcut for this
// option on the Taking screen; ResultPage's review tiles don't pass one.
export function AnswerTile({ text, selected, outcome, disabled, onSelect, shortcutHint }) {
  const classes = ['answer-tile'];
  if (selected) classes.push('answer-tile--selected');
  if (outcome === 'correct') classes.push('answer-tile--correct');
  if (outcome === 'wrong') classes.push('answer-tile--wrong');
  if (disabled) classes.push('answer-tile--disabled');

  return (
    <button
      type="button"
      className={classes.join(' ')}
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
    >
      {shortcutHint && <span className="answer-tile__hint">{shortcutHint}</span>}
      {text}
    </button>
  );
}
