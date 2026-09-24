import { useEffect, useRef, useState } from 'react';

// Counts down to deadlineIso using the server's clock, not the device's (rule 5): serverNowIso
// is a timestamp from the API response, captured once as an offset from the device clock at
// that instant, then applied on every tick so a wrong device clock never affects the timer.
//
// Before the attempt has loaded, deadlineIso is undefined; this must return Infinity (not 0
// or NaN) so a caller checking "has time run out?" doesn't read the still-loading state as
// the deadline having already passed - NaN > 0 is false, which is exactly that false alarm.
export function useCountdown(deadlineIso, serverNowIso) {
  const offsetRef = useRef(0);
  const hasDeadline = Boolean(deadlineIso);
  const deadlineMs = hasDeadline ? new Date(deadlineIso).getTime() : null;

  if (serverNowIso) {
    offsetRef.current = new Date(serverNowIso).getTime() - Date.now();
  }

  const [remainingMs, setRemainingMs] = useState(() =>
    hasDeadline ? Math.max(0, deadlineMs - (Date.now() + offsetRef.current)) : Infinity,
  );

  useEffect(() => {
    if (deadlineMs === null) return undefined;
    const tick = () => setRemainingMs(Math.max(0, deadlineMs - (Date.now() + offsetRef.current)));
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [deadlineMs]);

  return remainingMs;
}
