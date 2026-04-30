import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { XpProgressCard } from '../../components/XpProgressCard';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { useGrowthImageShare } from '../../hooks/useGrowthImageShare';
import { getBadgeCollection } from '../../lib/badges';
import { getBuddyLinks, getCoins, getStreak, type UserProfile } from '../../lib/db';
import { getOrCreateUser } from '../../lib/user';
import { buildSharePayload, getWeeklyChallenge } from '../../lib/growth';
import { getXp, getXpLevelProgress } from '../../lib/xp';

type ProfileData = {
  profile: UserProfile | null;
  currentStreak: number;
  bestStreak: number;
  totalSessions: number;
  freezeCount: number;
  totalXp: number;
  coinBalance: number;
  buddyCount: number;
  unlockedBadges: number;
  totalBadges: number;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const { shareGrowthPayload, visualShareElement } = useGrowthImageShare();

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          const [profile, streak, xp, coins, buddies, badges] = await Promise.all([
            getOrCreateUser(),
            getStreak(),
            getXp(),
            getCoins(),
            getBuddyLinks(),
            getBadgeCollection(),
          ]);

          if (!active) return;
          setData({
            profile,
            currentStreak: streak.current,
            bestStreak: streak.best,
            totalSessions: streak.totalSessions,
            freezeCount: streak.freezeCount,
            totalXp: xp.totalEarned,
            coinBalance: coins.balance,
            buddyCount: buddies.length,
            unlockedBadges: badges.filter((badge) => badge.unlocked).length,
            totalBadges: badges.length,
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

  const username = data?.profile?.username?.trim() || 'Just 20 Athlete';
  const inviteCode = data?.profile?.inviteCode ?? 'JUST-READY';
  const initials = data?.profile?.username ? getInitials(data.profile.username) : 'J20';
  const badgeRatio = `${data?.unlockedBadges ?? 0}/${data?.totalBadges ?? 0}`;
  const xpProgress = getXpLevelProgress(data?.totalXp ?? 0);
  const weeklyChallenge = getWeeklyChallenge();

  async function handleShareInvite() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await shareGrowthPayload(
      buildSharePayload('profile', {
        inviteCode,
        streakDays: data?.currentStreak ?? 0,
        source: 'profile',
      }),
      'profile_invite'
    );
  }

  async function handleShareChallenge() {
    await shareGrowthPayload(
      buildSharePayload('challenge', {
        inviteCode,
        streakDays: data?.currentStreak ?? 0,
        challengeDays: 7,
        source: 'profile',
      }),
      'profile_challenge'
    );
  }

  async function handleShareStreakProof() {
    await shareGrowthPayload(
      buildSharePayload('streak', {
        inviteCode,
        streakDays: data?.currentStreak ?? 0,
        source: 'profile',
      }),
      'profile_streak_proof'
    );
  }

  async function handleShareWeeklyChallenge() {
    await shareGrowthPayload(
      buildSharePayload('weekly_challenge', {
        inviteCode,
        streakDays: data?.currentStreak ?? 0,
        weeklyChallenge,
        source: 'profile',
      }),
      'profile_weekly_challenge'
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.eyebrow}>PROFILE</Text>
            <Text style={styles.heading}>Your Just 20 identity.</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/(tabs)/settings' as any)}
            activeOpacity={0.78}
          >
            <Text style={styles.settingsButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileTextWrap}>
            <Text style={styles.name}>{username}</Text>
            <Text style={styles.sub}>
              {getProfileCopy(data?.currentStreak ?? 0, data?.bestStreak ?? 0)}
            </Text>
            <View style={styles.invitePill}>
              <Text style={styles.inviteLabel}>Invite code</Text>
              <Text style={styles.inviteCode}>{inviteCode}</Text>
            </View>
          </View>
        </View>

        <XpProgressCard
          totalXp={data?.totalXp ?? 0}
          onPress={() => router.push('/xp-shop' as any)}
        />

        <View style={styles.statGrid}>
          <StatTile label={xpProgress.title} value={`Lv ${xpProgress.level}`} accent="⚡" />
          <StatTile label="Coins" value={`${data?.coinBalance ?? 0}`} accent="🪙" />
          <StatTile label="Streak" value={`${data?.currentStreak ?? 0}`} accent="🔥" />
          <StatTile label="Badges" value={badgeRatio} accent="🏅" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ActionRow
            title="Edit display name"
            subtitle="Choose the name friends see when you share."
            symbol="✏️"
            onPress={() => router.push('/profile-setup' as any)}
          />
          <ActionRow
            title="Open badge case"
            subtitle="See unlocks, hidden badges, rarity, and brag cards."
            symbol="🏅"
            onPress={() => router.push('/badges' as any)}
          />
          <ActionRow
            title="Open coin shop"
            subtitle="Spend coins on freeze refills and cosmetic style unlocks."
            symbol="🛍️"
            onPress={() => router.push('/xp-shop' as any)}
          />
          <ActionRow
            title="Invite a buddy"
            subtitle={`${data?.buddyCount ?? 0} linked. Turn the solo streak into social pressure.`}
            symbol="👥"
            onPress={handleShareInvite}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invite Lab</Text>
          <ActionRow
            title="Start a 7-day pact"
            subtitle="Best default for friends who need a simple yes."
            symbol="7"
            onPress={handleShareChallenge}
          />
          <ActionRow
            title="Share streak proof"
            subtitle="A softer brag for people already watching you."
            symbol="🔥"
            onPress={handleShareStreakProof}
          />
          <ActionRow
            title={weeklyChallenge.title}
            subtitle={weeklyChallenge.subtitle}
            symbol="↗"
            onPress={handleShareWeeklyChallenge}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Snapshot</Text>
          <View style={styles.snapshotRow}>
            <Text style={styles.snapshotLabel}>Best streak</Text>
            <Text style={styles.snapshotValue}>{data?.bestStreak ?? 0} days</Text>
          </View>
          <View style={styles.snapshotRow}>
            <Text style={styles.snapshotLabel}>Completed sessions</Text>
            <Text style={styles.snapshotValue}>{data?.totalSessions ?? 0}</Text>
          </View>
          <View style={styles.snapshotRow}>
            <Text style={styles.snapshotLabel}>Freeze bank</Text>
            <Text style={styles.snapshotValue}>{data?.freezeCount ?? 0}/3</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.settingsCard}
          onPress={() => router.push('/(tabs)/settings' as any)}
          activeOpacity={0.82}
        >
          <View>
            <Text style={styles.settingsTitle}>Reminder Settings</Text>
            <Text style={styles.settingsSub}>
              Time window, backup nudges, and notification controls live here now.
            </Text>
          </View>
          <Text style={styles.chevron}>→</Text>
        </TouchableOpacity>
      </ScrollView>
      {visualShareElement}
    </SafeAreaView>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statAccent}>{accent}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionRow({
  title,
  subtitle,
  symbol,
  onPress,
}: {
  title: string;
  subtitle: string;
  symbol: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.78}>
      <View style={styles.actionSymbol}>
        <Text style={styles.actionSymbolText}>{symbol}</Text>
      </View>
      <View style={styles.actionTextWrap}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSub}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>→</Text>
    </TouchableOpacity>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'J20';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getProfileCopy(currentStreak: number, bestStreak: number): string {
  if (currentStreak >= 30) return 'Streak creature status. This profile has receipts.';
  if (currentStreak >= 7) return 'A real streak is forming. Keep making it expensive to quit.';
  if (currentStreak > 0) return `Day ${currentStreak}. Tiny promise, loudly protected.`;
  if (bestStreak > 0) return `Best streak: ${bestStreak}. The comeback arc is available.`;
  return 'Start the first 20 and this starts looking dangerous.';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl + spacing.xl,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontSize: fontSize.xs,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: colors.streak,
  },
  heading: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1,
    marginTop: spacing.xs,
  },
  settingsButton: {
    flexShrink: 0,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  settingsButtonText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
    minWidth: 0,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 28,
    backgroundColor: colors.streakSoft,
    borderWidth: 2,
    borderColor: colors.streak,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.streak,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  profileTextWrap: { flex: 1, minWidth: 0, gap: spacing.xs },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.7,
    flexShrink: 1,
  },
  sub: {
    color: colors.subtext,
    fontSize: fontSize.sm,
    fontWeight: '600',
    lineHeight: 19,
  },
  invitePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    backgroundColor: '#F6F6F1',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  inviteLabel: {
    color: colors.subtext,
    fontSize: fontSize.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inviteCode: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
    flexShrink: 1,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statTile: {
    width: '48.5%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 118,
    justifyContent: 'space-between',
  },
  statAccent: { fontSize: 24 },
  statValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  statLabel: {
    color: colors.subtext,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionSymbol: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSymbolText: { fontSize: 20 },
  actionTextWrap: { flex: 1, gap: 2 },
  actionTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  actionSub: {
    color: colors.subtext,
    fontSize: fontSize.sm,
    fontWeight: '600',
    lineHeight: 18,
  },
  chevron: {
    color: colors.streak,
    fontSize: 22,
    fontWeight: '900',
  },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  snapshotLabel: {
    color: colors.subtext,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  snapshotValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.darkCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  settingsTitle: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '900',
    flexShrink: 1,
  },
  settingsSub: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: fontSize.sm,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: spacing.xs,
    maxWidth: 280,
  },
});
