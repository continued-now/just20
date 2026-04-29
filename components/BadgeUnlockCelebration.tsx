import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import type { BadgeDefinition, BadgeUnlockResult } from '../lib/badges';
import { getEquippedCosmetics, usesSoftAfterglow } from '../lib/shop';
import { BadgePin } from './BadgePin';

const AnimatedView = Animated.View as any;

type Props = {
  rewards: BadgeUnlockResult[];
  onDone?: () => void;
};

type UnlockTier = 'standard' | 'rare' | 'hidden';
type UnlockStage = 'anticipating' | 'revealing' | 'afterglow' | 'settled';

type BadgeUnlockPresentation = {
  tier: UnlockTier;
  anticipationMs: number;
  revealMs: number;
  afterglowMs: number;
  particleCount: number;
  ringCount: number;
  kickerBeforeReveal: string;
  kickerAfterReveal: string;
  teaserTitle: string;
  teaserCopy: string;
  reinforcementCopy: string;
  showMysteryFirst: boolean;
};

const BURSTS = [
  { x: -118, y: -104, color: colors.yellow },
  { x: 112, y: -100, color: '#FFFFFF' },
  { x: -130, y: -8, color: colors.brand },
  { x: 132, y: 2, color: colors.ice },
  { x: -78, y: 112, color: colors.streak },
  { x: 84, y: 116, color: '#FFFFFF' },
];

function applySoftAfterglow(presentation: BadgeUnlockPresentation): BadgeUnlockPresentation {
  return {
    ...presentation,
    afterglowMs: Math.round(presentation.afterglowMs * 1.12),
    particleCount: Math.max(2, presentation.particleCount - 1),
    ringCount: Math.min(1, presentation.ringCount),
    reinforcementCopy: 'Soft afterglow equipped.',
  };
}

function getBadgeUnlockPresentation(badge: BadgeDefinition, softAfterglow: boolean): BadgeUnlockPresentation {
  let presentation: BadgeUnlockPresentation;

  if (badge.visibility === 'hidden') {
    presentation = {
      tier: 'hidden',
      anticipationMs: 820,
      revealMs: 620,
      afterglowMs: 1400,
      particleCount: 6,
      ringCount: 2,
      kickerBeforeReveal: 'WAIT. SOMETHING TINY IS GLOWING.',
      kickerAfterReveal: 'HIDDEN BADGE REVEALED',
      teaserTitle: 'Secret badge found',
      teaserCopy: 'Hold on. This one was hiding.',
      reinforcementCopy: 'Hidden gem found.',
      showMysteryFirst: true,
    };
    return softAfterglow ? applySoftAfterglow(presentation) : presentation;
  }

  if (badge.xp >= 300) {
    presentation = {
      tier: 'rare',
      anticipationMs: 520,
      revealMs: 540,
      afterglowMs: 1040,
      particleCount: 5,
      ringCount: 2,
      kickerBeforeReveal: 'SOMETHING GOOD IS HAPPENING.',
      kickerAfterReveal: 'RARE BADGE',
      teaserTitle: 'Almost...',
      teaserCopy: 'This one took a minute.',
      reinforcementCopy: 'Rare one. Tiny legend behavior.',
      showMysteryFirst: false,
    };
    return softAfterglow ? applySoftAfterglow(presentation) : presentation;
  }

  presentation = {
    tier: 'standard',
    anticipationMs: 120,
    revealMs: 420,
    afterglowMs: 520,
    particleCount: 3,
    ringCount: 1,
    kickerBeforeReveal: 'BADGE UNLOCKED',
    kickerAfterReveal: 'BADGE UNLOCKED',
    teaserTitle: badge.name,
    teaserCopy: badge.description,
    reinforcementCopy: "That one's going on the wall.",
    showMysteryFirst: false,
  };
  return softAfterglow ? applySoftAfterglow(presentation) : presentation;
}

export function BadgeUnlockCelebration({ rewards, onDone }: Props) {
  const rewardKey = useMemo(
    () => rewards.map(reward => reward.definition.id).join('|'),
    [rewards]
  );
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<UnlockStage>('settled');
  const [displayedXp, setDisplayedXp] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [softAfterglow, setSoftAfterglow] = useState(false);
  const scale = useRef(new Animated.Value(0.82)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const badgeLift = useRef(new Animated.Value(18)).current;
  const anticipation = useRef(new Animated.Value(0)).current;
  const revealProgress = useRef(new Animated.Value(1)).current;
  const afterglow = useRef(new Animated.Value(0)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const xpCount = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const ringOne = useRef(new Animated.Value(0)).current;
  const ringTwo = useRef(new Animated.Value(0)).current;
  const bursts = useRef(BURSTS.map(() => new Animated.Value(0))).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const runningAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const xpListener = useRef<string | null>(null);

  const reward = rewards[index];
  const badge = reward?.definition;
  const presentation = badge ? getBadgeUnlockPresentation(badge, softAfterglow) : null;
  const settled = stage === 'settled';

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!rewardKey) {
      setOpen(false);
      return;
    }
    getEquippedCosmetics()
      .then(equipped => setSoftAfterglow(usesSoftAfterglow(equipped.unlockAnimation)))
      .catch(() => setSoftAfterglow(false));
    setIndex(0);
    setOpen(true);
  }, [rewardKey]);

  useEffect(() => {
    if (!open || !reward || !presentation) return;
    play();

    return cleanupRun;
  }, [open, index, reward, presentation?.tier, reduceMotion, softAfterglow]);

  function cleanupRun() {
    timers.current.forEach(timer => clearTimeout(timer));
    timers.current = [];
    runningAnimation.current?.stop();
    runningAnimation.current = null;

    if (xpListener.current) {
      xpCount.removeListener(xpListener.current);
      xpListener.current = null;
    }
  }

  function schedule(callback: () => void, delay: number) {
    const timer = setTimeout(callback, delay);
    timers.current.push(timer);
  }

  function play() {
    if (!reward || !presentation) return;

    cleanupRun();

    const anticipationMs = reduceMotion ? 80 : presentation.anticipationMs;
    const revealMs = reduceMotion ? 180 : presentation.revealMs;
    const afterglowMs = reduceMotion ? 420 : presentation.afterglowMs;
    const afterglowStart = anticipationMs + revealMs;
    const settledAt = afterglowStart + afterglowMs;
    const particleCount = reduceMotion ? 0 : presentation.particleCount;
    const xpDuration = Math.max(220, afterglowMs - 260);
    const revealStartsHidden = presentation.showMysteryFirst;

    setStage('anticipating');
    setDisplayedXp(0);
    scale.setValue(reduceMotion ? 0.98 : 0.82);
    opacity.setValue(0);
    badgeLift.setValue(reduceMotion ? 0 : 18);
    anticipation.setValue(0);
    revealProgress.setValue(revealStartsHidden ? 0 : 1);
    afterglow.setValue(0);
    xpOpacity.setValue(0);
    xpCount.setValue(0);
    buttonOpacity.setValue(0);
    ringOne.setValue(0);
    ringTwo.setValue(0);
    bursts.forEach(anim => anim.setValue(0));

    xpListener.current = xpCount.addListener(({ value }) => {
      setDisplayedXp(Math.round(value * reward.xpAwarded));
    });

    if (!reduceMotion && presentation.tier !== 'standard') {
      schedule(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }, Math.max(120, Math.round(anticipationMs * 0.48)));
    }

    schedule(() => {
      setStage('revealing');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, anticipationMs);

    schedule(() => setStage('afterglow'), afterglowStart);
    schedule(() => {
      setStage('settled');
      setDisplayedXp(reward.xpAwarded);
    }, settledAt);

    const animations: Animated.CompositeAnimation[] = [
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: reduceMotion ? 70 : 110,
        friction: reduceMotion ? 12 : 8,
        useNativeDriver: true,
      }),
      Animated.timing(anticipation, {
        toValue: 1,
        duration: anticipationMs,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(anticipationMs),
        Animated.timing(revealProgress, {
          toValue: 1,
          duration: revealMs,
          easing: Easing.out(Easing.back(1.18)),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(anticipationMs),
        Animated.spring(badgeLift, {
          toValue: 0,
          tension: 95,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(afterglowStart),
        Animated.timing(afterglow, {
          toValue: 1,
          duration: afterglowMs,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(afterglowStart + 160),
        Animated.spring(xpOpacity, {
          toValue: 1,
          tension: 130,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(afterglowStart + 180),
        Animated.timing(xpCount, {
          toValue: 1,
          duration: xpDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
      Animated.sequence([
        Animated.delay(settledAt),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ];

    if (!reduceMotion) {
      animations.push(
        Animated.sequence([
          Animated.delay(afterglowStart),
          Animated.timing(ringOne, {
            toValue: 1,
            duration: Math.min(920, afterglowMs),
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      );

      if (presentation.ringCount > 1) {
        animations.push(
          Animated.sequence([
            Animated.delay(afterglowStart + 160),
            Animated.timing(ringTwo, {
              toValue: 1,
              duration: Math.min(1040, afterglowMs),
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ])
        );
      }

      bursts.slice(0, particleCount).forEach((anim, burstIndex) => {
        animations.push(
          Animated.sequence([
            Animated.delay(afterglowStart + burstIndex * 46),
            Animated.timing(anim, {
              toValue: 1,
              duration: Math.min(900, afterglowMs),
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ])
        );
      });
    }

    runningAnimation.current = Animated.parallel(animations);
    runningAnimation.current.start(({ finished }) => {
      if (!finished) return;
      setStage('settled');
      setDisplayedXp(reward.xpAwarded);
    });
  }

  function close() {
    if (!settled) return;
    cleanupRun();
    setOpen(false);
    onDone?.();
  }

  function next() {
    if (!settled) return;
    if (index < rewards.length - 1) {
      setIndex(index + 1);
      return;
    }
    close();
  }

  if (!reward || !badge || !presentation) return null;

  const showBadgeDetails = presentation.tier === 'standard' || stage === 'afterglow' || settled;
  const kicker = showBadgeDetails ? presentation.kickerAfterReveal : presentation.kickerBeforeReveal;
  const title = showBadgeDetails ? badge.name : presentation.teaserTitle;
  const copy = showBadgeDetails ? badge.description : presentation.teaserCopy;
  const particleCount = reduceMotion ? 0 : presentation.particleCount;
  const ringOneScale = ringOne.interpolate({ inputRange: [0, 1], outputRange: [0.56, 1.42] });
  const ringOneOpacity = ringOne.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.42, 0] });
  const ringTwoScale = ringTwo.interpolate({ inputRange: [0, 1], outputRange: [0.56, 1.52] });
  const ringTwoOpacity = ringTwo.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0, 0.32, 0] });
  const glowScale = afterglow.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.82, 1.18, 1.04] });
  const glowOpacity = afterglow.interpolate({ inputRange: [0, 0.28, 1], outputRange: [0.22, 0.54, 0.32] });
  const chargeScale = anticipation.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1.12] });
  const chargeOpacity = anticipation.interpolate({
    inputRange: [0, 0.58, 1],
    outputRange: [0, presentation.tier === 'standard' ? 0.04 : 0.22, 0.08],
  });
  const afterglowBadgeScale = afterglow.interpolate({
    inputRange: [0, 0.22, 0.58, 1],
    outputRange: [1, 1.045, 1.02, 1],
  });
  const mysteryOpacity = revealProgress.interpolate({
    inputRange: [0, 0.45, 0.58, 1],
    outputRange: [1, 1, 0, 0],
  });
  const realBadgeOpacity = presentation.showMysteryFirst
    ? revealProgress.interpolate({
        inputRange: [0, 0.45, 0.58, 1],
        outputRange: [0, 0, 1, 1],
      })
    : 1;
  const mysteryRotate = revealProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '90deg'],
  });
  const realRotate = revealProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-90deg', '-90deg', '0deg'],
  });

  return (
    <Modal
      transparent
      visible={open}
      animationType="fade"
      onRequestClose={settled ? close : undefined}
    >
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
          <AnimatedView
            pointerEvents="none"
            style={[
              styles.glow,
              {
                backgroundColor: badge.color,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />
          <View style={styles.stage}>
            <AnimatedView
              pointerEvents="none"
              style={[
                styles.chargeGlow,
                {
                  backgroundColor: badge.accentColor,
                  opacity: chargeOpacity,
                  transform: [{ scale: chargeScale }],
                },
              ]}
            />
            {presentation.ringCount > 0 && (
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
            )}
            {presentation.ringCount > 1 && (
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
            )}
            {bursts.slice(0, particleCount).map((anim, burstIndex) => {
              const burst = BURSTS[burstIndex];
              const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [0, burst.x] });
              const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [0, burst.y] });
              const burstOpacity = anim.interpolate({ inputRange: [0, 0.28, 1], outputRange: [0, 0.95, 0] });
              const burstScale = anim.interpolate({ inputRange: [0, 0.32, 1], outputRange: [0.4, 1.2, 0.76] });
              return (
                <AnimatedView
                  key={`${badge.id}-${burstIndex}`}
                  pointerEvents="none"
                  style={[
                    styles.burst,
                    {
                      backgroundColor: burst.color === colors.brand ? badge.accentColor : burst.color,
                      opacity: burstOpacity,
                      transform: [{ translateX: tx }, { translateY: ty }, { scale: burstScale }],
                    },
                  ]}
                />
              );
            })}
            <AnimatedView
              style={{
                transform: [{ translateY: badgeLift }, { scale: afterglowBadgeScale }],
              }}
            >
              {presentation.showMysteryFirst ? (
                <View style={styles.flipStage}>
                  <AnimatedView
                    style={[
                      styles.flipFace,
                      {
                        opacity: mysteryOpacity,
                        transform: [{ perspective: 700 }, { rotateY: mysteryRotate }],
                      },
                    ]}
                  >
                    <BadgePin badge={badge} size={132} hidden />
                  </AnimatedView>
                  <AnimatedView
                    style={[
                      styles.flipFace,
                      {
                        opacity: realBadgeOpacity,
                        transform: [{ perspective: 700 }, { rotateY: realRotate }],
                      },
                    ]}
                  >
                    <BadgePin badge={badge} size={132} />
                  </AnimatedView>
                </View>
              ) : (
                <BadgePin badge={badge} size={132} />
              )}
            </AnimatedView>
          </View>

          <Text style={[styles.kicker, { color: badge.deepColor }]}>{kicker}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.copy}>{copy}</Text>
          <AnimatedView
            style={[
              styles.afterglowLine,
              {
                opacity: afterglow,
                transform: [
                  {
                    translateY: afterglow.interpolate({
                      inputRange: [0, 1],
                      outputRange: [6, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={[styles.afterglowText, { color: badge.deepColor }]}>
              {presentation.reinforcementCopy}
            </Text>
          </AnimatedView>
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
            <Text style={styles.xpText}>+{displayedXp} XP</Text>
          </AnimatedView>

          <AnimatedView
            pointerEvents={settled ? 'auto' : 'none'}
            style={[styles.buttonRow, { opacity: buttonOpacity }]}
          >
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={play}
              activeOpacity={0.75}
              disabled={!settled}
            >
              <Text style={styles.secondaryText}>Replay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: badge.accentColor }]}
              onPress={next}
              activeOpacity={0.84}
              disabled={!settled}
            >
              <Text style={styles.primaryText}>
                {index < rewards.length - 1 ? `Next ${index + 2}/${rewards.length}` : 'Collect'}
              </Text>
            </TouchableOpacity>
          </AnimatedView>
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
    backgroundColor: colors.cream,
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
  chargeGlow: {
    position: 'absolute',
    width: 152,
    height: 152,
    borderRadius: 76,
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
  flipStage: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipFace: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: spacing.xs,
    textAlign: 'center',
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
  afterglowLine: {
    marginTop: spacing.sm,
    minHeight: 18,
  },
  afterglowText: {
    fontSize: fontSize.sm,
    fontWeight: '900',
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
