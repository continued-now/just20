import { SUPABASE_ENABLED, supabase } from './supabase';
import { getOrCreateUser } from './user';
import { getBuddyLinks, getBuddyLink, addBuddyLink } from './db';
import { localDayKey } from './dates';
import { evaluateBadgeUnlocks } from './badges';

export type BuddyStatus = {
  username: string;
  inviteCode: string;
  completedToday: boolean;
};

// Returns list of buddies with their today-completion status.
// Local mode: status is always unknown (requires backend for real-time data).
// Supabase mode: fetches live data.
export async function getBuddyStatuses(): Promise<BuddyStatus[]> {
  if (SUPABASE_ENABLED) {
    try {
      const user = await getOrCreateUser();
      const remote = await supabase.getBuddyStatuses(user.deviceId);
    return remote.map(r => ({ ...r, inviteCode: '' }));
    } catch {
      // Fall through to local
    }
  }
  const links = await getBuddyLinks();
  return links.map(l => ({
    username: l.buddyUsername,
    inviteCode: l.buddyInviteCode,
    completedToday: false, // unknown without backend
  }));
}

// Links a buddy by their invite code. Returns success/error state.
export async function linkBuddy(rawCode: string): Promise<{
  success: boolean;
  username: string | null;
  error?: string;
}> {
  const code = rawCode.toUpperCase().trim();
  if (!code) return { success: false, username: null, error: 'Enter a code first.' };

  // Don't link yourself
  const me = await getOrCreateUser();
  if (code === me.inviteCode) {
    return { success: false, username: null, error: "That's your own code!" };
  }

  // Duplicate check
  const existing = await getBuddyLink(code);
  if (existing) {
    return { success: false, username: null, error: 'Already linked to that code.' };
  }

  if (SUPABASE_ENABLED) {
    try {
      const buddy = await supabase.findUserByCode(code);
      if (!buddy) return { success: false, username: null, error: 'Code not found. Check and try again.' };
      await supabase.addBuddyLink(me.deviceId, code);
      await addBuddyLink(buddy.username ?? 'Anonymous', code);
      await evaluateBadgeUnlocks({ event: 'buddy_linked', backendVerified: true });
      return { success: true, username: buddy.username };
    } catch {
      return { success: false, username: null, error: 'Connection error. Try again.' };
    }
  }

  // Local mode: save optimistically — cross-device sync happens once Supabase is active
  await addBuddyLink('Friend', code);
  await evaluateBadgeUnlocks({ event: 'buddy_linked' });
  return { success: true, username: 'Friend' };
}

// Pushes today's completion to Supabase so buddies can see it.
// No-op in local mode.
export async function syncCompletionToCloud(streakCurrent: number): Promise<void> {
  if (!SUPABASE_ENABLED) return;
  try {
    const user = await getOrCreateUser();
    const today = localDayKey();
    await supabase.updateStreakStatus(user.deviceId, streakCurrent, today);
  } catch { /* non-critical — fail silently */ }
}
