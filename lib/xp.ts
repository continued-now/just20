import {
  claimDailyXp,
  claimMilestoneXp,
  getFiredNudgeCountToday,
  getSetting,
} from './db';
import { isMilestoneDay } from './milestones';

export { getRecentXpEvents, getXp, type XpData, type XpEvent } from './db';

const WINDOW_MS = 10 * 60 * 1000;

type RewardMode = 'scheduled_fallback' | 'strict' | 'random';

export type WorkoutXpReward = {
  daily: number;
  milestone: number;
  total: number;
  baseXp: number;
  nudgePenalty: number;
  nudgesUsed: number;
  label: string;
};

function normalizeMode(value: string | null): RewardMode {
  if (value === 'scheduled_fallback' || value === 'strict' || value === 'random') return value;
  if (value === 'scheduled') return 'strict';
  return 'scheduled_fallback';
}

function isInsideScheduledWindow(hour: number): boolean {
  const now = Date.now();
  const windowStart = new Date();
  windowStart.setHours(hour, 0, 0, 0);
  const startMs = windowStart.getTime();
  return now >= startMs && now - startMs <= WINDOW_MS;
}

async function calculateDailyXp(overrides: { nudgesUsed?: number } = {}): Promise<{
  amount: number;
  baseXp: number;
  nudgePenalty: number;
  nudgesUsed: number;
  label: string;
  mode: RewardMode;
}> {
  const [modeSetting, hourSetting, firedNudges] = await Promise.all([
    getSetting('notification_mode'),
    getSetting('scheduled_hour'),
    overrides.nudgesUsed === undefined ? getFiredNudgeCountToday() : Promise.resolve(overrides.nudgesUsed),
  ]);
  const nudgesUsed = Math.max(0, firedNudges);
  const mode = normalizeMode(modeSetting);
  const scheduledHour = Number.parseInt(hourSetting ?? '8', 10) || 8;
  const inWindow = isInsideScheduledWindow(scheduledHour);

  if (mode === 'strict') {
    return inWindow
      ? { amount: 25, baseXp: 25, nudgePenalty: 0, nudgesUsed: 0, label: 'No-excuses window', mode }
      : { amount: 5, baseXp: 25, nudgePenalty: 20, nudgesUsed: 0, label: 'Outside strict window', mode };
  }

  if (mode === 'scheduled_fallback') {
    if (inWindow) {
      return { amount: 18, baseXp: 18, nudgePenalty: 0, nudgesUsed: 0, label: 'Window hit', mode };
    }

    const penalty = Math.min(nudgesUsed * 2, 12);
    return {
      amount: Math.max(4, 14 - penalty),
      baseXp: 14,
      nudgePenalty: penalty,
      nudgesUsed,
      label: nudgesUsed > 0 ? `Nudge ${nudgesUsed} save` : 'Late save',
      mode,
    };
  }

  const penalty = Math.min(nudgesUsed, 7);
  return {
    amount: Math.max(3, 10 - penalty),
    baseXp: 10,
    nudgePenalty: penalty,
    nudgesUsed,
    label: nudgesUsed > 0 ? `Nudge ${nudgesUsed}` : 'Flexible win',
    mode,
  };
}

export async function awardWorkoutXp(
  streakDay: number,
  overrides: { nudgesUsed?: number } = {}
): Promise<WorkoutXpReward> {
  const dailyXp = await calculateDailyXp(overrides);
  let daily = 0;
  let milestone = 0;

  const claimed = await claimDailyXp(dailyXp.amount, {
    mode: dailyXp.mode,
    baseXp: dailyXp.baseXp,
    nudgePenalty: dailyXp.nudgePenalty,
    nudgesUsed: dailyXp.nudgesUsed,
    label: dailyXp.label,
  });
  if (claimed !== null) daily = claimed;

  if (isMilestoneDay(streakDay)) {
    const claimedMilestone = await claimMilestoneXp(50, { streakDay });
    if (claimedMilestone !== null) milestone = claimedMilestone;
  }

  return {
    daily,
    milestone,
    total: daily + milestone,
    baseXp: dailyXp.baseXp,
    nudgePenalty: dailyXp.nudgePenalty,
    nudgesUsed: dailyXp.nudgesUsed,
    label: dailyXp.label,
  };
}
