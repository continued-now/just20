import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '../../components/BrandLogo';
import { Mascot, getMoodFromContext, getTierInfo } from '../../components/Mascot';
import { StreakBadge } from '../../components/StreakBadge';
import { XpProgressCard } from '../../components/XpProgressCard';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { useCountdown } from '../../hooks/useCountdown';
import { useNudges } from '../../hooks/useNudges';
import { useStreak } from '../../hooks/useStreak';
import { getCoins, getRecoveryOffer, type RecoveryOffer, type RecoveryType } from '../../lib/db';
import { isChestAvailable } from '../../lib/coins';
import { getBuddyStatuses } from '../../lib/social';
import { type BuddyStatus } from '../../lib/social';
import { getXp } from '../../lib/xp';

export default function HomeScreen() {
  const router = useRouter();
  const streak = useStreak();
  const nudges = useNudges();
  const { remainingMs, refreshWindow } = useCountdown();

  const [chestReady, setChestReady] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
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
      ]).then(([chest, coins, buds, xp, recovery]) => {
        if (!active) return;
        setChestReady(chest);
        setCoinBalance(coins.balance);
        setBuddies(buds);
        setTotalXp(xp.totalEarned);
        setRecoveryOffer(recovery);
      }).catch(() => {
        if (!active) return;
        setChestReady(false);
        setCoinBalance(0);
        setTotalXp(0);
        setRecoveryOffer(null);
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

  function statusText() {
    if (streak.completedToday) return "You did it! Rest up. 🎉";
    if (nudges.loading) return "Checking today's reminder plan...";
    if (showCountdown) return "Your 10-minute window is open 🔥";
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
    if (nudges.remaining === 1) return "Last chance today 🔥";
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
  const buddyDoneCount = buddies.filter(b => b.completedToday).length;
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
      <View style={styles.container}>
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

        <View style={styles.center}>
          {streak.current > 0 && (
            <StreakBadge streak={streak.current} freezes={streak.freezeCount} />
          )}

          <View style={styles.mascotWrap}>
            <Mascot mood={mood} streak={streak.current} size={150} />
          </View>

          {streak.current > 0 && (
            <Text style={styles.tierTeaser}>
              {tierInfo.form} {tierInfo.label}
              {tierInfo.daysToNext !== null ? `  ·  ${tierInfo.daysToNext}d to next` : ''}
            </Text>
          )}

          <Text style={styles.status}>{statusText()}</Text>

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

          <XpProgressCard
            totalXp={totalXp}
            compact
            onPress={() => router.push('/xp-shop' as any)}
          />

          {showCountdown && (
            <TouchableOpacity
              style={styles.countdownBanner}
              onPress={() => router.push('/workout')}
              activeOpacity={0.85}
            >
              <Text style={styles.countdownLabel}>DO IT NOW</Text>
              <Text style={styles.countdownTimer}>{formatCountdown(remainingMs)}</Text>
              <Text style={styles.countdownSub}>left in your window</Text>
            </TouchableOpacity>
          )}

          {/* Social proof strip */}
          {buddySocialText && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/squad')} activeOpacity={0.7}>
              <Text style={styles.socialStrip}>{buddySocialText}</Text>
            </TouchableOpacity>
          )}
          {buddies.length === 0 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/squad')} activeOpacity={0.7}>
              <Text style={styles.invitePrompt}>👥 Start a 7-day friend streak →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Weekly chest CTA (only on Sundays when eligible) */}
        {chestReady && (
          <TouchableOpacity
            style={styles.chestCta}
            onPress={() => router.push('/chest-open')}
            activeOpacity={0.85}
          >
            <Text style={styles.chestCtaText}>📦 Weekly chest available — open it →</Text>
          </TouchableOpacity>
        )}

        {!streak.completedToday && (
          <View style={styles.bottom}>
            <TouchableOpacity
              style={styles.cta}
              onPress={() => router.push('/workout')}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>DO IT NOW →</Text>
            </TouchableOpacity>
          </View>
        )}

        {streak.completedToday && (
          <View style={styles.bottom}>
            <View style={styles.doneCard}>
              <Text style={styles.doneEmoji}>✅</Text>
              <Text style={styles.doneText}>Pushups done today</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
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
  container: { flex: 1, paddingHorizontal: spacing.lg },
  header: {
    paddingTop: spacing.md,
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  mascotWrap: {
    marginVertical: spacing.md,
  },
  tierTeaser: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.subtext,
    textAlign: 'center',
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
  socialStrip: {
    fontSize: fontSize.sm,
    color: colors.streak,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
  },
  invitePrompt: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
  },
  recoveryCard: {
    width: '100%',
    maxWidth: 340,
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
