import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { requestPermission } from '../lib/notifications';
import { getOrCreateUser, markOnboardingComplete } from '../lib/user';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 5;

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [inviteCode, setInviteCode] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getOrCreateUser().then(u => setInviteCode(u.inviteCode));
  }, []);

  function goToStep(next: number) {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setStep(next), 180);
  }

  async function finish() {
    await markOnboardingComplete();
    const user = await getOrCreateUser();
    if (!user.username) {
      router.replace('/profile-setup');
    } else {
      router.replace('/');
    }
  }

  async function handleNotificationStep() {
    await requestPermission();
    await finish();
  }

  async function handleShareCode() {
    const text = `Just do 20 pushups. Every day. Join me on Just20!\n\nAdd me with code: ${inviteCode}\n\n#just20 #fitness`;
    try { await Share.share({ message: text }); } catch { /* dismissed */ }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        {step > 0 ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => goToStep(step - 1)} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {step === 0 && <Step0 onNext={() => goToStep(1)} />}
        {step === 1 && <Step1 onNext={() => goToStep(2)} />}
        {step === 2 && <Step2 onNext={() => goToStep(3)} />}
        {step === 3 && <Step3 inviteCode={inviteCode} onShare={handleShareCode} onNext={() => goToStep(4)} />}
        {step === 4 && <Step4 onAllow={handleNotificationStep} onSkip={finish} />}
      </Animated.View>

      {/* Step dots */}
      <View style={styles.dots}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>
    </SafeAreaView>
  );
}

function Step0({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.step}>
      <Text style={styles.mascot}>🥚</Text>
      <Text style={styles.headline}>just20</Text>
      <Text style={styles.subheadline}>20 pushups.{'\n'}Every day.{'\n'}No excuses.</Text>
      <Text style={styles.body}>
        The simplest fitness habit alive. No equipment, no gym, no gear. Just you and the floor.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={onNext}>
        <Text style={styles.btnText}>LET'S GO →</Text>
      </TouchableOpacity>
    </View>
  );
}

function Step1({ onNext }: { onNext: () => void }) {
  const today = new Date();
  const miniCal = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const done = i < 5; // show 5 completed days for demo
    const isToday = i === 6;
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      done,
      isToday,
    };
  });

  return (
    <View style={styles.step}>
      <Text style={styles.mascot}>🔥</Text>
      <Text style={styles.headline}>Show up every day.</Text>
      <Text style={styles.body}>
        Miss a day, your streak resets. But miss by one? Your freeze token kicks in automatically — you get a free pass.
      </Text>

      {/* Mini calendar demo */}
      <View style={styles.calDemo}>
        {miniCal.map((d, i) => (
          <View key={i} style={styles.calCol}>
            <View style={[styles.calDot, d.done ? styles.calDotDone : d.isToday ? styles.calDotToday : styles.calDotMiss]}>
              {d.done && <Text style={styles.calCheck}>✓</Text>}
            </View>
            <Text style={[styles.calLabel, d.isToday && styles.calLabelToday]}>{d.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.freezeNote}>
        <Text style={styles.freezeIcon}>🧊</Text>
        <Text style={styles.freezeText}>Every 7-day streak earns you a freeze token. Use it wisely.</Text>
      </View>

      <TouchableOpacity style={styles.btn} onPress={onNext}>
        <Text style={styles.btnText}>GOT IT →</Text>
      </TouchableOpacity>
    </View>
  );
}

function Step2({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.step}>
      <Text style={styles.mascot}>⚡</Text>
      <Text style={styles.headline}>One shot to get it done.</Text>
      <Text style={styles.body}>
        We send random windows throughout the day. When your window hits, you've got 5 minutes. Drop and give us 20 — anywhere, any time.
      </Text>

      <View style={styles.mechCard}>
        <View style={styles.mechRow}>
          <View style={styles.mechIcon}><Text style={styles.mechEmoji}>🎲</Text></View>
          <View style={styles.mechTextWrap}>
            <Text style={styles.mechTitle}>Random times</Text>
            <Text style={styles.mechSub}>You can't predict when. Neither can we, really.</Text>
          </View>
        </View>
        <View style={styles.mechDivider} />
        <View style={styles.mechRow}>
          <View style={styles.mechIcon}><Text style={styles.mechEmoji}>⏱</Text></View>
          <View style={styles.mechTextWrap}>
            <Text style={styles.mechTitle}>5-minute window</Text>
            <Text style={styles.mechSub}>Get the notification. Do 20. Done for the day.</Text>
          </View>
        </View>
        <View style={styles.mechDivider} />
        <View style={styles.mechRow}>
          <View style={styles.mechIcon}><Text style={styles.mechEmoji}>📍</Text></View>
          <View style={styles.mechTextWrap}>
            <Text style={styles.mechTitle}>Anywhere</Text>
            <Text style={styles.mechSub}>Floor. Office. Kitchen. No excuses accepted.</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.btn} onPress={onNext}>
        <Text style={styles.btnText}>UNDERSTOOD →</Text>
      </TouchableOpacity>
    </View>
  );
}

function Step3({
  inviteCode,
  onShare,
  onNext,
}: {
  inviteCode: string;
  onShare: () => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.mascot}>💪</Text>
      <Text style={styles.headline}>Accountability is everything.</Text>
      <Text style={styles.body}>
        Add a buddy. When they know you're watching, you both show up. This is your code — share it.
      </Text>

      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>YOUR CODE</Text>
        <Text style={styles.codeValue}>{inviteCode || 'JUST-XXXXXX'}</Text>
      </View>

      <TouchableOpacity style={styles.btn} onPress={onShare}>
        <Text style={styles.btnText}>SHARE CODE →</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onNext} style={styles.skipBtn}>
        <Text style={styles.skipText}>skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}

function Step4({ onAllow, onSkip }: { onAllow: () => void; onSkip: () => void }) {
  return (
    <View style={styles.step}>
      <Text style={styles.mascot}>😤</Text>
      <Text style={styles.headline}>We will annoy you.</Text>
      <Text style={styles.body}>
        Up to 20 push notifications a day, escalating in aggression until you do your pushups. This is how the streak lives.
      </Text>

      <View style={styles.notifPreview}>
        <View style={styles.notifRow}>
          <Text style={styles.notifIcon}>🙄</Text>
          <Text style={styles.notifMsg}>gentle reminder: the floor is waiting.</Text>
        </View>
        <View style={styles.notifRow}>
          <Text style={styles.notifIcon}>😤</Text>
          <Text style={styles.notifMsg}>DO THE PUSHUPS. i'm not asking.</Text>
        </View>
        <View style={styles.notifRow}>
          <Text style={styles.notifIcon}>💢</Text>
          <Text style={styles.notifMsg}>FINAL WARNING. 20 PUSHUPS. DO IT.</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.btn} onPress={onAllow}>
        <Text style={styles.btnText}>ALLOW NOTIFICATIONS →</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
        <Text style={styles.skipText}>skip (not recommended)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  backBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.subtext,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  step: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
  },

  mascot: { fontSize: 72 },
  headline: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 34,
  },
  subheadline: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.streak,
    textAlign: 'center',
    lineHeight: 44,
  },
  body: {
    fontSize: fontSize.md,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },

  btn: {
    backgroundColor: colors.text,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    minWidth: width * 0.7,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  btnText: {
    color: colors.bg,
    fontSize: fontSize.md,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  skipBtn: {
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // Mini calendar (Step 1)
  calDemo: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  calCol: { alignItems: 'center', gap: 4 },
  calDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDotDone: { backgroundColor: colors.success },
  calDotMiss: { backgroundColor: colors.border },
  calDotToday: { backgroundColor: colors.border, borderWidth: 2, borderColor: colors.streak },
  calCheck: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  calLabel: { fontSize: 10, color: colors.subtext, fontWeight: '600' },
  calLabelToday: { color: colors.streak, fontWeight: '800' },

  freezeNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'stretch',
  },
  freezeIcon: { fontSize: 20 },
  freezeText: { flex: 1, fontSize: fontSize.sm, color: colors.subtext, fontWeight: '500', lineHeight: 18 },

  // Mechanic card (Step 2)
  mechCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mechRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  mechIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mechEmoji: { fontSize: 20 },
  mechTextWrap: { flex: 1, gap: 2 },
  mechTitle: { fontSize: fontSize.sm, fontWeight: '800', color: colors.text },
  mechSub: { fontSize: fontSize.xs, color: colors.subtext, fontWeight: '500', lineHeight: 16 },
  mechDivider: { height: 1, backgroundColor: colors.border },

  // Invite code (Step 3)
  codeCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.border,
    alignSelf: 'stretch',
  },
  codeLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeValue: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 2,
  },

  // Notification preview (Step 3)
  notifPreview: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notifIcon: { fontSize: 20 },
  notifMsg: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },

  // Step dots
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.text,
    width: 20,
  },
});
