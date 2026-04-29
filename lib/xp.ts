import {
  claimDailyXp,
  claimMilestoneXp,
  getFiredNudgeCountToday,
  getSetting,
  type TrackingMethod,
} from './db';
import { isMilestoneDay } from './milestones';

export { getRecentXpEvents, getXp, type XpData, type XpEvent } from './db';

const WINDOW_MS = 10 * 60 * 1000;

export type XpLevel = {
  level: number;
  minXp: number;
  title: string;
};

export type XpLevelProgress = {
  totalXp: number;
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
  nextLevel: number;
  nextTitle: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpRemaining: number;
  percent: number;
};

export const XP_LEVELS: XpLevel[] = [
  { level: 1, minXp: 0, title: 'Starter Sprout' },
  { level: 2, minXp: 25, title: 'Tiny Spark' },
  { level: 3, minXp: 75, title: 'Floor Regular' },
  { level: 4, minXp: 150, title: 'Habit Bean' },
  { level: 5, minXp: 275, title: 'No-Excuses Rookie' },
  { level: 6, minXp: 450, title: 'Pushup Goblin' },
  { level: 7, minXp: 700, title: 'Window Hitter' },
  { level: 8, minXp: 1000, title: 'Squad Spark' },
  { level: 9, minXp: 1400, title: 'Badge Collector' },
  { level: 10, minXp: 1900, title: 'Form Gremlin' },
  { level: 11, minXp: 2500, title: 'Streak Creature' },
  { level: 12, minXp: 3200, title: 'Tiny Machine' },
  { level: 13, minXp: 4100, title: 'Floor Menace' },
  { level: 14, minXp: 5200, title: 'Iron Sprout' },
  { level: 15, minXp: 6500, title: 'Nudge Dodger' },
  { level: 16, minXp: 8100, title: 'Habit Goblin' },
  { level: 17, minXp: 10000, title: 'Tiny Legend' },
  { level: 18, minXp: 12300, title: 'Mythic Bean' },
  { level: 19, minXp: 15000, title: 'Ancient Egg' },
  { level: 20, minXp: 18200, title: 'Just 20 Icon' },
];

function getLevelMinXp(level: number): number {
  if (level <= 1) return 0;
  const known = XP_LEVELS[level - 1];
  if (known) return known.minXp;

  let xp = XP_LEVELS[XP_LEVELS.length - 1].minXp;
  for (let currentLevel = XP_LEVELS.length + 1; currentLevel <= level; currentLevel += 1) {
    xp += 3600 + (currentLevel - XP_LEVELS.length) * 450;
  }
  return xp;
}

function getLevelTitle(level: number): string {
  const known = XP_LEVELS[level - 1];
  if (known) return known.title;
  return `Overtime Legend ${level}`;
}

export function getXpLevelProgress(totalEarned: number): XpLevelProgress {
  const totalXp = Math.max(0, Math.floor(totalEarned || 0));
  let level = 1;

  while (totalXp >= getLevelMinXp(level + 1)) {
    level += 1;
  }

  const currentLevelXp = getLevelMinXp(level);
  const nextLevel = level + 1;
  const nextLevelXp = getLevelMinXp(nextLevel);
  const xpForNextLevel = Math.max(1, nextLevelXp - currentLevelXp);
  const xpIntoLevel = Math.max(0, totalXp - currentLevelXp);
  const xpRemaining = Math.max(0, nextLevelXp - totalXp);

  return {
    totalXp,
    level,
    title: getLevelTitle(level),
    currentLevelXp,
    nextLevelXp,
    nextLevel,
    nextTitle: getLevelTitle(nextLevel),
    xpIntoLevel,
    xpForNextLevel,
    xpRemaining,
    percent: Math.min(1, xpIntoLevel / xpForNextLevel),
  };
}

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

function applyTrackingXpAdjustment(
  dailyXp: Awaited<ReturnType<typeof calculateDailyXp>>,
  trackingMethod: TrackingMethod,
  manualAdjustments: number
): Awaited<ReturnType<typeof calculateDailyXp>> {
  if (trackingMethod === 'manual') {
    const manualAmount = Math.max(3, Math.round(dailyXp.amount * 0.55));
    return {
      ...dailyXp,
      amount: manualAmount,
      nudgePenalty: dailyXp.baseXp - manualAmount,
      label: 'Manual save',
    };
  }

  if (trackingMethod === 'camera_adjusted' || manualAdjustments > 0) {
    const correctionPenalty = Math.min(Math.max(manualAdjustments, 1) * 2, 8);
    const adjustedAmount = Math.max(4, dailyXp.amount - correctionPenalty);
    return {
      ...dailyXp,
      amount: adjustedAmount,
      nudgePenalty: dailyXp.nudgePenalty + correctionPenalty,
      label: 'Count fixed manually',
    };
  }

  return dailyXp;
}

export async function awardWorkoutXp(
  streakDay: number,
  overrides: {
    nudgesUsed?: number;
    trackingMethod?: TrackingMethod;
    manualAdjustments?: number;
  } = {}
): Promise<WorkoutXpReward> {
  const trackingMethod = overrides.trackingMethod ?? 'camera';
  const manualAdjustments = Math.max(0, overrides.manualAdjustments ?? 0);
  const dailyXp = applyTrackingXpAdjustment(
    await calculateDailyXp(overrides),
    trackingMethod,
    manualAdjustments
  );
  let daily = 0;
  let milestone = 0;

  const claimed = await claimDailyXp(dailyXp.amount, {
    mode: dailyXp.mode,
    baseXp: dailyXp.baseXp,
    nudgePenalty: dailyXp.nudgePenalty,
    nudgesUsed: dailyXp.nudgesUsed,
    label: dailyXp.label,
    trackingMethod,
    manualAdjustments,
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
