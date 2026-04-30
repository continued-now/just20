import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { STREAK_TIERS, getTierInfo } from '../../components/Mascot';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { useGrowthImageShare } from '../../hooks/useGrowthImageShare';
import { isChestAvailable } from '../../lib/coins';
import {
  getCalendarData,
  getCoins,
  getRecoveryCalendarData,
  getStreak,
  getUserProfile,
  type RecoveryType,
} from '../../lib/db';
import { localDayKey, localDaysBetween } from '../../lib/dates';
import { buildSharePayload } from '../../lib/growth';
import { MILESTONE_DAYS, getNextMilestone } from '../../lib/milestones';
import { getEquippedCosmetics, getFlameStyle, type FlameStyleId } from '../../lib/shop';
import { getXp } from '../../lib/xp';

type StreakData = {
  current: number;
  best: number;
  totalSessions: number;
  freezeCount: number;
  lastCompletedDate: string | null;
  calendar: Record<string, boolean>;
  recoveryCalendar: Record<string, RecoveryType>;
  coinBalance: number;
  xpBalance: number;
  chestReady: boolean;
  inviteCode: string | null;
  username: string | null;
  flameStyle: FlameStyleId | null;
};

type WeekDay = {
  key: string;
  label: string;
  dateNumber: string;
  dateLabel: string;
  done: boolean;
  recoveryType: RecoveryType;
  isToday: boolean;
};

const PERFECT_WEEK_TARGET = 7;
const WEEKLY_CHEST_TARGET = 5;

export default function StreakScreen() {
  const router = useRouter();
  const flameScale = useRef(new Animated.Value(1)).current;
  const flameGlow = useRef(new Animated.Value(0)).current;
  const [data, setData] = useState<StreakData | null>(null);
  const [selectedDay, setSelectedDay] = useState<WeekDay | null>(null);
  const { shareGrowthPayload, visualShareElement } = useGrowthImageShare();

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
      let active = true;

      async function load() {
        try {
          const [streak, cal, recoveryCal, coins, xp, chestReady, profile, equipped] =
            await Promise.all([
              getStreak(),
              getCalendarData(42),
              getRecoveryCalendarData(42),
              getCoins(),
              getXp(),
              isChestAvailable(),
              getUserProfile(),
              getEquippedCosmetics(),
            ]);

          if (!active) return;
          setData({
            current: streak.current,
            best: streak.best,
            totalSessions: streak.totalSessions,
            freezeCount: streak.freezeCount,
            lastCompletedDate: streak.lastCompletedDate,
            calendar: cal,
            recoveryCalendar: recoveryCal,
            coinBalance: coins.balance,
            xpBalance: xp.balance,
            chestReady,
            inviteCode: profile?.inviteCode ?? null,
            username: profile?.username ?? null,
            flameStyle: equipped.flameStyle,
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

  const today = localDayKey();
  const current = data?.current ?? 0;
  const completedToday = data?.calendar[today] ?? false;
  const daysSinceCompletion = data?.lastCompletedDate
    ? localDaysBetween(data.lastCompletedDate, today)
    : null;
  const freezeCanSaveToday =
    !completedToday && daysSinceCompletion === 2 && (data?.freezeCount ?? 0) > 0;
  const streakIsAtRisk = current > 0 && !completedToday;
  const dayOnLine = getDayOnLine(
    current,
    completedToday,
    data?.lastCompletedDate ?? null,
    data?.freezeCount ?? 0
  );
  const nextMilestone = getNextMilestone(current);
  const milestoneTarget = nextMilestone?.days ?? MILESTONE_DAYS[MILESTONE_DAYS.length - 1];
  const nextTier = getTierInfo(current);
  const week = buildWeek(data?.calendar ?? {}, data?.recoveryCalendar ?? {});
  const weekDoneCount = week.filter((day) => day.done).length;
  const monthDoneCount = Object.values(data?.calendar ?? {}).filter(Boolean).length;
  const perfectWeekProgress = Math.min((weekDoneCount / PERFECT_WEEK_TARGET) * 100, 100);
  const weeklyChestProgress = Math.min((weekDoneCount / WEEKLY_CHEST_TARGET) * 100, 100);
  const chestDaysRemaining = Math.max(0, WEEKLY_CHEST_TARGET - weekDoneCount);
  const milestoneProgress = nextMilestone
    ? Math.min((current / nextMilestone.days) * 100, 100)
    : 100;
  const hoursLeft = getHoursUntilMidnight();
  const streakLeague = getStreakLeague(current);
  const selected = selectedDay ?? week[week.length - 1];
  const flameVisual = getFlameStyle(data?.flameStyle);
  const heroPalette = getHeroPalette(completedToday, streakIsAtRisk, freezeCanSaveToday);
  const dailyGoalProgress = completedToday ? 100 : freezeCanSaveToday ? 45 : 0;
  const freezeCount = data?.freezeCount ?? 0;

  async function handleShare() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const payload = buildSharePayload('streak', {
      inviteCode: data?.inviteCode,
      streakDays: current,
      source: 'streak',
    });
    await shareGrowthPayload(payload, 'streak_center');
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
          <View style={styles.headerTitleWrap}>
            <Text style={styles.eyebrow}>STREAK</Text>
            <Text style={styles.heading}>
              {completedToday
                ? 'Locked in today.'
                : current > 0
                  ? `Day ${dayOnLine} is live.`
                  : 'Start your streak.'}
            </Text>
          </View>
          <View style={styles.currencyStack}>
            <View style={styles.xpPill}>
              <Text style={styles.xpText}>XP {data?.xpBalance ?? 0}</Text>
            </View>
            <TouchableOpacity
              style={styles.coinPill}
              onPress={() => router.push('/xp-shop' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.coinText}>🪙 {data?.coinBalance ?? 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.badgesPill}
              onPress={() => router.push('/badges' as any)}
              activeOpacity={0.82}
            >
              <Text style={styles.badgesText}>Badges</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.hero,
            {
              backgroundColor: heroPalette.background,
              borderColor: heroPalette.border,
              shadowColor: heroPalette.shadow,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={[styles.heroStatusPill, { backgroundColor: heroPalette.pill }]}>
              <Text style={[styles.heroStatusText, { color: heroPalette.pillText }]}>
                {completedToday ? 'TODAY LOCKED' : streakIsAtRisk ? 'ACTION NEEDED' : 'DAILY GOAL'}
              </Text>
            </View>
            <View style={styles.heroFreezePill}>
              <Text style={styles.heroFreezeText}>🧊 {freezeCount}</Text>
            </View>
          </View>

          <View style={styles.heroMain}>
            <View style={styles.flameOrb}>
              <Animated.View
                style={[
                  styles.flameAura,
                  {
                    backgroundColor: flameVisual.auraColor,
                    opacity: flameGlow.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.18, 0.55],
                    }),
                    transform: [{ scale: flameScale }],
                  },
                ]}
              />
              <Animated.Text style={[styles.flame, { transform: [{ scale: flameScale }] }]}>
                {flameVisual.emoji}
              </Animated.Text>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.streakNum}>{current}</Text>
              <Text style={styles.streakLabel}>{current === 1 ? 'day streak' : 'day streak'}</Text>
              <Text style={styles.heroSub}>
                {getHeroCopy(current, completedToday, freezeCanSaveToday, hoursLeft)}
              </Text>
            </View>
          </View>

          <View style={styles.dailyGoalCard}>
            <View style={styles.dailyGoalTop}>
              <Text style={styles.dailyGoalTitle}>
                {completedToday ? 'Daily goal complete' : `Finish 20 to lock Day ${dayOnLine}`}
              </Text>
              <Text style={styles.dailyGoalValue}>{completedToday ? '100%' : '0/20'}</Text>
            </View>
            <View style={styles.dailyGoalTrack}>
              <View
                style={[
                  styles.dailyGoalFill,
                  { width: `${dailyGoalProgress}%`, backgroundColor: heroPalette.progress },
                ]}
              />
            </View>
          </View>

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={[styles.primaryCta, completedToday && styles.primaryCtaDone]}
              onPress={completedToday ? handleShare : handleWorkoutPress}
              activeOpacity={0.86}
            >
              <Text style={styles.primaryCtaText}>
                {completedToday ? 'SHARE STREAK →' : `LOCK DAY ${dayOnLine} →`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareChip} onPress={handleShare} activeOpacity={0.82}>
              <Text style={styles.shareChipText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statusGrid}>
          <MiniStatus
            icon={completedToday ? '✓' : '!'}
            tone={completedToday ? 'safe' : streakIsAtRisk ? 'danger' : 'neutral'}
            label="Today"
            value={completedToday ? 'Locked' : current > 0 ? `${hoursLeft}h left` : 'Start now'}
          />
          <MiniStatus
            icon="🧊"
            tone={freezeCount > 0 ? 'ice' : 'danger'}
            label="Freezes"
            value={`${freezeCount}/3`}
          />
          <MiniStatus
            icon="🎁"
            tone={data?.chestReady ? 'reward' : 'neutral'}
            label="Chest"
            value={data?.chestReady ? 'Ready' : `${weekDoneCount}/${WEEKLY_CHEST_TARGET}`}
          />
        </View>

        {data?.chestReady && (
          <TouchableOpacity
            style={styles.chestCard}
            onPress={() => router.push('/chest-open')}
            activeOpacity={0.84}
          >
            <Text style={styles.chestEmoji}>📦</Text>
            <View style={styles.chestTextWrap}>
              <Text style={styles.chestTitle}>Reward waiting</Text>
              <Text style={styles.chestText}>
                You earned a weekly chest. Open it while the streak momentum is fresh.
              </Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.card, styles.weekCard]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>This Week</Text>
              <Text style={styles.cardSub}>Light the row. Five locked days opens the chest.</Text>
            </View>
            <Text style={styles.cardScore}>{weekDoneCount}/7</Text>
          </View>

          <View style={styles.weekRow}>
            {week.map((day) => (
              <Pressable key={day.key} style={styles.dayCol} onPress={() => handleDayPress(day)}>
                <View
                  style={[
                    styles.dayRing,
                    day.done && styles.dayRingDone,
                    day.recoveryType !== 'none' && styles.dayRingPatched,
                    day.isToday && !day.done && styles.dayRingToday,
                    selected?.key === day.key && styles.dayRingSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayRingText,
                      (day.done || day.recoveryType !== 'none') && styles.dayRingTextDone,
                    ]}
                  >
                    {getDayRingGlyph(day)}
                  </Text>
                </View>
                <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                  {day.label}
                </Text>
                <Text style={[styles.dayNumber, day.isToday && styles.dayLabelToday]}>
                  {day.dateNumber}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${perfectWeekProgress}%` }]} />
          </View>

          <View style={styles.chestProgressCard}>
            <View style={styles.chestProgressCopy}>
              <Text style={styles.chestProgressTitle}>Weekly chest</Text>
              <Text style={styles.chestProgressText}>
                {data?.chestReady
                  ? 'Ready to open.'
                  : `${chestDaysRemaining} more locked day${chestDaysRemaining === 1 ? '' : 's'} to unlock.`}
              </Text>
            </View>
            <View style={styles.chestProgressTrack}>
              <View style={[styles.chestProgressFill, { width: `${weeklyChestProgress}%` }]} />
            </View>
          </View>

          <View style={styles.dayDetail}>
            <Text style={styles.dayDetailTitle}>{selected.dateLabel}</Text>
            <Text style={styles.dayDetailText}>
              {selected.done
                ? 'Locked. This day is keeping the streak alive.'
                : selected.recoveryType !== 'none'
                  ? 'Protected with a freeze. The active streak survived.'
                  : selected.isToday
                    ? 'Today is open. Finish 20 and light the ring.'
                    : 'Missed. The calendar keeps the receipt so the next lock-in matters.'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Next Reward</Text>
              <Text style={styles.cardSub}>
                {nextMilestone
                  ? `${nextMilestone.daysLeft} day${nextMilestone.daysLeft === 1 ? '' : 's'} until the next streak milestone.`
                  : 'Every milestone is unlocked.'}
              </Text>
            </View>
            <Text style={styles.cardScore}>{nextMilestone ? nextMilestone.days : 'MAX'}</Text>
          </View>
          <View style={styles.milestoneTrack}>
            <View style={[styles.milestoneFill, { width: `${milestoneProgress}%` }]} />
            {MILESTONE_DAYS.slice(0, 6).map((day) => (
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
            <RewardPill label="Weekly chest" value={`${weekDoneCount}/${WEEKLY_CHEST_TARGET}`} />
            <RewardPill
              label="Next badge"
              value={nextMilestone ? `${nextMilestone.daysLeft}d` : 'MAX'}
            />
            <RewardPill label="Freezes" value={`${freezeCount}/3`} />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>League Identity</Text>
              <Text style={styles.cardSub}>
                Give the streak a status symbol, not just a number.
              </Text>
            </View>
            <Text style={styles.leagueEmoji}>{streakLeague.emoji}</Text>
          </View>

          <View style={styles.leagueCard}>
            <Text style={styles.leagueName}>{streakLeague.name}</Text>
            <Text style={styles.leagueText}>{streakLeague.copy}</Text>
          </View>

          <View style={styles.evoList}>
            {[...STREAK_TIERS].reverse().map((tier) => {
              const reached = current >= tier.minDays;
              const isCurrent = nextTier.minDays === tier.minDays;
              return (
                <View key={tier.minDays} style={[styles.evoRow, isCurrent && styles.evoRowCurrent]}>
                  <Text style={styles.evoForm}>{tier.form}</Text>
                  <View style={styles.evoMeta}>
                    <Text style={[styles.evoLabel, reached && styles.evoLabelReached]}>
                      {tier.label}
                    </Text>
                    <Text style={styles.evoSub}>
                      {tier.minDays === 0 ? 'Start' : `Day ${tier.minDays}`}
                    </Text>
                  </View>
                  <Text style={[styles.evoState, reached && styles.evoStateDone]}>
                    {reached ? '✓' : 'LOCK'}
                  </Text>
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
              <Text style={styles.cardSub}>
                A tiny heatmap that makes consistency feel collectible.
              </Text>
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
              const patched = (data?.recoveryCalendar[key] ?? 'none') !== 'none';
              const isToday = key === today;
              return (
                <View
                  key={key}
                  style={[
                    styles.heatCell,
                    done && styles.heatCellDone,
                    patched && styles.heatCellPatched,
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
            <Text style={styles.warningText}>
              One missed day resets the public number. That little bit of pressure is the product.
            </Text>
          </View>
        )}
      </ScrollView>
      {visualShareElement}
    </SafeAreaView>
  );
}

function buildWeek(
  calendar: Record<string, boolean>,
  recoveryCalendar: Record<string, RecoveryType>
): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = localDayKey(d);
    return {
      key,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
      dateNumber: String(d.getDate()),
      dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      done: calendar[key] ?? false,
      recoveryType: recoveryCalendar[key] ?? 'none',
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

function getDayOnLine(
  current: number,
  completedToday: boolean,
  lastCompletedDate: string | null,
  freezeCount: number
): number {
  if (completedToday) return Math.max(current, 1);
  if (!lastCompletedDate || current === 0) return 1;

  const daysSinceCompletion = localDaysBetween(lastCompletedDate, localDayKey());
  if (daysSinceCompletion === 1) return current + 1;
  if (daysSinceCompletion === 2 && freezeCount > 0) return current + 1;
  return 1;
}

function getHeroCopy(
  current: number,
  completedToday: boolean,
  freezeCanSaveToday: boolean,
  hoursLeft: number
): string {
  if (completedToday) return 'Perfect. Today is locked and the streak stays bright.';
  if (current === 0) return 'One quick set starts the counter.';
  if (freezeCanSaveToday) return 'A freeze can protect yesterday, but today still needs 20.';
  return `${hoursLeft} hour${hoursLeft === 1 ? '' : 's'} left to keep the flame lit.`;
}

function getHeroPalette(
  completedToday: boolean,
  streakIsAtRisk: boolean,
  freezeCanSaveToday: boolean
): {
  background: string;
  border: string;
  pill: string;
  pillText: string;
  progress: string;
  shadow: string;
} {
  if (completedToday) {
    return {
      background: colors.brand,
      border: colors.brandDark,
      pill: '#D9FFC0',
      pillText: colors.brandDark,
      progress: colors.yellow,
      shadow: colors.brandDark,
    };
  }
  if (freezeCanSaveToday) {
    return {
      background: colors.ice,
      border: '#0B7CAE',
      pill: '#DDF5FF',
      pillText: '#075A7B',
      progress: colors.yellow,
      shadow: colors.ice,
    };
  }
  if (streakIsAtRisk) {
    return {
      background: colors.streak,
      border: colors.streakDark,
      pill: '#FFF2D5',
      pillText: colors.streakDark,
      progress: colors.brand,
      shadow: colors.streak,
    };
  }
  return {
    background: '#7DDC25',
    border: colors.brandDark,
    pill: '#E9FFD8',
    pillText: colors.brandDark,
    progress: colors.yellow,
    shadow: colors.brand,
  };
}

function getDayRingGlyph(day: WeekDay): string {
  if (day.recoveryType !== 'none') return '🧊';
  if (day.done) return '✓';
  if (day.isToday) return '20';
  return '•';
}

function getStreakLeague(streak: number): { emoji: string; name: string; copy: string } {
  if (streak >= 100)
    return {
      emoji: '👑',
      name: 'Mythic Flame',
      copy: 'This is the kind of streak people screenshot and argue with.',
    };
  if (streak >= 30)
    return {
      emoji: '⚔️',
      name: 'Floor Menace',
      copy: 'Thirty days changes the app from reminder into identity.',
    };
  if (streak >= 14)
    return {
      emoji: '🔥',
      name: 'Habit Locked',
      copy: 'Two weeks is where streaks start feeling expensive to lose.',
    };
  if (streak >= 7)
    return {
      emoji: '🧊',
      name: 'Freeze Earner',
      copy: 'You crossed the first real line. Now the game has protection.',
    };
  if (streak > 0)
    return {
      emoji: '✨',
      name: 'Spark Run',
      copy: 'Small streaks are fragile. That is exactly why they work.',
    };
  return { emoji: '🎯', name: 'Unlit', copy: 'Light the first spark with one clean set.' };
}

function MiniStatus({
  icon,
  tone,
  label,
  value,
}: {
  icon: string;
  tone: 'safe' | 'danger' | 'ice' | 'reward' | 'neutral';
  label: string;
  value: string;
}) {
  return (
    <View style={[styles.miniStatus, styles[`miniStatus_${tone}`]]}>
      <Text style={styles.miniIcon}>{icon}</Text>
      <View style={styles.miniTextWrap}>
        <Text style={styles.miniLabel}>{label}</Text>
        <Text style={styles.miniValue}>{value}</Text>
      </View>
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
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl + spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerTitleWrap: { flex: 1, minWidth: 0 },
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
    flexShrink: 1,
  },
  currencyStack: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    flexShrink: 0,
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
    backgroundColor: colors.streakSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#FFD2BF',
  },
  badgesText: { fontSize: fontSize.sm, fontWeight: '900', color: colors.streak },

  hero: {
    overflow: 'hidden',
    alignItems: 'stretch',
    borderRadius: 34,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    gap: spacing.sm,
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  heroTopRow: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroStatusPill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  heroStatusText: {
    fontSize: fontSize.xs,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  heroFreezePill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  heroFreezeText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  heroMain: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 116,
  },
  flameOrb: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.34)',
  },
  flameAura: {
    position: 'absolute',
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: colors.streak,
  },
  flame: { fontSize: 54 },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  streakNum: {
    fontSize: 70,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 74,
    letterSpacing: -3,
  },
  streakLabel: {
    fontSize: fontSize.lg,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.92)',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: fontSize.sm,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  dailyGoalCard: {
    zIndex: 1,
    borderRadius: radius.lg,
    padding: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    gap: spacing.sm,
  },
  dailyGoalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  dailyGoalTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  dailyGoalValue: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  dailyGoalTrack: {
    height: 12,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.32)',
    overflow: 'hidden',
  },
  dailyGoalFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  heroActions: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryCta: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  primaryCtaDone: { backgroundColor: '#FFFFFF' },
  primaryCtaText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  shareChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
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
    padding: spacing.sm,
    borderWidth: 2,
    gap: spacing.sm,
    alignItems: 'center',
    minHeight: 94,
    justifyContent: 'center',
  },
  miniStatus_safe: { backgroundColor: '#E9F8F0', borderColor: colors.brand },
  miniStatus_danger: { backgroundColor: '#FFF1EA', borderColor: colors.streak },
  miniStatus_ice: { backgroundColor: '#EAF8FF', borderColor: colors.ice },
  miniStatus_reward: { backgroundColor: '#FFF6D8', borderColor: colors.yellow },
  miniStatus_neutral: { backgroundColor: colors.card, borderColor: colors.border },
  miniIcon: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
  },
  miniTextWrap: {
    alignItems: 'center',
    gap: 2,
  },
  miniLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    textAlign: 'center',
  },
  miniValue: { fontSize: fontSize.sm, fontWeight: '900', color: colors.text, textAlign: 'center' },

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

  weekCard: {
    backgroundColor: '#F7FFE9',
    borderColor: '#CDEFA6',
  },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  dayCol: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  dayRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  dayRingDone: { backgroundColor: colors.streak, borderColor: colors.streak },
  dayRingPatched: { backgroundColor: colors.ice, borderColor: colors.ice },
  dayRingToday: { borderColor: colors.streak, backgroundColor: colors.streakSoft },
  dayRingSelected: {
    transform: [{ scale: 1.08 }],
    borderColor: colors.text,
  },
  dayRingText: { fontSize: fontSize.md, fontWeight: '900', color: colors.subtext },
  dayRingTextDone: { color: '#FFFFFF' },
  dayLabel: { fontSize: 10, color: colors.subtext, fontWeight: '800' },
  dayNumber: { fontSize: 10, color: colors.subtext, fontWeight: '900', marginTop: -3 },
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
  chestProgressCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9EFC2',
    gap: spacing.sm,
  },
  chestProgressCopy: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  chestProgressTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  chestProgressText: {
    flex: 1,
    color: colors.subtext,
    fontSize: fontSize.xs,
    fontWeight: '800',
    textAlign: 'right',
  },
  chestProgressTrack: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  chestProgressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.brand,
  },
  dayDetail: {
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    gap: 3,
  },
  dayDetailTitle: { fontSize: fontSize.sm, fontWeight: '900', color: colors.text },
  dayDetailText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.subtext,
    lineHeight: 19,
  },

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
  heatCellPatched: { backgroundColor: colors.ice },
  heatCellToday: {
    borderWidth: 2,
    borderColor: colors.streak,
    backgroundColor: colors.streakSoft,
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
