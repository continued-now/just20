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

export default function ChallengeInviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    days?: string;
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
  const rawDays = Number.parseInt(firstParam(params.days) || '7', 10);
  const challengeDays = Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, 1), 30) : 7;
  const hasCode = code.length > 0;

  useEffect(() => {
    captureInboundAttribution({
      context: 'challenge',
      source,
      campaign,
      creatorCode,
      inviteCode: code,
      targetUrl: 'just20://challenge',
      metadata: { days: challengeDays },
    }).catch(() => {});
  }, [campaign, challengeDays, code, creatorCode, source]);

  async function handleJoin() {
    if (!hasCode || joining) return;
    setJoining(true);
    try {
      const result = await linkBuddy(code);

      if (result.success) {
        Alert.alert(
          'Challenge joined',
          `You and ${result.username ?? 'your buddy'} are now linked for the ${challengeDays}-day pushup challenge.`,
          [{ text: 'Go to Squad', onPress: () => router.replace('/(tabs)/squad' as any) }]
        );
        return;
      }

      Alert.alert('Could not join', result.error ?? 'This challenge link could not be joined.');
    } catch {
      Alert.alert('Could not join', 'This challenge link could not be joined.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.kicker}>Just 20 Challenge</Text>
          <Text style={styles.title}>{challengeDays} days. 20 pushups. No hiding.</Text>
          <Text style={styles.body}>
            Joining links you with the friend who sent this, so your Squad tab can keep the pressure visible.
          </Text>

          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Buddy code</Text>
            <Text style={styles.codeText}>{hasCode ? code : 'Missing code'}</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (!hasCode || joining) && styles.btnDisabled]}
            onPress={handleJoin}
            activeOpacity={0.85}
            disabled={!hasCode || joining}
          >
            <Text style={styles.primaryText}>{joining ? 'Joining...' : 'Join challenge →'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(tabs)/squad' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryText}>Maybe later</Text>
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
  codeBox: {
    backgroundColor: colors.streakSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.creamDeep,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  codeLabel: {
    fontSize: fontSize.xs,
    color: colors.subtext,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeText: {
    fontSize: 28,
    color: colors.text,
    fontWeight: '900',
    letterSpacing: 1.4,
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
