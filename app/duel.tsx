import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { captureInboundAttribution } from '../lib/growth';
import { linkBuddy } from '../lib/social';

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default function DuelInviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    target?: string;
    src?: string;
    source?: string;
    campaign?: string;
    creator?: string;
  }>();
  const [joining, setJoining] = useState(false);

  const code = firstParam(params.code).trim().toUpperCase();
  const source = firstParam(params.src) || firstParam(params.source);
  const campaign = firstParam(params.campaign);
  const creatorCode = firstParam(params.creator);
  const rawTarget = Number.parseInt(firstParam(params.target) || '60', 10);
  const targetSeconds = Number.isFinite(rawTarget) ? Math.min(Math.max(rawTarget, 10), 600) : 60;
  const hasCode = code.length > 0;

  useEffect(() => {
    captureInboundAttribution({
      context: 'duel',
      source,
      campaign,
      creatorCode,
      inviteCode: code,
      targetUrl: 'just20://duel',
      metadata: { targetSeconds },
    }).catch(() => {});
  }, [campaign, code, creatorCode, source, targetSeconds]);

  async function handleAccept() {
    if (!hasCode || joining) return;
    setJoining(true);
    try {
      const result = await linkBuddy(code);

      if (!result.success && result.error !== 'Already linked to that code.') {
        Alert.alert('Could not join duel', result.error ?? 'This duel link could not be joined.');
        return;
      }

      router.replace({
        pathname: '/workout',
        params: { mode: 'duel', duelTarget: String(targetSeconds), duelCode: code },
      } as any);
    } catch {
      Alert.alert('Could not join duel', 'This duel link could not be joined.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.kicker}>Async Duel</Text>
          <Text style={styles.title}>Beat 20 pushups in {targetSeconds}s.</Text>
          <Text style={styles.body}>
            Joining links you with the friend who sent this and starts a clean 20-rep attempt. The proof card does the talking after.
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: {
    flexGrow: 1,
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
