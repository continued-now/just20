import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { XpProgressCard } from '../components/XpProgressCard';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import {
  equipShopItem,
  getShopState,
  purchaseShopItem,
  type ShopItemId,
  type ShopItemView,
  type ShopState,
} from '../lib/shop';

export default function XpShopScreen() {
  const router = useRouter();
  const [shop, setShop] = useState<ShopState | null>(null);
  const [busyItemId, setBusyItemId] = useState<ShopItemId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setShop(await getShopState());
    } catch {
      setShop(null);
      setNotice('Shop could not load. Try reopening it in a second.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getShopState()
        .then(next => {
          if (active) setShop(next);
        })
        .catch(() => {
          if (active) {
            setShop(null);
            setNotice('Shop could not load. Try reopening it in a second.');
          }
        });
      return () => {
        active = false;
      };
    }, [])
  );

  async function runAction(item: ShopItemView) {
    if (busyItemId) return;
    await Haptics.selectionAsync();
    setBusyItemId(item.id);
    setNotice(null);
    try {
      const result = item.state === 'equip'
        ? await equipShopItem(item.id)
        : await purchaseShopItem(item.id);
      setShop(result.state);
      setNotice(result.message);
      if (result.ok) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setNotice('That did not go through. Your coins are safe; try once more.');
      await load();
    } finally {
      setBusyItemId(null);
    }
  }

  function handleItemPress(item: ShopItemView) {
    if (item.state === 'locked' || item.state === 'need_coins' || item.state === 'equipped' || item.state === 'owned' || item.state === 'maxed') {
      setNotice(item.helper);
      return;
    }

    if (item.state === 'equip') {
      runAction(item);
      return;
    }

    Alert.alert(
      `Buy ${item.title}?`,
      `${item.price} coins. XP stays earned-only; this is a cosmetic or streak utility purchase.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Buy', onPress: () => runAction(item) },
      ]
    );
  }

  const featured = shop?.items.filter(item => item.id === 'streak_freeze_refill' || item.id === 'proof_sunrise' || item.id === 'badge_sprout_frame') ?? [];
  const cosmetics = shop?.items.filter(item => !featured.some(featuredItem => featuredItem.id === item.id)) ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} activeOpacity={0.76}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.eyebrow}>COIN SHOP</Text>
          <Text style={styles.heading}>Spend coins. Keep XP sacred.</Text>
          <Text style={styles.subhead}>
            XP unlocks eligibility. Coins buy style and tiny utility. Clean reps, badges, and rank stay earned.
          </Text>
        </View>

        <XpProgressCard totalXp={shop?.totalXp ?? 0} />

        <View style={styles.walletCard}>
          <View>
            <Text style={styles.walletLabel}>Wallet</Text>
            <Text style={styles.walletValue}>{shop?.coinBalance ?? 0} coins</Text>
          </View>
          <View style={styles.walletDivider} />
          <View>
            <Text style={styles.walletLabel}>XP level</Text>
            <Text style={styles.walletLevel}>Lv {shop?.level ?? 1}</Text>
            <Text style={styles.walletCopy}>{shop?.levelTitle ?? 'Starter Sprout'}</Text>
          </View>
          <View style={styles.freezePill}>
            <Text style={styles.freezeText}>🧊 {shop?.freezeCount ?? 0}/3</Text>
          </View>
        </View>

        {notice ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        {!shop ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.streak} />
            <Text style={styles.loadingText}>Loading the tiny store...</Text>
          </View>
        ) : (
          <>
            <ShopSection title="Featured" subtitle="Useful, cute, and still fair to the daily promise.">
              {featured.map(item => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  busy={busyItemId === item.id}
                  onPress={() => handleItemPress(item)}
                />
              ))}
            </ShopSection>

            <ShopSection title="Cosmetics" subtitle="Style unlocks you can equip immediately.">
              {cosmetics.map(item => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  busy={busyItemId === item.id}
                  onPress={() => handleItemPress(item)}
                />
              ))}
            </ShopSection>
          </>
        )}

        <View style={styles.guardrailCard}>
          <Text style={styles.guardrailTitle}>Shop rule</Text>
          <Text style={styles.guardrailCopy}>
            No buying XP. No buying clean-rep badges. No buying rank. Freeze refills are capped so the daily promise still matters.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.cta}
          onPress={() => router.replace('/workout' as any)}
          activeOpacity={0.84}
        >
          <Text style={styles.ctaText}>Earn more coins →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ShopSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSub}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
}

function ShopItemCard({
  item,
  busy,
  onPress,
}: {
  item: ShopItemView;
  busy: boolean;
  onPress: () => void;
}) {
  const disabled = item.state === 'locked' || item.state === 'need_coins' || item.state === 'equipped' || item.state === 'owned' || item.state === 'maxed';
  const ready = item.state === 'buy' || item.state === 'equip';

  return (
    <View style={[styles.shopItem, ready && styles.shopItemReady, item.equipped && styles.shopItemEquipped]}>
      <View style={[styles.itemIcon, { backgroundColor: `${item.accentColor}22` }]}>
        <Text style={styles.itemIconText}>{item.icon}</Text>
      </View>
      <View style={styles.itemTextWrap}>
        <View style={styles.itemTitleRow}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={[styles.itemTag, ready && { color: item.accentColor }]}>{item.tag}</Text>
        </View>
        <Text style={styles.itemCopy}>{item.copy}</Text>
        <Text style={[styles.itemHelper, ready && { color: item.accentColor }]}>{item.helper}</Text>
      </View>
      <TouchableOpacity
        style={[
          styles.itemCta,
          ready && { backgroundColor: item.accentColor, borderColor: item.accentColor },
          disabled && styles.itemCtaDisabled,
        ]}
        onPress={onPress}
        disabled={busy || disabled}
        activeOpacity={0.82}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={[styles.itemCtaText, !ready && styles.itemCtaTextDisabled]}>
            {item.ctaLabel}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  closeBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  closeText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  eyebrow: {
    color: colors.streak,
    fontSize: fontSize.xs,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  heading: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  subhead: {
    color: colors.subtext,
    fontSize: fontSize.md,
    fontWeight: '700',
    lineHeight: 22,
    maxWidth: 350,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: fontSize.xs,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  walletValue: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
  },
  walletLevel: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  walletCopy: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: fontSize.xs,
    fontWeight: '700',
    maxWidth: 120,
  },
  walletDivider: {
    width: 1,
    height: 54,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  freezePill: {
    marginLeft: 'auto',
    borderRadius: radius.full,
    backgroundColor: 'rgba(91,196,245,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(91,196,245,0.32)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  freezeText: {
    color: '#BCEBFF',
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  noticeCard: {
    borderRadius: radius.md,
    backgroundColor: '#FFF6D8',
    borderWidth: 1,
    borderColor: '#FFE18A',
    padding: spacing.md,
  },
  noticeText: {
    color: '#8A6317',
    fontSize: fontSize.sm,
    fontWeight: '800',
    lineHeight: 19,
  },
  loadingCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.subtext,
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  section: { gap: spacing.sm, marginTop: spacing.xs },
  sectionHeader: { gap: 2 },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
  sectionSub: {
    color: colors.subtext,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  shopItemReady: {
    borderColor: '#FFD1B5',
    backgroundColor: '#FFF8F3',
  },
  shopItemEquipped: {
    borderColor: '#A8D970',
    backgroundColor: '#FBFFF4',
  },
  itemIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconText: { fontSize: 23 },
  itemTextWrap: { flex: 1, minWidth: 0, gap: spacing.xs },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '900',
    flex: 1,
  },
  itemTag: {
    color: colors.subtext,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    backgroundColor: '#F0F0EA',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  itemCopy: {
    color: colors.subtext,
    fontSize: fontSize.sm,
    fontWeight: '700',
    lineHeight: 19,
  },
  itemHelper: {
    color: colors.streak,
    fontSize: fontSize.xs,
    fontWeight: '900',
  },
  itemCta: {
    minWidth: 86,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.text,
    backgroundColor: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  itemCtaDisabled: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
  },
  itemCtaText: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: '900',
  },
  itemCtaTextDisabled: {
    color: colors.subtext,
  },
  guardrailCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#FFE082',
    backgroundColor: '#FFF8DC',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  guardrailTitle: {
    color: '#8A6400',
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  guardrailCopy: {
    color: '#8A6400',
    fontSize: fontSize.sm,
    fontWeight: '700',
    lineHeight: 19,
  },
  cta: {
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '900',
  },
});
