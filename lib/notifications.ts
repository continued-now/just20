import * as Notifications from 'expo-notifications';

const START_HOUR = 7;
const END_HOUR = 22;
const NUDGE_COUNT = 20;
const STREAK_AT_RISK_ID = 'streak-at-risk';
const NUDGE_TYPE = 'nudge';

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

function isNudgeNotification(notification: Notifications.NotificationRequest): boolean {
  const data = notification.content.data;
  return data?.type === NUDGE_TYPE || typeof data?.nudgeIndex === 'number';
}

export async function requestPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleNudges(): Promise<void> {
  // Cancel old nudge notifications while preserving streak/social notifications.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (isNudgeNotification(n)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  const now = new Date();
  const startMs = new Date(now).setHours(START_HOUR, 0, 0, 0);
  const endMs = new Date(now).setHours(END_HOUR, 0, 0, 0);
  const earliest = Math.max(startMs, now.getTime() + 2 * 60 * 1000);
  const window = endMs - earliest;

  if (window <= 0) return;

  const times: Date[] = [];
  for (let i = 0; i < NUDGE_COUNT; i++) {
    const t = new Date(earliest + Math.random() * window);
    times.push(t);
  }
  times.sort((a, b) => a.getTime() - b.getTime());

  for (let i = 0; i < times.length; i++) {
    const remaining = times.length - i;
    const t = tier(remaining);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'just20',
        body: pickMessage(t.messages, times[i]),
        sound: remaining <= 5 ? 'default' : undefined,
        data: { type: NUDGE_TYPE, nudgeIndex: i, remaining },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: times[i],
      },
    });
  }
}

export async function cancelAllNudges(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (isNudgeNotification(n)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export async function scheduleStreakAtRiskNotification(currentStreak: number): Promise<void> {
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
      title: 'just20 ⚠️',
      body,
      sound: 'default',
      data: { type: 'streak-at-risk' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: ninepm,
    },
  });
}

export async function getRemainingNudgeCount(): Promise<number> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter(isNudgeNotification).length;
}

export function setupNotificationHandler(): void {
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
