import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { captureInboundAttribution } from '../lib/growth';
import { linkBuddy } from '../lib/social';
import { joinSquadRoom } from '../lib/viral';

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default function TeamInviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    room?: string;
    code?: string;
    src?: string;
    source?: string;
    campaign?: string;
    creator?: string;
  }>();
  const [joining, setJoining] = useState(false);

  const roomCode = firstParam(params.room).trim().toUpperCase();
  const buddyCode = firstParam(params.code).trim().toUpperCase();
  const source = firstParam(params.src) || firstParam(params.source);
  const campaign = firstParam(params.campaign);
  const creatorCode = firstParam(params.creator);
  const hasRoom = roomCode.length > 0;

  useEffect(() => {
    captureInboundAttribution({
      context: 'team',
      source,
      campaign,
      creatorCode,
      inviteCode: buddyCode,
      targetUrl: 'just20://team',
      metadata: { roomCode },
    }).catch(() => {});
  }, [buddyCode, campaign, creatorCode, roomCode, source]);

  async function handleJoin() {
    if (!hasRoom || joining) return;
    setJoining(true);
    try {
      const roomResult = await joinSquadRoom(roomCode);
      if (buddyCode) await linkBuddy(buddyCode);

      if (!roomResult.success) {
        Alert.alert('Could not join room', roomResult.error ?? 'This team code could not be joined.');
        return;
      }

      Alert.alert(
        'Team room joined',
        `You are now in ${roomResult.room?.code ?? roomCode}.`,
        [{ text: 'Go to Squad', onPress: () => router.replace('/(tabs)/squad' as any) }]
      );
    } catch {
      Alert.alert('Could not join room', 'This team code could not be joined.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.kicker}>Team Room</Text>
          <Text style={styles.title}>Daily pressure, shared room.</Text>
          <Text style={styles.body}>
            Team codes help friends, classmates, coworkers, or group chats start the same daily pushup promise.
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
  roomBox: {
    backgroundColor: colors.streakSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.creamDeep,
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
