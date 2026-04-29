import { getUserProfile, setUserProfile, markOnboardingComplete, type UserProfile } from './db';
import { buildGrowthLink, buildSharePayload } from './growth';
import { validateUsername } from './validation';

export { markOnboardingComplete };

function generateDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function generateInviteCode(): string {
  // Avoids ambiguous chars: I, O, 0, 1
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const suffix = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `JUST-${suffix}`;
}

export async function getOrCreateUser(): Promise<UserProfile> {
  const existing = await getUserProfile();
  if (existing) return existing;

  const fresh: UserProfile = {
    deviceId: generateDeviceId(),
    username: null,
    inviteCode: generateInviteCode(),
    onboardingComplete: false,
  };
  await setUserProfile(fresh);
  return fresh;
}

export async function updateUsername(username: string): Promise<void> {
  const validation = validateUsername(username);
  if (validation.error || !validation.username) {
    throw new Error(validation.error ?? 'Invalid username.');
  }
  const profile = await getOrCreateUser();
  await setUserProfile({ ...profile, username: validation.username });
}

export function buildChallengeUrl(inviteCode: string, challengeDays = 7): string {
  return buildGrowthLink({
    path: 'challenge',
    inviteCode,
    source: 'profile',
    campaign: 'daily_challenge',
    params: { days: challengeDays },
  });
}

export function buildChallengeShareText(inviteCode: string, streakDays: number, challengeDays = 7): string {
  return buildSharePayload('challenge', { inviteCode, streakDays, challengeDays }).message;
}

export function buildShareText(inviteCode: string, streakDays: number): string {
  return buildSharePayload('profile', { inviteCode, streakDays }).message;
}
