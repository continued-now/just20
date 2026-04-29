import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { getCalendarData, getRecoveryCalendarData, getStreak, type RecoveryType } from '../../lib/db';
import { localDayKey } from '../../lib/dates';

type Stats = {
  current: number;
  best: number;
  totalSessions: number;
  freezeCount: number;
  calendar: Record<string, boolean>;
  recoveryCalendar: Record<string, RecoveryType>;
};

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          const [streak, cal, recoveryCal] = await Promise.all([
            getStreak(),
            getCalendarData(30),
            getRecoveryCalendarData(30),
          ]);
          if (!active) return;
          setStats({
            current: streak.current,
            best: streak.best,
            totalSessions: streak.totalSessions,
            freezeCount: streak.freezeCount,
            calendar: cal,
            recoveryCalendar: recoveryCal,
          });
        } catch {
          if (active) setStats(null);
        }
      }
      load();
      return () => {
        active = false;
      };
    }, [])
  );

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = localDayKey(d);
    return {
      key,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      done: stats?.calendar[key] ?? false,
      patched: (stats?.recoveryCalendar[key] ?? 'none') !== 'none',
    };
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Stats</Text>

        <View style={styles.grid}>
          <StatCard label="Current streak" value={`${stats?.current ?? 0} 🔥`} />
          <StatCard label="Best streak" value={`${stats?.best ?? 0} 🏆`} />
          <StatCard label="Total sessions" value={String(stats?.totalSessions ?? 0)} />
          <StatCard label="Freezes left" value={`${stats?.freezeCount ?? 0} 🧊`} />
        </View>

        <Text style={styles.sectionTitle}>Last 7 days</Text>
        <View style={styles.weekRow}>
          {last7.map((day) => (
            <View key={day.key} style={styles.dayCol}>
              <View style={[styles.dayDot, day.done ? styles.dayDotDone : day.patched ? styles.dayDotPatched : styles.dayDotMiss]} />
              <Text style={styles.dayLabel}>{day.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Last 30 days</Text>
        <View style={styles.calendarGrid}>
          {Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            const key = localDayKey(d);
            const done = stats?.calendar[key] ?? false;
            const patched = (stats?.recoveryCalendar[key] ?? 'none') !== 'none';
            return (
              <View
                key={key}
                style={[styles.calCell, done ? styles.calCellDone : patched ? styles.calCellPatched : styles.calCellMiss]}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl + spacing.xl },
  heading: { fontSize: 28, fontWeight: '900', color: colors.text },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardValue: { fontSize: fontSize.xl, fontWeight: '900', color: colors.text },
  cardLabel: { fontSize: fontSize.sm, color: colors.subtext, fontWeight: '500' },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCol: { alignItems: 'center', gap: spacing.xs },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  dayDotDone: { backgroundColor: colors.success },
  dayDotPatched: { backgroundColor: colors.ice },
  dayDotMiss: { backgroundColor: colors.border },
  dayLabel: { fontSize: 11, color: colors.subtext, fontWeight: '600' },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calCell: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  calCellDone: { backgroundColor: colors.success },
  calCellPatched: { backgroundColor: colors.ice },
  calCellMiss: { backgroundColor: colors.border },
});
