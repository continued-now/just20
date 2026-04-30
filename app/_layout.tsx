import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initDb, getSetting, getStreak, isCompletedToday, setSetting } from '../lib/db';
import {
  DEFAULT_NOTIFICATION_MODE,
  DEFAULT_SCHEDULED_HOUR,
  type NotificationMode,
  cancelAllNudges,
  cancelWindowedNotification,
  setupNotificationHandler,
  scheduleRandomNudges,
  requestPermission,
  scheduleStreakAtRiskNotification,
  scheduleWindowWithFallbackNudges,
  scheduleWindowedNotification,
} from '../lib/notifications';
import { getOrCreateUser } from '../lib/user';
import { scheduleSharedJust20StatusUpdate } from '../lib/widgetStatus';
import { devLog } from '../lib/diagnostics';
import { colors } from '../constants/theme';

function normalizeNotificationMode(value: string | null): NotificationMode {
  if (value === 'scheduled_fallback' || value === 'strict' || value === 'random') return value;
  if (value === 'scheduled') return 'strict';
  return DEFAULT_NOTIFICATION_MODE;
}

export default function RootLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const redirectTo = useRef<string | null>(null);

  useEffect(() => {
    async function init() {
      setReady(false);
      setInitError(null);
      redirectTo.current = null;
      await initDb();
      setupNotificationHandler();

      const user = await getOrCreateUser();
      if (!user.onboardingComplete) {
        redirectTo.current = '/onboarding';
      }

      setReady(true);
      scheduleSharedJust20StatusUpdate();

      if (!user.onboardingComplete) return;

      // Notifications are non-blocking and only requested after explicit opt-in.
      getSetting('notifications_enabled').then(async enabled => {
        if (enabled !== '1') return;
        const granted = await requestPermission();
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
            await scheduleRandomNudges({ skipToday: true });
          }
          scheduleSharedJust20StatusUpdate();
          return;
        }

        if (mode === 'scheduled_fallback') {
          await scheduleWindowWithFallbackNudges(scheduledHour);
        } else if (mode === 'strict') {
          await cancelAllNudges();
          await scheduleWindowedNotification(scheduledHour);
        } else {
          await cancelWindowedNotification();
          await scheduleRandomNudges();
        }

        if (s.current > 0) await scheduleStreakAtRiskNotification(s.current);
        scheduleSharedJust20StatusUpdate();
      }).catch(() => {
        devLog('notification_startup_failed');
        // Notification setup should never block app startup.
      });
    }
    init().catch(() => {
      devLog('startup_failed');
      setInitError('Just 20 could not open its local data. This is usually temporary.');
      setReady(false);
    });

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') scheduleSharedJust20StatusUpdate();
    });
    return () => sub.remove();
  }, [retryNonce]);

  useEffect(() => {
    if (ready && redirectTo.current) {
      router.replace(redirectTo.current as any);
    }
  }, [ready, router]);

  if (!ready) {
    if (initError) {
      return (
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>Could not start Just 20</Text>
          <Text style={styles.errorText}>{initError}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => setRetryNonce((n) => n + 1)}
            activeOpacity={0.82}
          >
            <Text style={styles.retryText}>Retry startup</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
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
          name="xp-shop"
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

const styles = StyleSheet.create({
  errorWrap: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 14,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.subtext,
    lineHeight: 22,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
