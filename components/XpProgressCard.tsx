import { StyleSheet, Text, TouchableOpacity, View, type DimensionValue } from 'react-native';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { getXpLevelProgress } from '../lib/xp';

type Props = {
  totalXp: number;
  compact?: boolean;
  tone?: 'light' | 'dark';
  onPress?: () => void;
};

export function XpProgressCard({ totalXp, compact = false, tone = 'light', onPress }: Props) {
  const progress = getXpLevelProgress(totalXp);
  const progressWidth = `${Math.max(4, Math.round(progress.percent * 100))}%` as DimensionValue;
  const dark = tone === 'dark';
  const content = (
    <>
      <View style={styles.topRow}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>LV {progress.level}</Text>
        </View>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, dark && styles.titleDark]}>{progress.title}</Text>
          <Text style={[styles.subtitle, dark && styles.subtitleDark]}>
            {progress.xpRemaining} XP to Level {progress.nextLevel} · {progress.nextTitle}
          </Text>
        </View>
        {onPress ? <Text style={[styles.chevron, dark && styles.chevronDark]}>→</Text> : null}
      </View>

      <View style={[styles.track, dark && styles.trackDark]}>
        <View style={[styles.fill, { width: progressWidth }]} />
      </View>

      <View style={styles.bottomRow}>
        <Text style={[styles.meta, dark && styles.metaDark]}>
          {progress.totalXp} lifetime XP
        </Text>
        <Text style={[styles.meta, dark && styles.metaDark]}>
          {progress.xpIntoLevel}/{progress.xpForNextLevel}
        </Text>
      </View>
    </>
  );
  const cardStyle = [
    styles.card,
    compact && styles.cardCompact,
    dark && styles.cardDark,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.82}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardCompact: {
    maxWidth: 340,
    padding: spacing.md,
  },
  cardDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  levelBadge: {
    borderRadius: radius.full,
    backgroundColor: colors.streak,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  levelBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  titleWrap: { flex: 1, minWidth: 0 },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  titleDark: { color: '#FFFFFF' },
  subtitle: {
    color: colors.subtext,
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginTop: 2,
  },
  subtitleDark: { color: 'rgba(255,255,255,0.58)' },
  chevron: {
    color: colors.streak,
    fontSize: 22,
    fontWeight: '900',
  },
  chevronDark: { color: '#FFFFFF' },
  track: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: '#E9E9DF',
    overflow: 'hidden',
  },
  trackDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.streak,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  meta: {
    color: colors.subtext,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  metaDark: { color: 'rgba(255,255,255,0.5)' },
});
