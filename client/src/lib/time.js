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
