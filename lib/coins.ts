import {
  getCoins,
  earnCoins,
  spendCoins,
  claimDailyBonus,
  claimMilestoneBonus,
  markChestClaimed,
  getCompletedDaysThisWeek,
  type CoinsData,
} from './db';
import { isMilestoneDay } from './milestones';
import { localDayKey } from './dates';

export { type CoinsData };

// Weighted random chest reward — lower amounts more likely (variable ratio schedule)
const CHEST_TIERS = [10, 15, 20, 25, 30, 40, 50, 75, 100];
const CHEST_WEIGHTS = [25, 20, 18, 15, 10, 6, 3, 2, 1]; // sums to 100

function drawChestReward(): number {
  let r = Math.random() * CHEST_WEIGHTS.reduce((a, b) => a + b, 0);
  for (let i = 0; i < CHEST_TIERS.length; i++) {
    r -= CHEST_WEIGHTS[i];
    if (r <= 0) return CHEST_TIERS[i];
  }
  return CHEST_TIERS[0];
}

// Call this after every successful workout completion
export async function awardWorkoutCoins(streakDay: number): Promise<{
  daily: number;
  milestone: number;
  total: number;
}> {
  let daily = 0;
  let milestone = 0;

  // Daily bonus (10 coins, once per day)
  const claimed = await claimDailyBonus();
  if (claimed !== null) daily = claimed;

  // Milestone bonus (50 coins on milestone days)
  if (isMilestoneDay(streakDay)) {
    const claimed = await claimMilestoneBonus(50);
    if (claimed !== null) milestone = claimed;
  }

  return { daily, milestone, total: daily + milestone };
}

// Check if the weekly chest is available to open
export async function isChestAvailable(): Promise<boolean> {
  const now = new Date();
  // Available every Sunday
  if (now.getDay() !== 0) return false;

  const coins = await getCoins();
  const today = localDayKey(now);

  // Already claimed today
  if (coins.lastChestDate === today) return false;

  // Must have completed ≥5 days this week
  const daysCompleted = await getCompletedDaysThisWeek();
  return daysCompleted >= 5;
}

// Opens the chest and returns the reward amount (or null if not eligible)
export async function openWeeklyChest(): Promise<number | null> {
  const available = await isChestAvailable();
  if (!available) return null;

  const reward = drawChestReward();
  await markChestClaimed(reward);
  return reward;
}

export { getCoins, earnCoins, spendCoins };
