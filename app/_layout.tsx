import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initDb, getSetting, getStreak, isCompletedToday, setSetting } from '../lib/db';
import {
  DEFAULT_NOTIFICATION_MODE,
  DEFAULT_SCHEDULED_HOUR,
  type NotificationMode,
  cancelAllNudges,
  cancelWindowedNotification,
  setupNotificationHandler,
  scheduleNudges,
  requestPermission,
  scheduleStreakAtRiskNotification,
  scheduleWindowWithFallbackNudges,
  scheduleWindowedNotification,
} from '../lib/notifications';
import { getOrCreateUser } from '../lib/user';

function normalizeNotificationMode(value: string | null): NotificationMode {
  if (value === 'scheduled_fallback' || value === 'strict' || value === 'random') return value;
  if (value === 'scheduled') return 'strict';
  return DEFAULT_NOTIFICATION_MODE;
}

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

      if (!user.onboardingComplete) return;

      // Notifications are non-blocking — schedule after UI is ready.
      requestPermission().then(async granted => {
        if (!granted) return;
        const [s, done, savedMode, savedHour] = await Promise.all([
          getStreak(),
          isCompletedToday(),
          getSetting('notification_mode'),
          getSetting('scheduled_hour'),
        ]);
        const mode = normalizeNotificationMode(savedMode);
        const scheduledHour = Number.parseInt(savedHour ?? String(DEFAULT_SCHEDULED_HOUR), 10) || DEFAULT_SCHEDULED_HOUR;

        if (!savedMode) await setSetting('notification_mode', mode);
        if (!savedHour) await setSetting('scheduled_hour', String(scheduledHour));

        if (done) {
          await cancelAllNudges();
          if (mode === 'scheduled_fallback') {
            await scheduleWindowWithFallbackNudges(scheduledHour, { skipToday: true });
          } else if (mode === 'strict') {
            await scheduleWindowedNotification(scheduledHour, { skipToday: true });
          } else {
            await cancelWindowedNotification();
          }
          return;
        }

        if (mode === 'scheduled_fallback') {
          await scheduleWindowWithFallbackNudges(scheduledHour);
        } else if (mode === 'strict') {
          await cancelAllNudges();
          await scheduleWindowedNotification(scheduledHour);
        } else {
          await cancelWindowedNotification();
          await scheduleNudges({ source: 'random' });
        }

        if (s.current > 0) await scheduleStreakAtRiskNotification(s.current);
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
          name="challenge"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="duel"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="team"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="badges"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
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
