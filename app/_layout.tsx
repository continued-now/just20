import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
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
  const [ready, setReady] = useState(false);
  const redirectTo = useRef<string | null>(null);

  useEffect(() => {
    async function init() {
      await initDb();
      setupNotificationHandler();

      const user = await getOrCreateUser();
      if (!user.onboardingComplete) {
        redirectTo.current = '/onboarding';
      }

      setReady(true);

      // Notifications are non-blocking — schedule after UI is ready
      requestPermission().then(async granted => {
        if (!granted) return;
        await scheduleNudges();
        const [s, done] = await Promise.all([getStreak(), isCompletedToday()]);
        if (s.current > 0 && !done) await scheduleStreakAtRiskNotification(s.current);
      });
    }
    init();
  }, []);

  useEffect(() => {
    if (ready && redirectTo.current) {
      router.replace(redirectTo.current as any);
    }
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#F5F5F0' }} />;
  }

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
