import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { repairStreak } from '../lib/db';
import { scheduleSharedJust20StatusUpdate } from '../lib/widgetStatus';

export default function StreakRepairScreen() {
  const { prevStreak } = useLocalSearchParams<{ prevStreak: string }>();
  const router = useRouter();
  const days = parseInt(prevStreak ?? '0', 10);

  async function handleRepair() {
    await repairStreak();
    scheduleSharedJust20StatusUpdate();
    router.replace('/');
  }

  function handleDecline() {
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.skull}>💀</Text>
          <Text style={styles.title}>YOUR STREAK{'\n'}BROKE.</Text>
          <Text style={styles.sub}>
            {days} days of pushups.{'\n'}Gone. But not forgotten.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>ONE-TIME REPAIR AVAILABLE</Text>
            <Text style={styles.cardNum}>{days}</Text>
            <Text style={styles.cardDays}>days saved</Text>
            <View style={styles.cardDivider} />
            <Text style={styles.cardNote}>
              Repair sets yesterday as your last day.{'\n'}
              Do your 20 today to cement it.{'\n'}
              Available once every 30 days.
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.repairBtn} onPress={handleRepair} activeOpacity={0.85}>
            <Text style={styles.repairBtnText}>REPAIR STREAK →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDecline} activeOpacity={0.6}>
            <Text style={styles.declineText}>accept defeat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, paddingHorizontal: spacing.lg },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  skull: { fontSize: 64 },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: -1,
  },
  sub: {
    fontSize: fontSize.md,
    color: colors.subtext,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  cardLabel: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.subtext,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cardNum: {
    fontSize: 72,
    fontWeight: '900',
    color: colors.streak,
    lineHeight: 76,
    letterSpacing: -3,
  },
  cardDays: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.subtext,
  },
  cardDivider: {
    height: 1,
    width: '50%',
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  cardNote: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  repairBtn: {
    backgroundColor: colors.streak,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  repairBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '900',
    letterSpacing: 1,
  },
  declineText: {
    color: colors.subtext,
    fontSize: fontSize.sm,
    fontWeight: '500',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
});
