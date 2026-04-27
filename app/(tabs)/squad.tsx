import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import {
  getBestCompletedTime,
  getCoins,
  getCompletedDaysThisWeek,
  getStreak,
  getUserSeed,
  isCompletedToday,
} from '../../lib/db';
import { buildChallengeShareText, buildShareText, getOrCreateUser } from '../../lib/user';
import { getBuddyStatuses, linkBuddy } from '../../lib/social';
import { type BuddyStatus } from '../../lib/social';
import { getXp } from '../../lib/xp';
import {
  buildDefaultRoomCode,
  buildDuelShareText,
  buildNudgeShareText,
  buildPetEvolutionShareText,
  buildTeamChallengeShareText,
  buildWeeklyWrappedShareText,
  getCurrentSquadRoom,
  getMonthlyTestStatus,
  getPetEvolution,
  joinSquadRoom,
  type SquadRoom,
} from '../../lib/viral';

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
  const [linking, setLinking] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
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
      async function load() {
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
      }
      load();
    }, [])
  );

  async function handleShare() {
    if (!data) return;
    const text = buildShareText(data.inviteCode, data.streak);
    try {
      await Share.share({ message: text });
    } catch (_) {}
  }

  async function handleShareChallenge() {
    if (!data) return;
    const text = buildChallengeShareText(data.inviteCode, data.streak, 7);
    try {
      await Share.share({ message: text });
    } catch (_) {}
  }

  async function handleShareDuel() {
    if (!data) return;
    const targetSeconds = data.bestTimeMs ? Math.max(10, Math.round(data.bestTimeMs / 1000)) : 60;
    const text = buildDuelShareText(data.inviteCode, targetSeconds, data.streak);
    try {
      await Share.share({ message: text });
    } catch (_) {}
  }

  async function handleShareWrapped() {
    if (!data) return;
    const text = buildWeeklyWrappedShareText({
      completedDays: data.completedDaysThisWeek,
      streakDays: data.streak,
      bestStreak: data.bestStreak,
      xpBalance: data.xpBalance,
      inviteCode: data.inviteCode,
    });
    try {
      await Share.share({ message: text });
    } catch (_) {}
  }

  async function handleSharePet() {
    if (!data) return;
    try {
      await Share.share({ message: buildPetEvolutionShareText(data.streak, data.inviteCode) });
    } catch (_) {}
  }

  async function handleNudgeBuddy(buddy: BuddyStatus) {
    if (!data) return;
    try {
      await Share.share({ message: buildNudgeShareText(buddy.username, data.inviteCode) });
    } catch (_) {}
  }

  async function handleJoinRoom(rawCode = roomInput) {
    const code = rawCode.trim();
    if (!code) return;
    setJoiningRoom(true);
    const result = await joinSquadRoom(code);
    setJoiningRoom(false);
    if (!result.success) {
      Alert.alert('Room not joined', result.error ?? 'Something went wrong.');
      return;
    }
    setRoomInput('');
    setData(prev => prev ? { ...prev, room: result.room } : prev);
    Alert.alert('Team room joined', `You are now in ${result.room?.code}.`);
  }

  async function handleCreateRoom() {
    if (!data) return;
    await handleJoinRoom(buildDefaultRoomCode(data.inviteCode));
  }

  async function handleShareTeamRoom() {
    if (!data) return;
    const room = data.room ?? (await joinSquadRoom(buildDefaultRoomCode(data.inviteCode))).room;
    if (!room) return;
    setData(prev => prev ? { ...prev, room } : prev);
    try {
      await Share.share({ message: buildTeamChallengeShareText(room.code, data.inviteCode) });
    } catch (_) {}
  }

  async function handleLink() {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setLinking(true);
    const result = await linkBuddy(code);
    setLinking(false);
    if (result.success) {
      setCodeInput('');
      // Reload buddies
      const buddies = await getBuddyStatuses();
      setData(prev => prev ? { ...prev, buddies } : prev);
      Alert.alert('Linked! 🤝', `You and ${result.username ?? 'your buddy'} are now accountable to each other.`);
    } else {
      Alert.alert('Not linked', result.error ?? 'Something went wrong.');
    }
  }

  const leaderboard = weeklyLeaders
    .map(entry => entry.isMe && data ? { ...entry, streak: data.streak } : entry)
    .sort((a, b) => b.streak - a.streak);

  const buddyCount = data?.buddies.length ?? 0;
  const participantCount = buddyCount + 1;
  const completedFriendCount = data ? data.buddies.filter(b => b.completedToday).length : 0;
  const lockedCount = (data?.completedToday ? 1 : 0) + completedFriendCount;
  const friendStreakTitle = buddyCount > 0
    ? `${participantCount} people in the loop`
    : 'Start a shared streak';
  const friendStreakHint = buddyCount > 0
    ? `${lockedCount}/${participantCount} locked today. Share the challenge link to pull in one more.`
    : 'Send a 7-day challenge link. When someone joins, this becomes your accountability streak.';
  const duelTargetSeconds = data?.bestTimeMs ? Math.max(10, Math.round(data.bestTimeMs / 1000)) : 60;
  const pet = getPetEvolution(data?.streak ?? 0);

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
              <View>
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
                <Text style={[styles.friendPillText, data?.completedToday && styles.friendPillTextDone]}>
                  You · {data?.completedToday ? 'locked' : 'open'}
                </Text>
              </View>
              {data?.buddies.slice(0, 3).map(b => (
                <View key={b.inviteCode} style={[styles.friendPill, b.completedToday && styles.friendPillDone]}>
                  <Text style={[styles.friendPillText, b.completedToday && styles.friendPillTextDone]}>
                    {b.username} · {b.completedToday ? 'locked' : 'open'}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.challengeBtn} onPress={handleShareChallenge} activeOpacity={0.85}>
              <Text style={styles.challengeBtnText}>
                {buddyCount > 0 ? 'SHARE CHALLENGE LINK →' : 'START 7-DAY CHALLENGE →'}
              </Text>
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
              hint={data?.monthlyTestAvailable ? 'Max clean reps, stricter pressure.' : 'Cooldown keeps the test meaningful.'}
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
                  {data?.room ? data.room.code : 'Creator and team codes'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleShareTeamRoom} activeOpacity={0.82} style={styles.roomShareBtn}>
                <Text style={styles.roomShareText}>Share</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.roomHint}>
              Use this for offices, creators, campuses, or friend groups. Local for now; backend turns it into live rooms.
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.codeInput}
                placeholder="TEAM-FLOOR"
                placeholderTextColor={colors.subtext}
                value={roomInput}
                onChangeText={t => setRoomInput(t.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
                returnKeyType="done"
                onSubmitEditing={() => handleJoinRoom()}
              />
              <TouchableOpacity
                style={[styles.linkBtn, (!roomInput.trim() || joiningRoom) && styles.linkBtnDisabled]}
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
            <Text style={styles.inviteCode}>{data?.inviteCode ?? '—'}</Text>
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
                onChangeText={t => setCodeInput(t.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={11}
                returnKeyType="done"
                onSubmitEditing={handleLink}
              />
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
              {data.buddies.map(b => (
                <View key={b.inviteCode} style={styles.buddyRow}>
                  <View style={styles.buddyAvatar}>
                    <Text style={styles.buddyAvatarText}>{b.username.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.buddyInfo}>
                    <Text style={styles.buddyName}>{b.username}</Text>
                    <Text style={styles.buddyStatus}>
                      {b.completedToday ? '✅ Done today' : '⏳ Pending today'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.nudgeBtn} onPress={() => handleNudgeBuddy(b)} activeOpacity={0.78}>
                    <Text style={styles.nudgeBtnText}>Nudge</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <Text style={styles.syncNote}>
                Real-time sync unlocks when backend is connected.
              </Text>
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
              Current view is a preview.
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
                <Text style={styles.rankSub}>personal league preview until live rankings launch</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
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
    backgroundColor: '#FFF6E8',
    borderColor: '#FFD9A8',
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  friendTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.7,
    marginTop: 4,
  },
  friendDayBadge: {
    minWidth: 72,
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
    backgroundColor: '#FFF0E8',
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
    backgroundColor: '#F7FAFF',
    borderColor: '#D7E7FF',
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
  inviteCode: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 2,
    textAlign: 'center',
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
  inputRow: { flexDirection: 'row', gap: spacing.sm },
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
    backgroundColor: '#FFF0E8',
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
    marginHorizontal: -spacing.sm,
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
