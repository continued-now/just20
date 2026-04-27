import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { linkBuddy } from '../lib/social';
import { joinSquadRoom } from '../lib/viral';

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default function TeamInviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ room?: string; code?: string }>();
  const [joining, setJoining] = useState(false);

  const roomCode = firstParam(params.room).trim().toUpperCase();
  const buddyCode = firstParam(params.code).trim().toUpperCase();
  const hasRoom = roomCode.length > 0;

  async function handleJoin() {
    if (!hasRoom || joining) return;
    setJoining(true);
    const roomResult = await joinSquadRoom(roomCode);
    if (buddyCode) await linkBuddy(buddyCode);
    setJoining(false);

    if (!roomResult.success) {
      Alert.alert('Could not join room', roomResult.error ?? 'This team code could not be joined.');
      return;
    }

    Alert.alert(
      'Team room joined',
      `You are now in ${roomResult.room?.code ?? roomCode}.`,
      [{ text: 'Go to Squad', onPress: () => router.replace('/(tabs)/squad' as any) }]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <View style={styles.card}>
          <Text style={styles.kicker}>Team Room</Text>
          <Text style={styles.title}>Daily pressure, shared room.</Text>
          <Text style={styles.body}>
            Team codes are a lightweight way to onboard offices, creators, friend groups, or school cohorts.
          </Text>

          <View style={styles.roomBox}>
            <Text style={styles.roomLabel}>Room code</Text>
            <Text style={styles.roomCode}>{hasRoom ? roomCode : 'Missing room'}</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (!hasRoom || joining) && styles.btnDisabled]}
            onPress={handleJoin}
            activeOpacity={0.85}
            disabled={!hasRoom || joining}
          >
            <Text style={styles.primaryText}>{joining ? 'Joining...' : 'Join room →'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(tabs)/squad' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryText}>Maybe later</Text>
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
  roomBox: {
    backgroundColor: '#FFF6E8',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FFD9A8',
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  roomLabel: {
    fontSize: fontSize.xs,
    color: colors.subtext,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roomCode: {
    fontSize: 28,
    color: colors.text,
    fontWeight: '900',
    letterSpacing: 1.2,
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
