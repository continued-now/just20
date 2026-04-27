import { useCallback, useEffect, useRef, useState } from 'react';
import { getSetting, getLastFiredNudge } from '../lib/db';

const WINDOW_MS = 10 * 60 * 1000;

export function useCountdown() {
  const [windowStartMs, setWindowStartMs] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshWindow = useCallback(async () => {
    const mode = await getSetting('notification_mode');
    const clearedAt = parseInt((await getSetting('countdown_cleared_at')) ?? '0', 10);

    let windowStart = 0;

    if (mode === 'scheduled') {
      const hour = parseInt((await getSetting('scheduled_hour')) ?? '8', 10);
      const now = new Date();
      const candidate = new Date();
      candidate.setHours(hour, 0, 0, 0);
      const candidateMs = candidate.getTime();
      if (candidateMs <= now.getTime() && clearedAt < candidateMs && now.getTime() - candidateMs < WINDOW_MS) {
        windowStart = candidateMs;
      }
    } else {
      const lastFired = await getLastFiredNudge();
      if (lastFired && clearedAt < lastFired) {
        windowStart = lastFired;
      }
    }

    setWindowStartMs(windowStart);
  }, []);

  const clearCountdown = useCallback(async () => {
    await import('../lib/db').then(({ setSetting }) =>
      setSetting('countdown_cleared_at', String(Date.now()))
    );
    setWindowStartMs(0);
    setRemainingMs(0);
  }, []);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!windowStartMs) {
      setRemainingMs(0);
      return;
    }

    const tick = () => {
      const rem = Math.max(0, WINDOW_MS - (Date.now() - windowStartMs));
      setRemainingMs(rem);
      if (rem === 0) setWindowStartMs(0);
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [windowStartMs]);

  return { remainingMs, refreshWindow, clearCountdown };
}
