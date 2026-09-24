// Single place for date/time formatting. The server stores and sends UTC; this file
// is the only place that converts to Asia/Amman for display.

const TIME_ZONE = 'Asia/Amman';

export function formatDateTime(isoString) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoString));
}

export function formatTime(isoString) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    timeStyle: 'medium',
  }).format(new Date(isoString));
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
