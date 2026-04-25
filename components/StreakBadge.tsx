import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../constants/theme';

type Props = {
  streak: number;
  freezes?: number;
};

export function StreakBadge({ streak, freezes = 0 }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.badge}>
        <Text style={styles.fire}>🔥</Text>
        <Text style={styles.number}>{streak}</Text>
        <Text style={styles.label}>{streak === 1 ? 'day' : 'days'}</Text>
      </View>
      {freezes > 0 && (
        <View style={styles.freezes}>
          {Array.from({ length: freezes }).map((_, i) => (
            <Text key={i} style={styles.ice}>🧊</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: 4,
  },
  fire: {
    fontSize: fontSize.md,
  },
  number: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.streak,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.streak,
    fontWeight: '600',
  },
  freezes: {
    flexDirection: 'row',
    gap: 2,
  },
  ice: {
    fontSize: 16,
  },
});
