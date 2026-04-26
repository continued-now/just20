// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE SCAFFOLD — not yet active
//
// To activate:
//   1. Create a project at supabase.com (free tier is enough)
//   2. Run the SQL schema below in the Supabase SQL Editor
//   3. Set SUPABASE_ENABLED = true and fill in your URL + anon key
//   4. Run: npx expo install @supabase/supabase-js  (optional: better client)
//
// ── SQL SCHEMA (paste into Supabase SQL Editor) ───────────────────────────────
//
// CREATE TABLE users (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   device_id TEXT UNIQUE NOT NULL,
//   username TEXT,
//   invite_code TEXT UNIQUE NOT NULL,
//   streak_current INT DEFAULT 0,
//   last_completed_date DATE,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// CREATE TABLE buddy_links (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//   buddy_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   UNIQUE (user_id, buddy_id)
// );
//
// CREATE TABLE challenges (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   name TEXT NOT NULL,
//   creator_id UUID REFERENCES users(id),
//   invite_code TEXT UNIQUE NOT NULL,
//   starts_at DATE NOT NULL,
//   ends_at DATE,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// CREATE TABLE challenge_members (
//   challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
//   user_id UUID REFERENCES users(id) ON DELETE CASCADE,
//   joined_at TIMESTAMPTZ DEFAULT NOW(),
//   PRIMARY KEY (challenge_id, user_id)
// );
//
// -- Enable RLS and add policies for each table (restrict to own rows via device_id).
// ─────────────────────────────────────────────────────────────────────────────

export const SUPABASE_ENABLED = false;

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

type Row = Record<string, unknown>;

async function req(path: string, method = 'GET', body?: Row): Promise<Row[]> {
  if (!SUPABASE_ENABLED) throw new Error('Supabase not enabled');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export const supabase = {
  async syncUser(deviceId: string, username: string | null, inviteCode: string): Promise<void> {
    await req('users', 'POST', { device_id: deviceId, username, invite_code: inviteCode });
  },

  async findUserByCode(code: string): Promise<{ id: string; username: string | null; invite_code: string } | null> {
    const rows = await req(`users?invite_code=eq.${encodeURIComponent(code)}&select=id,username,invite_code`);
    return (rows[0] as { id: string; username: string | null; invite_code: string }) ?? null;
  },

  async addBuddyLink(myDeviceId: string, buddyInviteCode: string): Promise<void> {
    const [meRows, buddyRows] = await Promise.all([
      req(`users?device_id=eq.${encodeURIComponent(myDeviceId)}&select=id`),
      req(`users?invite_code=eq.${encodeURIComponent(buddyInviteCode)}&select=id`),
    ]);
    const me = meRows[0] as { id: string } | undefined;
    const buddy = buddyRows[0] as { id: string } | undefined;
    if (!me || !buddy) throw new Error('User not found');
    await req('buddy_links', 'POST', { user_id: me.id, buddy_id: buddy.id });
  },

  async getBuddyStatuses(myDeviceId: string): Promise<{ username: string; completedToday: boolean }[]> {
    // Requires a view or RPC in Supabase that joins buddy_links → users.
    // Placeholder — implement after schema is wired.
    return [];
  },

  async updateStreakStatus(deviceId: string, streakCurrent: number, lastCompletedDate: string): Promise<void> {
    await req(
      `users?device_id=eq.${encodeURIComponent(deviceId)}`,
      'PATCH',
      { streak_current: streakCurrent, last_completed_date: lastCompletedDate }
    );
  },
};
