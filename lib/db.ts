import * as SQLite from 'expo-sqlite';
import { localDayKey, localDaysBetween, offsetLocalDay, startOfLocalWeekKey } from './dates';
import { devLog } from './diagnostics';
import { normalizeInviteCode } from './validation';

let db: SQLite.SQLiteDatabase | null = null;

export type TrackingMethod = 'camera' | 'camera_adjusted' | 'manual';
export type WorkoutMode = 'daily' | 'duel' | 'test';
export type RecoveryType = 'none' | 'streak_patch' | 'debt_set';
export type RecoveryStatus = 'none' | 'available' | 'active' | 'pending' | 'completed' | 'failed' | 'expired';

export type SessionMetadata = {
  trackingMethod?: TrackingMethod;
  manualAdjustments?: number;
  trackingQuality?: number | null;
  cameraReadyMs?: number | null;
  modelLoadMs?: number | null;
  workoutMode?: WorkoutMode;
  targetReps?: number;
  recoveryType?: RecoveryType;
  repairedDate?: string | null;
};

export type RecoveryOffer = {
  available: boolean;
  reason: 'missed_yesterday' | 'debt_due' | 'none';
  missedDate: string | null;
  previousStreak: number;
  canPatch: boolean;
  canDebtSet: boolean;
  patchWindowStart: number | null;
  patchWindowEnd: number | null;
  patchWindowOpen: boolean;
  activeDebtId: number | null;
  debtStep: number;
  debtDueDate: string | null;
};

export type SessionRecoverySummary = {
  recoveryType: RecoveryType;
  repairedDate: string | null;
  recoveryStatus: RecoveryStatus;
  recoveryXpAwarded: number;
  targetReps: number;
};

export type GrowthEventInput = {
  eventType: string;
  context: string;
  source?: string | null;
  campaign?: string | null;
  creatorCode?: string | null;
  inviteCode?: string | null;
  targetUrl?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type GrowthEvent = {
  id: number;
  date: string;
  eventType: string;
  context: string;
  source: string | null;
  campaign: string | null;
  creatorCode: string | null;
  inviteCode: string | null;
  targetUrl: string | null;
  metadata: string | null;
  createdAt: string;
};

export type AttributionTouchInput = {
  source?: string | null;
  campaign?: string | null;
  creatorCode?: string | null;
  inviteCode?: string | null;
};

export type AttributionState = {
  firstSource: string | null;
  firstCampaign: string | null;
  firstCreatorCode: string | null;
  firstInviteCode: string | null;
  firstSeenAt: string | null;
  lastSource: string | null;
  lastCampaign: string | null;
  lastCreatorCode: string | null;
  lastInviteCode: string | null;
  lastSeenAt: string | null;
};

const STANDARD_TARGET_REPS = 20;
const PATCH_RECOVERY_XP_FULL = 18;
const PATCH_RECOVERY_XP_LATE = 12;
const PATCH_RECOVERY_XP_MANUAL = 5;
const DEBT_RECOVERY_XP_FULL = 10;
const DEBT_RECOVERY_XP_MANUAL = 4;
const PATCH_WINDOW_START_HOUR = 7;
const PATCH_WINDOW_MINUTES = 10;
const PATCH_WINDOW_SPAN_MINUTES = 14 * 60;

type Migration = {
  version: number;
  name: string;
  run: () => Promise<void>;
};

async function tableHasColumn(table: string, column: string): Promise<boolean> {
  if (!db) return false;
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.some(row => row.name === column);
}

async function ensureColumn(table: string, column: string, definition: string): Promise<void> {
  if (!db) return;
  if (await tableHasColumn(table, column)) return;
  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'legacy_profile_session_columns',
    run: async () => {
      await ensureColumn('streak', 'streak_repair_used_date', 'TEXT');
      await ensureColumn('streak', 'user_seed', 'INTEGER');
      await ensureColumn('coins', 'last_milestone_bonus_date', 'TEXT');
      await ensureColumn('user_profile', 'onboarding_complete', 'INTEGER NOT NULL DEFAULT 0');
      await ensureColumn('sessions', 'tracking_method', "TEXT NOT NULL DEFAULT 'camera'");
      await ensureColumn('sessions', 'manual_adjustments', 'INTEGER NOT NULL DEFAULT 0');
      await ensureColumn('sessions', 'tracking_quality', 'REAL');
      await ensureColumn('sessions', 'camera_ready_ms', 'INTEGER');
      await ensureColumn('sessions', 'model_load_ms', 'INTEGER');
      await ensureColumn('sessions', 'workout_mode', "TEXT NOT NULL DEFAULT 'daily'");
      await ensureColumn('sessions', 'target_reps', 'INTEGER NOT NULL DEFAULT 20');
      await ensureColumn('sessions', 'recovery_type', "TEXT NOT NULL DEFAULT 'none'");
      await ensureColumn('sessions', 'repaired_date', 'TEXT');
      await ensureColumn('sessions', 'recovery_status', "TEXT NOT NULL DEFAULT 'none'");
      await ensureColumn('sessions', 'recovery_xp_awarded', 'INTEGER NOT NULL DEFAULT 0');
    },
  },
];

async function getSchemaVersion(): Promise<number> {
  if (!db) return 0;
  const row = await db.getFirstAsync<{ version: number }>('SELECT version FROM schema_meta WHERE id = 1');
  return row?.version ?? 0;
}

async function setSchemaVersion(version: number): Promise<void> {
  if (!db) return;
  await db.runAsync(
    `INSERT INTO schema_meta (id, version, updated_at)
     VALUES (1, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET version = excluded.version, updated_at = excluded.updated_at`,
    [version]
  );
}

async function runMigrations(): Promise<void> {
  if (!db) return;
  let currentVersion = await getSchemaVersion();
  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;
    await db.withTransactionAsync(async () => {
      await migration.run();
      await setSchemaVersion(migration.version);
    });
    currentVersion = migration.version;
    devLog('db_migration_applied', { version: migration.version, name: migration.name });
  }
}

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
      tracking_method TEXT NOT NULL DEFAULT 'camera',
      manual_adjustments INTEGER NOT NULL DEFAULT 0,
      tracking_quality REAL,
      camera_ready_ms INTEGER,
      model_load_ms INTEGER,
      workout_mode TEXT NOT NULL DEFAULT 'daily',
      target_reps INTEGER NOT NULL DEFAULT 20,
      recovery_type TEXT NOT NULL DEFAULT 'none',
      repaired_date TEXT,
      recovery_status TEXT NOT NULL DEFAULT 'none',
      recovery_xp_awarded INTEGER NOT NULL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS coin_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount INTEGER NOT NULL,
      source TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shop_inventory (
      item_id TEXT PRIMARY KEY,
      purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shop_equipped (
      slot TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recovery_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recovery_type TEXT NOT NULL,
      repaired_date TEXT NOT NULL,
      started_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL,
      step INTEGER NOT NULL DEFAULT 0,
      previous_streak INTEGER NOT NULL DEFAULT 0,
      completed_date TEXT,
      recovery_xp_awarded INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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

    CREATE TABLE IF NOT EXISTS badge_event_log (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      processed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schema_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO schema_meta (id, version) VALUES (1, 0);

    CREATE TABLE IF NOT EXISTS scheduled_nudges (
      date TEXT NOT NULL,
      fire_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS growth_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      event_type TEXT NOT NULL,
      context TEXT NOT NULL,
      source TEXT,
      campaign TEXT,
      creator_code TEXT,
      invite_code TEXT,
      target_url TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attribution_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      first_source TEXT,
      first_campaign TEXT,
      first_creator_code TEXT,
      first_invite_code TEXT,
      first_seen_at TEXT,
      last_source TEXT,
      last_campaign TEXT,
      last_creator_code TEXT,
      last_invite_code TEXT,
      last_seen_at TEXT
    );
  `);

  await runMigrations();
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

function parseDayKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getPatchWindow(missedDate: string, today = localDayKey()): {
  start: number;
  end: number;
  open: boolean;
} {
  const offsetMinutes = stableHash(`${missedDate}:${today}`) % (PATCH_WINDOW_SPAN_MINUTES - PATCH_WINDOW_MINUTES);
  const startDate = parseDayKey(today);
  startDate.setHours(PATCH_WINDOW_START_HOUR, offsetMinutes, 0, 0);
  const start = startDate.getTime();
  const end = start + PATCH_WINDOW_MINUTES * 60 * 1000;
  const now = Date.now();
  return { start, end, open: now >= start && now <= end };
}

async function expireOverdueRecovery(today = localDayKey()): Promise<void> {
  if (!db) return;
  await db.runAsync(
    `UPDATE recovery_ledger
     SET status = 'failed', updated_at = datetime('now')
     WHERE recovery_type = 'debt_set'
       AND status IN ('active', 'pending')
       AND due_date < ?`,
    [today]
  );
}

async function countCompletedPatchesSince(dayKey: string): Promise<number> {
  if (!db) return 0;
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM recovery_ledger
     WHERE recovery_type = 'streak_patch'
       AND status = 'completed'
       AND started_date >= ?`,
    [dayKey]
  );
  return row?.count ?? 0;
}

export async function getRecoveryOffer(): Promise<RecoveryOffer> {
  const empty: RecoveryOffer = {
    available: false,
    reason: 'none',
    missedDate: null,
    previousStreak: 0,
    canPatch: false,
    canDebtSet: false,
    patchWindowStart: null,
    patchWindowEnd: null,
    patchWindowOpen: false,
    activeDebtId: null,
    debtStep: 0,
    debtDueDate: null,
  };

  if (!db) return empty;

  const today = localDayKey();
  await expireOverdueRecovery(today);

  const activeDebt = await db.getFirstAsync<{
    id: number;
    repaired_date: string;
    due_date: string;
    step: number;
    previous_streak: number;
  }>(
    `SELECT id, repaired_date, due_date, step, previous_streak
     FROM recovery_ledger
     WHERE recovery_type = 'debt_set'
       AND status IN ('active', 'pending')
     ORDER BY id DESC
     LIMIT 1`
  );

  if (activeDebt) {
    return {
      ...empty,
      available: activeDebt.due_date === today,
      reason: activeDebt.due_date === today ? 'debt_due' : 'none',
      missedDate: activeDebt.repaired_date,
      previousStreak: activeDebt.previous_streak,
      canPatch: false,
      canDebtSet: activeDebt.due_date === today,
      activeDebtId: activeDebt.id,
      debtStep: activeDebt.step,
      debtDueDate: activeDebt.due_date,
    };
  }

  const streak = await db.getFirstAsync<{
    current: number;
    last_completed_date: string | null;
  }>('SELECT current, last_completed_date FROM streak WHERE id = 1');

  if (!streak?.last_completed_date || streak.current <= 0) return empty;

  const daysSinceCompletion = localDaysBetween(streak.last_completed_date, today);
  if (daysSinceCompletion !== 2) return empty;

  const missedDate = offsetLocalDay(today, -1);
  const patchWindow = getPatchWindow(missedDate, today);
  const weekPatchCount = await countCompletedPatchesSince(startOfLocalWeekKey());
  const monthPatchCount = await countCompletedPatchesSince(`${today.slice(0, 7)}-01`);

  return {
    available: true,
    reason: 'missed_yesterday',
    missedDate,
    previousStreak: streak.current,
    canPatch: weekPatchCount < 1 && monthPatchCount < 3,
    canDebtSet: true,
    patchWindowStart: patchWindow.start,
    patchWindowEnd: patchWindow.end,
    patchWindowOpen: patchWindow.open,
    activeDebtId: null,
    debtStep: 0,
    debtDueDate: null,
  };
}

function getRecoveryXp(
  recoveryType: RecoveryType,
  trackingMethod: TrackingMethod,
  repairedDate: string | null,
  today = localDayKey()
): number {
  if (trackingMethod === 'manual') {
    return recoveryType === 'streak_patch' ? PATCH_RECOVERY_XP_MANUAL : DEBT_RECOVERY_XP_MANUAL;
  }

  if (recoveryType === 'streak_patch' && repairedDate) {
    return getPatchWindow(repairedDate, today).open ? PATCH_RECOVERY_XP_FULL : PATCH_RECOVERY_XP_LATE;
  }

  if (recoveryType === 'debt_set') return DEBT_RECOVERY_XP_FULL;

  return 0;
}

async function completeStreakPatchInTransaction(input: {
  today: string;
  repairedDate: string | null;
  trackingMethod: TrackingMethod;
  sessionId: number | null;
}): Promise<{ status: RecoveryStatus; xp: number; ledgerId: number | null }> {
  if (!db || !input.repairedDate) return { status: 'failed', xp: 0, ledgerId: null };

  const expectedMissedDate = offsetLocalDay(input.today, -1);
  const expectedPreviousDate = offsetLocalDay(input.today, -2);
  const streak = await db.getFirstAsync<{
    current: number;
    best: number;
    last_completed_date: string | null;
    freeze_count: number;
  }>('SELECT current, best, last_completed_date, freeze_count FROM streak WHERE id = 1');

  if (!streak || input.repairedDate !== expectedMissedDate || streak.last_completed_date !== expectedPreviousDate) {
    return { status: 'failed', xp: 0, ledgerId: null };
  }

  const newCurrent = streak.current + 2;
  const newBest = Math.max(streak.best, newCurrent);
  const earnedFreeze = newCurrent > 0 && newCurrent % 7 === 0;
  const newFreezeCount = earnedFreeze ? Math.min(streak.freeze_count + 1, 3) : streak.freeze_count;

  await db.runAsync(
    `UPDATE streak
     SET current = ?, best = ?, last_completed_date = ?,
         freeze_count = ?, total_sessions = total_sessions + 1
     WHERE id = 1`,
    [newCurrent, newBest, input.today, newFreezeCount]
  );

  const result = await db.runAsync(
    `INSERT INTO recovery_ledger (
       recovery_type, repaired_date, started_date, due_date, status, step,
       previous_streak, completed_date
     ) VALUES ('streak_patch', ?, ?, ?, 'completed', 1, ?, ?)`,
    [input.repairedDate, input.today, input.today, streak.current, input.today]
  );
  const ledgerId = (result as { lastInsertRowId?: number }).lastInsertRowId ?? null;

  if (input.sessionId) {
    await db.runAsync(
      "UPDATE sessions SET recovery_status = 'completed' WHERE id = ?",
      [input.sessionId]
    );
  }

  return {
    status: 'completed',
    xp: getRecoveryXp('streak_patch', input.trackingMethod, input.repairedDate, input.today),
    ledgerId,
  };
}

async function applyDebtSetInTransaction(input: {
  today: string;
  repairedDate: string | null;
  trackingMethod: TrackingMethod;
  sessionId: number | null;
}): Promise<{ status: RecoveryStatus; xp: number; ledgerId: number | null }> {
  if (!db || !input.repairedDate) return { status: 'failed', xp: 0, ledgerId: null };

  const activeDebt = await db.getFirstAsync<{
    id: number;
    repaired_date: string;
    due_date: string;
    step: number;
    previous_streak: number;
  }>(
    `SELECT id, repaired_date, due_date, step, previous_streak
     FROM recovery_ledger
     WHERE recovery_type = 'debt_set'
       AND status IN ('active', 'pending')
     ORDER BY id DESC
     LIMIT 1`
  );

  if (activeDebt) {
    if (activeDebt.due_date !== input.today || activeDebt.repaired_date !== input.repairedDate) {
      return { status: 'failed', xp: 0, ledgerId: activeDebt.id };
    }

    const streak = await db.getFirstAsync<{
      current: number;
      best: number;
      last_completed_date: string | null;
      freeze_count: number;
    }>('SELECT current, best, last_completed_date, freeze_count FROM streak WHERE id = 1');
    if (!streak || streak.last_completed_date !== offsetLocalDay(input.today, -1)) {
      return { status: 'failed', xp: 0, ledgerId: activeDebt.id };
    }

    const newCurrent = streak.current + 1;
    const newBest = Math.max(streak.best, newCurrent);
    const earnedFreeze = newCurrent > 0 && newCurrent % 7 === 0;
    const newFreezeCount = earnedFreeze ? Math.min(streak.freeze_count + 1, 3) : streak.freeze_count;

    await db.runAsync(
      `UPDATE streak
       SET current = ?, best = ?, last_completed_date = ?,
           freeze_count = ?, total_sessions = total_sessions + 1
       WHERE id = 1`,
      [newCurrent, newBest, input.today, newFreezeCount]
    );
    await db.runAsync(
      `UPDATE recovery_ledger
       SET status = 'completed', step = 2, completed_date = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [input.today, activeDebt.id]
    );
    if (input.sessionId) {
      await db.runAsync(
        "UPDATE sessions SET recovery_status = 'completed' WHERE id = ?",
        [input.sessionId]
      );
    }

    return {
      status: 'completed',
      xp: getRecoveryXp('debt_set', input.trackingMethod, input.repairedDate, input.today),
      ledgerId: activeDebt.id,
    };
  }

  const expectedMissedDate = offsetLocalDay(input.today, -1);
  const expectedPreviousDate = offsetLocalDay(input.today, -2);
  const streak = await db.getFirstAsync<{
    current: number;
    best: number;
    last_completed_date: string | null;
    freeze_count: number;
  }>('SELECT current, best, last_completed_date, freeze_count FROM streak WHERE id = 1');

  if (!streak || input.repairedDate !== expectedMissedDate || streak.last_completed_date !== expectedPreviousDate) {
    return { status: 'failed', xp: 0, ledgerId: null };
  }

  const newCurrent = streak.current + 2;
  const newBest = Math.max(streak.best, newCurrent);
  const earnedFreeze = newCurrent > 0 && newCurrent % 7 === 0;
  const newFreezeCount = earnedFreeze ? Math.min(streak.freeze_count + 1, 3) : streak.freeze_count;
  const dueDate = offsetLocalDay(input.today, 1);

  await db.runAsync(
    `UPDATE streak
     SET current = ?, best = ?, last_completed_date = ?,
         freeze_count = ?, total_sessions = total_sessions + 1
     WHERE id = 1`,
    [newCurrent, newBest, input.today, newFreezeCount]
  );

  const result = await db.runAsync(
    `INSERT INTO recovery_ledger (
       recovery_type, repaired_date, started_date, due_date, status, step,
       previous_streak
     ) VALUES ('debt_set', ?, ?, ?, 'active', 1, ?)`,
    [input.repairedDate, input.today, dueDate, streak.current]
  );
  const ledgerId = (result as { lastInsertRowId?: number }).lastInsertRowId ?? null;

  if (input.sessionId) {
    await db.runAsync(
      "UPDATE sessions SET recovery_status = 'active' WHERE id = ?",
      [input.sessionId]
    );
  }

  return { status: 'active', xp: 0, ledgerId };
}

export async function saveSession(
  reps: number,
  durationMs: number,
  metadata: SessionMetadata = {}
): Promise<number | null> {
  if (!db) return null;
  const today = localDayKey();
  const targetReps = Math.max(STANDARD_TARGET_REPS, metadata.targetReps ?? STANDARD_TARGET_REPS);
  const trackingMethod = metadata.trackingMethod ?? 'camera';
  const manualAdjustments = Math.max(0, metadata.manualAdjustments ?? 0);
  const trackingQuality = metadata.trackingQuality ?? null;
  const cameraReadyMs = metadata.cameraReadyMs ?? null;
  const modelLoadMs = metadata.modelLoadMs ?? null;
  const workoutMode = metadata.workoutMode ?? 'daily';
  const recoveryType = metadata.recoveryType ?? 'none';
  const completionTargetReps = recoveryType === 'none' ? STANDARD_TARGET_REPS : targetReps;
  const completed = reps >= completionTargetReps ? 1 : 0;
  const repairedDate = metadata.repairedDate ?? null;
  let sessionId: number | null = null;
  let recoveryXpToAward = 0;
  let recoveryLedgerId: number | null = null;
  let recoveryStatus: RecoveryStatus = 'none';

  await db.withTransactionAsync(async () => {
    const result = await db!.runAsync(
      `INSERT INTO sessions (
        date, reps, duration_ms, completed, tracking_method, manual_adjustments,
        tracking_quality, camera_ready_ms, model_load_ms, workout_mode,
        target_reps, recovery_type, repaired_date, recovery_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        today,
        reps,
        durationMs,
        completed,
        trackingMethod,
        manualAdjustments,
        trackingQuality,
        cameraReadyMs,
        modelLoadMs,
        workoutMode,
        targetReps,
        recoveryType,
        repairedDate,
        recoveryType === 'none' ? 'none' : 'pending',
      ]
    );
    sessionId = (result as { lastInsertRowId?: number }).lastInsertRowId ?? null;
    if (completed) {
      if (recoveryType === 'streak_patch') {
        const result = await completeStreakPatchInTransaction({
          today,
          repairedDate,
          trackingMethod,
          sessionId,
        });
        recoveryStatus = result.status;
        recoveryXpToAward = result.xp;
        recoveryLedgerId = result.ledgerId;
        if (result.status === 'failed') await updateStreak(today);
      } else if (recoveryType === 'debt_set') {
        const result = await applyDebtSetInTransaction({
          today,
          repairedDate,
          trackingMethod,
          sessionId,
        });
        recoveryStatus = result.status;
        recoveryXpToAward = result.xp;
        recoveryLedgerId = result.ledgerId;
        if (result.status === 'failed') await updateStreak(today);
      } else {
        await updateStreak(today);
      }
    }
  });

  if (sessionId && recoveryType !== 'none') {
    await db.runAsync(
      'UPDATE sessions SET recovery_status = ? WHERE id = ?',
      [recoveryStatus, sessionId]
    );
  }

  if (sessionId && recoveryXpToAward > 0) {
    await addXp(recoveryXpToAward, recoveryType, {
      recoveryType,
      repairedDate,
      trackingMethod,
      manualAdjustments,
      targetReps,
    });
    await db.runAsync(
      'UPDATE sessions SET recovery_xp_awarded = ? WHERE id = ?',
      [recoveryXpToAward, sessionId]
    );
    if (recoveryLedgerId) {
      await db.runAsync(
        `UPDATE recovery_ledger
         SET recovery_xp_awarded = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [recoveryXpToAward, recoveryLedgerId]
      );
    }
  }

  return sessionId;
}

export async function getSessionRecoverySummary(sessionId: number | null): Promise<SessionRecoverySummary | null> {
  if (!db || !sessionId) return null;
  const row = await db.getFirstAsync<{
    recovery_type: RecoveryType;
    repaired_date: string | null;
    recovery_status: RecoveryStatus;
    recovery_xp_awarded: number;
    target_reps: number;
  }>(
    `SELECT recovery_type, repaired_date, recovery_status, recovery_xp_awarded, target_reps
     FROM sessions
     WHERE id = ?`,
    [sessionId]
  );
  if (!row) return null;

  return {
    recoveryType: row.recovery_type ?? 'none',
    repairedDate: row.repaired_date,
    recoveryStatus: row.recovery_status ?? 'none',
    recoveryXpAwarded: row.recovery_xp_awarded ?? 0,
    targetReps: row.target_reps ?? STANDARD_TARGET_REPS,
  };
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

export async function getCompletedRepsToday(): Promise<number> {
  if (!db) return 0;
  const row = await db.getFirstAsync<{ reps: number | null }>(
    `SELECT SUM(reps) as reps
     FROM sessions
     WHERE date = ?
       AND completed = 1
       AND recovery_type = 'none'`,
    [localDayKey()]
  );
  return row?.reps ?? 0;
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
    "SELECT MIN(duration_ms) as min_duration FROM sessions WHERE completed = 1 AND tracking_method != 'manual'"
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

export async function getRecoveryCalendarData(daysBack = 30): Promise<Record<string, RecoveryType>> {
  if (!db) return {};
  const startDay = offsetLocalDay(localDayKey(), -daysBack);
  const rows = await db.getAllAsync<{
    repaired_date: string;
    recovery_type: RecoveryType;
  }>(
    `SELECT repaired_date, recovery_type
     FROM recovery_ledger
     WHERE repaired_date >= ?
       AND status = 'completed'`,
    [startDay]
  );
  const result: Record<string, RecoveryType> = {};
  for (const row of rows) result[row.repaired_date] = row.recovery_type;
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
  const normalizedCode = normalizeInviteCode(code);
  const row = await db.getFirstAsync<{
    id: number;
    buddy_username: string;
    buddy_invite_code: string;
    linked_at: string;
  }>('SELECT * FROM buddy_links WHERE buddy_invite_code = ?', [normalizedCode]);
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
  const normalizedCode = normalizeInviteCode(buddyInviteCode);
  if (!normalizedCode) return;
  await db.runAsync(
    'INSERT OR IGNORE INTO buddy_links (buddy_username, buddy_invite_code) VALUES (?, ?)',
    [buddyUsername, normalizedCode]
  );
}

export async function removeBuddyLink(buddyInviteCode: string): Promise<void> {
  if (!db) return;
  await db.runAsync('DELETE FROM buddy_links WHERE buddy_invite_code = ?', [
    normalizeInviteCode(buddyInviteCode),
  ]);
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

export async function refundCoins(amount: number): Promise<void> {
  if (!db) return;
  await db.runAsync('UPDATE coins SET balance = balance + ? WHERE id = 1', [amount]);
}

export type CoinTransaction = {
  id: number;
  date: string;
  amount: number;
  source: string;
  metadata: string | null;
  createdAt: string;
};

export async function recordCoinTransaction(
  amount: number,
  source: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!db) return;
  await db.runAsync(
    'INSERT INTO coin_transactions (date, amount, source, metadata) VALUES (?, ?, ?, ?)',
    [localDayKey(), amount, source, metadata ? JSON.stringify(metadata) : null]
  );
}

export async function getCoinTransactions(limit = 20): Promise<CoinTransaction[]> {
  if (!db) return [];
  const rows = await db.getAllAsync<{
    id: number;
    date: string;
    amount: number;
    source: string;
    metadata: string | null;
    created_at: string;
  }>(
    'SELECT * FROM coin_transactions ORDER BY id DESC LIMIT ?',
    [limit]
  );
  return rows.map(row => ({
    id: row.id,
    date: row.date,
    amount: row.amount,
    source: row.source,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
}

export type ShopInventoryRow = {
  itemId: string;
  purchasedAt: string;
};

export type ShopEquippedRow = {
  slot: string;
  itemId: string;
  updatedAt: string;
};

export async function getShopInventoryRows(): Promise<ShopInventoryRow[]> {
  if (!db) return [];
  const rows = await db.getAllAsync<{
    item_id: string;
    purchased_at: string;
  }>('SELECT * FROM shop_inventory ORDER BY purchased_at DESC');
  return rows.map(row => ({
    itemId: row.item_id,
    purchasedAt: row.purchased_at,
  }));
}

export async function getShopEquippedRows(): Promise<ShopEquippedRow[]> {
  if (!db) return [];
  const rows = await db.getAllAsync<{
    slot: string;
    item_id: string;
    updated_at: string;
  }>('SELECT * FROM shop_equipped');
  return rows.map(row => ({
    slot: row.slot,
    itemId: row.item_id,
    updatedAt: row.updated_at,
  }));
}

export async function grantShopInventoryItem(itemId: string): Promise<void> {
  if (!db) return;
  await db.runAsync(
    'INSERT OR IGNORE INTO shop_inventory (item_id) VALUES (?)',
    [itemId]
  );
}

export async function setShopEquippedItem(slot: string, itemId: string): Promise<void> {
  if (!db) return;
  await db.runAsync(
    `INSERT INTO shop_equipped (slot, item_id, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(slot) DO UPDATE SET item_id = excluded.item_id, updated_at = datetime('now')`,
    [slot, itemId]
  );
}

export async function addStreakFreeze(maxFreezes = 3): Promise<boolean> {
  if (!db) return false;
  const row = await db.getFirstAsync<{ freeze_count: number }>(
    'SELECT freeze_count FROM streak WHERE id = 1'
  );
  if (!row || row.freeze_count >= maxFreezes) return false;
  await db.runAsync(
    'UPDATE streak SET freeze_count = MIN(freeze_count + 1, ?) WHERE id = 1',
    [maxFreezes]
  );
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

export async function hasProcessedBadgeEvent(eventId: string): Promise<boolean> {
  if (!db) return false;
  const row = await db.getFirstAsync<{ event_id: string }>(
    'SELECT event_id FROM badge_event_log WHERE event_id = ?',
    [eventId]
  );
  return !!row;
}

export async function markBadgeEventProcessed(eventId: string, eventType: string): Promise<void> {
  if (!db) return;
  await db.runAsync(
    'INSERT OR IGNORE INTO badge_event_log (event_id, event_type) VALUES (?, ?)',
    [eventId, eventType]
  );
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

// ─── Growth + attribution ───────────────────────────────────────────────────

function cleanNullable(value: string | null | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

export async function recordGrowthEvent(input: GrowthEventInput): Promise<void> {
  if (!db) return;
  await db.runAsync(
    `INSERT INTO growth_events
      (date, event_type, context, source, campaign, creator_code, invite_code, target_url, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      localDayKey(),
      input.eventType,
      input.context,
      cleanNullable(input.source),
      cleanNullable(input.campaign),
      cleanNullable(input.creatorCode),
      cleanNullable(input.inviteCode),
      cleanNullable(input.targetUrl),
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]
  );
}

export async function getGrowthEvents(limit = 50): Promise<GrowthEvent[]> {
  if (!db) return [];
  const rows = await db.getAllAsync<{
    id: number;
    date: string;
    event_type: string;
    context: string;
    source: string | null;
    campaign: string | null;
    creator_code: string | null;
    invite_code: string | null;
    target_url: string | null;
    metadata: string | null;
    created_at: string;
  }>(
    'SELECT * FROM growth_events ORDER BY id DESC LIMIT ?',
    [limit]
  );

  return rows.map(row => ({
    id: row.id,
    date: row.date,
    eventType: row.event_type,
    context: row.context,
    source: row.source,
    campaign: row.campaign,
    creatorCode: row.creator_code,
    inviteCode: row.invite_code,
    targetUrl: row.target_url,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
}

export async function saveAttributionTouch(input: AttributionTouchInput): Promise<void> {
  if (!db) return;
  const source = cleanNullable(input.source);
  const campaign = cleanNullable(input.campaign);
  const creatorCode = cleanNullable(input.creatorCode);
  const inviteCode = cleanNullable(input.inviteCode);
  if (!source && !campaign && !creatorCode && !inviteCode) return;

  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO attribution_state
      (id, first_source, first_campaign, first_creator_code, first_invite_code, first_seen_at,
       last_source, last_campaign, last_creator_code, last_invite_code, last_seen_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       last_source = excluded.last_source,
       last_campaign = excluded.last_campaign,
       last_creator_code = excluded.last_creator_code,
       last_invite_code = excluded.last_invite_code,
       last_seen_at = excluded.last_seen_at`,
    [source, campaign, creatorCode, inviteCode, now, source, campaign, creatorCode, inviteCode, now]
  );
}

export async function getAttributionState(): Promise<AttributionState | null> {
  if (!db) return null;
  const row = await db.getFirstAsync<{
    first_source: string | null;
    first_campaign: string | null;
    first_creator_code: string | null;
    first_invite_code: string | null;
    first_seen_at: string | null;
    last_source: string | null;
    last_campaign: string | null;
    last_creator_code: string | null;
    last_invite_code: string | null;
    last_seen_at: string | null;
  }>('SELECT * FROM attribution_state WHERE id = 1');
  if (!row) return null;
  return {
    firstSource: row.first_source,
    firstCampaign: row.first_campaign,
    firstCreatorCode: row.first_creator_code,
    firstInviteCode: row.first_invite_code,
    firstSeenAt: row.first_seen_at,
    lastSource: row.last_source,
    lastCampaign: row.last_campaign,
    lastCreatorCode: row.last_creator_code,
    lastInviteCode: row.last_invite_code,
    lastSeenAt: row.last_seen_at,
  };
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

export async function getBooleanSetting(key: string, fallback: boolean): Promise<boolean> {
  const value = await getSetting(key);
  if (value === null) return fallback;
  return value === '1' || value === 'true';
}

export async function setBooleanSetting(key: string, value: boolean): Promise<void> {
  await setSetting(key, value ? '1' : '0');
}

// ─── Nudge schedule ───────────────────────────────────────────────────────────

export async function saveNudgeSchedule(fireTimes: Date[]): Promise<void> {
  if (!db) return;
  if (fireTimes.length === 0) {
    await clearNudgeScheduleFromToday();
    return;
  }

  await db.withTransactionAsync(async () => {
    await db!.runAsync('DELETE FROM scheduled_nudges WHERE date < ?', [offsetLocalDay(localDayKey(), -7)]);
    await db!.runAsync('DELETE FROM scheduled_nudges WHERE fire_at > ?', [Date.now()]);
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
  await db.withTransactionAsync(async () => {
    await db!.runAsync('DELETE FROM scheduled_nudges WHERE date < ?', [offsetLocalDay(localDayKey(), -7)]);
    await db!.runAsync('DELETE FROM scheduled_nudges WHERE fire_at > ?', [Date.now()]);
  });
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

export async function getNextScheduledNudge(): Promise<number | null> {
  if (!db) return null;
  const today = localDayKey();
  const row = await db.getFirstAsync<{ fire_at: number }>(
    'SELECT fire_at FROM scheduled_nudges WHERE date = ? AND fire_at > ? ORDER BY fire_at ASC LIMIT 1',
    [today, Date.now()]
  );
  return row?.fire_at ?? null;
}
