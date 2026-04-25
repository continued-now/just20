import { useState, useEffect, useCallback } from 'react';
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
  const [state, setState] = useState<StreakState>({
    current: 0,
    best: 0,
    freezeCount: 0,
    totalSessions: 0,
    completedToday: false,
    loading: true,
  });

  const refresh = useCallback(async () => {
    const [streak, done] = await Promise.all([getStreak(), isCompletedToday()]);
    setState({
      current: streak.current,
      best: streak.best,
      freezeCount: streak.freezeCount,
      totalSessions: streak.totalSessions,
      completedToday: done,
      loading: false,
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
