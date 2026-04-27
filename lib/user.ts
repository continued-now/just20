import { getUserProfile, setUserProfile, markOnboardingComplete, type UserProfile } from './db';

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
  const profile = await getOrCreateUser();
  await setUserProfile({ ...profile, username: username.trim() });
}

export function buildChallengeUrl(inviteCode: string, challengeDays = 7): string {
  return `just20-jake://challenge?code=${encodeURIComponent(inviteCode)}&days=${challengeDays}`;
}

export function buildChallengeShareText(inviteCode: string, streakDays: number, challengeDays = 7): string {
  const dayLine = streakDays > 0
    ? `I just locked Day ${streakDays} on Just20.`
    : "I'm starting Just20 today.";
  const link = buildChallengeUrl(inviteCode, challengeDays);
  return `${dayLine} Join my ${challengeDays}-day 20-pushup challenge.\n\n${link}\n\nNo gym. 20 pushups. Keep me honest.\n\nCode: ${inviteCode}\n#just20`;
}

export function buildShareText(inviteCode: string, streakDays: number): string {
  const streakLine = streakDays > 0
    ? `I'm on day ${streakDays} of doing 20 pushups every single day.`
    : "I'm doing 20 pushups every single day.";
  return `${streakLine} Join my buddy streak on Just20! 💪\n\nAdd me with code: ${inviteCode}\n\n#just20 #fitness`;
}
