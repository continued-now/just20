import { useState, useEffect, useCallback, useRef } from 'react';
import { getStreak, isCompletedToday } from '../lib/db';

export type StreakState = {
  current: number;
  best: number;
  freezeCount: number;
  totalSessions: number;
  completedToday: boolean;
  loading: boolean;
};

export function useStreak() {
  const mountedRef = useRef(true);
  const [state, setState] = useState<StreakState>({
    current: 0,
    best: 0,
    freezeCount: 0,
    totalSessions: 0,
    completedToday: false,
    loading: true,
  });

  const refresh = useCallback(async () => {
    try {
      const [streak, done] = await Promise.all([getStreak(), isCompletedToday()]);
      if (!mountedRef.current) return;
      setState({
        current: streak.current,
        best: streak.best,
        freezeCount: streak.freezeCount,
        totalSessions: streak.totalSessions,
        completedToday: done,
        loading: false,
      });
    } catch {
      if (mountedRef.current) {
        setState(current => ({ ...current, loading: false }));
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  return { ...state, refresh };
}
