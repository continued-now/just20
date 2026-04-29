import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { openWeeklyChest, getCoins } from '../lib/coins';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimatedView = Animated.View as any;

const COIN_COLORS = [colors.yellow, colors.streak, colors.brand, colors.yellow, '#FFEC8B'];
const COIN_COUNT = 20;

export default function ChestOpenScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<'idle' | 'opening' | 'result'>('idle');
  const [reward, setReward] = useState<number | null>(null);
  const [balance, setBalance] = useState(0);

  const mountedRef = useRef(true);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const chestOpacity = useRef(new Animated.Value(1)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  const coins = useRef(
    Array.from({ length: COIN_COUNT }, (_, i) => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      color: COIN_COLORS[i % COIN_COLORS.length],
      size: 8 + (i % 3) * 4,
      angle: (i / COIN_COUNT) * Math.PI * 2,
      dist: 60 + (i % 4) * 30,
    }))
  ).current;

  useEffect(() => {
    getCoins()
      .then(c => {
        if (mountedRef.current) setBalance(c.balance);
      })
      .catch(() => {});
    return () => {
      mountedRef.current = false;
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  async function handleOpen() {
    if (phase !== 'idle') return;
    setPhase('opening');

    // Shake the chest
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start(async () => {
      // Claim the reward
      let amount: number | null = null;
      let newBalance = balance;
      try {
        amount = await openWeeklyChest();
        const newCoins = await getCoins();
        newBalance = newCoins.balance;
      } catch {
        setPhase('idle');
        Alert.alert('Chest unavailable', 'Could not open the weekly chest. Please try again.');
        return;
      }

      if (amount === null) {
        setPhase('idle');
        Alert.alert('Chest unavailable', 'This chest is not ready yet.');
        return;
      }

      setReward(amount);
      setBalance(newBalance);

      // Chest pops open
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1.3, tension: 80, friction: 4, useNativeDriver: true }),
        Animated.timing(chestOpacity, { toValue: 0, duration: 300, delay: 200, useNativeDriver: true }),
      ]).start();

      // Coins burst out
      const coinAnims = coins.map((c, i) =>
        Animated.sequence([
          Animated.delay(i * 20),
          Animated.parallel([
            Animated.timing(c.x, {
              toValue: Math.cos(c.angle) * c.dist,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(c.y, {
              toValue: Math.sin(c.angle) * c.dist - 40,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(c.opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
              Animated.delay(300),
              Animated.timing(c.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]),
          ]),
        ])
      );
      Animated.parallel(coinAnims).start();

      // Show result
      resultTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        Animated.timing(resultOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        setPhase('result');
      }, 600);
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.heading}>Weekly Chest</Text>
        <Text style={styles.sub}>
          {phase === 'result'
            ? 'Your reward for showing up this week.'
            : 'Complete 5+ days in a week to earn this.'}
        </Text>

        <View style={styles.chestArea}>
          {/* Coin particles */}
          {coins.map((c, i) => (
            <AnimatedView
              key={i}
              pointerEvents="none"
              style={[
                styles.coinParticle,
                {
                  width: c.size,
                  height: c.size,
                  borderRadius: c.size / 2,
                  backgroundColor: c.color,
                  transform: [{ translateX: c.x }, { translateY: c.y }],
                  opacity: c.opacity,
                },
              ]}
            />
          ))}

          {/* Chest */}
          <AnimatedView
            style={[
              styles.chest,
              {
                transform: [{ translateX: shakeAnim }, { scale: scaleAnim }],
                opacity: chestOpacity,
              },
            ]}
          >
            <Text style={styles.chestEmoji}>📦</Text>
          </AnimatedView>

          {/* Result */}
          {phase === 'result' && reward !== null && (
            <AnimatedView style={[styles.result, { opacity: resultOpacity }]}>
              <Text style={styles.resultCoins}>+{reward}</Text>
              <Text style={styles.resultLabel}>coins</Text>
            </AnimatedView>
          )}
        </View>

        {phase !== 'result' && (
          <Text style={styles.balanceHint}>Balance: {balance} coins</Text>
        )}
        {phase === 'result' && (
          <Text style={styles.balanceHint}>New balance: {balance} coins</Text>
        )}

        <View style={styles.actions}>
          {phase === 'idle' && (
            <TouchableOpacity style={styles.openBtn} onPress={handleOpen} activeOpacity={0.85}>
              <Text style={styles.openBtnText}>OPEN CHEST →</Text>
            </TouchableOpacity>
          )}
          {phase === 'result' && (
            <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/')} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>NICE. →</Text>
            </TouchableOpacity>
          )}
          {phase === 'opening' && (
            <View style={styles.openBtn}>
              <Text style={styles.openBtnText}>Opening...</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, paddingHorizontal: spacing.lg, alignItems: 'center' },
  heading: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  sub: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  chestArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  coinParticle: {
    position: 'absolute',
  },
  chest: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chestEmoji: { fontSize: 100 },
  result: {
    position: 'absolute',
    alignItems: 'center',
  },
  resultCoins: {
    fontSize: 80,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: -3,
    lineHeight: 84,
  },
  resultLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  balanceHint: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  actions: { paddingBottom: spacing.xl, width: '100%' },
  openBtn: {
    backgroundColor: '#FFD700',
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  openBtnText: {
    color: '#000000',
    fontSize: fontSize.lg,
    fontWeight: '900',
    letterSpacing: 1,
  },
  doneBtn: {
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
