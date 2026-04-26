import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { getCalendarData, getStreak } from '../../lib/db';
import { getNextMilestone, MILESTONE_DAYS } from '../../lib/milestones';

type StreakData = {
  current: number;
  best: number;
  totalSessions: number;
  freezeCount: number;
  calendar: Record<string, boolean>;
};

export default function StreakScreen() {
  const [data, setData] = useState<StreakData | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [streak, cal] = await Promise.all([getStreak(), getCalendarData(30)]);
        setData({
          current: streak.current,
          best: streak.best,
          totalSessions: streak.totalSessions,
          freezeCount: streak.freezeCount,
          calendar: cal,
        });
      }
      load();
    }, [])
  );

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    return {
      key,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      done: data?.calendar[key] ?? false,
      isToday: i === 6,
    };
  });

  const current = data?.current ?? 0;
  const nextMilestone = getNextMilestone(current);
  const milestoneProgress = nextMilestone
    ? (current / nextMilestone.days) * 100
    : 100;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Streak</Text>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.flame}>🔥</Text>
          <Text style={styles.streakNum}>{current}</Text>
          <Text style={styles.streakLabel}>
            {current === 1 ? 'day streak' : 'day streak'}
          </Text>
          {current === 0 && (
            <Text style={styles.zeroHint}>Complete today's 20 to start your streak</Text>
          )}
        </View>

        {/* Milestone progress */}
        {nextMilestone && current > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Next Milestone</Text>
            <View style={styles.milestoneRow}>
              <Text style={styles.milestoneCurrent}>{current}</Text>
              <View style={styles.milestoneBarWrap}>
                <View style={styles.milestoneBarTrack}>
                  <View style={[styles.milestoneBarFill, { width: `${milestoneProgress}%` }]} />
                </View>
                <View style={styles.milestoneLabels}>
                  <Text style={styles.milestoneDaysLeft}>
                    {nextMilestone.daysLeft} day{nextMilestone.daysLeft !== 1 ? 's' : ''} to go
                  </Text>
                  <Text style={styles.milestoneTarget}>{nextMilestone.days} 🏅</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {current > 0 && !nextMilestone && (
          <View style={[styles.card, styles.legendCard]}>
            <Text style={styles.legendEmoji}>👑</Text>
            <Text style={styles.legendText}>You've hit every milestone. Actual legend.</Text>
          </View>
        )}

        {/* Last 7 days */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last 7 days</Text>
          <View style={styles.weekRow}>
            {last7.map((day) => (
              <View key={day.key} style={styles.dayCol}>
                <View
                  style={[
                    styles.dayDot,
                    day.done ? styles.dayDotDone : day.isToday ? styles.dayDotToday : styles.dayDotMiss,
                  ]}
                >
                  {day.done && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>{day.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Stat cards */}
        <View style={styles.grid}>
          <StatCard emoji="🏆" label="Best streak" value={`${data?.best ?? 0} days`} />
          <StatCard emoji="💪" label="Total sessions" value={String(data?.totalSessions ?? 0)} />
          <StatCard emoji="🧊" label="Freezes left" value={String(data?.freezeCount ?? 0)} />
          <StatCard
            emoji="📅"
            label="This month"
            value={`${Object.values(data?.calendar ?? {}).filter(Boolean).length} days`}
          />
        </View>

        {/* 30-day heatmap */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last 30 days</Text>
          <View style={styles.heatmap}>
            {Array.from({ length: 30 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (29 - i));
              const key = d.toISOString().split('T')[0];
              return (
                <View
                  key={key}
                  style={[styles.heatCell, data?.calendar[key] ? styles.heatCellDone : styles.heatCellMiss]}
                />
              );
            })}
          </View>
        </View>

        {data?.freezeCount === 0 && current > 0 && (
          <View style={styles.freezeWarn}>
            <Text style={styles.freezeWarnText}>No freezes left — don't miss a day!</Text>
          </View>
        )}

        {/* Milestone roadmap */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Milestone Roadmap</Text>
          <View style={styles.roadmap}>
            {MILESTONE_DAYS.map(day => (
              <View key={day} style={styles.roadmapRow}>
                <View style={[styles.roadmapDot, current >= day ? styles.roadmapDotDone : styles.roadmapDotPending]} />
                <Text style={[styles.roadmapDay, current >= day && styles.roadmapDayDone]}>
                  {day} days
                </Text>
                {current >= day && <Text style={styles.roadmapCheck}>✓</Text>}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  heading: { fontSize: 28, fontWeight: '900', color: colors.text },

  hero: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  flame: { fontSize: 56 },
  streakNum: { fontSize: 72, fontWeight: '900', color: colors.streak, lineHeight: 80 },
  streakLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.subtext },
  zeroHint: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

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

  // Milestone progress
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  milestoneCurrent: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.streak,
    minWidth: 40,
  },
  milestoneBarWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  milestoneBarTrack: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  milestoneBarFill: {
    height: '100%',
    backgroundColor: colors.streak,
    borderRadius: radius.full,
  },
  milestoneLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestoneDaysLeft: {
    fontSize: fontSize.xs,
    color: colors.subtext,
    fontWeight: '600',
  },
  milestoneTarget: {
    fontSize: fontSize.xs,
    color: colors.subtext,
    fontWeight: '700',
  },

  legendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  legendEmoji: { fontSize: 28 },
  legendText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: spacing.xs },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotDone: { backgroundColor: colors.success },
  dayDotMiss: { backgroundColor: colors.border },
  dayDotToday: { backgroundColor: colors.border, borderWidth: 2, borderColor: colors.streak },
  checkmark: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  dayLabel: { fontSize: 11, color: colors.subtext, fontWeight: '600' },
  dayLabelToday: { color: colors.streak, fontWeight: '800' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
  },
  statEmoji: { fontSize: 24 },
  statValue: { fontSize: fontSize.lg, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: fontSize.xs, color: colors.subtext, fontWeight: '500' },

  heatmap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  heatCell: { width: 26, height: 26, borderRadius: 5 },
  heatCellDone: { backgroundColor: colors.success },
  heatCellMiss: { backgroundColor: colors.border },

  freezeWarn: {
    backgroundColor: '#FFF8E1',
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  freezeWarnText: { fontSize: fontSize.sm, fontWeight: '600', color: '#F57F17' },

  // Milestone roadmap
  roadmap: { gap: spacing.sm },
  roadmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roadmapDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roadmapDotDone: { backgroundColor: colors.streak },
  roadmapDotPending: { backgroundColor: colors.border },
  roadmapDay: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.subtext,
  },
  roadmapDayDone: { color: colors.text },
  roadmapCheck: {
    fontSize: 13,
    color: colors.streak,
    fontWeight: '800',
  },
});
