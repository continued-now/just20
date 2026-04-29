import { getSetting, setSetting } from './db';
import { localDayKey, localDaysBetween } from './dates';
import { buildGrowthLink, buildSharePayload } from './growth';

const SQUAD_ROOM_SETTING = 'squad_room';
const MONTHLY_TEST_SETTING = 'last_monthly_test_date';
const MONTHLY_TEST_INTERVAL_DAYS = 30;

export type SquadRoom = {
  code: string;
  name: string;
  joinedAt: string;
};

export type PetEvolution = {
  name: string;
  emoji: string;
  nextGoal: string;
};

export type MonthlyTestStatus = {
  available: boolean;
  daysUntilNext: number;
  lastTestDate: string | null;
};

function normalizeTeamCode(rawCode: string): string {
  const cleaned = rawCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/--+/g, '-');

  if (!cleaned) return '';
  return cleaned.startsWith('TEAM-') ? cleaned.slice(0, 20) : `TEAM-${cleaned}`.slice(0, 20);
}

function roomNameFromCode(code: string): string {
  return code.replace(/^TEAM-/, '').replace(/-/g, ' ') || 'Just 20 Room';
}

export function buildDefaultRoomCode(inviteCode: string): string {
  return `TEAM-${inviteCode.replace(/^JUST-/, '').slice(0, 4) || 'J20'}`;
}

export async function getCurrentSquadRoom(): Promise<SquadRoom | null> {
  const raw = await getSetting(SQUAD_ROOM_SETTING);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SquadRoom;
    return parsed.code ? parsed : null;
  } catch {
    const code = normalizeTeamCode(raw);
    if (!code) return null;
    return {
      code,
      name: roomNameFromCode(code),
      joinedAt: new Date().toISOString(),
    };
  }
}

export async function joinSquadRoom(rawCode: string): Promise<{
  success: boolean;
  room: SquadRoom | null;
  error?: string;
}> {
  const code = normalizeTeamCode(rawCode);
  if (!code || code.length < 7) {
    return { success: false, room: null, error: 'Enter a team code like TEAM-FLOOR.' };
  }

  const room: SquadRoom = {
    code,
    name: roomNameFromCode(code),
    joinedAt: new Date().toISOString(),
  };
  await setSetting(SQUAD_ROOM_SETTING, JSON.stringify(room));
  return { success: true, room };
}

export async function getMonthlyTestStatus(): Promise<MonthlyTestStatus> {
  const lastTestDate = await getSetting(MONTHLY_TEST_SETTING);
  if (!lastTestDate) {
    return { available: true, daysUntilNext: 0, lastTestDate: null };
  }

  const daysSince = localDaysBetween(lastTestDate, localDayKey());
  const daysUntilNext = Math.max(0, MONTHLY_TEST_INTERVAL_DAYS - daysSince);
  return {
    available: daysUntilNext === 0,
    daysUntilNext,
    lastTestDate,
  };
}

export async function markMonthlyTestTaken(): Promise<void> {
  await setSetting(MONTHLY_TEST_SETTING, localDayKey());
}

export function getPetEvolution(streakDays: number): PetEvolution {
  if (streakDays >= 365) return { name: 'Legend Flame', emoji: '👑🔥', nextGoal: 'Maxed. Protect the myth.' };
  if (streakDays >= 100) return { name: 'Cursed Flame', emoji: '💀🔥', nextGoal: `${365 - streakDays} days to Legend.` };
  if (streakDays >= 30) return { name: 'Inferno Pet', emoji: '🔥🔥', nextGoal: `${100 - streakDays} days to Cursed.` };
  if (streakDays >= 7) return { name: 'Flame Pet', emoji: '🔥', nextGoal: `${30 - streakDays} days to Inferno.` };
  if (streakDays > 0) return { name: 'Spark Egg', emoji: '✨🥚', nextGoal: `${7 - streakDays} days to hatch.` };
  return { name: 'Unhatched Egg', emoji: '🥚', nextGoal: 'Do Day 1 to wake it up.' };
}

export function buildDuelUrl(inviteCode: string, targetSeconds: number): string {
  return buildGrowthLink({
    path: 'duel',
    inviteCode,
    source: 'squad',
    campaign: 'async_duel',
    params: { target: targetSeconds },
  });
}

export function buildDuelShareText(inviteCode: string, targetSeconds: number, streakDays: number): string {
  return buildSharePayload('duel', { inviteCode, targetSeconds, streakDays }).message;
}

export function buildNudgeShareText(buddyUsername: string, inviteCode: string): string {
  return buildSharePayload('nudge', { inviteCode, buddyUsername }).message;
}

export function buildWeeklyWrappedShareText(input: {
  completedDays: number;
  streakDays: number;
  bestStreak: number;
  xpBalance: number;
  inviteCode: string;
}): string {
  return buildSharePayload('weekly_wrapped', input).message;
}

export function buildMonthlyTestShareText(input: {
  reps: number;
  durationSeconds: number | null;
  inviteCode: string;
}): string {
  return buildSharePayload('monthly_test', input).message;
}

export function buildPetEvolutionShareText(streakDays: number, inviteCode: string): string {
  const pet = getPetEvolution(streakDays);
  const payload = buildSharePayload('pet', { streakDays, inviteCode });
  return `My Just 20 streak pet is now ${pet.emoji} ${pet.name} at Day ${streakDays}.\n\n${pet.nextGoal}\n\nJoin my squad:\n${payload.link}\n\nCode: ${inviteCode}\n#just20`;
}

export function buildTeamChallengeUrl(roomCode: string, inviteCode: string): string {
  return buildGrowthLink({
    path: 'team',
    inviteCode,
    source: 'squad',
    campaign: 'team_room',
    params: { room: roomCode },
  });
}

export function buildTeamChallengeShareText(roomCode: string, inviteCode: string): string {
  return buildSharePayload('team', { inviteCode, roomCode }).message;
}
