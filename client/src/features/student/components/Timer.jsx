import { useEffect, useRef, useState } from 'react';
import { useT } from '../../../i18n/useT.js';
import { formatCountdown } from '../../../lib/time.js';

const ONE_MINUTE_MS = 60 * 1000;
const FIVE_MINUTES_MS = 5 * ONE_MINUTE_MS;

// Rule: teal > 5 min, bold dark text <= 5 min, danger <= 1 min, with aria-live announcements
// at those thresholds (not every second - that would spam a screen reader).
export function Timer({ remainingMs }) {
  const { t } = useT();
  const level =
    remainingMs <= ONE_MINUTE_MS
      ? 'critical'
      : remainingMs <= FIVE_MINUTES_MS
        ? 'warning'
        : 'normal';
  const [announcement, setAnnouncement] = useState('');
  const lastLevelRef = useRef(null);

  useEffect(() => {
    if (lastLevelRef.current === level) return;
    lastLevelRef.current = level;
    if (level === 'warning') setAnnouncement(t('student.taking.fiveMinutesLeft'));
    else if (level === 'critical') setAnnouncement(t('student.taking.oneMinuteLeft'));
  }, [level, t]);

  return (
    <div className={`timer timer--${level}`} role="timer">
      <span aria-hidden="true">{formatCountdown(remainingMs)}</span>
      <span className="visually-hidden" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
