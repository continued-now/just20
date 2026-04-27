import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mascot, getMoodFromContext, getTierInfo } from '../../components/Mascot';
import { StreakBadge } from '../../components/StreakBadge';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { useCountdown } from '../../hooks/useCountdown';
import { useNudges } from '../../hooks/useNudges';
import { useStreak } from '../../hooks/useStreak';
import { getStreakRepairStatus, getCoins } from '../../lib/db';
import { isChestAvailable } from '../../lib/coins';
import { getBuddyStatuses } from '../../lib/social';
import { type BuddyStatus } from '../../lib/social';

export default function HomeScreen() {
  const router = useRouter();
  const streak = useStreak();
  const nudges = useNudges();
  const { remainingMs, refreshWindow } = useCountdown();
  const repairChecked = useRef(false);

  const [chestReady, setChestReady] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [buddies, setBuddies] = useState<BuddyStatus[]>([]);

  useFocusEffect(
    useCallback(() => {
      streak.refresh();
      nudges.refresh();
      refreshWindow();

      // Run all side-checks in parallel
      Promise.all([
        isChestAvailable(),
        getCoins(),
        getBuddyStatuses(),
      ]).then(([chest, coins, buds]) => {
        setChestReady(chest);
        setCoinBalance(coins.balance);
        setBuddies(buds);
      });

      if (!repairChecked.current) {
        repairChecked.current = true;
        getStreakRepairStatus().then(repair => {
          if (repair.eligible) {
            router.push(`/streak-repair?prevStreak=${repair.previousStreak}`);
          }
        });
      }
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
        return `${formatHour(nudges.scheduledHour)} window + ${nudges.remaining} fallback nudge${nudges.remaining !== 1 ? 's' : ''}`;
      }
      return nudges.scheduledWindowActive
        ? `Set-time window at ${formatHour(nudges.scheduledHour)}`
        : 'Daily reminders are off';
    }
    if (nudges.remaining <= 0) return "Day's almost over. Tomorrow. 😑";
    if (nudges.remaining === 1) return "Last chance today 🔥";
    return `${nudges.remaining} nudge${nudges.remaining !== 1 ? 's' : ''} left today`;
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
          <Text style={styles.title}>just20</Text>
          {coinBalance > 0 && (
            <View style={styles.coinPill}>
              <Text style={styles.coinText}>🪙 {coinBalance}</Text>
            </View>
          )}
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
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1,
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
    marginTop: -spacing.sm,
  },
  status: {
    fontSize: fontSize.md,
    color: colors.subtext,
    textAlign: 'center',
    fontWeight: '500',
  },
  socialStrip: {
    fontSize: fontSize.sm,
    color: colors.streak,
    fontWeight: '700',
    textAlign: 'center',
  },
  invitePrompt: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    fontWeight: '600',
    textAlign: 'center',
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
    paddingBottom: spacing.xl,
  },
  cta: {
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
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
