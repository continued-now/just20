import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../constants/theme';

type BrandLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
};

const SIZES = {
  sm: { width: 112, height: 42, word: 24, knob: 36, num: 15, line: 66 },
  md: { width: 148, height: 54, word: 32, knob: 46, num: 19, line: 86 },
  lg: { width: 210, height: 76, word: 46, knob: 64, num: 27, line: 124 },
};

export function BrandLogo({ size = 'md', style }: BrandLogoProps) {
  const metrics = SIZES[size];

  return (
    <View
      accessibilityLabel="Just 20"
      accessible
      style={[
        styles.track,
        {
          width: metrics.width,
          height: metrics.height,
          borderRadius: metrics.height / 2,
          paddingLeft: metrics.height * 0.42,
          paddingRight: metrics.height * 0.1,
        },
        style,
      ]}
    >
      <View style={styles.wordWrap}>
        <Text
          style={[
            styles.word,
            {
              fontSize: metrics.word,
              lineHeight: metrics.word + 2,
              letterSpacing: -metrics.word * 0.09,
            },
          ]}
        >
          just
        </Text>
        <View style={[styles.repLine, { width: metrics.line * 0.48 }]} />
      </View>
      <View
        style={[
          styles.knob,
          {
            width: metrics.knob,
            height: metrics.knob,
            borderRadius: metrics.knob / 2,
          },
        ]}
      >
        <Text style={[styles.number, { fontSize: metrics.num, lineHeight: metrics.num + 2 }]}>20</Text>
        <View style={[styles.smile, { width: metrics.knob * 0.48 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: 'rgba(220,255,185,0.55)',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  wordWrap: {
    justifyContent: 'center',
  },
  word: {
    color: '#F5FFE8',
    fontWeight: '900',
  },
  repLine: {
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.brandSoft,
    opacity: 0.62,
  },
  knob: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
    borderWidth: 2,
    borderColor: '#DFE9D3',
  },
  number: {
    color: colors.brandDark,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  smile: {
    position: 'absolute',
    bottom: 5,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.brand,
    opacity: 0.68,
  },
});
