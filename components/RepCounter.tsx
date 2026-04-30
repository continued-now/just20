import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { fontSize } from '../constants/theme';

const AnimatedText = Animated.Text as any;

type Props = {
  count: number;
  target?: number;
};

export function RepCounter({ count, target = 20 }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(count);

  useEffect(() => {
    if (count !== prevCount.current) {
      prevCount.current = count;
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      ]).start();
    }
  }, [count, scaleAnim]);

  return (
    <View style={styles.container}>
      <AnimatedText style={[styles.count, { transform: [{ scale: scaleAnim }] }]}>
        {count}
      </AnimatedText>
      <Text style={styles.target}>/ {target}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    overflow: 'visible',
  },
  count: {
    fontSize: 80,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 96,
    includeFontPadding: false,
  },
  target: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.68)',
    paddingBottom: 12,
  },
});
