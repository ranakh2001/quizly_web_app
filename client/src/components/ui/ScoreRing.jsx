const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// A circular progress ring showing score/maxScore. Purely presentational and reusable
// (teacher/admin result screens can use it later too).
export function ScoreRing({ score, maxScore, label }) {
  const percent = maxScore > 0 ? Math.min(1, Math.max(0, score / maxScore)) : 0;
  const offset = CIRCUMFERENCE * (1 - percent);

  return (
    <div className="score-ring" role="img" aria-label={label}>
      <svg viewBox="0 0 120 120" className="score-ring__svg" aria-hidden="true">
        <circle className="score-ring__track" cx="60" cy="60" r={RADIUS} />
        <circle
          className="score-ring__value"
          cx="60"
          cy="60"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="score-ring__text" aria-hidden="true">
        <span className="score-ring__score">{score}</span>
        {/* One isolate around the whole "/ maxScore" fragment - a lone bdi per number
            still lets the neutral "/" between them flip order in RTL (e.g. "30 /"
            instead of "/ 30"); isolating the fragment as a unit keeps it as authored. */}
        <bdi className="score-ring__max">/ {maxScore}</bdi>
      </div>
    </div>
  );
}
