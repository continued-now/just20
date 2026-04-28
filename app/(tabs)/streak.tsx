import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { STREAK_TIERS, getTierInfo } from '../../components/Mascot';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { isChestAvailable } from '../../lib/coins';
import { getCalendarData, getCoins, getStreak, getUserProfile } from '../../lib/db';
import { localDayKey, localDaysBetween } from '../../lib/dates';
import { MILESTONE_DAYS, getNextMilestone } from '../../lib/milestones';
import { getXp } from '../../lib/xp';

type StreakData = {
  current: number;
  best: number;
  totalSessions: number;
  freezeCount: number;
  lastCompletedDate: string | null;
  calendar: Record<string, boolean>;
  coinBalance: number;
  xpBalance: number;
  chestReady: boolean;
  inviteCode: string | null;
  username: string | null;
};

type WeekDay = {
  key: string;
  label: string;
  dateLabel: string;
  done: boolean;
  isToday: boolean;
};

const PERFECT_WEEK_TARGET = 7;

export default function StreakScreen() {
  const router = useRouter();
  const flameScale = useRef(new Animated.Value(1)).current;
  const flameGlow = useRef(new Animated.Value(0)).current;
  const [data, setData] = useState<StreakData | null>(null);
  const [selectedDay, setSelectedDay] = useState<WeekDay | null>(null);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(flameScale, {
            toValue: 1.08,
            duration: 950,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(flameGlow, {
            toValue: 1,
            duration: 950,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(flameScale, {
            toValue: 1,
            duration: 850,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(flameGlow, {
            toValue: 0,
            duration: 850,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [flameGlow, flameScale]);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [streak, cal, coins, xp, chestReady, profile] = await Promise.all([
          getStreak(),
          getCalendarData(42),
          getCoins(),
          getXp(),
          isChestAvailable(),
          getUserProfile(),
        ]);

        setData({
          current: streak.current,
          best: streak.best,
          totalSessions: streak.totalSessions,
          freezeCount: streak.freezeCount,
          lastCompletedDate: streak.lastCompletedDate,
          calendar: cal,
          coinBalance: coins.balance,
          xpBalance: xp.balance,
          chestReady,
          inviteCode: profile?.inviteCode ?? null,
          username: profile?.username ?? null,
        });
      }

      load();
    }, [])
  );

  const today = localDayKey();
  const current = data?.current ?? 0;
  const completedToday = data?.calendar[today] ?? false;
  const daysSinceCompletion = data?.lastCompletedDate
    ? localDaysBetween(data.lastCompletedDate, today)
    : null;
  const freezeCanSaveToday = !completedToday && daysSinceCompletion === 2 && (data?.freezeCount ?? 0) > 0;
  const streakIsAtRisk = current > 0 && !completedToday;
  const dayOnLine = getDayOnLine(current, completedToday, data?.lastCompletedDate ?? null, data?.freezeCount ?? 0);
  const nextMilestone = getNextMilestone(current);
  const milestoneTarget = nextMilestone?.days ?? MILESTONE_DAYS[MILESTONE_DAYS.length - 1];
  const nextTier = getTierInfo(current);
  const week = buildWeek(data?.calendar ?? {});
  const weekDoneCount = week.filter(day => day.done).length;
  const monthDoneCount = Object.values(data?.calendar ?? {}).filter(Boolean).length;
  const perfectWeekProgress = Math.min((weekDoneCount / PERFECT_WEEK_TARGET) * 100, 100);
  const milestoneProgress = nextMilestone ? Math.min((current / nextMilestone.days) * 100, 100) : 100;
  const hoursLeft = getHoursUntilMidnight();
  const streakLeague = getStreakLeague(current);
  const selected = selectedDay ?? week[week.length - 1];

  async function handleShare() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const inviteLine = data?.inviteCode ? `\nMy code: ${data.inviteCode}` : '';
    const name = data?.username ? `${data.username} is` : "I'm";
    const dayLine = current > 0
      ? `${name} on a ${current}-day Just20 streak. 20 pushups a day. No negotiations.`
      : "I'm starting a Just20 streak. 20 pushups a day. Hold me to it.";

    try {
      await Share.share({
        message: `${dayLine}${inviteLine}\n\nTry to catch me. #just20`,
      });
    } catch {
      // Share sheets can be dismissed; nothing to recover from.
    }
  }

  async function handleDayPress(day: WeekDay) {
    await Haptics.selectionAsync();
    setSelectedDay(day);
  }

  async function handleWorkoutPress() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/workout');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>STREAK CENTER</Text>
            <Text style={styles.heading}>Keep the flame alive.</Text>
          </View>
          <View style={styles.currencyStack}>
            <View style={styles.xpPill}>
              <Text style={styles.xpText}>XP {data?.xpBalance ?? 0}</Text>
            </View>
            <View style={styles.coinPill}>
              <Text style={styles.coinText}>🪙 {data?.coinBalance ?? 0}</Text>
            </View>
            <TouchableOpacity style={styles.badgesPill} onPress={() => router.push('/badges' as any)} activeOpacity={0.82}>
              <Text style={styles.badgesText}>Badges</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.hero, streakIsAtRisk && styles.heroDanger, completedToday && styles.heroSafe]}>
          <Animated.View
            style={[
              styles.flameAura,
              {
                opacity: flameGlow.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.55] }),
                transform: [{ scale: flameScale }],
              },
            ]}
          />
          <Animated.Text style={[styles.flame, { transform: [{ scale: flameScale }] }]}>🔥</Animated.Text>
          <Text style={styles.streakNum}>{current}</Text>
          <Text style={styles.streakLabel}>{current === 1 ? 'day streak' : 'day streak'}</Text>
          <Text style={styles.heroSub}>{getHeroCopy(current, completedToday, freezeCanSaveToday, hoursLeft)}</Text>

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={[styles.primaryCta, completedToday && styles.primaryCtaDone]}
              onPress={completedToday ? handleShare : handleWorkoutPress}
              activeOpacity={0.86}
            >
              <Text style={styles.primaryCtaText}>
                {completedToday ? 'FLEX THE STREAK →' : `SAVE DAY ${dayOnLine} →`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareChip} onPress={handleShare} activeOpacity={0.82}>
              <Text style={styles.shareChipText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statusGrid}>
          <MiniStatus
            tone={completedToday ? 'safe' : streakIsAtRisk ? 'danger' : 'neutral'}
            label={completedToday ? 'Locked' : 'At risk'}
            value={completedToday ? 'Safe today' : current > 0 ? `${hoursLeft}h left` : 'Start now'}
          />
          <MiniStatus
            tone={(data?.freezeCount ?? 0) > 0 ? 'ice' : 'danger'}
            label="Freeze bank"
            value={`${data?.freezeCount ?? 0}/3`}
          />
          <MiniStatus
            tone={data?.chestReady ? 'reward' : 'neutral'}
            label="Weekly chest"
            value={data?.chestReady ? 'Ready' : `${weekDoneCount}/5`}
          />
        </View>

        {data?.chestReady && (
          <TouchableOpacity style={styles.chestCard} onPress={() => router.push('/chest-open')} activeOpacity={0.84}>
            <Text style={styles.chestEmoji}>📦</Text>
            <View style={styles.chestTextWrap}>
              <Text style={styles.chestTitle}>Reward waiting</Text>
              <Text style={styles.chestText}>You earned a weekly chest. Open it before the dopamine goblin gets impatient.</Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Perfect Week</Text>
              <Text style={styles.cardSub}>Fill all 7 rings for a cleaner streak story.</Text>
            </View>
            <Text style={styles.cardScore}>{weekDoneCount}/7</Text>
          </View>

          <View style={styles.weekRow}>
            {week.map(day => (
              <Pressable key={day.key} style={styles.dayCol} onPress={() => handleDayPress(day)}>
                <View
                  style={[
                    styles.dayRing,
                    day.done && styles.dayRingDone,
                    day.isToday && !day.done && styles.dayRingToday,
                    selected?.key === day.key && styles.dayRingSelected,
                  ]}
                >
                  <Text style={[styles.dayRingText, day.done && styles.dayRingTextDone]}>
                    {day.done ? '✓' : day.isToday ? '!' : '•'}
                  </Text>
                </View>
                <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>{day.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${perfectWeekProgress}%` }]} />
          </View>

          <View style={styles.dayDetail}>
            <Text style={styles.dayDetailTitle}>{selected.dateLabel}</Text>
            <Text style={styles.dayDetailText}>
              {selected.done
                ? 'Stamped. This day is part of the streak story.'
                : selected.isToday
                ? 'Today is open. Finish 20 and make the ring glow.'
                : 'Missed days are visible by design. The calendar should make quitting annoying.'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Next Big Moment</Text>
              <Text style={styles.cardSub}>
                {nextMilestone ? `${nextMilestone.daysLeft} day${nextMilestone.daysLeft === 1 ? '' : 's'} until the next share-worthy badge.` : 'Every milestone is unlocked. Ridiculous.'}
              </Text>
            </View>
            <Text style={styles.cardScore}>{nextMilestone ? nextMilestone.days : 'MAX'}</Text>
          </View>
          <View style={styles.milestoneTrack}>
            <View style={[styles.milestoneFill, { width: `${milestoneProgress}%` }]} />
            {MILESTONE_DAYS.slice(0, 6).map(day => (
              <View
                key={day}
                style={[
                  styles.milestoneTick,
                  { left: `${Math.min((day / milestoneTarget) * 100, 100)}%` },
                  current >= day && styles.milestoneTickDone,
                ]}
              />
            ))}
          </View>
          <View style={styles.rewardRow}>
            <RewardPill label="Default window" value="+18 XP" />
            <RewardPill label="No excuses" value="+25 XP" />
            <RewardPill label="Nudges" value="-XP" />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>League Identity</Text>
              <Text style={styles.cardSub}>Give the streak a status symbol, not just a number.</Text>
            </View>
            <Text style={styles.leagueEmoji}>{streakLeague.emoji}</Text>
          </View>

          <View style={styles.leagueCard}>
            <Text style={styles.leagueName}>{streakLeague.name}</Text>
            <Text style={styles.leagueText}>{streakLeague.copy}</Text>
          </View>

          <View style={styles.evoList}>
            {[...STREAK_TIERS].reverse().map(tier => {
              const reached = current >= tier.minDays;
              const isCurrent = nextTier.minDays === tier.minDays;
              return (
                <View key={tier.minDays} style={[styles.evoRow, isCurrent && styles.evoRowCurrent]}>
                  <Text style={styles.evoForm}>{tier.form}</Text>
                  <View style={styles.evoMeta}>
                    <Text style={[styles.evoLabel, reached && styles.evoLabelReached]}>{tier.label}</Text>
                    <Text style={styles.evoSub}>{tier.minDays === 0 ? 'Start' : `Day ${tier.minDays}`}</Text>
                  </View>
                  <Text style={[styles.evoState, reached && styles.evoStateDone]}>{reached ? '✓' : 'LOCK'}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.grid}>
          <StatCard label="Best streak" value={`${data?.best ?? 0}`} accent="🏆" />
          <StatCard label="Total sessions" value={`${data?.totalSessions ?? 0}`} accent="💪" />
          <StatCard label="This month" value={`${monthDoneCount}`} accent="📅" />
          <StatCard label="Safety ice" value={`${data?.freezeCount ?? 0}`} accent="🧊" />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Receipts</Text>
              <Text style={styles.cardSub}>A tiny heatmap that makes consistency feel collectible.</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/squad')} activeOpacity={0.78}>
              <Text style={styles.squadLink}>Squad →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heatmap}>
            {Array.from({ length: 42 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (41 - i));
              const key = localDayKey(d);
              const done = data?.calendar[key] ?? false;
              const isToday = key === today;
              return (
                <View
                  key={key}
                  style={[
                    styles.heatCell,
                    done && styles.heatCellDone,
                    isToday && !done && styles.heatCellToday,
                  ]}
                />
              );
            })}
          </View>
        </View>

        {streakIsAtRisk && (data?.freezeCount ?? 0) === 0 && (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>No freeze. No mercy.</Text>
            <Text style={styles.warningText}>One missed day resets the public number. That little bit of pressure is the product.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function buildWeek(calendar: Record<string, boolean>): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = localDayKey(d);
    return {
      key,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
      dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      done: calendar[key] ?? false,
      isToday: i === 6,
    };
  });
}

function getHoursUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / (60 * 60 * 1000)));
}

function getDayOnLine(current: number, completedToday: boolean, lastCompletedDate: string | null, freezeCount: number): number {
  if (completedToday) return Math.max(current, 1);
  if (!lastCompletedDate || current === 0) return 1;

  const daysSinceCompletion = localDaysBetween(lastCompletedDate, localDayKey());
  if (daysSinceCompletion === 1) return current + 1;
  if (daysSinceCompletion === 2 && freezeCount > 0) return current + 1;
  return 1;
}

function getHeroCopy(current: number, completedToday: boolean, freezeCanSaveToday: boolean, hoursLeft: number): string {
  if (completedToday) return 'Today is locked. The streak survives another sunrise.';
  if (current === 0) return 'Start with one clean win. The first flame is the hardest.';
  if (freezeCanSaveToday) return 'A freeze can cover yesterday, but today still needs your 20.';
  return `${hoursLeft} hour${hoursLeft === 1 ? '' : 's'} until midnight tries to steal it.`;
}

function getStreakLeague(streak: number): { emoji: string; name: string; copy: string } {
  if (streak >= 100) return { emoji: '👑', name: 'Mythic Flame', copy: 'This is the kind of streak people screenshot and argue with.' };
  if (streak >= 30) return { emoji: '⚔️', name: 'Floor Menace', copy: 'Thirty days changes the app from reminder into identity.' };
  if (streak >= 14) return { emoji: '🔥', name: 'Habit Locked', copy: 'Two weeks is where streaks start feeling expensive to lose.' };
  if (streak >= 7) return { emoji: '🧊', name: 'Freeze Earner', copy: 'You crossed the first real line. Now the game has protection.' };
  if (streak > 0) return { emoji: '✨', name: 'Spark Run', copy: 'Small streaks are fragile. That is exactly why they work.' };
  return { emoji: '🎯', name: 'Unlit', copy: 'The viral loop starts after the first public win.' };
}

function MiniStatus({ tone, label, value }: { tone: 'safe' | 'danger' | 'ice' | 'reward' | 'neutral'; label: string; value: string }) {
  return (
    <View style={[styles.miniStatus, styles[`miniStatus_${tone}`]]}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

function RewardPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rewardPill}>
      <Text style={styles.rewardValue}>{value}</Text>
      <Text style={styles.rewardLabel}>{label}</Text>
    </View>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statAccent}>{accent}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  eyebrow: {
    fontSize: fontSize.xs,
    fontWeight: '900',
    color: colors.streak,
    letterSpacing: 1.7,
  },
  heading: {
    fontSize: 31,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1.1,
    marginTop: 2,
  },
  currencyStack: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  xpPill: {
    backgroundColor: '#171717',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  xpText: { fontSize: fontSize.sm, fontWeight: '900', color: '#FFFFFF' },
  coinPill: {
    backgroundColor: '#FFF3C4',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#FFD76B',
  },
  coinText: { fontSize: fontSize.sm, fontWeight: '900', color: '#9B6500' },
  badgesPill: {
    backgroundColor: '#FFF0E8',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#FFD2BF',
  },
  badgesText: { fontSize: fontSize.sm, fontWeight: '900', color: colors.streak },

  hero: {
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: '#1D120E',
    borderRadius: 34,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#4B2419',
    gap: spacing.xs,
  },
  heroDanger: {
    borderColor: '#FF8A65',
    shadowColor: colors.streak,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  heroSafe: {
    backgroundColor: '#10251A',
    borderColor: '#3CB371',
  },
  flameAura: {
    position: 'absolute',
    top: 20,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: colors.streak,
  },
  flame: { fontSize: 78, marginTop: spacing.xs },
  streakNum: {
    fontSize: 92,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 100,
    letterSpacing: -4,
  },
  streakLabel: {
    fontSize: fontSize.lg,
    fontWeight: '900',
    color: '#FFD0B8',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  heroSub: {
    maxWidth: 290,
    color: '#FFE9DD',
    fontSize: fontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryCta: {
    backgroundColor: colors.streak,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    shadowColor: colors.streak,
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  primaryCtaDone: { backgroundColor: colors.success },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  shareChip: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  shareChipText: { color: '#FFFFFF', fontWeight: '900', fontSize: fontSize.sm },

  statusGrid: { flexDirection: 'row', gap: spacing.sm },
  miniStatus: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: 4,
  },
  miniStatus_safe: { backgroundColor: '#E9F8F0', borderColor: '#C4EED7' },
  miniStatus_danger: { backgroundColor: '#FFF1EA', borderColor: '#FFD0BE' },
  miniStatus_ice: { backgroundColor: '#EAF8FF', borderColor: '#BCEBFF' },
  miniStatus_reward: { backgroundColor: '#FFF6D8', borderColor: '#FFE18A' },
  miniStatus_neutral: { backgroundColor: colors.card, borderColor: colors.border },
  miniLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  miniValue: { fontSize: fontSize.sm, fontWeight: '900', color: colors.text },

  chestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#FFF6D8',
    borderWidth: 1,
    borderColor: '#FFE18A',
  },
  chestEmoji: { fontSize: 34 },
  chestTextWrap: { flex: 1, gap: 2 },
  chestTitle: { fontSize: fontSize.md, fontWeight: '900', color: colors.text },
  chestText: { fontSize: fontSize.sm, fontWeight: '600', color: '#8A6317', lineHeight: 19 },
  chevron: { fontSize: 24, fontWeight: '900', color: '#B98200' },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.sm,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardSub: {
    maxWidth: 245,
    fontSize: fontSize.xs,
    color: colors.subtext,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 3,
  },
  cardScore: { fontSize: 26, fontWeight: '900', color: colors.streak, letterSpacing: -1 },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  dayCol: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  dayRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  dayRingDone: { backgroundColor: colors.streak, borderColor: colors.streak },
  dayRingToday: { borderColor: colors.streak, backgroundColor: '#FFF0E8' },
  dayRingSelected: {
    transform: [{ scale: 1.08 }],
    borderColor: colors.text,
  },
  dayRingText: { fontSize: fontSize.md, fontWeight: '900', color: colors.subtext },
  dayRingTextDone: { color: '#FFFFFF' },
  dayLabel: { fontSize: 10, color: colors.subtext, fontWeight: '800' },
  dayLabelToday: { color: colors.streak },
  progressTrack: {
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.streak,
  },
  dayDetail: {
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.bg,
    gap: 3,
  },
  dayDetailTitle: { fontSize: fontSize.sm, fontWeight: '900', color: colors.text },
  dayDetailText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.subtext, lineHeight: 19 },

  milestoneTrack: {
    height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  milestoneFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.streak,
  },
  milestoneTick: {
    position: 'absolute',
    top: 3,
    width: 4,
    height: 12,
    borderRadius: 2,
    backgroundColor: 'rgba(26,26,26,0.22)',
  },
  milestoneTickDone: { backgroundColor: '#FFFFFF' },
  rewardRow: { flexDirection: 'row', gap: spacing.sm },
  rewardPill: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: '#FFF7F0',
    borderWidth: 1,
    borderColor: '#FFE1D2',
  },
  rewardValue: { fontSize: fontSize.md, fontWeight: '900', color: colors.streak },
  rewardLabel: { fontSize: 10, fontWeight: '800', color: colors.subtext, marginTop: 2 },

  leagueEmoji: { fontSize: 32 },
  leagueCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#171717',
    gap: spacing.xs,
  },
  leagueName: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.7 },
  leagueText: { fontSize: fontSize.sm, fontWeight: '700', color: '#D6D6D6', lineHeight: 20 },
  evoList: { gap: spacing.xs },
  evoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  evoRowCurrent: {
    backgroundColor: '#FFF4EE',
    borderWidth: 1,
    borderColor: '#FFD2BF',
  },
  evoForm: { fontSize: 25, width: 38, textAlign: 'center' },
  evoMeta: { flex: 1, gap: 1 },
  evoLabel: { fontSize: fontSize.sm, fontWeight: '800', color: colors.subtext },
  evoLabelReached: { color: colors.text },
  evoSub: { fontSize: fontSize.xs, color: colors.subtext, fontWeight: '600' },
  evoState: { fontSize: 10, fontWeight: '900', color: colors.subtext },
  evoStateDone: { color: colors.streak, fontSize: fontSize.sm },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  statAccent: { fontSize: 23 },
  statValue: { fontSize: 30, fontWeight: '900', color: colors.text, letterSpacing: -1 },
  statLabel: { fontSize: fontSize.xs, fontWeight: '800', color: colors.subtext },

  squadLink: { fontSize: fontSize.sm, fontWeight: '900', color: colors.streak },
  heatmap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heatCell: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: colors.border,
  },
  heatCellDone: { backgroundColor: colors.success },
  heatCellToday: {
    borderWidth: 2,
    borderColor: colors.streak,
    backgroundColor: '#FFF0E8',
  },

  warningCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: '#FFF1EA',
    borderWidth: 1,
    borderColor: '#FFD0BE',
    gap: spacing.xs,
  },
  warningTitle: { fontSize: fontSize.md, fontWeight: '900', color: colors.text },
  warningText: { fontSize: fontSize.sm, fontWeight: '700', color: '#A44C27', lineHeight: 20 },
});
