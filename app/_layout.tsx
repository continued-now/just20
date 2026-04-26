import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { initDb, getStreak, isCompletedToday } from '../lib/db';
import {
  setupNotificationHandler,
  scheduleNudges,
  requestPermission,
  scheduleStreakAtRiskNotification,
} from '../lib/notifications';

export default function RootLayout() {
  useEffect(() => {
    async function init() {
      await initDb();
      setupNotificationHandler();
      const granted = await requestPermission();
      if (granted) {
        await scheduleNudges();
        // Schedule 9pm streak-at-risk notification if streak is active and not done yet
        const [s, done] = await Promise.all([getStreak(), isCompletedToday()]);
        if (s.current > 0 && !done) {
          await scheduleStreakAtRiskNotification(s.current);
        }
      }
    }
    init();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="workout"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="completion"
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen
          name="streak-repair"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </>
  );
}
