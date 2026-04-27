import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimatedView = Animated.View as any;

export type MascotMood = 'sleeping' | 'neutral' | 'annoyed' | 'angry' | 'furious' | 'celebrating';

const MOOD_EMOJI: Record<MascotMood, string> = {
  sleeping: '😴',
  neutral: '😐',
  annoyed: '😒',
  angry: '😤',
  furious: '🤬',
  celebrating: '🥳',
};

const MOOD_BG: Record<MascotMood, string> = {
  sleeping: '#E8E8E0',
  neutral: '#E8E8E0',
  annoyed: '#FFE5B4',
  angry: '#FFCDD2',
  furious: '#FF8A80',
  celebrating: '#C8E6C9',
};

// ─── Streak tier evolution ────────────────────────────────────────────────────

export type StreakTierInfo = {
  minDays: number;
  label: string;
  form: string;       // display emoji (used in evolution path)
  badge: string | null;  // corner badge on the mascot circle
  ringColor: string | null;
  nextTierDays: number | null;
};

export const STREAK_TIERS: StreakTierInfo[] = [
  { minDays: 365, label: 'Legend',  form: '👑🔥', badge: '👑', ringColor: '#FFB300', nextTierDays: null },
  { minDays: 100, label: 'Cursed',  form: '💀🔥', badge: '💀', ringColor: '#9C27B0', nextTierDays: 365 },
  { minDays: 30,  label: 'Inferno', form: '🔥🔥', badge: '🔥', ringColor: '#E64A19', nextTierDays: 100 },
  { minDays: 7,   label: 'Flame',   form: '🔥',   badge: '🔥', ringColor: '#FF7043', nextTierDays: 30 },
  { minDays: 0,   label: 'Dormant', form: '🥚',   badge: null,  ringColor: null,      nextTierDays: 7 },
];

export function getTierInfo(streak: number): StreakTierInfo & { daysToNext: number | null } {
  const tier = STREAK_TIERS.find(t => streak >= t.minDays) ?? STREAK_TIERS[STREAK_TIERS.length - 1];
  return { ...tier, daysToNext: tier.nextTierDays !== null ? tier.nextTierDays - streak : null };
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  mood: MascotMood;
  streak?: number;
  size?: number;
};

export function getMoodFromContext(remaining: number, completedToday: boolean): MascotMood {
  if (completedToday) return 'celebrating';
  const hour = new Date().getHours();
  if (hour < 7) return 'sleeping';
  if (remaining >= 16) return 'neutral';
  if (remaining >= 11) return 'annoyed';
  if (remaining >= 6) return 'angry';
  return 'furious';
}

export function Mascot({ mood, streak = 0, size = 140 }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (mood === 'celebrating') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.15, duration: 300, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        { iterations: 4 }
      ).start();
    } else if (mood === 'furious') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]),
        { iterations: 6 }
      ).start();
    } else {
      scaleAnim.setValue(1);
      shakeAnim.setValue(0);
    }
  }, [mood, scaleAnim, shakeAnim]);

  const tierInfo = getTierInfo(streak);
  const ringWidth = tierInfo.ringColor ? 3 : 0;

  return (
    <View style={{ width: size + ringWidth * 2, height: size + ringWidth * 2, alignItems: 'center', justifyContent: 'center' }}>
      <AnimatedView
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: MOOD_BG[mood],
            transform: [{ scale: scaleAnim }, { translateX: shakeAnim }],
            borderWidth: ringWidth,
            borderColor: tierInfo.ringColor ?? 'transparent',
          },
        ]}
      >
        <Text style={{ fontSize: size * 0.55 }}>{MOOD_EMOJI[mood]}</Text>
      </AnimatedView>

      {/* Tier badge — top-right corner of the circle */}
      {tierInfo.badge && (
        <View style={[styles.badge, { top: 0, right: 0 }]}>
          <Text style={styles.badgeEmoji}>{tierInfo.badge}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  badgeEmoji: { fontSize: 13 },
});
