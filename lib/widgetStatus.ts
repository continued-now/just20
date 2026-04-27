import {
  getBooleanSetting,
  getNextScheduledNudge,
  getStreak,
  isCompletedToday,
  setSetting,
} from './db';
import { getRemainingNudgeCount } from './notifications';
import { getMoodFromContext, getTierInfo, type MascotMood } from './mascotState';
import { writeSharedStatus } from './sharedStatusNative';

export type Just20Status = {
  completedToday: boolean;
  currentStreak: number;
  freezeCount: number;
  remainingNudges: number;
  nextNudgeAt: number | null;
  lastCompletedDate: string | null;
  mascotMood: MascotMood;
  streakTierLabel: string;
  lockInModeEnabled: boolean;
  widgetUrgencyEnabled: boolean;
  watchNudgesEnabled: boolean;
  lastUpdatedAt: number;
};

let pendingUpdate: ReturnType<typeof setTimeout> | null = null;

export async function buildJust20Status(): Promise<Just20Status> {
  const [
    streak,
    completedToday,
    remainingNudges,
    nextNudgeAt,
    lockInModeEnabled,
    widgetUrgencyEnabled,
    watchNudgesEnabled,
  ] = await Promise.all([
    getStreak(),
    isCompletedToday(),
    getRemainingNudgeCount(),
    getNextScheduledNudge(),
    getBooleanSetting('lock_in_mode_enabled', false),
    getBooleanSetting('widget_urgency_enabled', true),
    getBooleanSetting('watch_nudges_enabled', true),
  ]);

  const tier = getTierInfo(streak.current);
  return {
    completedToday,
    currentStreak: streak.current,
    freezeCount: streak.freezeCount,
    remainingNudges,
    nextNudgeAt,
    lastCompletedDate: streak.lastCompletedDate,
    mascotMood: getMoodFromContext(remainingNudges, completedToday),
    streakTierLabel: tier.label,
    lockInModeEnabled,
    widgetUrgencyEnabled,
    watchNudgesEnabled,
    lastUpdatedAt: Date.now(),
  };
}

export async function updateSharedJust20Status(): Promise<void> {
  const status = await buildJust20Status();
  await writeSharedStatus(status);
  await setSetting('shared_status_last_updated_at', String(status.lastUpdatedAt));
}

export function scheduleSharedJust20StatusUpdate(delayMs = 250): void {
  if (pendingUpdate) clearTimeout(pendingUpdate);
  pendingUpdate = setTimeout(() => {
    pendingUpdate = null;
    updateSharedJust20Status().catch(() => {});
  }, delayMs);
}
