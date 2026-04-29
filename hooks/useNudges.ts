import { useState, useEffect, useCallback, useRef } from 'react';
import { getSetting } from '../lib/db';
import {
  DEFAULT_NOTIFICATION_MODE,
  DEFAULT_SCHEDULED_HOUR,
  type NotificationMode,
  getRemainingNudgeCount,
  hasScheduledWindowNotification,
  scheduleNudges,
} from '../lib/notifications';

function normalizeMode(value: string | null): NotificationMode {
  if (value === 'scheduled_fallback' || value === 'strict' || value === 'random') return value;
  if (value === 'scheduled') return 'strict';
  return DEFAULT_NOTIFICATION_MODE;
}

export function useNudges() {
  const mountedRef = useRef(true);
  const [remaining, setRemaining] = useState(0);
  const [mode, setMode] = useState<NotificationMode>(DEFAULT_NOTIFICATION_MODE);
  const [scheduledHour, setScheduledHour] = useState(DEFAULT_SCHEDULED_HOUR);
  const [scheduledWindowActive, setScheduledWindowActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [count, windowActive, savedMode, savedHour] = await Promise.all([
        getRemainingNudgeCount(),
        hasScheduledWindowNotification(),
        getSetting('notification_mode'),
        getSetting('scheduled_hour'),
      ]);
      if (!mountedRef.current) return;
      setRemaining(count);
      setScheduledWindowActive(windowActive);
      setMode(normalizeMode(savedMode));
      setScheduledHour(Number.parseInt(savedHour ?? String(DEFAULT_SCHEDULED_HOUR), 10) || DEFAULT_SCHEDULED_HOUR);
      setLoading(false);
    } catch {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  return { remaining, mode, scheduledHour, scheduledWindowActive, loading, refresh, scheduleNudges };
}
