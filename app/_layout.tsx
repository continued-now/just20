import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { initDb } from '../lib/db';
import { setupNotificationHandler, scheduleNudges, requestPermission } from '../lib/notifications';

export default function RootLayout() {
  useEffect(() => {
    async function init() {
      await initDb();
      setupNotificationHandler();
      const granted = await requestPermission();
      if (granted) await scheduleNudges();
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
      </Stack>
    </>
  );
}
