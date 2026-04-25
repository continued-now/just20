import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
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

type Props = {
  mood: MascotMood;
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

export function Mascot({ mood, size = 140 }: Props) {
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

  return (
    <AnimatedView
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: MOOD_BG[mood],
          transform: [{ scale: scaleAnim }, { translateX: shakeAnim }],
        },
      ]}
    >
      <Text style={{ fontSize: size * 0.55 }}>{MOOD_EMOJI[mood]}</Text>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
