import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '../components/BrandLogo';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { DEFAULT_SCHEDULED_HOUR } from '../lib/notifications';

function formatHour(hour: number): string {
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

function parseHour(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 23 ? parsed : DEFAULT_SCHEDULED_HOUR;
}

export default function LaunchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    scheduledHour?: string;
    notificationsEnabled?: string;
  }>();
  const scheduledHour = parseHour(params.scheduledHour);
  const notificationsEnabled = params.notificationsEnabled === '1';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.wrap}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.top}>
          <BrandLogo size="md" />
          <Text style={styles.kicker}>Setup complete</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.number}>20</Text>
          <Text style={styles.title}>Start your first 20.</Text>
          <Text style={styles.copy}>
            One target today. Your streak starts after rep 20.
          </Text>
        </View>

        <View style={styles.plan}>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Today</Text>
            <Text style={styles.planValue}>20 pushups</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Reminder</Text>
            <Text style={styles.planValue}>
              {notificationsEnabled ? `${formatHour(scheduledHour)} daily` : 'Off for now'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primary}
            onPress={() => router.replace('/workout')}
            activeOpacity={0.86}
          >
            <Text style={styles.primaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
              START THE FIRST 20 →
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondary}
            onPress={() => router.replace('/')}
            activeOpacity={0.74}
          >
            <Text style={styles.secondaryText}>See home first</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  top: {
    alignItems: 'center',
    gap: spacing.md,
  },
  kicker: {
    color: colors.brandDark,
    fontSize: fontSize.xs,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
  },
  number: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: colors.brand,
    color: '#FFFFFF',
    fontSize: 76,
    lineHeight: 140,
    fontWeight: '900',
    textAlign: 'center',
    borderWidth: 6,
    borderColor: colors.brandDark,
    overflow: 'hidden',
  },
  title: {
    color: colors.text,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0,
  },
  copy: {
    color: colors.subtext,
    fontSize: fontSize.md,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 320,
  },
  plan: {
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  planLabel: {
    color: colors.subtext,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  planValue: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  actions: {
    gap: spacing.sm,
  },
  primary: {
    minHeight: 58,
    borderRadius: radius.full,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryText: {
    color: colors.bg,
    fontSize: fontSize.md,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0,
  },
  secondary: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.subtext,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
});
