import * as SQLite from 'expo-sqlite';
import { localDayKey, localDaysBetween, offsetLocalDay, startOfLocalWeekKey } from './dates';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDb(): Promise<void> {
  db = await SQLite.openDatabaseAsync('just20.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      reps INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS streak (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current INTEGER NOT NULL DEFAULT 0,
      best INTEGER NOT NULL DEFAULT 0,
      last_completed_date TEXT,
      freeze_count INTEGER NOT NULL DEFAULT 0,
      total_sessions INTEGER NOT NULL DEFAULT 0
    );

    INSERT OR IGNORE INTO streak (id, current, best, freeze_count, total_sessions)
    VALUES (1, 0, 0, 0, 0);

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      device_id TEXT NOT NULL,
      username TEXT,
      invite_code TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS buddy_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buddy_username TEXT NOT NULL,
      buddy_invite_code TEXT NOT NULL UNIQUE,
      linked_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coins (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      balance INTEGER NOT NULL DEFAULT 0,
      total_earned INTEGER NOT NULL DEFAULT 0,
      last_chest_date TEXT,
      last_daily_bonus_date TEXT
    );

    INSERT OR IGNORE INTO coins (id, balance, total_earned) VALUES (1, 0, 0);

    CREATE TABLE IF NOT EXISTS xp (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      balance INTEGER NOT NULL DEFAULT 0,
      total_earned INTEGER NOT NULL DEFAULT 0,
      last_daily_award_date TEXT,
      last_milestone_award_date TEXT
    );

    INSERT OR IGNORE INTO xp (id, balance, total_earned) VALUES (1, 0, 0);

    CREATE TABLE IF NOT EXISTS xp_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount INTEGER NOT NULL,
      source TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS badge_unlocks (
      badge_id TEXT PRIMARY KEY,
      unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
      xp_awarded INTEGER NOT NULL DEFAULT 0,
      share_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS badge_counters (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scheduled_nudges (
      date TEXT NOT NULL,
      fire_at INTEGER NOT NULL
    );
  `);

  // Migrations for existing installs
  try { await db.execAsync('ALTER TABLE streak ADD COLUMN streak_repair_used_date TEXT'); } catch (_) {}
  try { await db.execAsync('ALTER TABLE streak ADD COLUMN user_seed INTEGER'); } catch (_) {}
  try { await db.execAsync('ALTER TABLE coins ADD COLUMN last_milestone_bonus_date TEXT'); } catch (_) {}
  try { await db.execAsync('ALTER TABLE user_profile ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0'); } catch (_) {}
  // Existing users who already have a username have effectively "done" onboarding
  await db.runAsync('UPDATE user_profile SET onboarding_complete = 1 WHERE username IS NOT NULL AND onboarding_complete = 0');
  await db.runAsync(
    'UPDATE streak SET user_seed = ? WHERE id = 1 AND user_seed IS NULL',
    [Math.floor(Math.random() * 2147483647)]
  );
}

export async function getUserSeed(): Promise<number> {
  if (!db) return 0;
  const row = await db.getFirstAsync<{ user_seed: number | null }>(
    'SELECT user_seed FROM streak WHERE id = 1'
  );
  return row?.user_seed ?? 0;
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function saveSession(reps: number, durationMs: number): Promise<void> {
  if (!db) return;
  const today = localDayKey();
  const completed = reps >= 20 ? 1 : 0;
  await db.withTransactionAsync(async () => {
    await db!.runAsync(
      'INSERT INTO sessions (date, reps, duration_ms, completed) VALUES (?, ?, ?, ?)',
      [today, reps, durationMs, completed]
    );
    if (completed) await updateStreak(today);
  });
}

async function updateStreak(today: string): Promise<void> {
  if (!db) return;
  const s = await db.getFirstAsync<{
    current: number;
    best: number;
    last_completed_date: string | null;
    freeze_count: number;
    total_sessions: number;
  }>('SELECT * FROM streak WHERE id = 1');

  if (!s) return;
  if (s.last_completed_date === today) {
    await db.runAsync('UPDATE streak SET total_sessions = total_sessions + 1 WHERE id = 1');
    return;
  }

  const yesterday = offsetLocalDay(today, -1);
  let newCurrent = 1;
  let newFreezeCount = s.freeze_count;

  if (s.last_completed_date === yesterday) {
    newCurrent = s.current + 1;
  } else if (s.last_completed_date) {
    const daysMissed = localDaysBetween(s.last_completed_date, today);
    if (daysMissed === 2 && s.freeze_count > 0) {
      newCurrent = s.current + 1;
      newFreezeCount = s.freeze_count - 1;
    }
  }

  const newBest = Math.max(s.best, newCurrent);
  const earnedFreeze = newCurrent > 0 && newCurrent % 7 === 0;
  newFreezeCount = earnedFreeze ? Math.min(newFreezeCount + 1, 3) : newFreezeCount;

  await db.runAsync(
    `UPDATE streak
     SET current = ?, best = ?, last_completed_date = ?,
         freeze_count = ?, total_sessions = total_sessions + 1
     WHERE id = 1`,
    [newCurrent, newBest, today, newFreezeCount]
  );
}

export async function getStreak(): Promise<{
  current: number;
  best: number;
  lastCompletedDate: string | null;
  freezeCount: number;
  totalSessions: number;
}> {
  if (!db) return { current: 0, best: 0, lastCompletedDate: null, freezeCount: 0, totalSessions: 0 };
  const row = await db.getFirstAsync<{
    current: number;
    best: number;
    last_completed_date: string | null;
    freeze_count: number;
    total_sessions: number;
  }>('SELECT * FROM streak WHERE id = 1');
  if (!row) return { current: 0, best: 0, lastCompletedDate: null, freezeCount: 0, totalSessions: 0 };

  const daysSinceCompletion = row.last_completed_date
    ? localDaysBetween(row.last_completed_date, localDayKey())
    : 0;
  const streakStillAlive =
    daysSinceCompletion <= 1 || (daysSinceCompletion === 2 && row.freeze_count > 0);

  return {
    current: streakStillAlive ? row.current : 0,
    best: row.best,
    lastCompletedDate: row.last_completed_date,
    freezeCount: row.freeze_count,
    totalSessions: row.total_sessions,
  };
}

export async function getCompletedSetsToday(): Promise<number> {
  if (!db) return 0;
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sessions WHERE date = ? AND completed = 1',
    [localDayKey()]
  );
  return row?.count ?? 0;
}

export async function isCompletedToday(): Promise<boolean> {
  if (!db) return false;
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sessions WHERE date = ? AND completed = 1',
    [localDayKey()]
  );
  return (row?.count ?? 0) > 0;
}

export async function getBestCompletedTime(): Promise<number | null> {
  if (!db) return null;
  const row = await db.getFirstAsync<{ min_duration: number | null }>(
    'SELECT MIN(duration_ms) as min_duration FROM sessions WHERE completed = 1'
  );
  return row?.min_duration ?? null;
}

export async function getCalendarData(daysBack = 30): Promise<Record<string, boolean>> {
  if (!db) return {};
  const startDay = offsetLocalDay(localDayKey(), -daysBack);
  const rows = await db.getAllAsync<{ date: string; completed: number }>(
    `SELECT date, MAX(completed) as completed FROM sessions
     WHERE date >= ?
     GROUP BY date`,
    [startDay]
  );
  const result: Record<string, boolean> = {};
  for (const row of rows) result[row.date] = row.completed === 1;
  return result;
}

export async function getCompletedDaysThisWeek(): Promise<number> {
  if (!db) return 0;
  const mondayStr = startOfLocalWeekKey();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT date) as count FROM sessions WHERE date >= ? AND completed = 1`,
    [mondayStr]
  );
  return row?.count ?? 0;
}

// ─── Streak repair ───────────────────────────────────────────────────────────

export async function getStreakRepairStatus(): Promise<{
  eligible: boolean;
  previousStreak: number;
}> {
  if (!db) return { eligible: false, previousStreak: 0 };
  const row = await db.getFirstAsync<{
    current: number;
    last_completed_date: string | null;
    freeze_count: number;
    streak_repair_used_date: string | null;
  }>('SELECT current, last_completed_date, freeze_count, streak_repair_used_date FROM streak WHERE id = 1');

  if (!row || !row.last_completed_date) return { eligible: false, previousStreak: 0 };
  if (row.current < 7) return { eligible: false, previousStreak: row.current };

  const today = localDayKey();
  const daysMissed = localDaysBetween(row.last_completed_date, today);

  const autoFreezeCovers = daysMissed === 2 && row.freeze_count > 0;
  if (autoFreezeCovers || daysMissed < 2 || daysMissed > 3) {
    return { eligible: false, previousStreak: row.current };
  }

  if (row.streak_repair_used_date) {
    const daysSinceRepair = localDaysBetween(row.streak_repair_used_date, today);
    if (daysSinceRepair < 30) return { eligible: false, previousStreak: row.current };
  }

  return { eligible: true, previousStreak: row.current };
}

export async function repairStreak(): Promise<void> {
  if (!db) return;
  const today = localDayKey();
  const yesterday = offsetLocalDay(today, -1);
  await db.runAsync(
    'UPDATE streak SET last_completed_date = ?, streak_repair_used_date = ? WHERE id = 1',
    [yesterday, today]
  );
}

// ─── User profile ────────────────────────────────────────────────────────────

export type UserProfile = {
  deviceId: string;
  username: string | null;
  inviteCode: string;
  onboardingComplete: boolean;
};

export async function getUserProfile(): Promise<UserProfile | null> {
  if (!db) return null;
  const row = await db.getFirstAsync<{
    device_id: string;
    username: string | null;
    invite_code: string;
    onboarding_complete: number | null;
  }>('SELECT device_id, username, invite_code, onboarding_complete FROM user_profile WHERE id = 1');
  if (!row) return null;
  return {
    deviceId: row.device_id,
    username: row.username,
    inviteCode: row.invite_code,
    onboardingComplete: (row.onboarding_complete ?? 0) === 1,
  };
}

export async function setUserProfile(profile: UserProfile): Promise<void> {
  if (!db) return;
  await db.runAsync(
    `INSERT INTO user_profile (id, device_id, username, invite_code, onboarding_complete)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET device_id=excluded.device_id,
       username=excluded.username, invite_code=excluded.invite_code,
       onboarding_complete=excluded.onboarding_complete`,
    [profile.deviceId, profile.username, profile.inviteCode, profile.onboardingComplete ? 1 : 0]
  );
}

export async function markOnboardingComplete(): Promise<void> {
  if (!db) return;
  await db.runAsync('UPDATE user_profile SET onboarding_complete = 1 WHERE id = 1');
}

// ─── Buddy links ─────────────────────────────────────────────────────────────

export type BuddyLink = {
  id: number;
  buddyUsername: string;
  buddyInviteCode: string;
  linkedAt: string;
};

export async function getBuddyLinks(): Promise<BuddyLink[]> {
  if (!db) return [];
  const rows = await db.getAllAsync<{
    id: number;
    buddy_username: string;
    buddy_invite_code: string;
    linked_at: string;
  }>('SELECT * FROM buddy_links ORDER BY linked_at DESC');
  return rows.map(r => ({
    id: r.id,
    buddyUsername: r.buddy_username,
    buddyInviteCode: r.buddy_invite_code,
    linkedAt: r.linked_at,
  }));
}

export async function getBuddyLink(code: string): Promise<BuddyLink | null> {
  if (!db) return null;
  const row = await db.getFirstAsync<{
    id: number;
    buddy_username: string;
    buddy_invite_code: string;
    linked_at: string;
  }>('SELECT * FROM buddy_links WHERE buddy_invite_code = ?', [code.toUpperCase()]);
  if (!row) return null;
  return {
    id: row.id,
    buddyUsername: row.buddy_username,
    buddyInviteCode: row.buddy_invite_code,
    linkedAt: row.linked_at,
  };
}

export async function addBuddyLink(buddyUsername: string, buddyInviteCode: string): Promise<void> {
  if (!db) return;
  await db.runAsync(
    'INSERT OR IGNORE INTO buddy_links (buddy_username, buddy_invite_code) VALUES (?, ?)',
    [buddyUsername, buddyInviteCode.toUpperCase()]
  );
}

export async function removeBuddyLink(buddyInviteCode: string): Promise<void> {
  if (!db) return;
  await db.runAsync('DELETE FROM buddy_links WHERE buddy_invite_code = ?', [buddyInviteCode.toUpperCase()]);
}

// ─── Coins ───────────────────────────────────────────────────────────────────

export type CoinsData = {
  balance: number;
  totalEarned: number;
  lastChestDate: string | null;
  lastDailyBonusDate: string | null;
  lastMilestoneBonusDate: string | null;
};

export async function getCoins(): Promise<CoinsData> {
  if (!db) {
    return {
      balance: 0,
      totalEarned: 0,
      lastChestDate: null,
      lastDailyBonusDate: null,
      lastMilestoneBonusDate: null,
    };
  }
  const row = await db.getFirstAsync<{
    balance: number;
    total_earned: number;
    last_chest_date: string | null;
    last_daily_bonus_date: string | null;
    last_milestone_bonus_date: string | null;
  }>('SELECT * FROM coins WHERE id = 1');
  if (!row) {
    return {
      balance: 0,
      totalEarned: 0,
      lastChestDate: null,
      lastDailyBonusDate: null,
      lastMilestoneBonusDate: null,
    };
  }
  return {
    balance: row.balance,
    totalEarned: row.total_earned,
    lastChestDate: row.last_chest_date,
    lastDailyBonusDate: row.last_daily_bonus_date,
    lastMilestoneBonusDate: row.last_milestone_bonus_date,
  };
}

export async function earnCoins(amount: number): Promise<void> {
  if (!db) return;
  await db.runAsync(
    'UPDATE coins SET balance = balance + ?, total_earned = total_earned + ? WHERE id = 1',
    [amount, amount]
  );
}

export async function spendCoins(amount: number): Promise<boolean> {
  if (!db) return false;
  const row = await db.getFirstAsync<{ balance: number }>('SELECT balance FROM coins WHERE id = 1');
  if (!row || row.balance < amount) return false;
  await db.runAsync('UPDATE coins SET balance = balance - ? WHERE id = 1', [amount]);
  return true;
}

export async function claimDailyBonus(): Promise<number | null> {
  if (!db) return null;
  const today = localDayKey();
  const row = await db.getFirstAsync<{ last_daily_bonus_date: string | null }>(
    'SELECT last_daily_bonus_date FROM coins WHERE id = 1'
  );
  if (row?.last_daily_bonus_date === today) return null;
  const amount = 10;
  await db.runAsync(
    'UPDATE coins SET balance = balance + ?, total_earned = total_earned + ?, last_daily_bonus_date = ? WHERE id = 1',
    [amount, amount, today]
  );
  return amount;
}

export async function claimMilestoneBonus(amount: number): Promise<number | null> {
  if (!db) return null;
  const today = localDayKey();
  const row = await db.getFirstAsync<{ last_milestone_bonus_date: string | null }>(
    'SELECT last_milestone_bonus_date FROM coins WHERE id = 1'
  );
  if (row?.last_milestone_bonus_date === today) return null;
  await db.runAsync(
    'UPDATE coins SET balance = balance + ?, total_earned = total_earned + ?, last_milestone_bonus_date = ? WHERE id = 1',
    [amount, amount, today]
  );
  return amount;
}

export async function markChestClaimed(amount: number): Promise<void> {
  if (!db) return;
  await db.runAsync(
    'UPDATE coins SET balance = balance + ?, total_earned = total_earned + ?, last_chest_date = ? WHERE id = 1',
    [amount, amount, localDayKey()]
  );
}

// ─── XP ─────────────────────────────────────────────────────────────────────

export type XpData = {
  balance: number;
  totalEarned: number;
  lastDailyAwardDate: string | null;
  lastMilestoneAwardDate: string | null;
};

export type XpEvent = {
  id: number;
  date: string;
  amount: number;
  source: string;
  metadata: string | null;
  createdAt: string;
};

export type BadgeUnlock = {
  badgeId: string;
  unlockedAt: string;
  xpAwarded: number;
  shareCount: number;
};

export type BadgeCounter = {
  key: string;
  count: number;
  updatedAt: string;
};

export async function getXp(): Promise<XpData> {
  if (!db) {
    return {
      balance: 0,
      totalEarned: 0,
      lastDailyAwardDate: null,
      lastMilestoneAwardDate: null,
    };
  }

  const row = await db.getFirstAsync<{
    balance: number;
    total_earned: number;
    last_daily_award_date: string | null;
    last_milestone_award_date: string | null;
  }>('SELECT * FROM xp WHERE id = 1');

  if (!row) {
    return {
      balance: 0,
      totalEarned: 0,
      lastDailyAwardDate: null,
      lastMilestoneAwardDate: null,
    };
  }

  return {
    balance: row.balance,
    totalEarned: row.total_earned,
    lastDailyAwardDate: row.last_daily_award_date,
    lastMilestoneAwardDate: row.last_milestone_award_date,
  };
}

async function addXp(amount: number, source: string, metadata?: Record<string, unknown>): Promise<void> {
  if (!db || amount <= 0) return;
  const today = localDayKey();
  await db.withTransactionAsync(async () => {
    await db!.runAsync(
      'UPDATE xp SET balance = balance + ?, total_earned = total_earned + ? WHERE id = 1',
      [amount, amount]
    );
    await db!.runAsync(
      'INSERT INTO xp_events (date, amount, source, metadata) VALUES (?, ?, ?, ?)',
      [today, amount, source, metadata ? JSON.stringify(metadata) : null]
    );
  });
}

export async function claimDailyXp(
  amount: number,
  metadata?: Record<string, unknown>
): Promise<number | null> {
  if (!db) return null;
  const today = localDayKey();
  const row = await db.getFirstAsync<{ last_daily_award_date: string | null }>(
    'SELECT last_daily_award_date FROM xp WHERE id = 1'
  );
  if (row?.last_daily_award_date === today) return null;

  await addXp(amount, 'daily_workout', metadata);
  await db.runAsync('UPDATE xp SET last_daily_award_date = ? WHERE id = 1', [today]);
  return amount;
}

export async function claimMilestoneXp(
  amount: number,
  metadata?: Record<string, unknown>
): Promise<number | null> {
  if (!db) return null;
  const today = localDayKey();
  const row = await db.getFirstAsync<{ last_milestone_award_date: string | null }>(
    'SELECT last_milestone_award_date FROM xp WHERE id = 1'
  );
  if (row?.last_milestone_award_date === today) return null;

  await addXp(amount, 'streak_milestone', metadata);
  await db.runAsync('UPDATE xp SET last_milestone_award_date = ? WHERE id = 1', [today]);
  return amount;
}

export async function awardBadgeXp(
  amount: number,
  metadata?: Record<string, unknown>
): Promise<number | null> {
  if (!db || amount <= 0) return null;
  await addXp(amount, 'badge_unlock', metadata);
  return amount;
}

export async function getBadgeUnlocks(): Promise<BadgeUnlock[]> {
  if (!db) return [];
  const rows = await db.getAllAsync<{
    badge_id: string;
    unlocked_at: string;
    xp_awarded: number;
    share_count: number;
  }>('SELECT * FROM badge_unlocks ORDER BY unlocked_at DESC');

  return rows.map(row => ({
    badgeId: row.badge_id,
    unlockedAt: row.unlocked_at,
    xpAwarded: row.xp_awarded,
    shareCount: row.share_count,
  }));
}

export async function insertBadgeUnlock(badgeId: string, xpAwarded: number): Promise<boolean> {
  if (!db) return false;
  const result = await db.runAsync(
    'INSERT OR IGNORE INTO badge_unlocks (badge_id, xp_awarded) VALUES (?, ?)',
    [badgeId, xpAwarded]
  );
  return (result as { changes?: number }).changes === 1;
}

export async function incrementBadgeShareCount(badgeId: string): Promise<void> {
  if (!db) return;
  await db.runAsync(
    'UPDATE badge_unlocks SET share_count = share_count + 1 WHERE badge_id = ?',
    [badgeId]
  );
}

export async function getBadgeCounters(): Promise<Record<string, number>> {
  if (!db) return {};
  const rows = await db.getAllAsync<{
    key: string;
    count: number;
  }>('SELECT key, count FROM badge_counters');

  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.key] = row.count;
    return acc;
  }, {});
}

export async function getBadgeCounter(key: string): Promise<number> {
  if (!db) return 0;
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT count FROM badge_counters WHERE key = ?',
    [key]
  );
  return row?.count ?? 0;
}

export async function setBadgeCounter(key: string, count: number): Promise<void> {
  if (!db) return;
  await db.runAsync(
    `INSERT INTO badge_counters (key, count, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET
       count = excluded.count,
       updated_at = excluded.updated_at`,
    [key, Math.max(0, count)]
  );
}

export async function incrementBadgeCounter(key: string, by = 1): Promise<number> {
  const current = await getBadgeCounter(key);
  const next = current + by;
  await setBadgeCounter(key, next);
  return next;
}

export async function getRecentXpEvents(limit = 20): Promise<XpEvent[]> {
  if (!db) return [];
  const rows = await db.getAllAsync<{
    id: number;
    date: string;
    amount: number;
    source: string;
    metadata: string | null;
    created_at: string;
  }>('SELECT * FROM xp_events ORDER BY created_at DESC LIMIT ?', [limit]);

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    amount: row.amount,
    source: row.source,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
}

// ─── App settings ─────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  if (!db) return null;
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (!db) return;
  await db.runAsync(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}

// ─── Nudge schedule ───────────────────────────────────────────────────────────

export async function saveNudgeSchedule(fireTimes: Date[]): Promise<void> {
  if (!db) return;
  const scheduleDates = [...new Set(fireTimes.map((t) => localDayKey(t)))];
  if (scheduleDates.length === 0) {
    await clearNudgeScheduleFromToday();
    return;
  }

  await db.withTransactionAsync(async () => {
    for (const date of scheduleDates) {
      await db!.runAsync('DELETE FROM scheduled_nudges WHERE date = ?', [date]);
    }
    for (const t of fireTimes) {
      await db!.runAsync(
        'INSERT INTO scheduled_nudges (date, fire_at) VALUES (?, ?)',
        [localDayKey(t), t.getTime()]
      );
    }
  });
}

export async function clearNudgeScheduleFromToday(): Promise<void> {
  if (!db) return;
  await db.runAsync('DELETE FROM scheduled_nudges WHERE date >= ?', [localDayKey()]);
}

export async function getLastFiredNudge(): Promise<number | null> {
  if (!db) return null;
  const today = localDayKey();
  const now = Date.now();
  const tenMinutesAgo = now - 10 * 60 * 1000;
  const row = await db.getFirstAsync<{ fire_at: number }>(
    'SELECT fire_at FROM scheduled_nudges WHERE date = ? AND fire_at <= ? AND fire_at >= ? ORDER BY fire_at DESC LIMIT 1',
    [today, now, tenMinutesAgo]
  );
  return row?.fire_at ?? null;
}

export async function getFiredNudgeCountToday(): Promise<number> {
  if (!db) return 0;
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM scheduled_nudges WHERE date = ? AND fire_at <= ?',
    [localDayKey(), Date.now()]
  );
  return row?.count ?? 0;
}
