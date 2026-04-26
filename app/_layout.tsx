import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { initDb, getStreak, isCompletedToday } from '../lib/db';
import {
  setupNotificationHandler,
  scheduleNudges,
  requestPermission,
  scheduleStreakAtRiskNotification,
} from '../lib/notifications';
import { getOrCreateUser } from '../lib/user';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    async function init() {
      await initDb();
      setupNotificationHandler();

      // New users see onboarding; existing users without username see profile-setup
      const user = await getOrCreateUser();
      if (!user.onboardingComplete) {
        setTimeout(() => router.replace('/onboarding'), 0);
      } else if (!user.username) {
        setTimeout(() => router.replace('/profile-setup'), 0);
      }

      const granted = await requestPermission();
      if (granted) {
        await scheduleNudges();
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
        <Stack.Screen
          name="profile-setup"
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen
          name="chest-open"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }}
        />
      </Stack>
    </>
  );
}
