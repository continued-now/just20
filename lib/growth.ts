import {
  getAttributionState as getStoredAttributionState,
  recordGrowthEvent as recordStoredGrowthEvent,
  saveAttributionTouch,
  type AttributionState,
  type GrowthEventInput,
} from './db';

export type ShareContext =
  | 'completion'
  | 'challenge'
  | 'duel'
  | 'team'
  | 'squad'
  | 'profile'
  | 'streak'
  | 'badge'
  | 'monthly_test'
  | 'weekly_challenge'
  | 'weekly_wrapped'
  | 'pet'
  | 'nudge';

export type GrowthSource =
  | 'completion'
  | 'profile'
  | 'squad'
  | 'streak'
  | 'badge'
  | 'deep_link'
  | 'weekly_challenge'
  | 'system';

export type GrowthCampaign =
  | 'daily_challenge'
  | 'friend_streak'
  | 'async_duel'
  | 'team_room'
  | 'weekly_wrapped'
  | 'monthly_test'
  | 'streak_proof'
  | 'pet_evolution'
  | 'weekly_challenge'
  | 'badge_brag'
  | 'buddy_nudge'
  | 'proof_card';

export type WeeklyChallenge = {
  id: string;
  title: string;
  subtitle: string;
  days: number;
  campaign: GrowthCampaign;
  cta: string;
};

export type GrowthSharePayload = {
  context: ShareContext;
  title: string;
  message: string;
  link: string;
  source: GrowthSource;
  campaign: GrowthCampaign;
  creatorCode: string | null;
  inviteCode: string | null;
};

type LinkParamValue = string | number | boolean | null | undefined;

export type BuildGrowthLinkInput = {
  path: 'challenge' | 'duel' | 'team';
  inviteCode?: string | null;
  source?: GrowthSource;
  campaign?: GrowthCampaign;
  creatorCode?: string | null;
  params?: Record<string, LinkParamValue>;
};

export type SharePayloadInput = {
  inviteCode?: string | null;
  streakDays?: number;
  challengeDays?: number;
  targetSeconds?: number;
  roomCode?: string;
  completedDays?: number;
  bestStreak?: number;
  xpBalance?: number;
  reps?: number;
  durationSeconds?: number | null;
  badgeName?: string;
  badgeDescription?: string;
  badgeXp?: number;
  buddyUsername?: string;
  weeklyChallenge?: WeeklyChallenge;
  source?: GrowthSource;
  campaign?: GrowthCampaign;
  creatorCode?: string | null;
};

export type InboundAttributionInput = {
  context: ShareContext;
  source?: string | null;
  campaign?: string | null;
  creatorCode?: string | null;
  inviteCode?: string | null;
  targetUrl?: string | null;
  metadata?: Record<string, unknown>;
};

const WEEKLY_CHALLENGES: WeeklyChallenge[] = [
  {
    id: 'seven_day_no_excuses',
    title: '7-Day No Excuses',
    subtitle: 'One set a day. Pull one friend in and keep each other honest.',
    days: 7,
    campaign: 'weekly_challenge',
    cta: 'Start the 7-day pact',
  },
  {
    id: 'beat_my_20',
    title: 'Beat My 20',
    subtitle: 'Post a receipt, then challenge someone to beat your time.',
    days: 7,
    campaign: 'async_duel',
    cta: 'Share the time challenge',
  },
  {
    id: 'office_floor',
    title: 'Office Floor Challenge',
    subtitle: 'A tiny team room for coworkers, classmates, or one chaotic group chat.',
    days: 7,
    campaign: 'team_room',
    cta: 'Build a tiny team',
  },
  {
    id: 'first_week_fire',
    title: 'First Week Fire',
    subtitle: 'Stack the first receipts and invite someone who likes starting strong.',
    days: 7,
    campaign: 'friend_streak',
    cta: 'Invite a streak buddy',
  },
];

function encodeQuery(params: Record<string, LinkParamValue>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

function compactCode(value: string | null | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function defaultSource(context: ShareContext): GrowthSource {
  if (context === 'profile') return 'profile';
  if (context === 'streak') return 'streak';
  if (context === 'badge') return 'badge';
  if (context === 'weekly_challenge') return 'weekly_challenge';
  if (context === 'completion' || context === 'monthly_test') return 'completion';
  return 'squad';
}

function defaultCampaign(context: ShareContext): GrowthCampaign {
  switch (context) {
    case 'duel':
      return 'async_duel';
    case 'team':
      return 'team_room';
    case 'weekly_wrapped':
      return 'weekly_wrapped';
    case 'monthly_test':
      return 'monthly_test';
    case 'streak':
      return 'streak_proof';
    case 'pet':
      return 'pet_evolution';
    case 'badge':
      return 'badge_brag';
    case 'nudge':
      return 'buddy_nudge';
    case 'profile':
      return 'friend_streak';
    case 'completion':
      return 'proof_card';
    case 'weekly_challenge':
      return 'weekly_challenge';
    default:
      return 'daily_challenge';
  }
}

export function buildGrowthLink(input: BuildGrowthLinkInput): string {
  const params: Record<string, LinkParamValue> = { ...(input.params ?? {}) };
  const inviteCode = compactCode(input.inviteCode);
  if (inviteCode && params.code === undefined) params.code = inviteCode;
  if (input.source) params.src = input.source;
  if (input.campaign) params.campaign = input.campaign;
  if (input.creatorCode) params.creator = input.creatorCode;

  const query = encodeQuery(params);
  return query ? `just20://${input.path}?${query}` : `just20://${input.path}`;
}

export function getWeeklyChallenge(now = new Date()): WeeklyChallenge {
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
  const weekIndex = Math.floor((now.getTime() - yearStart) / (7 * 24 * 60 * 60 * 1000));
  return WEEKLY_CHALLENGES[Math.abs(weekIndex) % WEEKLY_CHALLENGES.length];
}

export function buildSharePayload(context: ShareContext, input: SharePayloadInput): GrowthSharePayload {
  const source = input.source ?? defaultSource(context);
  const campaign = input.campaign ?? defaultCampaign(context);
  const inviteCode = compactCode(input.inviteCode);
  const creatorCode = compactCode(input.creatorCode);
  const codeForDisplay = inviteCode ?? 'JUST-READY';
  const streakDays = Math.max(0, input.streakDays ?? 0);
  const streakLine = streakDays > 0
    ? `Day ${streakDays} is locked on Just 20.`
    : 'I am starting Just 20 today.';

  if (context === 'duel') {
    const targetSeconds = Math.max(10, input.targetSeconds ?? 60);
    const link = buildGrowthLink({
      path: 'duel',
      inviteCode,
      source,
      campaign,
      creatorCode,
      params: { target: targetSeconds },
    });
    return {
      context,
      title: 'Beat my Just 20 time',
      message: `${streakLine} Beat my 20 pushups in ${targetSeconds}s.\n\n${link}\n\nClean reps only. Tap in.\n#just20`,
      link,
      source,
      campaign,
      creatorCode,
      inviteCode,
    };
  }

  if (context === 'team') {
    const roomCode = input.roomCode ?? 'TEAM-J20';
    const link = buildGrowthLink({
      path: 'team',
      inviteCode,
      source,
      campaign,
      creatorCode,
      params: { room: roomCode },
    });
    return {
      context,
      title: 'Join my Just 20 room',
      message: `Join my Just 20 team room: ${roomCode}.\n\nDaily 20 pushups, tiny pressure, visible receipts.\n\n${link}\n#just20`,
      link,
      source,
      campaign,
      creatorCode,
      inviteCode,
    };
  }

  if (context === 'monthly_test') {
    const reps = Math.max(0, input.reps ?? 0);
    const timeLine = input.durationSeconds ? ` in ${input.durationSeconds}s` : '';
    const link = buildGrowthLink({ path: 'challenge', inviteCode, source, campaign, creatorCode, params: { days: 7 } });
    return {
      context,
      title: 'Monthly Just 20 test',
      message: `Monthly Just 20 test: ${reps} clean pushups${timeLine}.\n\nI am checking again in 30 days. Join me:\n${link}\n\nCode: ${codeForDisplay}\n#just20`,
      link,
      source,
      campaign,
      creatorCode,
      inviteCode,
    };
  }

  if (context === 'weekly_wrapped') {
    const link = buildGrowthLink({ path: 'challenge', inviteCode, source, campaign, creatorCode, params: { days: 7 } });
    return {
      context,
      title: 'My Just 20 week',
      message: `My Just 20 week: ${input.completedDays ?? 0}/7 days, ${streakDays}-day current streak, ${input.bestStreak ?? 0}-day best, ${input.xpBalance ?? 0} XP.\n\nTry to catch me:\n${link}\n\nCode: ${codeForDisplay}\n#just20`,
      link,
      source,
      campaign,
      creatorCode,
      inviteCode,
    };
  }

  if (context === 'pet') {
    const link = buildGrowthLink({ path: 'challenge', inviteCode, source, campaign, creatorCode, params: { days: 7 } });
    return {
      context,
      title: 'My Just 20 streak pet',
      message: `My Just 20 streak pet hit Day ${streakDays}.\n\nTiny daily promise. Weirdly hard to quit.\n\nJoin my squad:\n${link}\n\nCode: ${codeForDisplay}\n#just20`,
      link,
      source,
      campaign,
      creatorCode,
      inviteCode,
    };
  }

  if (context === 'nudge') {
    const buddy = input.buddyUsername ?? 'Buddy';
    const link = buildGrowthLink({ path: 'challenge', inviteCode, source, campaign, creatorCode, params: { days: 7 } });
    return {
      context,
      title: 'Just 20 nudge',
      message: `${buddy}, this is your Just 20 nudge. 20 pushups before the day gets away.\n\nAdd me back:\n${link}\n\nCode: ${codeForDisplay}\n#just20`,
      link,
      source,
      campaign,
      creatorCode,
      inviteCode,
    };
  }

  if (context === 'badge') {
    const link = buildGrowthLink({ path: 'challenge', inviteCode, source, campaign, creatorCode, params: { days: 7 } });
    return {
      context,
      title: `Just 20 badge: ${input.badgeName ?? 'Unlocked'}`,
      message: `I unlocked "${input.badgeName ?? 'a badge'}" on Just 20.\n${input.badgeDescription ?? 'Tiny daily proof, stacked over time.'}\n\n+${input.badgeXp ?? 0} XP\n\nJoin me:\n${link}\n\nCode: ${codeForDisplay}\n#just20`,
      link,
      source,
      campaign,
      creatorCode,
      inviteCode,
    };
  }

  if (context === 'weekly_challenge') {
    const challenge = input.weeklyChallenge ?? getWeeklyChallenge();
    const link = buildGrowthLink({
      path: 'challenge',
      inviteCode,
      source,
      campaign: input.campaign ?? challenge.campaign,
      creatorCode,
      params: { days: challenge.days, challenge: challenge.id },
    });
    return {
      context,
      title: challenge.title,
      message: `This week's Just 20 prompt: ${challenge.title}.\n\n${challenge.subtitle}\n\nJoin me:\n${link}\n\nCode: ${codeForDisplay}\n#just20`,
      link,
      source,
      campaign: input.campaign ?? challenge.campaign,
      creatorCode,
      inviteCode,
    };
  }

  const challengeDays = Math.max(1, Math.min(input.challengeDays ?? 7, 30));
  const link = buildGrowthLink({
    path: 'challenge',
    inviteCode,
    source,
    campaign,
    creatorCode,
    params: { days: challengeDays },
  });
  const actionLine = context === 'streak'
    ? 'Try to catch me.'
    : context === 'profile'
    ? 'Join my buddy streak.'
    : `Join my ${challengeDays}-day 20-pushup challenge.`;

  return {
    context,
    title: 'Join me on Just 20',
    message: `${streakLine} ${actionLine}\n\n${link}\n\nNo gym. 20 pushups. Keep me honest.\n\nCode: ${codeForDisplay}\n#just20`,
    link,
    source,
    campaign,
    creatorCode,
    inviteCode,
  };
}

export async function recordGrowthEvent(input: GrowthEventInput): Promise<void> {
  await recordStoredGrowthEvent(input);
}

export function growthEventFromPayload(
  payload: GrowthSharePayload,
  eventType: 'share_opened' | 'share_failed',
  metadata?: Record<string, unknown>
): GrowthEventInput {
  return {
    eventType,
    context: payload.context,
    source: payload.source,
    campaign: payload.campaign,
    creatorCode: payload.creatorCode,
    inviteCode: payload.inviteCode,
    targetUrl: payload.link,
    metadata,
  };
}

export async function captureInboundAttribution(input: InboundAttributionInput): Promise<void> {
  if (!input.source && !input.campaign && !input.creatorCode && !input.inviteCode) return;
  await saveAttributionTouch({
    source: input.source,
    campaign: input.campaign,
    creatorCode: input.creatorCode,
    inviteCode: input.inviteCode,
  });
  await recordStoredGrowthEvent({
    eventType: 'inbound_link',
    context: input.context,
    source: input.source,
    campaign: input.campaign,
    creatorCode: input.creatorCode,
    inviteCode: input.inviteCode,
    targetUrl: input.targetUrl,
    metadata: input.metadata,
  });
}

export async function getAttributionState(): Promise<AttributionState | null> {
  return getStoredAttributionState();
}
