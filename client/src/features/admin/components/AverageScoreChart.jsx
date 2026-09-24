import { useT } from '../../../i18n/useT.js';

// One bar per class, filled to its average score percentage. Plain CSS, no chart library.
// The numbers stay visible as text (never colour/length alone), and the whole chart carries
// one aria-label summary since the individual bars have no accessible text of their own.
export function AverageScoreChart({ rows }) {
  const { t } = useT();

  function valueText(row) {
    return row.averagePercent === null ? t('admin.overview.noAttempts') : `${row.averagePercent}%`;
  }

  const summary = rows.map((row) => `${row.className}: ${valueText(row)}`).join(', ');

  return (
    <div
      className="bar-chart"
      role="img"
      aria-label={`${t('admin.overview.avgByClassTitle')} - ${summary}`}
    >
      {rows.map((row) => (
        <div className="bar-chart__row" key={row.classId}>
          <span className="bar-chart__label">{row.className}</span>
          <div className="bar-chart__track">
            <div
              className="bar-chart__fill"
              style={{ inlineSize: `${row.averagePercent ?? 0}%` }}
            />
          </div>
          <span className="bar-chart__value">{valueText(row)}</span>
        </div>
      ))}
    </div>
  );
}
