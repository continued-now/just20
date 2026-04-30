import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '../../components/BrandLogo';
import { Mascot, getMoodFromContext, getTierInfo } from '../../components/Mascot';
import { XpProgressCard } from '../../components/XpProgressCard';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { useCountdown } from '../../hooks/useCountdown';
import { useNudges } from '../../hooks/useNudges';
import { useStreak } from '../../hooks/useStreak';
import {
  getCoins,
  getCompletedDaysThisWeek,
  getCompletedRepsToday,
  getRecoveryOffer,
  type RecoveryOffer,
  type RecoveryType,
} from '../../lib/db';
import { isChestAvailable } from '../../lib/coins';
import { getBuddyStatuses } from '../../lib/social';
import { type BuddyStatus } from '../../lib/social';
import { getXp } from '../../lib/xp';

const DAILY_TARGET_REPS = 20;
const WEEKLY_CHEST_TARGET = 5;

export default function HomeScreen() {
  const router = useRouter();
  const streak = useStreak();
  const nudges = useNudges();
  const { remainingMs, refreshWindow } = useCountdown();

  const [chestReady, setChestReady] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [completedDaysThisWeek, setCompletedDaysThisWeek] = useState(0);
  const [completedRepsToday, setCompletedRepsToday] = useState(0);
  const [buddies, setBuddies] = useState<BuddyStatus[]>([]);
  const [recoveryOffer, setRecoveryOffer] = useState<RecoveryOffer | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      streak.refresh();
      nudges.refresh();
      refreshWindow();

      // Run all side-checks in parallel
      Promise.all([
        isChestAvailable(),
        getCoins(),
        getBuddyStatuses(),
        getXp(),
        getRecoveryOffer(),
        getCompletedDaysThisWeek(),
        getCompletedRepsToday(),
      ])
        .then(([chest, coins, buds, xp, recovery, daysThisWeek, repsToday]) => {
          if (!active) return;
          setChestReady(chest);
          setCoinBalance(coins.balance);
          setBuddies(buds);
          setTotalXp(xp.totalEarned);
          setRecoveryOffer(recovery);
          setCompletedDaysThisWeek(daysThisWeek);
          setCompletedRepsToday(repsToday);
        })
        .catch(() => {
          if (!active) return;
          setChestReady(false);
          setCoinBalance(0);
          setTotalXp(0);
          setRecoveryOffer(null);
          setCompletedDaysThisWeek(0);
          setCompletedRepsToday(0);
        });

      return () => {
        active = false;
      };
    }, [streak.refresh, nudges.refresh, router])
  );

  const mood = getMoodFromContext(nudges.remaining, streak.completedToday);
  const tierInfo = getTierInfo(streak.current);

  function formatCountdown(ms: number) {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  function formatHour(h: number) {
    if (h === 12) return '12pm';
    if (h < 12) return `${h}am`;
    return `${h - 12}pm`;
  }

  const showCountdown = remainingMs > 0 && !streak.completedToday;
  const dailyReps = streak.completedToday
    ? Math.max(DAILY_TARGET_REPS, completedRepsToday)
    : completedRepsToday;
  const dailyProgress = streak.completedToday
    ? 100
    : Math.min(100, (dailyReps / DAILY_TARGET_REPS) * 100);
  const chestDays = Math.min(completedDaysThisWeek, WEEKLY_CHEST_TARGET);
  const chestProgress = Math.min(100, (chestDays / WEEKLY_CHEST_TARGET) * 100);
  const questTitle = streak.completedToday
    ? 'Daily quest complete'
    : showCountdown
      ? 'Your window is open'
      : "Today's 20";
  const questCta = streak.completedToday
    ? chestReady
      ? 'Open chest →'
      : 'View streak →'
    : showCountdown
      ? 'Do it now →'
      : "Start today's 20 →";

  function statusText() {
    if (streak.completedToday) return 'You did it! Rest up. 🎉';
    if (nudges.loading) return "Checking today's reminder plan...";
    if (showCountdown) return 'Your 10-minute window is open 🔥';
    if (nudges.mode === 'strict') {
      return nudges.scheduledWindowActive
        ? `No-excuses window at ${formatHour(nudges.scheduledHour)}`
        : 'Daily reminders are off';
    }
    if (nudges.mode === 'scheduled_fallback') {
      if (nudges.remaining > 0) {
        return `${formatHour(nudges.scheduledHour)} window + ${nudges.remaining} backup nudge${nudges.remaining !== 1 ? 's' : ''}`;
      }
      return nudges.scheduledWindowActive
        ? `Set-time window at ${formatHour(nudges.scheduledHour)}`
        : 'Daily reminders are off';
    }
    if (nudges.remaining <= 0) return "Day's almost over. Tomorrow. 😑";
    if (nudges.remaining === 1) return 'Last chance today 🔥';
    return `${nudges.remaining} nudge${nudges.remaining !== 1 ? 's' : ''} left today`;
  }

  function startRecovery(type: RecoveryType) {
    if (!recoveryOffer?.missedDate) return;
    router.push({
      pathname: '/workout',
      params: {
        recoveryType: type,
        repairedDate: recoveryOffer.missedDate,
      },
    } as any);
  }

  // Buddy summary for the social proof strip
  const buddyDoneCount = buddies.filter((b) => b.completedToday).length;
  const buddySocialText =
    buddies.length === 0
      ? null
      : buddyDoneCount === 0
        ? `${buddies.length} buddy${buddies.length > 1 ? 's' : ''} still going today`
        : buddyDoneCount === buddies.length
          ? `All ${buddies.length} buddy${buddies.length > 1 ? 's' : ''} done today 🔥`
          : `${buddyDoneCount}/${buddies.length} budd${buddies.length > 1 ? 'ies' : 'y'} done today`;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BrandLogo size="sm" />
          <TouchableOpacity
            style={styles.coinPill}
            onPress={() => router.push('/xp-shop' as any)}
            activeOpacity={0.78}
          >
            <Text style={styles.coinText}>🪙 {coinBalance}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.questCard, streak.completedToday && styles.questCardDone]}>
          <View style={styles.questTopRow}>
            <View style={styles.questTitleWrap}>
              <Text style={styles.questEyebrow}>Daily Quest</Text>
              <Text style={styles.questTitle}>{questTitle}</Text>
            </View>
            <View style={styles.streakMini}>
              <Text style={styles.streakMiniValue}>{streak.current}</Text>
              <Text style={styles.streakMiniLabel}>streak</Text>
            </View>
          </View>

          <View style={styles.questMain}>
            <View style={styles.mascotWrap}>
              <Mascot mood={mood} streak={streak.current} size={116} />
            </View>
            <View style={styles.questCopy}>
              <Text style={styles.questStatus}>{statusText()}</Text>
              <Text style={styles.tierTeaser}>
                {tierInfo.form} {tierInfo.label}
                {tierInfo.daysToNext !== null ? ` · ${tierInfo.daysToNext}d to next` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.questProgressCard}>
            <View style={styles.questProgressTop}>
              <Text style={styles.questProgressLabel}>
                {streak.completedToday ? 'Locked today' : 'Pushups today'}
              </Text>
              <Text style={styles.questProgressValue}>
                {streak.completedToday ? '100%' : `${dailyReps}/${DAILY_TARGET_REPS}`}
              </Text>
            </View>
            <View style={styles.questTrack}>
              <View style={[styles.questFill, { width: `${dailyProgress}%` }]} />
            </View>
          </View>

          <View style={styles.rewardStrip}>
            <RewardChip
              label="Chest"
              value={`${chestDays}/${WEEKLY_CHEST_TARGET}`}
              progress={chestProgress}
            />
            <RewardChip label="Freezes" value={`${streak.freezeCount}/3`} />
            <RewardChip label="XP" value={`${totalXp}`} />
          </View>

          <TouchableOpacity
            style={styles.questCta}
            onPress={() => {
              if (streak.completedToday) {
                router.push(chestReady ? '/chest-open' : '/(tabs)/streak');
              } else {
                router.push('/workout');
              }
            }}
            activeOpacity={0.86}
          >
            <Text style={styles.questCtaText}>{questCta}</Text>
          </TouchableOpacity>
        </View>

        {recoveryOffer?.available && !streak.completedToday && (
          <View style={styles.recoveryCard}>
            <Text style={styles.recoveryEyebrow}>
              {recoveryOffer.reason === 'debt_due' ? 'DEBT SET DUE' : 'STREAK PATCH AVAILABLE'}
            </Text>
            <Text style={styles.recoveryTitle}>
              {recoveryOffer.reason === 'debt_due'
                ? 'Clear the last 10.'
                : 'Yesterday is patchable.'}
            </Text>
            <Text style={styles.recoveryCopy}>
              {recoveryOffer.reason === 'debt_due'
                ? 'Do 30 today to clear the debt and keep the active streak alive.'
                : recoveryOffer.patchWindowOpen
                  ? 'Patch window is open. Do 40 now for max recovery XP.'
                  : `Do 40 today, or split it into 10 extra over two days. Patch window: ${formatRecoveryTime(recoveryOffer.patchWindowStart)}.`}
            </Text>
            <View style={styles.recoveryActions}>
              {recoveryOffer.reason === 'debt_due' ? (
                <TouchableOpacity
                  style={styles.recoveryPrimary}
                  onPress={() => startRecovery('debt_set')}
                  activeOpacity={0.84}
                >
                  <Text style={styles.recoveryPrimaryText}>Do 30 now →</Text>
                </TouchableOpacity>
              ) : (
                <>
                  {recoveryOffer.canPatch && (
                    <TouchableOpacity
                      style={styles.recoveryPrimary}
                      onPress={() => startRecovery('streak_patch')}
                      activeOpacity={0.84}
                    >
                      <Text style={styles.recoveryPrimaryText}>Patch with 40 →</Text>
                    </TouchableOpacity>
                  )}
                  {recoveryOffer.canDebtSet && (
                    <TouchableOpacity
                      style={styles.recoverySecondary}
                      onPress={() => startRecovery('debt_set')}
                      activeOpacity={0.78}
                    >
                      <Text style={styles.recoverySecondaryText}>Debt Set: 30 today</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        <XpProgressCard totalXp={totalXp} compact onPress={() => router.push('/xp-shop' as any)} />

        {showCountdown && (
          <TouchableOpacity
            style={styles.countdownBanner}
            onPress={() => router.push('/workout')}
            activeOpacity={0.85}
          >
            <Text style={styles.countdownLabel}>WINDOW OPEN</Text>
            <Text style={styles.countdownTimer}>{formatCountdown(remainingMs)}</Text>
            <Text style={styles.countdownSub}>{"left to claim today's lock"}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.socialCard}>
          <Text style={styles.socialTitle}>Squad pressure</Text>
          {buddySocialText ? (
            <TouchableOpacity onPress={() => router.push('/(tabs)/squad')} activeOpacity={0.7}>
              <Text style={styles.socialStrip}>{buddySocialText}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.push('/(tabs)/squad')} activeOpacity={0.7}>
              <Text style={styles.invitePrompt}>Start a 7-day friend streak →</Text>
            </TouchableOpacity>
          )}
        </View>

        {chestReady && (
          <TouchableOpacity
            style={styles.chestCta}
            onPress={() => router.push('/chest-open')}
            activeOpacity={0.85}
          >
            <Text style={styles.chestCtaText}>Weekly chest available — open it →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RewardChip({
  label,
  value,
  progress,
}: {
  label: string;
  value: string;
  progress?: number;
}) {
  return (
    <View style={styles.rewardChip}>
      <Text style={styles.rewardChipValue}>{value}</Text>
      <Text style={styles.rewardChipLabel}>{label}</Text>
      {progress !== undefined ? (
        <View style={styles.rewardChipTrack}>
          <View style={[styles.rewardChipFill, { width: `${progress}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

function formatRecoveryTime(value: number | null): string {
  if (!value) return 'later today';
  const date = new Date(value);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')}${suffix}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + spacing.xl,
    gap: spacing.md,
  },
  container: { flex: 1, paddingHorizontal: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  coinPill: {
    position: 'absolute',
    right: 0,
    backgroundColor: '#FFF8DC',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  coinText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: '#B8860B',
  },
  questCard: {
    borderRadius: 32,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.brandDark,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: colors.brandDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 5,
  },
  questCardDone: {
    backgroundColor: '#74DE22',
  },
  questTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  questTitleWrap: { flex: 1, minWidth: 0 },
  questEyebrow: {
    color: '#E9FFD8',
    fontSize: fontSize.xs,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  questTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 2,
  },
  streakMini: {
    minWidth: 76,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  streakMiniValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 30,
  },
  streakMiniLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  questMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  mascotWrap: {
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  questCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  questStatus: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '900',
    lineHeight: 22,
  },
  tierTeaser: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 0.3,
  },
  status: {
    fontSize: fontSize.md,
    color: colors.subtext,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
    maxWidth: 320,
  },
  questProgressCard: {
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  questProgressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  questProgressLabel: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  questProgressValue: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  questTrack: {
    height: 12,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.32)',
    overflow: 'hidden',
  },
  questFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.yellow,
  },
  rewardStrip: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rewardChip: {
    flex: 1,
    minHeight: 78,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    padding: spacing.sm,
    justifyContent: 'center',
    gap: 2,
  },
  rewardChipValue: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  rewardChipLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rewardChipTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  rewardChipFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.yellow,
  },
  questCta: {
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  questCtaText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  socialStrip: {
    fontSize: fontSize.sm,
    color: colors.streak,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
  },
  socialCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  socialTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  invitePrompt: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    fontWeight: '800',
    lineHeight: 19,
    maxWidth: 320,
  },
  recoveryCard: {
    width: '100%',
    backgroundColor: '#FFF8DC',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FFE082',
    padding: spacing.md,
    gap: spacing.sm,
  },
  recoveryEyebrow: {
    color: '#9A6A00',
    fontSize: fontSize.xs,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  recoveryTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  recoveryCopy: {
    color: '#7B5B00',
    fontSize: fontSize.sm,
    fontWeight: '700',
    lineHeight: 19,
  },
  recoveryActions: {
    gap: spacing.sm,
  },
  recoveryPrimary: {
    borderRadius: radius.full,
    backgroundColor: colors.streak,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  recoveryPrimaryText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  recoverySecondary: {
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFE082',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  recoverySecondaryText: {
    color: '#8A6400',
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  countdownBanner: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: 2,
  },
  countdownLabel: {
    fontSize: fontSize.xs,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    opacity: 0.85,
  },
  countdownTimer: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
    lineHeight: 52,
  },
  countdownSub: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.75,
  },
  chestCta: {
    backgroundColor: '#FFF8DC',
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  chestCtaText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: '#B8860B',
  },
  bottom: {
    paddingBottom: spacing.xxl + spacing.md,
  },
  cta: {
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '900',
    letterSpacing: 1,
  },
  doneCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  doneEmoji: { fontSize: 24 },
  doneText: { fontSize: fontSize.md, fontWeight: '700', color: colors.success },
});
