import * as SQLite from 'expo-sqlite';

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
  `);
}

export async function saveSession(reps: number, durationMs: number): Promise<void> {
  if (!db) return;
  const today = todayStr();
  const completed = reps >= 20 ? 1 : 0;
  await db.runAsync(
    'INSERT INTO sessions (date, reps, duration_ms, completed) VALUES (?, ?, ?, ?)',
    [today, reps, durationMs, completed]
  );
  if (completed) await updateStreak(today);
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
  if (s.last_completed_date === today) return;

  const yesterday = offsetDay(today, -1);
  let newCurrent = 1;

  if (s.last_completed_date === yesterday) {
    newCurrent = s.current + 1;
  } else if (s.last_completed_date) {
    const daysMissed =
      (new Date(today).getTime() - new Date(s.last_completed_date).getTime()) / 86400000;
    if (daysMissed === 2 && s.freeze_count > 0) {
      newCurrent = s.current + 1;
      await db.runAsync('UPDATE streak SET freeze_count = freeze_count - 1 WHERE id = 1');
    }
  }

  const newBest = Math.max(s.best, newCurrent);
  const earnedFreeze = newCurrent > 0 && newCurrent % 7 === 0;
  const newFreezeCount = earnedFreeze
    ? Math.min(s.freeze_count + 1, 3)
    : s.freeze_count;

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
  return {
    current: row.current,
    best: row.best,
    lastCompletedDate: row.last_completed_date,
    freezeCount: row.freeze_count,
    totalSessions: row.total_sessions,
  };
}

export async function isCompletedToday(): Promise<boolean> {
  if (!db) return false;
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sessions WHERE date = ? AND completed = 1',
    [todayStr()]
  );
  return (row?.count ?? 0) > 0;
}

export async function getCalendarData(daysBack = 30): Promise<Record<string, boolean>> {
  if (!db) return {};
  const rows = await db.getAllAsync<{ date: string; completed: number }>(
    `SELECT date, MAX(completed) as completed FROM sessions
     WHERE date >= date('now', '-${daysBack} days')
     GROUP BY date`
  );
  const result: Record<string, boolean> = {};
  for (const row of rows) result[row.date] = row.completed === 1;
  return result;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function offsetDay(dateStr: string, offset: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}
