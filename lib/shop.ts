import {
  addStreakFreeze,
  getCoinTransactions,
  getCoins,
  getShopEquippedRows,
  getShopInventoryRows,
  getStreak,
  getXp,
  grantShopInventoryItem,
  recordCoinTransaction,
  refundCoins,
  setShopEquippedItem,
  spendCoins,
  type CoinTransaction,
} from './db';
import { getXpLevelProgress } from './xp';

export type ShopItemId =
  | 'streak_freeze_refill'
  | 'proof_sunrise'
  | 'proof_midnight'
  | 'badge_sprout_frame'
  | 'badge_honey_frame'
  | 'flame_mint'
  | 'flame_campfire'
  | 'afterglow_soft';

export type ShopSlot = 'proof_card_theme' | 'badge_frame' | 'flame_style' | 'unlock_animation';
export type ShopItemKind = 'consumable' | 'cosmetic';
export type ShopItemState = 'locked' | 'need_coins' | 'buy' | 'equip' | 'equipped' | 'owned' | 'maxed';
export type ProofCardThemeId = Extract<ShopItemId, 'proof_sunrise' | 'proof_midnight'>;
export type BadgeFrameStyle = Extract<ShopItemId, 'badge_sprout_frame' | 'badge_honey_frame'>;
export type FlameStyleId = Extract<ShopItemId, 'flame_mint' | 'flame_campfire'>;
export type UnlockAnimationStyle = Extract<ShopItemId, 'afterglow_soft'>;

export type EquippedCosmetics = {
  proofCardTheme: ProofCardThemeId | null;
  badgeFrame: BadgeFrameStyle | null;
  flameStyle: FlameStyleId | null;
  unlockAnimation: UnlockAnimationStyle | null;
};

export type ShopItem = {
  id: ShopItemId;
  title: string;
  copy: string;
  price: number;
  level: number;
  kind: ShopItemKind;
  slot: ShopSlot | null;
  icon: string;
  tag: string;
  accentColor: string;
};

export type ShopItemView = ShopItem & {
  owned: boolean;
  equipped: boolean;
  state: ShopItemState;
  helper: string;
  ctaLabel: string;
};

export type ShopState = {
  totalXp: number;
  level: number;
  levelTitle: string;
  coinBalance: number;
  freezeCount: number;
  equipped: EquippedCosmetics;
  items: ShopItemView[];
  transactions: CoinTransaction[];
};

export type ShopActionResult = {
  ok: boolean;
  message: string;
  reason?: 'not_found' | 'locked' | 'need_coins' | 'owned' | 'not_owned' | 'maxed' | 'spend_failed';
  state: ShopState;
};

const MAX_FREEZES = 3;

export const SHOP_CATALOG: ShopItem[] = [
  {
    id: 'streak_freeze_refill',
    title: 'Streak Freeze Refill',
    copy: 'Restock one safety ice. Still capped at 3, because unlimited insurance makes the streak boring.',
    price: 120,
    level: 2,
    kind: 'consumable',
    slot: null,
    icon: '🧊',
    tag: 'streak',
    accentColor: '#5BC4F5',
  },
  {
    id: 'proof_sunrise',
    title: 'Sunrise Proof Card',
    copy: 'A warm receipt theme for early wins, comeback arcs, and first-thing floor goblin energy.',
    price: 80,
    level: 3,
    kind: 'cosmetic',
    slot: 'proof_card_theme',
    icon: '🌅',
    tag: 'proof',
    accentColor: '#FF9F1C',
  },
  {
    id: 'proof_midnight',
    title: 'Midnight Proof Card',
    copy: 'A darker receipt for late-night saves and “I still did it” screenshots.',
    price: 120,
    level: 6,
    kind: 'cosmetic',
    slot: 'proof_card_theme',
    icon: '🌙',
    tag: 'proof',
    accentColor: '#7C6BFF',
  },
  {
    id: 'badge_sprout_frame',
    title: 'Sprout Badge Frame',
    copy: 'A soft green enamel frame around the badges you actually earned.',
    price: 90,
    level: 3,
    kind: 'cosmetic',
    slot: 'badge_frame',
    icon: '🌱',
    tag: 'badges',
    accentColor: '#58CC02',
  },
  {
    id: 'badge_honey_frame',
    title: 'Honey Badge Frame',
    copy: 'A golden badge-case trim for milestone screenshots that deserve a little glow.',
    price: 160,
    level: 8,
    kind: 'cosmetic',
    slot: 'badge_frame',
    icon: '🍯',
    tag: 'badges',
    accentColor: '#FFB000',
  },
  {
    id: 'flame_mint',
    title: 'Mint Flame',
    copy: 'Freshen up the streak center with a cooler flame aura.',
    price: 140,
    level: 8,
    kind: 'cosmetic',
    slot: 'flame_style',
    icon: '🔥',
    tag: 'streak',
    accentColor: '#00B894',
  },
  {
    id: 'flame_campfire',
    title: 'Campfire Flame',
    copy: 'A cozy orange streak look for people who keep coming back tomorrow.',
    price: 180,
    level: 10,
    kind: 'cosmetic',
    slot: 'flame_style',
    icon: '🔥',
    tag: 'streak',
    accentColor: '#FF6B35',
  },
  {
    id: 'afterglow_soft',
    title: 'Soft Afterglow',
    copy: 'A calmer badge reveal finish with gentler particles and a premium little settle.',
    price: 180,
    level: 10,
    kind: 'cosmetic',
    slot: 'unlock_animation',
    icon: '✨',
    tag: 'unlock',
    accentColor: '#FFC857',
  },
];

const EMPTY_EQUIPPED: EquippedCosmetics = {
  proofCardTheme: null,
  badgeFrame: null,
  flameStyle: null,
  unlockAnimation: null,
};

function getCatalogItem(itemId: string): ShopItem | null {
  return SHOP_CATALOG.find(item => item.id === itemId) ?? null;
}

function getHelper(item: ShopItem, state: ShopItemState, coinBalance: number): string {
  if (state === 'locked') return `Unlocks at Level ${item.level}. Keep earning XP.`;
  if (state === 'need_coins') return `Need ${item.price - coinBalance} more coins.`;
  if (state === 'equipped') return 'Equipped right now.';
  if (state === 'equip') return 'Owned. Tap to equip.';
  if (state === 'owned') return 'Already yours.';
  if (state === 'maxed') return 'Freeze bank is full at 3/3.';
  return `${item.price} coins · Level ${item.level}+`;
}

function getCtaLabel(state: ShopItemState): string {
  if (state === 'locked') return 'Locked';
  if (state === 'need_coins') return 'Need coins';
  if (state === 'equip') return 'Equip';
  if (state === 'equipped') return 'Equipped';
  if (state === 'owned') return 'Owned';
  if (state === 'maxed') return 'Maxed';
  return 'Buy';
}

function normalizeEquipped(rows: Awaited<ReturnType<typeof getShopEquippedRows>>): EquippedCosmetics {
  const equipped: EquippedCosmetics = { ...EMPTY_EQUIPPED };
  rows.forEach(row => {
    const item = getCatalogItem(row.itemId);
    if (!item?.slot) return;
    if (item.slot === 'proof_card_theme') equipped.proofCardTheme = item.id as ProofCardThemeId;
    if (item.slot === 'badge_frame') equipped.badgeFrame = item.id as BadgeFrameStyle;
    if (item.slot === 'flame_style') equipped.flameStyle = item.id as FlameStyleId;
    if (item.slot === 'unlock_animation') equipped.unlockAnimation = item.id as UnlockAnimationStyle;
  });
  return equipped;
}

export async function getEquippedCosmetics(): Promise<EquippedCosmetics> {
  return normalizeEquipped(await getShopEquippedRows());
}

export async function getShopState(): Promise<ShopState> {
  const [xp, coins, streak, inventoryRows, equippedRows, transactions] = await Promise.all([
    getXp(),
    getCoins(),
    getStreak(),
    getShopInventoryRows(),
    getShopEquippedRows(),
    getCoinTransactions(12),
  ]);
  const progress = getXpLevelProgress(xp.totalEarned);
  const ownedIds = new Set(inventoryRows.map(row => row.itemId));
  const equipped = normalizeEquipped(equippedRows);
  const equippedIds = new Set<string>(Object.values(equipped).filter(Boolean) as string[]);

  const items = SHOP_CATALOG.map(item => {
    const owned = ownedIds.has(item.id);
    const isEquipped = equippedIds.has(item.id);
    let state: ShopItemState = 'buy';

    if (progress.level < item.level) {
      state = 'locked';
    } else if (item.id === 'streak_freeze_refill' && streak.freezeCount >= MAX_FREEZES) {
      state = 'maxed';
    } else if (owned && isEquipped) {
      state = 'equipped';
    } else if (owned && item.slot) {
      state = 'equip';
    } else if (owned) {
      state = 'owned';
    } else if (coins.balance < item.price) {
      state = 'need_coins';
    }

    return {
      ...item,
      owned,
      equipped: isEquipped,
      state,
      helper: getHelper(item, state, coins.balance),
      ctaLabel: getCtaLabel(state),
    };
  });

  return {
    totalXp: xp.totalEarned,
    level: progress.level,
    levelTitle: progress.title,
    coinBalance: coins.balance,
    freezeCount: streak.freezeCount,
    equipped,
    items,
    transactions,
  };
}

export async function purchaseShopItem(itemId: ShopItemId): Promise<ShopActionResult> {
  const item = getCatalogItem(itemId);
  if (!item) {
    return { ok: false, reason: 'not_found', message: 'That shop item is missing.', state: await getShopState() };
  }

  const state = await getShopState();
  const itemState = state.items.find(candidate => candidate.id === itemId);
  if (!itemState) {
    return { ok: false, reason: 'not_found', message: 'That shop item is missing.', state };
  }
  if (itemState.state === 'locked') {
    return { ok: false, reason: 'locked', message: `Reach Level ${item.level} to unlock this.`, state };
  }
  if (itemState.state === 'need_coins') {
    return { ok: false, reason: 'need_coins', message: itemState.helper, state };
  }
  if (itemState.state === 'maxed') {
    return { ok: false, reason: 'maxed', message: 'Your freeze bank is already full.', state };
  }
  if (item.kind === 'cosmetic' && itemState.owned) {
    return { ok: false, reason: 'owned', message: 'Already yours. Use Equip to switch back.', state };
  }

  const spent = await spendCoins(item.price);
  if (!spent) {
    return { ok: false, reason: 'spend_failed', message: 'Coin balance changed. Try again.', state: await getShopState() };
  }

  try {
    if (item.id === 'streak_freeze_refill') {
      const added = await addStreakFreeze(MAX_FREEZES);
      if (!added) {
        await refundCoins(item.price);
        return { ok: false, reason: 'maxed', message: 'Your freeze bank is already full.', state: await getShopState() };
      }
    } else {
      await grantShopInventoryItem(item.id);
      if (item.slot) await setShopEquippedItem(item.slot, item.id);
    }
  } catch (error) {
    await refundCoins(item.price);
    throw error;
  }

  await recordCoinTransaction(-item.price, 'shop_purchase', {
    itemId: item.id,
    title: item.title,
    kind: item.kind,
    slot: item.slot,
  });

  const nextState = await getShopState();
  return {
    ok: true,
    message: item.kind === 'consumable' ? `${item.title} added.` : `${item.title} bought and equipped.`,
    state: nextState,
  };
}

export async function equipShopItem(itemId: ShopItemId): Promise<ShopActionResult> {
  const item = getCatalogItem(itemId);
  const state = await getShopState();
  if (!item?.slot) {
    return { ok: false, reason: 'not_found', message: 'That item cannot be equipped.', state };
  }

  const owned = state.items.find(candidate => candidate.id === itemId)?.owned ?? false;
  if (!owned) {
    return { ok: false, reason: 'not_owned', message: 'Buy this before equipping it.', state };
  }

  await setShopEquippedItem(item.slot, item.id);
  return {
    ok: true,
    message: `${item.title} equipped.`,
    state: await getShopState(),
  };
}

export type ProofCardTheme = {
  cardBg: string;
  stampBg: string;
  stampBorder: string;
  stampText: string;
  metricBg: string;
  metricBorder: string;
  accent: string;
  subtleText: string;
};

export function getProofCardTheme(itemId: ProofCardThemeId | null | undefined): ProofCardTheme {
  if (itemId === 'proof_sunrise') {
    return {
      cardBg: '#21140C',
      stampBg: 'rgba(255,159,28,0.18)',
      stampBorder: 'rgba(255,190,92,0.56)',
      stampText: '#FFB95F',
      metricBg: 'rgba(255,185,95,0.11)',
      metricBorder: 'rgba(255,185,95,0.18)',
      accent: '#FFB95F',
      subtleText: 'rgba(255,239,219,0.56)',
    };
  }

  if (itemId === 'proof_midnight') {
    return {
      cardBg: '#101226',
      stampBg: 'rgba(124,107,255,0.2)',
      stampBorder: 'rgba(164,154,255,0.56)',
      stampText: '#AFA7FF',
      metricBg: 'rgba(175,167,255,0.11)',
      metricBorder: 'rgba(175,167,255,0.18)',
      accent: '#AFA7FF',
      subtleText: 'rgba(232,229,255,0.56)',
    };
  }

  return {
    cardBg: '#0F0F0F',
    stampBg: 'rgba(255,107,53,0.13)',
    stampBorder: 'rgba(255,107,53,0.48)',
    stampText: '#FF6B35',
    metricBg: 'rgba(255,255,255,0.08)',
    metricBorder: 'rgba(255,255,255,0.1)',
    accent: '#FF6B35',
    subtleText: 'rgba(255,255,255,0.55)',
  };
}

export type BadgeFrameConfig = {
  borderColor: string;
  backgroundColor: string;
  glowColor: string;
};

export function getBadgeFrameStyle(itemId: BadgeFrameStyle | null | undefined): BadgeFrameConfig | null {
  if (itemId === 'badge_sprout_frame') {
    return {
      borderColor: '#9BE66E',
      backgroundColor: '#F3FFE9',
      glowColor: 'rgba(88,204,2,0.18)',
    };
  }
  if (itemId === 'badge_honey_frame') {
    return {
      borderColor: '#FFC857',
      backgroundColor: '#FFF8D6',
      glowColor: 'rgba(255,184,0,0.2)',
    };
  }
  return null;
}

export type FlameStyle = {
  emoji: string;
  auraColor: string;
  heroBg: string;
  borderColor: string;
  label: string;
};

export function getFlameStyle(itemId: FlameStyleId | null | undefined): FlameStyle {
  if (itemId === 'flame_mint') {
    return {
      emoji: '🔥',
      auraColor: '#00B894',
      heroBg: '#08251D',
      borderColor: '#27D6A3',
      label: 'Mint flame equipped',
    };
  }
  if (itemId === 'flame_campfire') {
    return {
      emoji: '🔥',
      auraColor: '#FF8A3D',
      heroBg: '#24130A',
      borderColor: '#FFB169',
      label: 'Campfire flame equipped',
    };
  }
  return {
    emoji: '🔥',
    auraColor: '#FF6B35',
    heroBg: '#1D120E',
    borderColor: '#4B2419',
    label: 'Default flame',
  };
}

export function usesSoftAfterglow(itemId: UnlockAnimationStyle | null | undefined): boolean {
  return itemId === 'afterglow_soft';
}
