import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { clearNudgeScheduleFromToday, getSetting, saveNudgeSchedule } from './db';
import { devLog } from './diagnostics';
import { localDayKey } from './dates';

const START_HOUR = 7;
const END_HOUR = 22;
const NUDGE_COUNT = 20;
const MIN_NUDGE_COUNT = 4;
const WINDOW_MS = 10 * 60 * 1000;
const SCHEDULE_AHEAD_DAYS = 3;
const ANDROID_CHANNEL_ID = 'daily-reminders';
const STREAK_AT_RISK_ID = 'streak-at-risk';
const NUDGE_TYPE = 'nudge';
const SCHEDULED_WINDOW_ID = 'scheduled-window';
const SCHEDULED_WINDOW_TYPE = 'scheduled-window';

export const DEFAULT_NOTIFICATION_MODE = 'scheduled_fallback';
export const DEFAULT_SCHEDULED_HOUR = 8;
export const DEFAULT_MAX_DAILY_NUDGES = NUDGE_COUNT;

export type NotificationMode = 'scheduled_fallback' | 'strict' | 'random';

type ScheduleWindowOptions = {
  skipToday?: boolean;
};

type ScheduleNudgeOptions = {
  count?: number;
  source?: 'random' | 'fallback';
  startAfter?: Date;
};

const TIERS: { minRemaining: number; messages: string[] }[] = [
  {
    minRemaining: 16,
    messages: [
      "hey. 20 pushups. you know the drill 😴",
      "gentle reminder: the floor is waiting.",
      "no rush. but also: push-ups. now-ish. 🤙",
    ],
  },
  {
    minRemaining: 11,
    messages: [
      "still waiting. the floor misses your face 🙄",
      "you said you'd do it. do it.",
      "tick tock. pushups aren't going to do themselves. 🙄",
    ],
  },
  {
    minRemaining: 6,
    messages: [
      "DO THE PUSHUPS. i'm not asking. 😤",
      "getting annoyed. seriously. pushups. NOW.",
      "I. AM. WATCHING. GET DOWN AND PUSH. 😤",
    ],
  },
  {
    minRemaining: 1,
    messages: [
      "IT IS [TIME]. YOU HAVE NOT DONE YOUR PUSHUPS. I AM DISAPPOINTED. 🔥💢",
      "FINAL WARNING. 20 PUSHUPS. DO IT OR FACE SHAME. 🤬",
      "THE FLOOR. YOUR HANDS. NOW. TWENTY. REPS. NO EXCUSES. 💢🔥",
    ],
  },
];

async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Daily reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#58CC02',
  }).catch(() => {});
}

function tier(remaining: number) {
  for (const t of TIERS) {
    if (remaining >= t.minRemaining) return t;
  }
  return TIERS[TIERS.length - 1];
}

function pickMessage(messages: string[], date: Date): string {
  const msg = messages[Math.floor(Math.random() * messages.length)];
  const t = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return msg.replace('[TIME]', t);
}

async function getConfiguredNudgeCount(): Promise<number> {
  const savedCount = await getSetting('max_daily_nudges');
  const parsed = Number.parseInt(savedCount ?? String(DEFAULT_MAX_DAILY_NUDGES), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_DAILY_NUDGES;
  return Math.max(MIN_NUDGE_COUNT, Math.min(NUDGE_COUNT, parsed));
}

function isNudgeNotification(notification: Notifications.NotificationRequest): boolean {
  const data = notification.content.data;
  return data?.type === NUDGE_TYPE || typeof data?.nudgeIndex === 'number';
}

function isScheduledWindowNotification(notification: Notifications.NotificationRequest): boolean {
  const data = notification.content.data;
  return (
    notification.identifier === SCHEDULED_WINDOW_ID ||
    notification.identifier.startsWith(`${SCHEDULED_WINDOW_ID}:`) ||
    data?.type === SCHEDULED_WINDOW_TYPE
  );
}

function isTodaysNudgeNotification(notification: Notifications.NotificationRequest): boolean {
  const nudgeDate = notification.content.data?.nudgeDate;
  return isNudgeNotification(notification) && (typeof nudgeDate !== 'string' || nudgeDate === localDayKey());
}

function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function windowNotificationIdentifier(date: Date): string {
  return `${SCHEDULED_WINDOW_ID}:${localDayKey(date)}`;
}

function nextScheduledWindowDate(hour: number, skipToday = false): Date {
  const now = new Date();
  const fireAt = new Date(now);
  fireAt.setHours(hour, 0, 0, 0);

  if (skipToday || fireAt.getTime() <= now.getTime()) {
    fireAt.setDate(fireAt.getDate() + 1);
  }

  return fireAt;
}

function nextNudgeStartDate(skipToday = false): Date {
  const now = new Date();
  const startAt = new Date(now);
  startAt.setHours(START_HOUR, 0, 0, 0);

  if (skipToday || startAt.getTime() <= now.getTime()) {
    startAt.setDate(startAt.getDate() + 1);
  }

  return startAt;
}

function nudgeScheduleBounds(startAfter?: Date): { earliest: number; endMs: number } {
  const now = new Date();
  const scheduleDay = startAfter ? new Date(startAfter) : new Date(now);
  let startMs = new Date(scheduleDay).setHours(START_HOUR, 0, 0, 0);
  let endMs = new Date(scheduleDay).setHours(END_HOUR, 0, 0, 0);
  let earliest = Math.max(
    startMs,
    now.getTime() + 2 * 60 * 1000,
    startAfter?.getTime() ?? 0
  );

  if (!startAfter && earliest >= endMs) {
    scheduleDay.setDate(scheduleDay.getDate() + 1);
    startMs = new Date(scheduleDay).setHours(START_HOUR, 0, 0, 0);
    endMs = new Date(scheduleDay).setHours(END_HOUR, 0, 0, 0);
    earliest = startMs;
  }

  return { earliest, endMs };
}

export async function requestPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  devLog('notification_permission_result', { status });
  return status === 'granted';
}

export async function scheduleNudges(options: ScheduleNudgeOptions = {}): Promise<void> {
  await ensureAndroidNotificationChannel();

  // Cancel old nudge notifications while preserving streak/social notifications.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (isNudgeNotification(n)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  const count = options.count ?? (await getConfiguredNudgeCount());
  const firstBounds = nudgeScheduleBounds(options.startAfter);
  const firstDate = new Date(firstBounds.earliest);
  const schedules: { dateKey: string; times: Date[] }[] = [];
  const allTimes: Date[] = [];

  for (let dayIndex = 0; dayIndex < SCHEDULE_AHEAD_DAYS; dayIndex += 1) {
    const bounds = dayIndex === 0
      ? firstBounds
      : nudgeScheduleBounds(
          (() => {
            const start = addLocalDays(firstDate, dayIndex);
            if (options.startAfter) {
              start.setHours(options.startAfter.getHours(), options.startAfter.getMinutes(), 0, 0);
            } else {
              start.setHours(START_HOUR, 0, 0, 0);
            }
            return start;
          })()
        );
    const window = bounds.endMs - bounds.earliest;
    if (window <= 0) continue;

    const times: Date[] = [];
    for (let i = 0; i < count; i++) {
      const t = new Date(bounds.earliest + Math.random() * window);
      times.push(t);
    }
    times.sort((a, b) => a.getTime() - b.getTime());

    schedules.push({ dateKey: localDayKey(times[0] ?? new Date(bounds.earliest)), times });
    allTimes.push(...times);
  }

  allTimes.sort((a, b) => a.getTime() - b.getTime());

  if (allTimes.length === 0) {
    await saveNudgeSchedule([]);
    devLog('nudges_schedule_skipped', { reason: 'empty_window', source: options.source ?? 'random' });
    return;
  }

  await saveNudgeSchedule(allTimes);

  for (const schedule of schedules) {
    for (let i = 0; i < schedule.times.length; i++) {
      const remaining = schedule.times.length - i;
      const t = tier(remaining);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Just 20',
          body: pickMessage(t.messages, schedule.times[i]),
          sound: remaining <= 5 ? 'default' : undefined,
          data: {
            type: NUDGE_TYPE,
            nudgeIndex: i,
            nudgeDate: schedule.dateKey,
            remaining,
            source: options.source ?? 'random',
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: schedule.times[i],
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }
  }
  devLog('nudges_scheduled', {
    count: allTimes.length,
    days: schedules.length,
    source: options.source ?? 'random',
    firstFireAt: allTimes[0]?.toISOString(),
    lastFireAt: allTimes[allTimes.length - 1]?.toISOString(),
  });
}

export async function scheduleRandomNudges(
  options: ScheduleWindowOptions = {}
): Promise<void> {
  await scheduleNudges({
    source: 'random',
    startAfter: options.skipToday ? nextNudgeStartDate(true) : undefined,
  });
}

export async function scheduleWindowWithFallbackNudges(
  hour: number,
  options: ScheduleWindowOptions = {}
): Promise<void> {
  const windowStart = nextScheduledWindowDate(hour, options.skipToday);
  const fallbackStart = new Date(windowStart.getTime() + WINDOW_MS);
  await scheduleWindowedNotification(hour, options);
  await scheduleNudges({ source: 'fallback', startAfter: fallbackStart });
}

export async function scheduleWindowedNotification(
  hour: number,
  options: ScheduleWindowOptions = {}
): Promise<void> {
  await ensureAndroidNotificationChannel();
  await cancelWindowedNotification();

  const firstDate = nextScheduledWindowDate(hour, options.skipToday);
  const dates = Array.from({ length: SCHEDULE_AHEAD_DAYS }, (_, dayIndex) =>
    addLocalDays(firstDate, dayIndex)
  );

  for (const date of dates) {
    await Notifications.scheduleNotificationAsync({
      identifier: windowNotificationIdentifier(date),
      content: {
        title: 'Just 20 ⚡',
        body: "Your window is open. Drop and give 20. 10 minutes on the clock.",
        sound: 'default',
        data: { type: SCHEDULED_WINDOW_TYPE, windowDate: localDayKey(date) },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  }
  devLog('window_notification_scheduled', {
    hour,
    skipToday: options.skipToday ?? false,
    days: dates.length,
    firstFireAt: dates[0]?.toISOString(),
    lastFireAt: dates[dates.length - 1]?.toISOString(),
  });
}

export async function cancelWindowedNotification(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (isScheduledWindowNotification(n)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
  await Notifications.cancelScheduledNotificationAsync(SCHEDULED_WINDOW_ID).catch(() => {});
}

export async function cancelAllNudges(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (isNudgeNotification(n)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
  await clearNudgeScheduleFromToday();
  devLog('nudges_cancelled');
}

export async function scheduleStreakAtRiskNotification(currentStreak: number): Promise<void> {
  await ensureAndroidNotificationChannel();

  // Cancel any existing streak-at-risk notification first
  await Notifications.cancelScheduledNotificationAsync(STREAK_AT_RISK_ID).catch(() => {});

  const now = new Date();
  const ninepm = new Date();
  ninepm.setHours(21, 0, 0, 0);

  if (now >= ninepm) return; // Window has passed

  const messages = [
    `Your ${currentStreak}-day streak dies tonight. 3 hours left.`,
    `Day ${currentStreak} is slipping. The floor is waiting.`,
    `${currentStreak} days on the line. Do. The. Pushups.`,
    `${currentStreak} days. Don't let tonight be the night you quit.`,
  ];
  const body = messages[Math.floor(Math.random() * messages.length)];

  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_AT_RISK_ID,
    content: {
      title: 'Just 20 ⚠️',
      body,
      sound: 'default',
      data: { type: 'streak-at-risk' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: ninepm,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
}

export async function getRemainingNudgeCount(): Promise<number> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter(isTodaysNudgeNotification).length;
}

export async function hasScheduledWindowNotification(): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some(isScheduledWindowNotification);
}

export function setupNotificationHandler(): void {
  ensureAndroidNotificationChannel();

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
