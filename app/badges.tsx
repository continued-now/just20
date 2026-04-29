import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BadgePin } from '../components/BadgePin';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import {
  buildBadgeBragText,
  evaluateBadgeUnlocks,
  getBadgeCollection,
  markBadgeShared,
  type BadgeCategory,
  type BadgeProgress,
} from '../lib/badges';
import { buildSharePayload, growthEventFromPayload, recordGrowthEvent } from '../lib/growth';
import { getBadgeFrameStyle, getEquippedCosmetics, type BadgeFrameStyle } from '../lib/shop';
import { getOrCreateUser } from '../lib/user';

type Filter = 'all' | BadgeCategory;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'streak', label: 'Streak' },
  { id: 'social', label: 'Social' },
  { id: 'performance', label: 'Performance' },
  { id: 'consistency', label: 'Ritual' },
];
const BADGE_GRID_COLUMNS = 3;
const BADGE_GRID_GAP = spacing.sm;

export default function BadgesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [selected, setSelected] = useState<BadgeProgress | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [badgeFrame, setBadgeFrame] = useState<BadgeFrameStyle | null>(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      async function load() {
        try {
          await evaluateBadgeUnlocks({ event: 'app_open' });
          const [collection, user, equipped] = await Promise.all([
            getBadgeCollection(),
            getOrCreateUser(),
            getEquippedCosmetics(),
          ]);
          if (!mounted) return;
          setBadges(collection);
          setInviteCode(user.inviteCode);
          setBadgeFrame(equipped.badgeFrame);
        } catch {
          if (mounted) setBadges([]);
        }
      }
      load();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const filteredBadges = useMemo(
    () => badges.filter(item => filter === 'all' || item.definition.category === filter),
    [badges, filter]
  );
  const unlockedCount = badges.filter(item => item.unlocked).length;
  const totalBadgeXp = badges.reduce((sum, item) => sum + (item.unlocked ? item.xpAwarded : 0), 0);
  const nextBadge = badges.find(item => !item.unlocked && !item.hiddenUntilUnlocked) ?? badges.find(item => !item.unlocked);
  const gridWidth = Math.max(0, width - spacing.lg * 2);
  const badgeTileWidth = Math.max(84, Math.floor(
    (gridWidth - BADGE_GRID_GAP * (BADGE_GRID_COLUMNS - 1)) / BADGE_GRID_COLUMNS
  ));

  async function handleBrag(item: BadgeProgress) {
    if (!item.unlocked) return;
    const payload = buildSharePayload('badge', {
      inviteCode,
      badgeName: item.definition.name,
      badgeDescription: item.definition.description,
      badgeXp: item.definition.xp,
      source: 'badge',
    });
    try {
      await recordGrowthEvent(growthEventFromPayload(payload, 'share_opened', { surface: 'badge_case' }));
      await Share.share({ message: buildBadgeBragText(item.definition, inviteCode) });
      await markBadgeShared(item.definition.id);
      setBadges(prev => prev.map(b => (
        b.definition.id === item.definition.id ? { ...b, shareCount: b.shareCount + 1 } : b
      )));
      setSelected(prev => prev && prev.definition.id === item.definition.id
        ? { ...prev, shareCount: prev.shareCount + 1 }
        : prev);
    } catch (error) {
      await recordGrowthEvent(growthEventFromPayload(payload, 'share_failed', {
        surface: 'badge_case',
        badgeId: item.definition.id,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.eyebrow}>COLLECTIBLES</Text>
            <Text style={styles.heading}>Badges</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} activeOpacity={0.72}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryNum}>{unlockedCount}/{badges.length}</Text>
            <Text style={styles.summaryLabel}>unlocked</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View>
            <Text style={styles.summaryNum}>{totalBadgeXp}</Text>
            <Text style={styles.summaryLabel}>badge XP</Text>
          </View>
        </View>

        {nextBadge && (
          <TouchableOpacity style={styles.nextCard} onPress={() => setSelected(nextBadge)} activeOpacity={0.84}>
            <FramedBadgePin
              badge={nextBadge.definition}
              size={76}
              locked={!nextBadge.unlocked}
              hidden={nextBadge.hiddenUntilUnlocked}
              frame={nextBadge.unlocked ? badgeFrame : null}
            />
            <View style={styles.nextInfo}>
              <Text style={styles.nextKicker}>Next cute little victory</Text>
              <Text style={styles.nextTitle}>
                {nextBadge.hiddenUntilUnlocked ? 'Secret Badge' : nextBadge.definition.name}
              </Text>
              <Text style={styles.nextProgress}>{nextBadge.progressLabel}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${nextBadge.percent}%` }]} />
              </View>
            </View>
          </TouchableOpacity>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.filterChip, filter === item.id && styles.filterChipActive]}
              onPress={() => setFilter(item.id)}
              activeOpacity={0.78}
            >
              <Text style={[styles.filterText, filter === item.id && styles.filterTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.grid}>
          {filteredBadges.map(item => (
            <BadgeTile
              key={item.definition.id}
              item={item}
              tileWidth={badgeTileWidth}
              frame={badgeFrame}
              onPress={() => setSelected(item)}
            />
          ))}
        </View>
      </ScrollView>

      <BadgeDetailModal
        item={selected}
        frame={badgeFrame}
        onClose={() => setSelected(null)}
        onBrag={handleBrag}
      />
    </SafeAreaView>
  );
}

function BadgeTile({
  item,
  tileWidth,
  frame,
  onPress,
}: {
  item: BadgeProgress;
  tileWidth: number;
  frame: BadgeFrameStyle | null;
  onPress: () => void;
}) {
  const displayName = item.hiddenUntilUnlocked ? 'Secret Badge' : item.definition.name;

  return (
    <TouchableOpacity
      style={[styles.tile, { width: tileWidth }, item.unlocked && styles.tileUnlocked]}
      onPress={onPress}
      activeOpacity={0.84}
    >
      <FramedBadgePin
        badge={item.definition}
        size={56}
        locked={!item.unlocked}
        hidden={item.hiddenUntilUnlocked}
        frame={item.unlocked ? frame : null}
      />
      <Text style={styles.tileName}>{displayName}</Text>
      <Text style={styles.tileXp}>+{item.definition.xp} XP</Text>
      <View style={styles.tileTrack}>
        <View style={[styles.tileFill, { width: `${item.unlocked ? 100 : item.percent}%` }]} />
      </View>
      <Text style={styles.tileStatus}>{item.unlocked ? 'Unlocked' : item.progressLabel}</Text>
    </TouchableOpacity>
  );
}

function BadgeDetailModal({
  item,
  frame,
  onClose,
  onBrag,
}: {
  item: BadgeProgress | null;
  frame: BadgeFrameStyle | null;
  onClose: () => void;
  onBrag: (item: BadgeProgress) => void;
}) {
  if (!item) return null;

  const displayName = item.hiddenUntilUnlocked ? 'Secret Badge' : item.definition.name;
  const displayDescription = item.hiddenUntilUnlocked
    ? 'Keep showing up to reveal this one.'
    : item.definition.description;
  const unlockedDate = item.unlockedAt
    ? new Date(item.unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <FramedBadgePin
            badge={item.definition}
            size={128}
            locked={!item.unlocked}
            hidden={item.hiddenUntilUnlocked}
            frame={item.unlocked ? frame : null}
          />
          <Text style={styles.modalTitle}>{displayName}</Text>
          <Text style={styles.modalDescription}>{displayDescription}</Text>

          <View style={styles.modalMetaRow}>
            <View style={styles.modalMeta}>
              <Text style={styles.modalMetaValue}>+{item.definition.xp}</Text>
              <Text style={styles.modalMetaLabel}>XP</Text>
            </View>
            <View style={styles.modalMeta}>
              <Text style={styles.modalMetaValue}>{item.unlocked ? 'Yes' : `${item.percent}%`}</Text>
              <Text style={styles.modalMetaLabel}>{item.unlocked ? 'Unlocked' : 'Progress'}</Text>
            </View>
            <View style={styles.modalMeta}>
              <Text style={styles.modalMetaValue}>Soon</Text>
              <Text style={styles.modalMetaLabel}>Rarity</Text>
            </View>
          </View>

          <View style={styles.requirementBox}>
            <Text style={styles.requirementLabel}>Requirement</Text>
            <Text style={styles.requirementText}>{item.definition.requirement}</Text>
            <Text style={styles.requirementProgress}>{item.progressLabel}</Text>
          </View>

          {item.unlocked && unlockedDate ? (
            <Text style={styles.unlockDate}>Unlocked {unlockedDate} · bragged {item.shareCount} times</Text>
          ) : (
            <Text style={styles.unlockDate}>Rarity appears once enough athletes have unlocked this badge.</Text>
          )}

          {item.unlocked ? (
            <TouchableOpacity style={styles.bragBtn} onPress={() => onBrag(item)} activeOpacity={0.84}>
              <Text style={styles.bragText}>BRAG →</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.lockedBtn}>
              <Text style={styles.lockedText}>Locked for now</Text>
            </View>
          )}

          <TouchableOpacity onPress={onClose} activeOpacity={0.72}>
            <Text style={styles.modalClose}>close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function FramedBadgePin({
  badge,
  size,
  locked,
  hidden,
  frame,
}: {
  badge: BadgeProgress['definition'];
  size: number;
  locked?: boolean;
  hidden?: boolean;
  frame: BadgeFrameStyle | null;
}) {
  const frameStyle = !locked ? getBadgeFrameStyle(frame) : null;
  if (!frameStyle) {
    return <BadgePin badge={badge} size={size} locked={locked} hidden={hidden} />;
  }

  return (
    <View
      style={[
        styles.badgeFrameWrap,
        {
          width: size + 14,
          height: size + 14,
          borderRadius: (size + 14) / 2,
          borderColor: frameStyle.borderColor,
          backgroundColor: frameStyle.backgroundColor,
          shadowColor: frameStyle.borderColor,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.badgeFrameGlow,
          {
            backgroundColor: frameStyle.glowColor,
            borderRadius: (size + 22) / 2,
          },
        ]}
      />
      <BadgePin badge={badge} size={size} locked={locked} hidden={hidden} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl + spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontSize: fontSize.xs,
    color: colors.streak,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  heading: {
    fontSize: 34,
    color: colors.text,
    fontWeight: '900',
    letterSpacing: -1.2,
    flexShrink: 1,
  },
  closeBtn: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeText: { color: colors.subtext, fontWeight: '900', fontSize: fontSize.xs },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  summaryNum: { fontSize: 30, fontWeight: '900', color: colors.text, textAlign: 'center' },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '900',
    textAlign: 'center',
  },
  summaryDivider: { width: 1, height: 44, backgroundColor: colors.border },
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.streakSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.creamDeep,
    padding: spacing.lg,
  },
  nextIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextEmoji: { fontSize: 38 },
  nextInfo: { flex: 1, minWidth: 0, gap: 4 },
  nextKicker: {
    fontSize: fontSize.xs,
    color: colors.subtext,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  nextTitle: { fontSize: fontSize.lg, color: colors.text, fontWeight: '900', flexShrink: 1 },
  nextProgress: { fontSize: fontSize.xs, color: colors.subtext, fontWeight: '700' },
  progressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: { height: '100%', backgroundColor: colors.streak },
  filterRow: { gap: spacing.sm, paddingRight: spacing.lg },
  filterChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  filterText: { color: colors.subtext, fontWeight: '900', fontSize: fontSize.xs },
  filterTextActive: { color: '#FFFFFF' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: BADGE_GRID_GAP,
    rowGap: BADGE_GRID_GAP,
  },
  tile: {
    minHeight: 154,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  tileUnlocked: {
    borderColor: '#A8D970',
    backgroundColor: '#FEFFF8',
  },
  badgeIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: { fontSize: 28 },
  tileName: {
    minHeight: 34,
    fontSize: fontSize.xs,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  tileXp: { fontSize: 10, color: colors.streak, fontWeight: '900' },
  tileTrack: {
    width: '100%',
    height: 5,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  tileFill: { height: '100%', backgroundColor: colors.success },
  tileStatus: {
    fontSize: 9,
    color: colors.subtext,
    fontWeight: '700',
    textAlign: 'center',
  },
  badgeFrameWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  badgeFrameGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  modalIcon: {
    width: 112,
    height: 112,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmoji: { fontSize: 58 },
  modalTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.9,
  },
  modalDescription: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalMetaRow: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  modalMeta: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    padding: spacing.md,
    alignItems: 'center',
  },
  modalMetaValue: { fontSize: fontSize.md, color: colors.text, fontWeight: '900' },
  modalMetaLabel: {
    fontSize: 10,
    color: colors.subtext,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  requirementBox: {
    width: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.streakSoft,
    borderWidth: 1,
    borderColor: colors.creamDeep,
    padding: spacing.md,
    gap: 3,
  },
  requirementLabel: {
    fontSize: 10,
    color: colors.subtext,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  requirementText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '900' },
  requirementProgress: { fontSize: fontSize.xs, color: colors.subtext, fontWeight: '700' },
  unlockDate: { fontSize: fontSize.xs, color: colors.subtext, fontWeight: '700', textAlign: 'center' },
  bragBtn: {
    width: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.streak,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  bragText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '900', letterSpacing: 0.8 },
  lockedBtn: {
    width: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.border,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  lockedText: { color: colors.subtext, fontSize: fontSize.md, fontWeight: '900' },
  modalClose: { color: colors.subtext, fontSize: fontSize.sm, fontWeight: '700', padding: spacing.sm },
});
