import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { MILESTONE_COPY } from '../lib/milestones';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimatedView = Animated.View as any;

const CONFETTI_COLORS = [colors.streak, colors.accent, colors.brand, colors.ice, colors.yellow];
const PARTICLE_COUNT = 18;

type Props = {
  streak: number;
  visible: boolean;
  onDismiss: () => void;
};

export function MilestoneCelebration({ streak, visible, onDismiss }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.4)).current;

  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: 4 + (i * 5.5) % 90,
      size: 8 + (i % 3) * 5,
      yAnim: new Animated.Value(-40),
      opAnim: new Animated.Value(0),
    }))
  ).current;

  const cardRef = useRef<ViewShot>(null);
  const rawCopy = MILESTONE_COPY[streak] ?? `${streak} DAYS.\nYou showed up.`;
  const copyLines = rawCopy.split('\n');

  useEffect(() => {
    if (!visible) {
      scaleAnim.setValue(0.4);
      particles.forEach(p => { p.yAnim.setValue(-40); p.opAnim.setValue(0); });
      return;
    }

    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 55,
      friction: 7,
      useNativeDriver: true,
    }).start();

    const anims = particles.map((p, i) =>
      Animated.sequence([
        Animated.delay(i * 55),
        Animated.parallel([
          Animated.timing(p.yAnim, {
            toValue: 900,
            duration: 2000 + (i % 5) * 150,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(p.opAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
            Animated.delay(1300),
            Animated.timing(p.opAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]),
        ]),
      ])
    );
    Animated.parallel(anims).start();
  }, [visible]);

  async function handleShare() {
    if (!cardRef.current) return;
    try {
      const uri = await (cardRef.current as any).capture();
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch (_) {}
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        {/* Confetti particles — outside ViewShot so they don't appear in share card */}
        {particles.map((p, i) => (
          <AnimatedView
            key={i}
            pointerEvents="none"
            style={[
              styles.particle,
              {
                left: p.left,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: p.size / 2,
                transform: [{ translateY: p.yAnim }],
                opacity: p.opAnim,
              },
            ]}
          />
        ))}

        {/* Shareable card */}
        <AnimatedView style={{ transform: [{ scale: scaleAnim }], width: '78%' }}>
          <ViewShot ref={cardRef} options={{ format: 'png', quality: 1.0 }} style={styles.card}>
            <Text style={styles.flame}>🔥</Text>
            <Text style={styles.streakNum}>{streak}</Text>
            <Text style={styles.daysLabel}>DAYS</Text>
            <View style={styles.divider} />
            <Text style={styles.copyLine}>{copyLines[1] ?? copyLines[0]}</Text>
            <Text style={styles.brandTag}>#just20</Text>
          </ViewShot>
        </AnimatedView>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
            <Text style={styles.shareBtnText}>SHARE THIS →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss} activeOpacity={0.6} style={styles.dismissTouch}>
            <Text style={styles.dismissText}>close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
  card: {
    backgroundColor: '#0F0F0F',
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.5)',
  },
  flame: { fontSize: 52 },
  streakNum: {
    fontSize: 88,
    fontWeight: '900',
    color: colors.streak,
    lineHeight: 88,
    letterSpacing: -5,
  },
  daysLabel: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 5,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    width: '55%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: spacing.xs,
  },
  copyLine: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  brandTag: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.28)',
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  actions: {
    alignItems: 'center',
    gap: spacing.md,
    width: '78%',
  },
  shareBtn: {
    backgroundColor: colors.streak,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '900',
    letterSpacing: 1,
  },
  dismissTouch: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  dismissText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
