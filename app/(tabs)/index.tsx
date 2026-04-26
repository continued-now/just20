import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mascot, getMoodFromContext } from '../../components/Mascot';
import { StreakBadge } from '../../components/StreakBadge';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { useNudges } from '../../hooks/useNudges';
import { useStreak } from '../../hooks/useStreak';
import { getStreakRepairStatus } from '../../lib/db';

export default function HomeScreen() {
  const router = useRouter();
  const streak = useStreak();
  const nudges = useNudges();
  // Prevent showing repair prompt more than once per session
  const repairChecked = useRef(false);

  useFocusEffect(
    useCallback(() => {
      streak.refresh();
      nudges.refresh();

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

  function statusText() {
    if (streak.completedToday) return "You did it! Rest up. 🎉";
    if (nudges.remaining <= 0) return "Day's almost over. Tomorrow. 😑";
    if (nudges.remaining === 1) return "Last chance today 🔥";
    return `${nudges.remaining} nudge${nudges.remaining !== 1 ? 's' : ''} left today`;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>just20</Text>
        </View>

        <View style={styles.center}>
          {streak.current > 0 && (
            <StreakBadge streak={streak.current} freezes={streak.freezeCount} />
          )}

          <View style={styles.mascotWrap}>
            <Mascot mood={mood} size={150} />
          </View>

          <Text style={styles.status}>{statusText()}</Text>
        </View>

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
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1,
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
  status: {
    fontSize: fontSize.md,
    color: colors.subtext,
    textAlign: 'center',
    fontWeight: '500',
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
