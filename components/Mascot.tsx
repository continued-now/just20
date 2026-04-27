import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import {
  getMoodFromContext,
  getTierInfo,
  type MascotMood,
  STREAK_TIERS,
  type StreakTierInfo,
} from '../lib/mascotState';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimatedView = Animated.View as any;

export { getMoodFromContext, getTierInfo, STREAK_TIERS, type MascotMood, type StreakTierInfo };

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

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  mood: MascotMood;
  streak?: number;
  size?: number;
};

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
