import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { BrandLogo } from './BrandLogo';

export type GrowthShareCardTone = 'default' | 'streak' | 'success' | 'ice' | 'badge' | 'dark';

export type GrowthShareCardModel = {
  eyebrow: string;
  title: string;
  body: string;
  statLabel: string;
  statValue: string;
  inviteCode?: string | null;
  link?: string | null;
  footer?: string;
  heroGlyph?: string;
  tone?: GrowthShareCardTone;
};

const TONE_STYLES: Record<
  GrowthShareCardTone,
  { background: string; accent: string; soft: string; text: string }
> = {
  default: {
    background: colors.bg,
    accent: colors.brand,
    soft: colors.brandSoft,
    text: colors.text,
  },
  streak: { background: '#20140E', accent: colors.streak, soft: '#FFF0D6', text: '#FFFFFF' },
  success: {
    background: '#10251A',
    accent: colors.success,
    soft: colors.successSoft,
    text: '#FFFFFF',
  },
  ice: { background: '#071D2B', accent: colors.ice, soft: colors.iceSoft, text: '#FFFFFF' },
  badge: { background: '#241B0B', accent: colors.yellow, soft: '#FFF6D8', text: '#FFFFFF' },
  dark: {
    background: colors.darkCard,
    accent: colors.brand,
    soft: colors.brandSoft,
    text: '#FFFFFF',
  },
};

export function GrowthShareCard({
  eyebrow,
  title,
  body,
  statLabel,
  statValue,
  inviteCode,
  link,
  footer = 'No gym. 20 pushups. Keep me honest.',
  heroGlyph = '20',
  tone = 'default',
}: GrowthShareCardModel) {
  const toneStyle = TONE_STYLES[tone];
  const onDark = tone !== 'default';

  return (
    <View style={[styles.card, { backgroundColor: toneStyle.background }]}>
      <View style={styles.header}>
        <BrandLogo size="sm" />
        <View style={[styles.contextPill, { backgroundColor: toneStyle.soft }]}>
          <Text
            style={[
              styles.contextText,
              { color: tone === 'default' ? colors.brandDark : colors.text },
            ]}
          >
            {eyebrow}
          </Text>
        </View>
      </View>

      <View style={styles.heroRow}>
        <View style={[styles.glyphBadge, { backgroundColor: toneStyle.accent }]}>
          <Text style={styles.glyphText}>{heroGlyph}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text
            style={[styles.statValue, { color: toneStyle.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {statValue}
          </Text>
          <Text style={[styles.statLabel, onDark && styles.statLabelDark]}>{statLabel}</Text>
        </View>
      </View>

      <View style={[styles.messagePanel, onDark && styles.messagePanelDark]}>
        <Text
          style={[styles.title, onDark && styles.titleDark]}
          numberOfLines={3}
          adjustsFontSizeToFit
        >
          {title}
        </Text>
        <Text style={[styles.body, onDark && styles.bodyDark]} numberOfLines={5}>
          {body}
        </Text>
      </View>

      <View style={styles.metaRow}>
        {inviteCode ? (
          <View style={[styles.metaBox, onDark && styles.metaBoxDark]}>
            <Text style={[styles.metaLabel, onDark && styles.metaLabelDark]}>Invite code</Text>
            <Text
              style={[styles.metaValue, onDark && styles.metaValueDark]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {inviteCode}
            </Text>
          </View>
        ) : null}
        <View style={[styles.metaBox, styles.metaBoxWide, onDark && styles.metaBoxDark]}>
          <Text style={[styles.metaLabel, onDark && styles.metaLabelDark]}>Join link</Text>
          <Text
            style={[styles.linkText, onDark && styles.metaValueDark]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {link ?? 'just20://challenge'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, onDark && styles.footerTextDark]}>{footer}</Text>
        <Text style={[styles.hashtag, { color: toneStyle.accent }]}>#just20</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 390,
    minHeight: 540,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  contextPill: {
    flexShrink: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  contextText: {
    fontSize: fontSize.xs,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  glyphBadge: {
    width: 116,
    height: 116,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5,
  },
  glyphText: {
    color: '#FFFFFF',
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900',
    textAlign: 'center',
  },
  statBlock: {
    flex: 1,
    minWidth: 0,
  },
  statValue: {
    fontSize: 48,
    lineHeight: 54,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: spacing.xs,
    color: colors.subtext,
    fontSize: fontSize.sm,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statLabelDark: {
    color: 'rgba(255,255,255,0.68)',
  },
  messagePanel: {
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    gap: spacing.sm,
  },
  messagePanelDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  title: {
    color: colors.text,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '900',
  },
  titleDark: {
    color: '#FFFFFF',
  },
  body: {
    color: colors.subtext,
    fontSize: fontSize.md,
    lineHeight: 23,
    fontWeight: '700',
  },
  bodyDark: {
    color: 'rgba(255,255,255,0.76)',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaBox: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    padding: spacing.md,
    gap: 4,
  },
  metaBoxWide: {
    flex: 1.25,
  },
  metaBoxDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  metaLabel: {
    color: colors.subtext,
    fontSize: fontSize.xs,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metaLabelDark: {
    color: 'rgba(255,255,255,0.56)',
  },
  metaValue: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  metaValueDark: {
    color: '#FFFFFF',
  },
  linkText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  footerText: {
    flex: 1,
    color: colors.subtext,
    fontSize: fontSize.sm,
    lineHeight: 19,
    fontWeight: '800',
  },
  footerTextDark: {
    color: 'rgba(255,255,255,0.66)',
  },
  hashtag: {
    flexShrink: 0,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
});
