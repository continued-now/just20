import { useFocusEffect } from 'expo-router';
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
import { getStreak, getCoins, getUserSeed } from '../../lib/db';
import { getOrCreateUser } from '../../lib/user';
import { buildShareText } from '../../lib/user';
import { getBuddyStatuses, linkBuddy } from '../../lib/social';
import { type BuddyStatus } from '../../lib/social';

type PageData = {
  username: string | null;
  inviteCode: string;
  streak: number;
  coinBalance: number;
  buddies: BuddyStatus[];
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
  const [data, setData] = useState<PageData | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [linking, setLinking] = useState(false);
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
        const [user, streakData, coinsData, buddies, seed] = await Promise.all([
          getOrCreateUser(),
          getStreak(),
          getCoins(),
          getBuddyStatuses(),
          getUserSeed(),
        ]);
        setData({
          username: user.username,
          inviteCode: user.inviteCode,
          streak: streakData.current,
          coinBalance: coinsData.balance,
          buddies,
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
                  <Text style={styles.buddyCode}>{b.inviteCode}</Text>
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
                Buddy streaks are 22% more likely to survive the week.{'\n'}
                Share your code above to get started.
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
                <Text style={styles.rankNum}>Top {100 - data.rank}%</Text>
                <Text style={styles.rankSub}>of all Just20 users</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  buddyCode: { fontSize: 10, color: colors.subtext, fontWeight: '600' },
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
