// Solid white answer tile (never glass, per the design system). States: idle / selected /
// disabled always; correct / wrong only apply once the review has unlocked (ResultPage).
export function AnswerTile({ text, selected, outcome, disabled, onSelect }) {
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
      {text}
    </button>
  );
}
