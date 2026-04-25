import { useState, useEffect, useCallback } from 'react';
import { getRemainingNudgeCount, scheduleNudges } from '../lib/notifications';

export function useNudges() {
  const [remaining, setRemaining] = useState(20);

  const refresh = useCallback(async () => {
    const count = await getRemainingNudgeCount();
    setRemaining(count);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { remaining, refresh, scheduleNudges };
}
