import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { linkBuddy } from '../lib/social';

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default function DuelInviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; target?: string }>();
  const [joining, setJoining] = useState(false);

  const code = firstParam(params.code).trim().toUpperCase();
  const rawTarget = Number.parseInt(firstParam(params.target) || '60', 10);
  const targetSeconds = Number.isFinite(rawTarget) ? Math.min(Math.max(rawTarget, 10), 600) : 60;
  const hasCode = code.length > 0;

  async function handleAccept() {
    if (!hasCode || joining) return;
    setJoining(true);
    const result = await linkBuddy(code);
    setJoining(false);

    if (!result.success && result.error !== 'Already linked to that code.') {
      Alert.alert('Could not join duel', result.error ?? 'This duel link could not be joined.');
      return;
    }

    router.replace({
      pathname: '/workout',
      params: { mode: 'duel', duelTarget: String(targetSeconds), duelCode: code },
    } as any);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <View style={styles.card}>
          <Text style={styles.kicker}>Async Duel</Text>
          <Text style={styles.title}>Beat 20 pushups in {targetSeconds}s.</Text>
          <Text style={styles.body}>
            Accepting links you with the sender and starts a clean 20-rep attempt. The proof card does the talking after.
          </Text>

          <View style={styles.duelBox}>
            <Text style={styles.duelLabel}>Target time</Text>
            <Text style={styles.duelTime}>{targetSeconds}s</Text>
            <Text style={styles.duelCode}>{hasCode ? code : 'Missing invite code'}</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (!hasCode || joining) && styles.btnDisabled]}
            onPress={handleAccept}
            activeOpacity={0.85}
            disabled={!hasCode || joining}
          >
            <Text style={styles.primaryText}>{joining ? 'Joining...' : 'Accept duel →'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(tabs)/squad' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryText}>Not today</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
  },
  kicker: {
    fontSize: fontSize.xs,
    fontWeight: '900',
    color: colors.streak,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.text,
    lineHeight: 36,
    letterSpacing: -1.2,
  },
  body: {
    fontSize: fontSize.md,
    color: colors.subtext,
    lineHeight: 23,
    fontWeight: '600',
  },
  duelBox: {
    backgroundColor: '#171717',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  duelLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  duelTime: {
    fontSize: 58,
    color: colors.streak,
    fontWeight: '900',
    lineHeight: 62,
    letterSpacing: -3,
  },
  duelCode: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.62)',
    fontWeight: '800',
  },
  primaryBtn: {
    backgroundColor: colors.streak,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  primaryText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  secondaryText: {
    color: colors.subtext,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
