// Single place for date/time formatting. The server stores and sends UTC; this file is the
// only place that converts to Asia/Amman for display, in the active UI language - e.g.
// Arabic "24 سبتمبر 2026، 1:31 م", English "24 Sep 2026, 1:31 PM". Every screen must call
// these instead of formatting a date itself.

const TIME_ZONE = 'Asia/Amman';

// Intl locale codes, not our internal 'ar'/'en' language codes - kept as a small map so the
// rest of the app never has to know the difference.
const LOCALES = { ar: 'ar', en: 'en-GB' };

export function formatDateTime(isoString, language) {
  return new Intl.DateTimeFormat(LOCALES[language] ?? LOCALES.en, {
    timeZone: TIME_ZONE,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(isoString));
}

export function formatTime(isoString, language) {
  return new Intl.DateTimeFormat(LOCALES[language] ?? LOCALES.en, {
    timeZone: TIME_ZONE,
    timeStyle: 'medium',
  }).format(new Date(isoString));
}

// <input type="datetime-local"> always uses the BROWSER's local timezone, not Asia/Amman
// specifically - there's no way to pin a native datetime-local input to a fixed IANA zone.
// The value round-trips correctly regardless (a teacher sets a time on their own clock, it
// converts to the same UTC instant either way); this is a deliberate simplification, not a
// bug - a custom Amman-locked picker would be considerably more machinery for this scope.
export function toDateTimeLocalValue(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocalValue(localValue) {
  if (!localValue) return null;
  return new Date(localValue).toISOString();
}

// Formats a countdown duration as m:ss (or h:mm:ss once past an hour). Never negative -
// the deadline having passed is the caller's concern, not this formatter's.
export function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`;
  return `${minutes}:${paddedSeconds}`;
}
