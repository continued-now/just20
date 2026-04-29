import {
  awardBadgeXp,
  getBadgeCounters,
  getBadgeUnlocks,
  getBestCompletedTime,
  getBuddyLinks,
  getCompletedDaysThisWeek,
  getSetting,
  getStreak,
  hasProcessedBadgeEvent,
  incrementBadgeCounter,
  incrementBadgeShareCount,
  insertBadgeUnlock,
  markBadgeEventProcessed,
  setBadgeCounter,
  type BadgeUnlock,
} from './db';
import { buildSharePayload } from './growth';

export type BadgeCategory = 'streak' | 'social' | 'performance' | 'consistency';
export type BadgeVisibility = 'visible' | 'hidden';

export type BadgeDefinition = {
  id: string;
  category: BadgeCategory;
  name: string;
  description: string;
  requirement: string;
  xp: number;
  icon: string;
  color: string;
  accentColor: string;
  deepColor: string;
  visibility: BadgeVisibility;
  rarityKey: string;
  sortOrder: number;
  backendRequired?: boolean;
  blockedLabel?: string;
};

export type BadgeEventContext = {
  event?: 'workout_completed' | 'buddy_linked' | 'monthly_test_completed' | 'app_open';
  reps?: number;
  durationMs?: number;
  mode?: 'daily' | 'duel' | 'test';
  trackingMethod?: 'camera' | 'camera_adjusted' | 'manual';
  manualAdjustments?: number;
  nudgesUsed?: number;
  eventId?: string;
  backendVerified?: boolean;
};

export type BadgeProgress = {
  definition: BadgeDefinition;
  unlocked: boolean;
  unlockedAt: string | null;
  xpAwarded: number;
  shareCount: number;
  current: number;
  target: number;
  percent: number;
  progressLabel: string;
  hiddenUntilUnlocked: boolean;
  canUnlockNow: boolean;
};

export type BadgeUnlockResult = {
  definition: BadgeDefinition;
  unlockedAt: string;
  xpAwarded: number;
};

type BadgeStats = {
  currentStreak: number;
  bestStreak: number;
  totalSessions: number;
  buddyCount: number;
  completedDaysThisWeek: number;
  bestCompletedTimeMs: number | null;
  counters: Record<string, number>;
  notificationMode: 'scheduled_fallback' | 'strict' | 'random';
  scheduledWindowActive: boolean;
};

const WINDOW_MS = 10 * 60 * 1000;

function badge(
  definition: Omit<BadgeDefinition, 'rarityKey'> & { rarityKey?: string }
): BadgeDefinition {
  return { ...definition, rarityKey: definition.rarityKey ?? definition.id };
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  badge({
    id: 'starter_sprout',
    category: 'streak',
    name: 'Starter Sprout',
    description: 'Day 1 exists. That counts.',
    requirement: 'Complete Day 1.',
    xp: 10,
    icon: '🌱',
    color: '#DFF4C7',
    accentColor: '#58CC02',
    deepColor: '#2E7D16',
    visibility: 'visible',
    sortOrder: 10,
  }),
  badge({
    id: 'tiny_spark',
    category: 'streak',
    name: 'Tiny Spark',
    description: 'Three days. Suspiciously consistent.',
    requirement: 'Reach a 3-day streak.',
    xp: 25,
    icon: '✨',
    color: '#FFE6B8',
    accentColor: '#FF9F1C',
    deepColor: '#B76200',
    visibility: 'visible',
    sortOrder: 20,
  }),
  badge({
    id: 'hatched_habit',
    category: 'streak',
    name: 'Hatched Habit',
    description: 'One week. The egg has opinions now.',
    requirement: 'Reach a 7-day streak.',
    xp: 60,
    icon: '🥚',
    color: '#FFF0D6',
    accentColor: '#FFBE5C',
    deepColor: '#8B5A1E',
    visibility: 'visible',
    sortOrder: 30,
  }),
  badge({
    id: 'two_week_bean',
    category: 'streak',
    name: 'Two-Week Bean',
    description: 'Two weeks is where excuses get nervous.',
    requirement: 'Reach a 14-day streak.',
    xp: 100,
    icon: '🫘',
    color: '#F6DFCA',
    accentColor: '#C7895D',
    deepColor: '#7C4C33',
    visibility: 'visible',
    sortOrder: 40,
  }),
  badge({
    id: 'monthling',
    category: 'streak',
    name: 'Monthling',
    description: 'Thirty days. This is becoming a thing.',
    requirement: 'Reach a 30-day streak.',
    xp: 220,
    icon: '🎂',
    color: '#FFE0D2',
    accentColor: '#FF7A3D',
    deepColor: '#9D3618',
    visibility: 'visible',
    sortOrder: 50,
  }),
  badge({
    id: 'flame_friend',
    category: 'streak',
    name: 'Flame Friend',
    description: 'Sixty days. The floor knows your name.',
    requirement: 'Reach a 60-day streak.',
    xp: 400,
    icon: '🔥',
    color: '#FFD3BA',
    accentColor: '#FF6B2C',
    deepColor: '#9E2D14',
    visibility: 'visible',
    sortOrder: 60,
  }),
  badge({
    id: 'tiny_legend',
    category: 'streak',
    name: 'Tiny Legend',
    description: 'Ninety days. Tiny legend behavior.',
    requirement: 'Reach a 90-day streak.',
    xp: 700,
    icon: '👑',
    color: '#FFE8A3',
    accentColor: '#F5B900',
    deepColor: '#8E6900',
    visibility: 'visible',
    sortOrder: 70,
  }),
  badge({
    id: 'ancient_egg',
    category: 'streak',
    name: 'Ancient Egg',
    description: 'Half a year. Absurd, politely.',
    requirement: 'Reach a 180-day streak.',
    xp: 1200,
    icon: '🪨',
    color: '#F7E9C8',
    accentColor: '#D6A85C',
    deepColor: '#73522E',
    visibility: 'hidden',
    sortOrder: 80,
  }),
  badge({
    id: 'year_goblin',
    category: 'streak',
    name: 'Year Goblin',
    description: 'A whole year. The goblin bows.',
    requirement: 'Reach a 365-day streak.',
    xp: 2500,
    icon: '🧌',
    color: '#E8F6D8',
    accentColor: '#78C850',
    deepColor: '#3F7C37',
    visibility: 'hidden',
    sortOrder: 90,
  }),
  badge({
    id: 'first_buddy',
    category: 'social',
    name: 'First Buddy',
    description: 'Someone joined the accountability loop.',
    requirement: 'Link 1 buddy.',
    xp: 40,
    icon: '👋',
    color: '#DCEEFF',
    accentColor: '#1CB0F6',
    deepColor: '#126A9C',
    visibility: 'visible',
    sortOrder: 110,
  }),
  badge({
    id: 'popular',
    category: 'social',
    name: 'Popular',
    description: 'The tiny movement begins.',
    requirement: 'Link 3 buddies.',
    xp: 120,
    icon: '🐣',
    color: '#D7F0FF',
    accentColor: '#4BC3FF',
    deepColor: '#146E99',
    visibility: 'visible',
    sortOrder: 120,
  }),
  badge({
    id: 'buddy_magnet',
    category: 'social',
    name: 'Buddy Magnet',
    description: 'The accountability field is getting suspiciously strong.',
    requirement: 'Link 5 buddies.',
    xp: 220,
    icon: '🧲',
    color: '#DDF7FF',
    accentColor: '#2DC5E8',
    deepColor: '#0F728A',
    visibility: 'visible',
    sortOrder: 130,
  }),
  badge({
    id: 'tiny_evangelist',
    category: 'social',
    name: 'Tiny Evangelist',
    description: 'You spread the tiny gospel. Politely.',
    requirement: '10 referred friends complete Day 1.',
    xp: 500,
    icon: '📣',
    color: '#E7F3FF',
    accentColor: '#5E9BFF',
    deepColor: '#2859B8',
    visibility: 'hidden',
    sortOrder: 140,
    backendRequired: true,
    blockedLabel: 'Referral tracking is coming soon',
  }),
  badge({
    id: 'pack_starter',
    category: 'social',
    name: 'Pack Starter',
    description: 'The floor has a group chat now.',
    requirement: '3 people join your team room.',
    xp: 180,
    icon: '👥',
    color: '#E0F7FF',
    accentColor: '#1CB0F6',
    deepColor: '#0B638D',
    visibility: 'visible',
    sortOrder: 150,
    backendRequired: true,
    blockedLabel: 'Live room joins are coming soon',
  }),
  badge({
    id: 'room_captain',
    category: 'social',
    name: 'Room Captain',
    description: 'You are now responsible for vibes and hydration.',
    requirement: '10 people join your team room.',
    xp: 450,
    icon: '🚩',
    color: '#DCE9FF',
    accentColor: '#4169E1',
    deepColor: '#243E91',
    visibility: 'hidden',
    sortOrder: 160,
    backendRequired: true,
    blockedLabel: 'Live room joins are coming soon',
  }),
  badge({
    id: 'nudge_goblin',
    category: 'social',
    name: 'Nudge Goblin',
    description: 'You nudged. They moved. The goblin is pleased.',
    requirement: '7 nudges lead to friend completions.',
    xp: 250,
    icon: '🔔',
    color: '#E9F8D9',
    accentColor: '#7AC943',
    deepColor: '#3A7626',
    visibility: 'hidden',
    sortOrder: 170,
    backendRequired: true,
    blockedLabel: 'Friend nudge attribution required',
  }),
  badge({
    id: 'everybody_ate',
    category: 'social',
    name: 'Everybody Ate',
    description: 'The whole table got their 20.',
    requirement: '3 buddies complete on the same day.',
    xp: 300,
    icon: '🍽️',
    color: '#DFF5FF',
    accentColor: '#39C7F3',
    deepColor: '#126F96',
    visibility: 'hidden',
    sortOrder: 180,
    backendRequired: true,
    blockedLabel: 'Buddy same-day completion sync required',
  }),
  badge({
    id: 'clean_20',
    category: 'performance',
    name: 'Clean 20',
    description: 'Twenty clean reps. No counter fiddling.',
    requirement: 'Finish 20 reps without manual adjustment.',
    xp: 80,
    icon: '✓',
    color: '#DFF7E7',
    accentColor: '#20C56C',
    deepColor: '#167744',
    visibility: 'visible',
    sortOrder: 210,
  }),
  badge({
    id: 'speed_sprout',
    category: 'performance',
    name: 'Speed Sprout',
    description: 'Tiny plant. Somehow faster.',
    requirement: 'Beat your prior best 20-rep time.',
    xp: 100,
    icon: '💨',
    color: '#E4FBE4',
    accentColor: '#40D76F',
    deepColor: '#207C3B',
    visibility: 'hidden',
    sortOrder: 220,
  }),
  badge({
    id: 'sub_60_bean',
    category: 'performance',
    name: 'Sub-60 Bean',
    description: 'The bean has entered sport mode.',
    requirement: 'Complete 20 reps under 60 seconds.',
    xp: 160,
    icon: '⏱️',
    color: '#E3FADE',
    accentColor: '#67C94F',
    deepColor: '#367D2E',
    visibility: 'visible',
    sortOrder: 230,
  }),
  badge({
    id: 'no_excuses_bean',
    category: 'performance',
    name: 'No-Excuses Bean',
    description: 'Set time. Showed up. No courtroom drama.',
    requirement: 'Complete inside your strict scheduled window.',
    xp: 120,
    icon: '⏰',
    color: '#FFF0CF',
    accentColor: '#FFB84D',
    deepColor: '#A96000',
    visibility: 'visible',
    sortOrder: 240,
  }),
  badge({
    id: 'baseline_badge',
    category: 'performance',
    name: 'Baseline Badge',
    description: 'Measure first. Flex later.',
    requirement: 'Complete your first monthly Test Me attempt.',
    xp: 150,
    icon: '📏',
    color: '#E7F0FF',
    accentColor: '#6E9DFF',
    deepColor: '#355BBD',
    visibility: 'visible',
    sortOrder: 250,
  }),
  badge({
    id: 'stronger_bean',
    category: 'performance',
    name: 'Stronger Bean',
    description: 'The bean has measurable opinions now.',
    requirement: 'Improve monthly test reps by 10%.',
    xp: 300,
    icon: '💪',
    color: '#E2F8E8',
    accentColor: '#2FBC65',
    deepColor: '#176C39',
    visibility: 'hidden',
    sortOrder: 260,
  }),
  badge({
    id: 'form_snob',
    category: 'performance',
    name: 'Form Snob',
    description: 'A little picky. Honestly, fair.',
    requirement: 'Complete 5 clean sessions in a row.',
    xp: 220,
    icon: '🤓',
    color: '#DFF7E7',
    accentColor: '#20B879',
    deepColor: '#136B4A',
    visibility: 'hidden',
    sortOrder: 270,
  }),
  badge({
    id: 'perfect_week',
    category: 'consistency',
    name: 'Perfect Week',
    description: 'Seven days. Seven checkmarks.',
    requirement: 'Complete all 7 days in a week.',
    xp: 180,
    icon: '📅',
    color: '#F1E6FF',
    accentColor: '#9B6BFF',
    deepColor: '#6239A6',
    visibility: 'visible',
    sortOrder: 310,
  }),
  badge({
    id: 'save_wizard',
    category: 'consistency',
    name: 'Save Wizard',
    description: 'Crisis avoided with tiny sorcery.',
    requirement: 'Use a freeze and recover the streak next day.',
    xp: 120,
    icon: '🪄',
    color: '#EFE8FF',
    accentColor: '#A982FF',
    deepColor: '#5D3AA6',
    visibility: 'hidden',
    sortOrder: 320,
    backendRequired: true,
    blockedLabel: 'Freeze recovery telemetry required',
  }),
  badge({
    id: 'morning_bean',
    category: 'consistency',
    name: 'Morning Bean',
    description: 'Before breakfast? Rude, but impressive.',
    requirement: 'Complete before 9am three times.',
    xp: 90,
    icon: '🌅',
    color: '#FFF3C9',
    accentColor: '#FFD43B',
    deepColor: '#A67900',
    visibility: 'visible',
    sortOrder: 330,
  }),
  badge({
    id: 'night_gremlin',
    category: 'consistency',
    name: 'Night Gremlin',
    description: 'Late, quiet, slightly goblin-coded.',
    requirement: 'Complete after 9pm three times.',
    xp: 90,
    icon: '🌙',
    color: '#E8E5FF',
    accentColor: '#7C6CF2',
    deepColor: '#3B327F',
    visibility: 'hidden',
    sortOrder: 340,
  }),
  badge({
    id: 'no_nudge_needed',
    category: 'consistency',
    name: 'No Nudge Needed',
    description: 'You showed up before the app had to tap the glass.',
    requirement: 'Complete before any backup nudge fires 5 times.',
    xp: 180,
    icon: '🔕',
    color: '#E8F8DF',
    accentColor: '#58CC02',
    deepColor: '#357E0D',
    visibility: 'visible',
    sortOrder: 350,
  }),
];

async function updateBadgeCountersForEvent(context: BadgeEventContext): Promise<void> {
  const reps = context.reps ?? 0;
  const completedSet = reps >= 20;
  const isWorkoutCompletion = context.event === 'workout_completed' && completedSet;

  if (isWorkoutCompletion) {
    const clean = (context.trackingMethod ?? 'camera') === 'camera' && context.manualAdjustments === 0;
    if (clean) {
      await Promise.all([
        incrementBadgeCounter('clean_sessions_total'),
        incrementBadgeCounter('clean_session_streak'),
      ]);
    } else if (context.manualAdjustments !== undefined) {
      await setBadgeCounter('clean_session_streak', 0);
    }

    if ((context.nudgesUsed ?? 0) === 0) {
      await incrementBadgeCounter('no_nudge_needed_sessions');
    }

    const hour = new Date().getHours();
    if (hour < 9) await incrementBadgeCounter('morning_completions');
    if (hour >= 21) await incrementBadgeCounter('night_completions');

    const [modeSetting, hourSetting] = await Promise.all([
      getSetting('notification_mode'),
      getSetting('scheduled_hour'),
    ]);
    const mode = normalizeNotificationMode(modeSetting);
    const scheduledHour = Number.parseInt(hourSetting ?? '8', 10) || 8;
    if (mode === 'strict' && isInsideScheduledWindow(scheduledHour)) {
      await incrementBadgeCounter('strict_window_completions');
    }

    const durationMs = context.durationMs ?? 0;
    if ((context.trackingMethod ?? 'camera') !== 'manual' && durationMs > 0) {
      const priorBest = await getCounter('best_20_time_ms');
      if (priorBest > 0 && durationMs < priorBest) {
        await incrementBadgeCounter('speed_pb_count');
      }
      if (priorBest === 0 || durationMs < priorBest) {
        await setBadgeCounter('best_20_time_ms', durationMs);
      }
    }
  }

  if (context.event === 'monthly_test_completed' && reps > 0) {
    await incrementBadgeCounter('monthly_test_attempts');
    const priorBest = await getCounter('best_test_reps');
    if (priorBest > 0 && reps >= Math.ceil(priorBest * 1.1)) {
      await incrementBadgeCounter('monthly_test_10pct_improvements');
    }
    if (reps > priorBest) {
      await setBadgeCounter('best_test_reps', reps);
    }
  }
}

async function getCounter(key: string): Promise<number> {
  const counters = await getBadgeCounters();
  return counters[key] ?? 0;
}

async function loadBadgeStats(): Promise<BadgeStats> {
  const [streak, buddies, completedDaysThisWeek, bestCompletedTimeMs, counters, modeSetting, hourSetting] =
    await Promise.all([
      getStreak(),
      getBuddyLinks(),
      getCompletedDaysThisWeek(),
      getBestCompletedTime(),
      getBadgeCounters(),
      getSetting('notification_mode'),
      getSetting('scheduled_hour'),
    ]);

  const scheduledHour = Number.parseInt(hourSetting ?? '8', 10) || 8;

  return {
    currentStreak: streak.current,
    bestStreak: streak.best,
    totalSessions: streak.totalSessions,
    buddyCount: buddies.length,
    completedDaysThisWeek,
    bestCompletedTimeMs,
    counters,
    notificationMode: normalizeNotificationMode(modeSetting),
    scheduledWindowActive: isInsideScheduledWindow(scheduledHour),
  };
}

function normalizeNotificationMode(value: string | null): BadgeStats['notificationMode'] {
  if (value === 'strict' || value === 'random' || value === 'scheduled_fallback') return value;
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

function counter(stats: BadgeStats, key: string): number {
  return stats.counters[key] ?? 0;
}

function progressForBadge(
  badge: BadgeDefinition,
  stats: BadgeStats
): Pick<BadgeProgress, 'current' | 'target' | 'progressLabel' | 'canUnlockNow'> {
  switch (badge.id) {
    case 'starter_sprout':
      return progress(stats.totalSessions, 1, `${Math.min(stats.totalSessions, 1)}/1 day`);
    case 'tiny_spark':
      return progress(stats.bestStreak, 3, `${Math.min(stats.bestStreak, 3)}/3 days`);
    case 'hatched_habit':
      return progress(stats.bestStreak, 7, `${Math.min(stats.bestStreak, 7)}/7 days`);
    case 'two_week_bean':
      return progress(stats.bestStreak, 14, `${Math.min(stats.bestStreak, 14)}/14 days`);
    case 'monthling':
      return progress(stats.bestStreak, 30, `${Math.min(stats.bestStreak, 30)}/30 days`);
    case 'flame_friend':
      return progress(stats.bestStreak, 60, `${Math.min(stats.bestStreak, 60)}/60 days`);
    case 'tiny_legend':
      return progress(stats.bestStreak, 90, `${Math.min(stats.bestStreak, 90)}/90 days`);
    case 'ancient_egg':
      return progress(stats.bestStreak, 180, `${Math.min(stats.bestStreak, 180)}/180 days`);
    case 'year_goblin':
      return progress(stats.bestStreak, 365, `${Math.min(stats.bestStreak, 365)}/365 days`);
    case 'first_buddy':
      return progress(stats.buddyCount, 1, `${Math.min(stats.buddyCount, 1)}/1 buddy`);
    case 'popular':
      return progress(stats.buddyCount, 3, `${Math.min(stats.buddyCount, 3)}/3 buddies`);
    case 'buddy_magnet':
      return progress(stats.buddyCount, 5, `${Math.min(stats.buddyCount, 5)}/5 buddies`);
    case 'clean_20':
      return progress(counter(stats, 'clean_sessions_total'), 1, counter(stats, 'clean_sessions_total') > 0 ? 'Clean set complete' : 'No clean set yet');
    case 'speed_sprout':
      return progress(counter(stats, 'speed_pb_count'), 1, counter(stats, 'speed_pb_count') > 0 ? 'Personal best beaten' : 'Beat your previous best');
    case 'sub_60_bean': {
      const best = counter(stats, 'best_20_time_ms') || stats.bestCompletedTimeMs || 0;
      const hit = best > 0 && best <= 60000;
      return progress(hit ? 1 : 0, 1, best > 0 ? `Best ${Math.round(best / 1000)}s` : 'No timed set yet');
    }
    case 'no_excuses_bean':
      return progress(counter(stats, 'strict_window_completions'), 1, stats.notificationMode === 'strict'
        ? stats.scheduledWindowActive ? 'Strict window active' : 'Hit your strict window'
        : 'Switch to No Excuses mode');
    case 'baseline_badge':
      return progress(counter(stats, 'monthly_test_attempts'), 1, counter(stats, 'monthly_test_attempts') > 0 ? 'Test recorded' : 'No test recorded yet');
    case 'stronger_bean':
      return progress(counter(stats, 'monthly_test_10pct_improvements'), 1, counter(stats, 'monthly_test_10pct_improvements') > 0 ? '10% improvement recorded' : 'Improve a monthly test by 10%');
    case 'form_snob':
      return progress(counter(stats, 'clean_session_streak'), 5, `${Math.min(counter(stats, 'clean_session_streak'), 5)}/5 clean sessions`);
    case 'perfect_week':
      return progress(
        stats.completedDaysThisWeek,
        7,
        `${Math.min(stats.completedDaysThisWeek, 7)}/7 this week`
      );
    case 'morning_bean':
      return progress(counter(stats, 'morning_completions'), 3, `${Math.min(counter(stats, 'morning_completions'), 3)}/3 mornings`);
    case 'night_gremlin':
      return progress(counter(stats, 'night_completions'), 3, `${Math.min(counter(stats, 'night_completions'), 3)}/3 nights`);
    case 'no_nudge_needed':
      return progress(counter(stats, 'no_nudge_needed_sessions'), 5, `${Math.min(counter(stats, 'no_nudge_needed_sessions'), 5)}/5 no-nudge wins`);
    default:
      return progress(0, 1, badge.blockedLabel ?? 'Coming soon');
  }
}

function progress(current: number, target: number, progressLabel: string) {
  return {
    current,
    target,
    progressLabel,
    canUnlockNow: current >= target,
  };
}

function unlockMap(unlocks: BadgeUnlock[]): Map<string, BadgeUnlock> {
  return new Map(unlocks.map(unlock => [unlock.badgeId, unlock]));
}

export async function getBadgeCollection(
  context: BadgeEventContext = {}
): Promise<BadgeProgress[]> {
  const [stats, unlocks] = await Promise.all([loadBadgeStats(), getBadgeUnlocks()]);
  const byId = unlockMap(unlocks);

  return BADGE_DEFINITIONS
    .map(definition => {
      const unlock = byId.get(definition.id);
      const badgeProgress = progressForBadge(definition, stats);
      const target = Math.max(1, badgeProgress.target);
      const percent = Math.min(100, Math.round((badgeProgress.current / target) * 100));
      const backendBlocked = definition.backendRequired && !context.backendVerified;

      return {
        definition,
        unlocked: !!unlock,
        unlockedAt: unlock?.unlockedAt ?? null,
        xpAwarded: unlock?.xpAwarded ?? 0,
        shareCount: unlock?.shareCount ?? 0,
        current: badgeProgress.current,
        target,
        percent,
        progressLabel: backendBlocked
          ? definition.blockedLabel ?? 'Live tracking is coming soon'
          : badgeProgress.progressLabel,
        hiddenUntilUnlocked: definition.visibility === 'hidden' && !unlock,
        canUnlockNow: !backendBlocked && !unlock && badgeProgress.canUnlockNow,
      };
    })
    .sort((a, b) => a.definition.sortOrder - b.definition.sortOrder);
}

export async function evaluateBadgeUnlocks(
  context: BadgeEventContext = {}
): Promise<BadgeUnlockResult[]> {
  const eventId = context.eventId?.trim();
  if (eventId && await hasProcessedBadgeEvent(eventId)) {
    return [];
  }

  await updateBadgeCountersForEvent(context);
  const collection = await getBadgeCollection(context);
  const newlyUnlocked: BadgeUnlockResult[] = [];

  for (const item of collection) {
    if (!item.canUnlockNow) continue;
    const inserted = await insertBadgeUnlock(item.definition.id, item.definition.xp);
    if (!inserted) continue;

    await awardBadgeXp(item.definition.xp, {
      badgeId: item.definition.id,
      category: item.definition.category,
      name: item.definition.name,
    });

    newlyUnlocked.push({
      definition: item.definition,
      unlockedAt: new Date().toISOString(),
      xpAwarded: item.definition.xp,
    });
  }

  if (eventId) {
    await markBadgeEventProcessed(eventId, context.event ?? 'unknown');
  }

  return newlyUnlocked;
}

export async function markBadgeShared(badgeId: string): Promise<void> {
  await incrementBadgeShareCount(badgeId);
}

export function buildBadgeBragText(badge: BadgeDefinition, inviteCode?: string | null): string {
  return buildSharePayload('badge', {
    inviteCode,
    badgeName: badge.name,
    badgeDescription: badge.description,
    badgeXp: badge.xp,
    source: 'badge',
  }).message;
}
