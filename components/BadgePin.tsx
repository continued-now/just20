import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import type { BadgeDefinition } from '../lib/badges';

type Props = {
  badge: BadgeDefinition;
  size?: number;
  locked?: boolean;
  hidden?: boolean;
};

export function BadgePin({ badge, size = 88, locked = false, hidden = false }: Props) {
  const outer = size;
  const rim = Math.round(size * 0.84);
  const face = Math.round(size * 0.66);
  const iconSize = Math.max(18, Math.round(size * 0.34));
  const deep = locked ? '#8D9289' : badge.deepColor;
  const accent = locked ? '#D4D8CE' : badge.accentColor;
  const soft = locked ? '#ECEEE7' : badge.color;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          backgroundColor: deep,
          opacity: locked ? 0.66 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.shadowLip,
          {
            width: outer,
            height: outer,
            borderRadius: outer / 2,
            backgroundColor: deep,
          },
        ]}
      />
      <View
        style={[
          styles.rim,
          {
            width: rim,
            height: rim,
            borderRadius: rim / 2,
            backgroundColor: accent,
          },
        ]}
      >
        <View
          style={[
            styles.face,
            {
              width: face,
              height: face,
              borderRadius: face / 2,
              backgroundColor: soft,
              borderColor: '#FFFDF2',
            },
          ]}
        >
          <Text style={[styles.icon, { fontSize: iconSize, color: deep }]}>
            {hidden ? '?' : badge.icon}
          </Text>
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.shine,
            {
              width: Math.round(size * 0.42),
              height: Math.round(size * 0.11),
              borderRadius: size,
              top: Math.round(size * 0.14),
              left: Math.round(size * 0.22),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  shadowLip: {
    position: 'absolute',
    left: 0,
    top: 5,
    opacity: 0.22,
  },
  rim: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    overflow: 'hidden',
  },
  icon: {
    fontWeight: '900',
    textAlign: 'center',
  },
  shine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.58)',
    transform: [{ rotate: '-14deg' }],
  },
});
