import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { useGrowthImageShare } from '../../hooks/useGrowthImageShare';
import {
  getBestCompletedTime,
  getCoins,
  getCompletedDaysThisWeek,
  getStreak,
  getUserSeed,
  isCompletedToday,
} from '../../lib/db';
import { getOrCreateUser } from '../../lib/user';
import { getBuddyStatuses, linkBuddy } from '../../lib/social';
import { type BuddyStatus } from '../../lib/social';
import { SUPABASE_ENABLED } from '../../lib/supabase';
import { getXp } from '../../lib/xp';
import {
  buildDefaultRoomCode,
  buildPetEvolutionShareText,
  getCurrentSquadRoom,
  getMonthlyTestStatus,
  getPetEvolution,
  joinSquadRoom,
  type SquadRoom,
} from '../../lib/viral';
import { buildSharePayload, getWeeklyChallenge, recordGrowthEvent } from '../../lib/growth';
import { validateInviteCode } from '../../lib/validation';

type PageData = {
  username: string | null;
  inviteCode: string;
  streak: number;
  completedToday: boolean;
  coinBalance: number;
  xpBalance: number;
  bestStreak: number;
  bestTimeMs: number | null;
  completedDaysThisWeek: number;
  monthlyTestAvailable: boolean;
  daysUntilMonthlyTest: number;
  buddies: BuddyStatus[];
  room: SquadRoom | null;
  rank: number;
  userSeed: number;
};

// Deterministic "simulated rank" — seeded by device so it's stable across opens
function computeRank(streakDays: number, seed: number): number {
  if (streakDays === 0) return 0;
  // Combines streak with a stable seed so the rank feels personal but doesn't bounce
  const base = Math.abs(Math.sin(seed) * 1000) % 100;
  const streakBonus = Math.min(streakDays * 0.8, 60);
  return Math.min(Math.round(base * 0.4 + streakBonus), 99);
}

export default function SquadScreen() {
  const router = useRouter();
  const [data, setData] = useState<PageData | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [pastedInviteCode, setPastedInviteCode] = useState(false);
  const [linking, setLinking] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const { shareGrowthPayload, visualShareElement } = useGrowthImageShare();
  const [weeklyLeaders] = useState(() =>
    // Static mock leaderboard entries — replaced with real data once Supabase is active
    [
      { name: 'You', streak: 0, isMe: true },
      { name: 'Ghost_X', streak: 47 },
      { name: 'IronMike', streak: 31 },
      { name: 'DailyDave', streak: 22 },
      { name: 'FloorFear', streak: 18 },
    ]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          const [
            user,
            streakData,
            coinsData,
            xpData,
            buddies,
            seed,
            completedToday,
            bestTimeMs,
            completedDaysThisWeek,
            room,
            monthlyTest,
          ] = await Promise.all([
            getOrCreateUser(),
            getStreak(),
            getCoins(),
            getXp(),
            getBuddyStatuses(),
            getUserSeed(),
            isCompletedToday(),
            getBestCompletedTime(),
            getCompletedDaysThisWeek(),
            getCurrentSquadRoom(),
            getMonthlyTestStatus(),
          ]);
          if (!active) return;
          setData({
            username: user.username,
            inviteCode: user.inviteCode,
            streak: streakData.current,
            completedToday,
            coinBalance: coinsData.balance,
            xpBalance: xpData.balance,
            bestStreak: streakData.best,
            bestTimeMs,
            completedDaysThisWeek,
            monthlyTestAvailable: monthlyTest.available,
            daysUntilMonthlyTest: monthlyTest.daysUntilNext,
            buddies,
            room,
            rank: computeRank(streakData.current, seed),
            userSeed: seed,
          });
        } catch {
          if (active) setData(null);
        }
      }
      load();
      return () => {
        active = false;
      };
    }, [])
  );

  async function handleShare() {
    if (!data) return;
    await shareGrowthPayload(
      buildSharePayload('profile', {
        inviteCode: data.inviteCode,
        streakDays: data.streak,
        source: 'squad',
      }),
      'squad_code'
    );
  }

  async function handleCopyInviteCode() {
    if (!data?.inviteCode) return;
    await Clipboard.setStringAsync(data.inviteCode);
    setInviteCopied(true);
  }

  async function handlePasteInviteCode() {
    const pasted = await Clipboard.getStringAsync();
    const validation = validateInviteCode(pasted);
    if (validation.error || !validation.code) {
      Alert.alert('Nothing pasted', 'Copy a Just 20 invite code first.');
      return;
    }
    setCodeInput(validation.code);
    setPastedInviteCode(true);
  }

  async function handleShareChallenge() {
    if (!data) return;
    await shareGrowthPayload(
      buildSharePayload('challenge', {
        inviteCode: data.inviteCode,
        streakDays: data.streak,
        challengeDays: 7,
        source: 'squad',
      }),
      'friend_streak'
    );
  }

  async function handleShareDuel() {
    if (!data) return;
    const targetSeconds = data.bestTimeMs ? Math.max(10, Math.round(data.bestTimeMs / 1000)) : 60;
    await shareGrowthPayload(
      buildSharePayload('duel', {
        inviteCode: data.inviteCode,
        targetSeconds,
        streakDays: data.streak,
        source: 'squad',
      }),
      'async_duel'
    );
  }

  async function handleShareWrapped() {
    if (!data) return;
    await shareGrowthPayload(
      buildSharePayload('weekly_wrapped', {
        completedDays: data.completedDaysThisWeek,
        streakDays: data.streak,
        bestStreak: data.bestStreak,
        xpBalance: data.xpBalance,
        inviteCode: data.inviteCode,
        source: 'squad',
      }),
      'weekly_wrapped'
    );
  }

  async function handleSharePet() {
    if (!data) return;
    const payload = buildSharePayload('pet', {
      inviteCode: data.inviteCode,
      streakDays: data.streak,
      source: 'squad',
    });
    await shareGrowthPayload(
      {
        ...payload,
        message: buildPetEvolutionShareText(data.streak, data.inviteCode),
      },
      'streak_pet'
    );
  }

  async function handleNudgeBuddy(buddy: BuddyStatus) {
    if (!data) return;
    await shareGrowthPayload(
      buildSharePayload('nudge', {
        inviteCode: data.inviteCode,
        buddyUsername: buddy.username,
        source: 'squad',
      }),
      'buddy_nudge'
    );
  }

  async function handleShareWeeklyChallenge() {
    if (!data) return;
    await shareGrowthPayload(
      buildSharePayload('weekly_challenge', {
        inviteCode: data.inviteCode,
        streakDays: data.streak,
        weeklyChallenge,
        source: 'weekly_challenge',
      }),
      'weekly_challenge'
    );
  }

  async function handleJoinRoom(rawCode = roomInput) {
    const code = rawCode.trim();
    if (!code) return;
    setJoiningRoom(true);
    try {
      const result = await joinSquadRoom(code);
      if (!result.success) {
        Alert.alert('Room not joined', result.error ?? 'Something went wrong.');
        return;
      }
      setRoomInput('');
      setData((prev) => (prev ? { ...prev, room: result.room } : prev));
      Alert.alert('Team room joined', `You are now in ${result.room?.code}.`);
    } catch {
      Alert.alert('Room not joined', 'Something went wrong.');
    } finally {
      setJoiningRoom(false);
    }
  }

  async function handleCreateRoom() {
    if (!data) return;
    await handleJoinRoom(buildDefaultRoomCode(data.inviteCode));
  }

  async function handleShareTeamRoom() {
    if (!data) return;
    try {
      const room = data.room ?? (await joinSquadRoom(buildDefaultRoomCode(data.inviteCode))).room;
      if (!room) return;
      setData((prev) => (prev ? { ...prev, room } : prev));
      await shareGrowthPayload(
        buildSharePayload('team', {
          inviteCode: data.inviteCode,
          roomCode: room.code,
          source: 'squad',
        }),
        'team_room'
      );
    } catch (error) {
      await recordGrowthEvent({
        eventType: 'share_failed',
        context: 'team',
        source: 'squad',
        campaign: 'team_room',
        inviteCode: data.inviteCode,
        metadata: {
          surface: 'team_room',
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  async function handleLink() {
    const validation = validateInviteCode(codeInput);
    if (validation.error || !validation.code) {
      Alert.alert('Not linked', validation.error ?? 'Use a valid Just 20 invite code.');
      return;
    }
    const code = validation.code;
    setCodeInput(code);
    setLinking(true);
    try {
      const result = await linkBuddy(code);
      if (result.success) {
        setCodeInput('');
        // Reload buddies
        const buddies = await getBuddyStatuses();
        setData((prev) => (prev ? { ...prev, buddies } : prev));
        Alert.alert(
          'Linked! 🤝',
          `You and ${result.username ?? 'your buddy'} are now accountable to each other.`
        );
      } else {
        Alert.alert('Not linked', result.error ?? 'Something went wrong.');
      }
    } catch {
      Alert.alert('Not linked', 'Something went wrong.');
    } finally {
      setLinking(false);
    }
  }

  const leaderboard = weeklyLeaders
    .map((entry) => (entry.isMe && data ? { ...entry, streak: data.streak } : entry))
    .sort((a, b) => b.streak - a.streak);

  const buddyCount = data?.buddies.length ?? 0;
  const participantCount = buddyCount + 1;
  const completedFriendCount = data ? data.buddies.filter((b) => b.completedToday).length : 0;
  const lockedCount = (data?.completedToday ? 1 : 0) + completedFriendCount;
  const friendStreakTitle =
    buddyCount > 0 ? `${participantCount} people in the loop` : 'Start a shared streak';
  const friendStreakHint =
    buddyCount > 0
      ? SUPABASE_ENABLED
        ? `${lockedCount}/${participantCount} locked today. Share the challenge link to pull in one more.`
        : 'Buddies are saved here. Live check-ins are coming soon, so you can start building the squad now.'
      : 'Send a 7-day challenge link. When someone joins, this becomes your accountability streak.';
  const duelTargetSeconds = data?.bestTimeMs
    ? Math.max(10, Math.round(data.bestTimeMs / 1000))
    : 60;
  const pet = getPetEvolution(data?.streak ?? 0);
  const weeklyChallenge = getWeeklyChallenge();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>Squad</Text>

          <View style={[styles.card, styles.friendStreakCard]}>
            <View style={styles.friendHeader}>
              <View style={styles.friendTitleWrap}>
                <Text style={styles.cardTitle}>Friend Streak</Text>
                <Text style={styles.friendTitle}>{friendStreakTitle}</Text>
              </View>
              <View style={styles.friendDayBadge}>
                <Text style={styles.friendDayNum}>{data?.streak ?? 0}</Text>
                <Text style={styles.friendDayLabel}>days</Text>
              </View>
            </View>

            <Text style={styles.friendHint}>{friendStreakHint}</Text>

            <View style={styles.friendPillRow}>
              <View style={[styles.friendPill, data?.completedToday && styles.friendPillDone]}>
                <Text
                  style={[styles.friendPillText, data?.completedToday && styles.friendPillTextDone]}
                >
                  You · {data?.completedToday ? 'locked' : 'open'}
                </Text>
              </View>
              {data?.buddies.slice(0, 3).map((b) => (
                <View
                  key={b.inviteCode}
                  style={[styles.friendPill, b.completedToday && styles.friendPillDone]}
                >
                  <Text
                    style={[styles.friendPillText, b.completedToday && styles.friendPillTextDone]}
                  >
                    {b.username} ·{' '}
                    {SUPABASE_ENABLED ? (b.completedToday ? 'locked' : 'open') : 'added'}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.challengeBtn}
              onPress={handleShareChallenge}
              activeOpacity={0.85}
            >
              <Text style={styles.challengeBtnText}>
                {buddyCount > 0 ? 'SHARE CHALLENGE LINK →' : 'START 7-DAY CHALLENGE →'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, styles.weeklyChallengeCard]}>
            <View style={styles.weeklyChallengeHeader}>
              <View style={styles.weeklyChallengeTextWrap}>
                <Text style={styles.cardTitle}>Weekly Challenge</Text>
                <Text style={styles.weeklyChallengeTitle}>{weeklyChallenge.title}</Text>
                <Text style={styles.weeklyChallengeHint}>{weeklyChallenge.subtitle}</Text>
              </View>
              <View style={styles.weeklyChallengeBadge}>
                <Text style={styles.weeklyChallengeBadgeText}>{weeklyChallenge.days}d</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.weeklyChallengeBtn}
              onPress={handleShareWeeklyChallenge}
              activeOpacity={0.85}
            >
              <Text style={styles.weeklyChallengeBtnText}>{weeklyChallenge.cta} →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.viralGrid}>
            <ViralActionCard
              title="Async Duel"
              value={`${duelTargetSeconds}s`}
              hint="Challenge someone to beat your 20."
              action="Share duel"
              onPress={handleShareDuel}
            />
            <ViralActionCard
              title="Weekly Wrapped"
              value={`${data?.completedDaysThisWeek ?? 0}/7`}
              hint="A compact weekly receipt."
              action="Share week"
              onPress={handleShareWrapped}
            />
            <ViralActionCard
              title="Monthly Test"
              value={data?.monthlyTestAvailable ? 'Ready' : `${data?.daysUntilMonthlyTest ?? 0}d`}
              hint={
                data?.monthlyTestAvailable
                  ? 'Max clean reps, stricter pressure.'
                  : 'Cooldown keeps the test meaningful.'
              }
              action={data?.monthlyTestAvailable ? 'Test me' : 'Locked'}
              onPress={() => router.push({ pathname: '/workout', params: { mode: 'test' } } as any)}
              disabled={!data?.monthlyTestAvailable}
            />
            <ViralActionCard
              title="Streak Pet"
              value={pet.emoji}
              hint={`${pet.name}. ${pet.nextGoal}`}
              action="Share pet"
              onPress={handleSharePet}
            />
          </View>

          <View style={[styles.card, styles.roomCard]}>
            <View style={styles.roomHeader}>
              <View>
                <Text style={styles.cardTitle}>Squad Room</Text>
                <Text style={styles.roomTitle}>
                  {data?.room ? data.room.code : 'Your team code'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleShareTeamRoom}
                activeOpacity={0.82}
                style={styles.roomShareBtn}
              >
                <Text style={styles.roomShareText}>Share</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.roomHint}>
              Use this for friends, classmates, coworkers, or any group that wants a little daily
              pressure. Live room progress is coming soon.
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.codeInput}
                placeholder="TEAM-FLOOR"
                placeholderTextColor={colors.subtext}
                value={roomInput}
                onChangeText={(t) => setRoomInput(t.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
                returnKeyType="done"
                onSubmitEditing={() => handleJoinRoom()}
              />
              <TouchableOpacity
                style={[
                  styles.linkBtn,
                  (!roomInput.trim() || joiningRoom) && styles.linkBtnDisabled,
                ]}
                onPress={() => handleJoinRoom()}
                activeOpacity={0.85}
                disabled={!roomInput.trim() || joiningRoom}
              >
                <Text style={styles.linkBtnText}>{joiningRoom ? '...' : 'JOIN'}</Text>
              </TouchableOpacity>
            </View>
            {!data?.room && (
              <TouchableOpacity onPress={handleCreateRoom} activeOpacity={0.7}>
                <Text style={styles.createRoomText}>Create my default team code →</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Your invite code */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Code</Text>
            <View style={styles.inviteCodeBox}>
              <Text style={styles.inviteCode}>{data?.inviteCode ?? '—'}</Text>
              <TouchableOpacity
                style={styles.copyCodeBtn}
                onPress={handleCopyInviteCode}
                activeOpacity={0.78}
                disabled={!data?.inviteCode}
              >
                <Text style={styles.copyCodeText}>{inviteCopied ? 'COPIED' : 'COPY'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.codeHint}>
              Share this code with friends so they can add you.{'\n'}
              Works on Instagram, KakaoTalk, WeChat — anywhere.
            </Text>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
              <Text style={styles.shareBtnText}>SHARE CODE →</Text>
            </TouchableOpacity>
          </View>

          {/* Link a friend */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add a Buddy</Text>
            <Text style={styles.addHint}>Enter their code to link your streaks.</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.codeInput}
                placeholder="JUST-XXXXXX"
                placeholderTextColor={colors.subtext}
                value={codeInput}
                onChangeText={(t) => {
                  setCodeInput(t.toUpperCase().replace(/[^A-Z0-9- ]/g, ''));
                  setPastedInviteCode(false);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={11}
                returnKeyType="done"
                onSubmitEditing={handleLink}
              />
              <TouchableOpacity
                style={styles.pasteBtn}
                onPress={handlePasteInviteCode}
                activeOpacity={0.78}
              >
                <Text style={styles.pasteBtnText}>{pastedInviteCode ? 'PASTED' : 'PASTE'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.linkBtn, (!codeInput.trim() || linking) && styles.linkBtnDisabled]}
                onPress={handleLink}
                activeOpacity={0.85}
                disabled={!codeInput.trim() || linking}
              >
                <Text style={styles.linkBtnText}>{linking ? '...' : 'LINK'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Buddies list */}
          {data && data.buddies.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your Buddies</Text>
              {data.buddies.map((b) => (
                <View key={b.inviteCode} style={styles.buddyRow}>
                  <View style={styles.buddyAvatar}>
                    <Text style={styles.buddyAvatarText}>{b.username.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.buddyInfo}>
                    <Text style={styles.buddyName}>{b.username}</Text>
                    <Text style={styles.buddyStatus}>
                      {SUPABASE_ENABLED
                        ? b.completedToday
                          ? '✅ Done today'
                          : '⏳ Pending today'
                        : 'Added · check-ins soon'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.nudgeBtn}
                    onPress={() => handleNudgeBuddy(b)}
                    activeOpacity={0.78}
                  >
                    <Text style={styles.nudgeBtnText}>Nudge</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <Text style={styles.syncNote}>Live buddy check-ins are coming soon.</Text>
            </View>
          )}

          {data && data.buddies.length === 0 && (
            <View style={[styles.card, styles.emptyBuddies]}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyTitle}>No buddies yet</Text>
              <Text style={styles.emptyHint}>
                Buddy streaks turn a solo promise into shared pressure.{'\n'}
                Start with a challenge link above.
              </Text>
            </View>
          )}

          {/* Weekly leaderboard */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weekly Leaderboard</Text>
            <Text style={styles.leaderHint}>
              Global rankings unlock once you connect friends.{'\n'}
              Invite friends to make this board competitive.
            </Text>
            {leaderboard.map((entry, i) => (
              <View key={entry.name} style={[styles.leaderRow, entry.isMe && styles.leaderRowMe]}>
                <Text style={[styles.leaderRank, i === 0 && styles.leaderRankTop]}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </Text>
                <Text style={[styles.leaderName, entry.isMe && styles.leaderNameMe]}>
                  {entry.isMe ? (data?.username ?? 'You') : entry.name}
                </Text>
                <Text style={[styles.leaderStreak, entry.isMe && styles.leaderStreakMe]}>
                  {entry.streak} 🔥
                </Text>
              </View>
            ))}
          </View>

          {/* Rank card */}
          {data && data.streak > 0 && (
            <View style={[styles.card, styles.rankCard]}>
              <Text style={styles.rankEmoji}>📊</Text>
              <View style={styles.rankInfo}>
                <Text style={styles.rankNum}>Top {100 - data.rank}% pace</Text>
                <Text style={styles.rankSub}>your personal league pace</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      {visualShareElement}
    </SafeAreaView>
  );
}

function ViralActionCard({
  title,
  value,
  hint,
  action,
  onPress,
  disabled = false,
}: {
  title: string;
  value: string;
  hint: string;
  action: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.viralCard, disabled && styles.viralCardDisabled]}>
      <Text style={styles.viralTitle}>{title}</Text>
      <Text style={styles.viralValue}>{value}</Text>
      <Text style={styles.viralHint}>{hint}</Text>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.82}
        style={[styles.viralBtn, disabled && styles.viralBtnDisabled]}
        disabled={disabled}
      >
        <Text style={styles.viralBtnText}>{action} →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl + spacing.xl },
  heading: { fontSize: 28, fontWeight: '900', color: colors.text },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Friend streak
  friendStreakCard: {
    backgroundColor: colors.streakSoft,
    borderColor: colors.creamDeep,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  friendTitleWrap: { flex: 1, minWidth: 0 },
  friendTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.7,
    marginTop: 4,
  },
  friendDayBadge: {
    minWidth: 72,
    flexShrink: 0,
    borderRadius: radius.lg,
    backgroundColor: colors.text,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  friendDayNum: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 30,
  },
  friendDayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.62)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  friendHint: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    lineHeight: 20,
    fontWeight: '600',
  },
  friendPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  friendPill: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#E8D3B1',
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  friendPillDone: {
    backgroundColor: '#E8F8DD',
    borderColor: '#A8D970',
  },
  friendPillText: {
    fontSize: fontSize.xs,
    color: colors.subtext,
    fontWeight: '800',
  },
  friendPillTextDone: {
    color: '#3D7C1C',
  },
  challengeBtn: {
    backgroundColor: colors.streak,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: colors.streak,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  challengeBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  // Weekly challenge
  weeklyChallengeCard: {
    backgroundColor: colors.successSoft,
    borderColor: colors.border,
  },
  weeklyChallengeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  weeklyChallengeTextWrap: { flex: 1, minWidth: 0, gap: spacing.xs },
  weeklyChallengeTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.7,
  },
  weeklyChallengeHint: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    fontWeight: '700',
    lineHeight: 20,
  },
  weeklyChallengeBadge: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklyChallengeBadgeText: {
    color: colors.brandDark,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  weeklyChallengeBtn: {
    backgroundColor: colors.brandDark,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  weeklyChallengeBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '900',
  },

  // Viral action cards
  viralGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  viralCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  viralCardDisabled: {
    opacity: 0.62,
  },
  viralTitle: {
    fontSize: fontSize.xs,
    fontWeight: '900',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  viralValue: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1,
  },
  viralHint: {
    minHeight: 36,
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.subtext,
    lineHeight: 16,
  },
  viralBtn: {
    marginTop: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.streakSoft,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  viralBtnDisabled: {
    backgroundColor: colors.border,
  },
  viralBtnText: {
    color: colors.streak,
    fontSize: fontSize.xs,
    fontWeight: '900',
  },

  // Team rooms
  roomCard: {
    backgroundColor: colors.iceSoft,
    borderColor: colors.border,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  roomTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  roomHint: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    fontWeight: '600',
    lineHeight: 20,
  },
  roomShareBtn: {
    borderRadius: radius.full,
    backgroundColor: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  roomShareText: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: '900',
  },
  createRoomText: {
    textAlign: 'center',
    color: colors.streak,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },

  // Invite code
  inviteCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  inviteCode: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 2,
    textAlign: 'center',
  },
  copyCodeBtn: {
    borderRadius: radius.full,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  copyCodeText: {
    color: colors.brandDark,
    fontSize: fontSize.xs,
    fontWeight: '900',
  },
  codeHint: {
    fontSize: fontSize.xs,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 18,
  },
  shareBtn: {
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Add buddy
  addHint: { fontSize: fontSize.sm, color: colors.subtext, fontWeight: '500' },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' },
  codeInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  pasteBtn: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  pasteBtnText: {
    color: colors.text,
    fontWeight: '900',
    fontSize: fontSize.xs,
  },
  linkBtn: {
    backgroundColor: colors.streak,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  linkBtnDisabled: { opacity: 0.4 },
  linkBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: fontSize.sm },

  // Buddies
  buddyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  buddyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.streak,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buddyAvatarText: { color: '#FFF', fontWeight: '900', fontSize: fontSize.md },
  buddyInfo: { flex: 1 },
  buddyName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  buddyStatus: { fontSize: fontSize.xs, color: colors.subtext, fontWeight: '500' },
  nudgeBtn: {
    borderRadius: radius.full,
    backgroundColor: colors.streakSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  nudgeBtnText: {
    fontSize: fontSize.xs,
    color: colors.streak,
    fontWeight: '900',
  },
  syncNote: {
    fontSize: fontSize.xs,
    color: colors.subtext,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  emptyBuddies: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.text },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Leaderboard
  leaderHint: {
    fontSize: fontSize.xs,
    color: colors.subtext,
    lineHeight: 18,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  leaderRowMe: {
    backgroundColor: '#FFF8F5',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  leaderRank: {
    width: 28,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.subtext,
    textAlign: 'center',
  },
  leaderRankTop: { fontSize: fontSize.md },
  leaderName: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  leaderNameMe: { fontWeight: '900', color: colors.streak },
  leaderStreak: { fontSize: fontSize.sm, fontWeight: '700', color: colors.subtext },
  leaderStreakMe: { color: colors.streak },

  // Rank card
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rankEmoji: { fontSize: 28 },
  rankInfo: { flex: 1 },
  rankNum: { fontSize: fontSize.lg, fontWeight: '900', color: colors.text },
  rankSub: { fontSize: fontSize.xs, color: colors.subtext, fontWeight: '500' },
});
