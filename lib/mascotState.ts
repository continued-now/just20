export type MascotMood = 'sleeping' | 'neutral' | 'annoyed' | 'angry' | 'furious' | 'celebrating';

export type StreakTierInfo = {
  minDays: number;
  label: string;
  form: string;
  badge: string | null;
  ringColor: string | null;
  nextTierDays: number | null;
};

export const STREAK_TIERS: StreakTierInfo[] = [
  { minDays: 365, label: 'Legend', form: '👑🔥', badge: '👑', ringColor: '#FFB300', nextTierDays: null },
  { minDays: 100, label: 'Cursed', form: '💀🔥', badge: '💀', ringColor: '#9C27B0', nextTierDays: 365 },
  { minDays: 30, label: 'Inferno', form: '🔥🔥', badge: '🔥', ringColor: '#E64A19', nextTierDays: 100 },
  { minDays: 7, label: 'Flame', form: '🔥', badge: '🔥', ringColor: '#FF7043', nextTierDays: 30 },
  { minDays: 0, label: 'Dormant', form: '🥚', badge: null, ringColor: null, nextTierDays: 7 },
];

export function getTierInfo(streak: number): StreakTierInfo & { daysToNext: number | null } {
  const tier = STREAK_TIERS.find(t => streak >= t.minDays) ?? STREAK_TIERS[STREAK_TIERS.length - 1];
  return { ...tier, daysToNext: tier.nextTierDays !== null ? tier.nextTierDays - streak : null };
}

export function getMoodFromContext(remaining: number, completedToday: boolean): MascotMood {
  if (completedToday) return 'celebrating';
  const hour = new Date().getHours();
  if (hour < 7) return 'sleeping';
  if (remaining >= 16) return 'neutral';
  if (remaining >= 11) return 'annoyed';
  if (remaining >= 6) return 'angry';
  return 'furious';
}
