import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import type { BadgeUnlockResult } from '../lib/badges';
import { BadgePin } from './BadgePin';

const AnimatedView = Animated.View as any;

type Props = {
  rewards: BadgeUnlockResult[];
  onDone?: () => void;
};

const BURSTS = [
  { x: -118, y: -104, color: '#FFD43B' },
  { x: 112, y: -100, color: '#FFFFFF' },
  { x: -130, y: -8, color: '#58CC02' },
  { x: 132, y: 2, color: '#1CB0F6' },
  { x: -78, y: 112, color: '#FF9F1C' },
  { x: 84, y: 116, color: '#FFFFFF' },
];

export function BadgeUnlockCelebration({ rewards, onDone }: Props) {
  const rewardKey = useMemo(
    () => rewards.map(reward => reward.definition.id).join('|'),
    [rewards]
  );
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const scale = useRef(new Animated.Value(0.82)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const badgeLift = useRef(new Animated.Value(18)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const ringOne = useRef(new Animated.Value(0)).current;
  const ringTwo = useRef(new Animated.Value(0)).current;
  const bursts = useRef(BURSTS.map(() => new Animated.Value(0))).current;

  const reward = rewards[index];

  useEffect(() => {
    if (!rewardKey) return;
    setIndex(0);
    setOpen(true);
  }, [rewardKey]);

  useEffect(() => {
    if (!open || !reward) return;
    play();
  }, [open, index, reward]);

  function play() {
    scale.setValue(0.82);
    opacity.setValue(0);
    badgeLift.setValue(18);
    xpOpacity.setValue(0);
    ringOne.setValue(0);
    ringTwo.setValue(0);
    bursts.forEach(anim => anim.setValue(0));

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 110,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(badgeLift, {
        toValue: 0,
        tension: 95,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(120),
        Animated.timing(ringOne, { toValue: 1, duration: 860, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(220),
        Animated.timing(ringTwo, { toValue: 1, duration: 1040, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(440),
        Animated.spring(xpOpacity, {
          toValue: 1,
          tension: 130,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      ...bursts.map((anim, burstIndex) =>
        Animated.sequence([
          Animated.delay(120 + burstIndex * 42),
          Animated.timing(anim, { toValue: 1, duration: 820, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }

  function close() {
    setOpen(false);
    onDone?.();
  }

  function next() {
    if (index < rewards.length - 1) {
      setIndex(index + 1);
      return;
    }
    close();
  }

  if (!reward) return null;

  const badge = reward.definition;
  const ringOneScale = ringOne.interpolate({ inputRange: [0, 1], outputRange: [0.56, 1.42] });
  const ringOneOpacity = ringOne.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.42, 0] });
  const ringTwoScale = ringTwo.interpolate({ inputRange: [0, 1], outputRange: [0.56, 1.52] });
  const ringTwoOpacity = ringTwo.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0, 0.32, 0] });

  return (
    <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <AnimatedView
          style={[
            styles.card,
            {
              opacity,
              borderColor: badge.color,
              transform: [{ scale }],
            },
          ]}
        >
          <View style={[styles.glow, { backgroundColor: badge.color }]} />
          <View style={styles.stage}>
            <AnimatedView
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  borderColor: badge.accentColor,
                  opacity: ringOneOpacity,
                  transform: [{ scale: ringOneScale }],
                },
              ]}
            />
            <AnimatedView
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  borderColor: badge.accentColor,
                  opacity: ringTwoOpacity,
                  transform: [{ scale: ringTwoScale }],
                },
              ]}
            />
            {bursts.map((anim, burstIndex) => {
              const burst = BURSTS[burstIndex];
              const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [0, burst.x] });
              const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [0, burst.y] });
              const burstOpacity = anim.interpolate({ inputRange: [0, 0.28, 1], outputRange: [0, 0.95, 0] });
              return (
                <AnimatedView
                  key={`${badge.id}-${burstIndex}`}
                  pointerEvents="none"
                  style={[
                    styles.burst,
                    {
                      backgroundColor: burst.color === '#58CC02' ? badge.accentColor : burst.color,
                      opacity: burstOpacity,
                      transform: [{ translateX: tx }, { translateY: ty }],
                    },
                  ]}
                />
              );
            })}
            <AnimatedView style={{ transform: [{ translateY: badgeLift }] }}>
              <BadgePin badge={badge} size={132} />
            </AnimatedView>
          </View>

          <Text style={[styles.kicker, { color: badge.deepColor }]}>BADGE UNLOCKED</Text>
          <Text style={styles.title}>{badge.name}</Text>
          <Text style={styles.copy}>{badge.description}</Text>
          <AnimatedView
            style={[
              styles.xpPill,
              {
                opacity: xpOpacity,
                transform: [
                  {
                    translateY: xpOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.xpText}>+{reward.xpAwarded} XP</Text>
          </AnimatedView>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={play} activeOpacity={0.75}>
              <Text style={styles.secondaryText}>Replay</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: badge.accentColor }]} onPress={next} activeOpacity={0.84}>
              <Text style={styles.primaryText}>
                {index < rewards.length - 1 ? `Next ${index + 2}/${rewards.length}` : 'Collect'}
              </Text>
            </TouchableOpacity>
          </View>
        </AnimatedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.64)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 36,
    backgroundColor: '#FFFDF2',
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 10,
  },
  glow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.5,
    left: -80,
    top: -80,
  },
  stage: {
    width: 210,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  ring: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderWidth: 4,
    borderRadius: 84,
  },
  burst: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 30,
    color: colors.text,
    fontWeight: '900',
    letterSpacing: -1.1,
    textAlign: 'center',
  },
  copy: {
    marginTop: spacing.xs,
    color: colors.subtext,
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  xpPill: {
    marginTop: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.text,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  xpText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '900' },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  secondaryBtn: {
    flex: 0.8,
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryText: { color: colors.subtext, fontSize: fontSize.sm, fontWeight: '900' },
  primaryBtn: {
    flex: 1.2,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '900' },
});
