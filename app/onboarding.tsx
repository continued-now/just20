import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '../components/BrandLogo';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { setSetting } from '../lib/db';
import {
  DEFAULT_NOTIFICATION_MODE,
  DEFAULT_SCHEDULED_HOUR,
  requestPermission,
  scheduleWindowWithFallbackNudges,
} from '../lib/notifications';
import { markOnboardingComplete, updateUsername } from '../lib/user';
import { validateUsername } from '../lib/validation';

const { width } = Dimensions.get('window');
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
const TOTAL_STEPS = 4;

function formatHour(hour: number): string {
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

// Bounces in on mount — each step re-mounts the mascot so the spring fires every time
function MascotBounce({ emoji }: { emoji: string }) {
  const scale = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, tension: 130, friction: 7, useNativeDriver: true }).start();
  }, []);
  return <Animated.Text style={[styles.mascot, { transform: [{ scale }] }]}>{emoji}</Animated.Text>;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [scheduledHour, setScheduledHour] = useState(DEFAULT_SCHEDULED_HOUR);
  const [submitting, setSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs so PanResponder closure always reads latest values without re-creation
  const stepRef = useRef(0);
  const goToStepRef = useRef<(n: number) => void>(() => {});

  function goToStep(next: number) {
    Keyboard.dismiss();
    stepRef.current = next;
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    stepTimerRef.current = setTimeout(() => setStep(next), 160);
  }
  goToStepRef.current = goToStep;

  useEffect(() => () => {
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 12 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderRelease: (_, gs) => {
        const s = stepRef.current;
        if (gs.dx < -50 && s < TOTAL_STEPS - 1) goToStepRef.current(s + 1);
        if (gs.dx > 50 && s > 0) goToStepRef.current(s - 1);
      },
    })
  ).current;

  function handleUsernameNext() {
    const validation = validateUsername(username, { optional: true });
    if (validation.error) {
      setUsernameError(validation.error);
      return;
    }
    if (validation.username) setUsername(validation.username);
    goToStep(2);
  }

  async function finish(notificationsEnabled = false) {
    const validation = validateUsername(username, { optional: true });
    if (validation.error) {
      setUsernameError(validation.error);
      goToStep(1);
      return;
    }
    if (validation.username) await updateUsername(validation.username);
    await setSetting('notification_mode', DEFAULT_NOTIFICATION_MODE);
    await setSetting('scheduled_hour', String(scheduledHour));
    await setSetting('notifications_enabled', notificationsEnabled ? '1' : '0');
    await markOnboardingComplete();
    router.replace('/');
  }

  async function handleAllow() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        await scheduleWindowWithFallbackNudges(scheduledHour);
      }
      await finish(granted);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await finish(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Top bar: back + step counter */}
        <View style={styles.topBar}>
          {step > 0 ? (
            <TouchableOpacity onPress={() => goToStep(step - 1)} activeOpacity={0.7} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
          <Text style={styles.counter}>{step + 1} / {TOTAL_STEPS}</Text>
        </View>

        {/* Step content */}
        <Animated.View style={[styles.content, { opacity: fadeAnim }]} {...panResponder.panHandlers}>
          <ScrollView
            contentContainerStyle={styles.contentScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 0 && <Step0 onNext={() => goToStep(1)} />}
            {step === 1 && (
              <Step1
                username={username}
                error={usernameError}
                onChangeUsername={(value) => {
                  setUsername(value);
                  setUsernameError('');
                }}
                onNext={handleUsernameNext}
              />
            )}
            {step === 2 && (
              <Step2
                scheduledHour={scheduledHour}
                onHourChange={setScheduledHour}
                onNext={() => goToStep(3)}
              />
            )}
            {step === 3 && (
              <Step3
                scheduledHour={scheduledHour}
                submitting={submitting}
                onAllow={handleAllow}
                onSkip={handleSkip}
              />
            )}
          </ScrollView>
        </Animated.View>

        {/* Dots */}
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function Step0({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.step}>
      <MascotBounce emoji="🥚" />
      <BrandLogo size="lg" />
      <Text style={styles.subheadline}>20 pushups.{'\n'}Every day.{'\n'}No excuses.</Text>
      <Text style={styles.body}>No equipment. No gym. Just you and the floor.</Text>
      <TouchableOpacity style={styles.btn} onPress={onNext}>
        <Text style={styles.btnText}>{"LET'S GO ->"}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Step1({
  username,
  error,
  onChangeUsername,
  onNext,
}: {
  username: string;
  error: string;
  onChangeUsername: (s: string) => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.step}>
      <MascotBounce emoji="💪" />
      <Text style={styles.headline}>What do your{'\n'}friends call you?</Text>
      <Text style={styles.body}>{"Shows up on your squad's leaderboard. Optional."}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder="e.g. Constant"
        placeholderTextColor={colors.subtext}
        value={username}
        onChangeText={onChangeUsername}
        maxLength={20}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={onNext}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity style={styles.btn} onPress={onNext}>
        <Text style={styles.btnText}>{username.trim() ? 'LOOKS GOOD ->' : 'SKIP ->'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Step2({
  scheduledHour,
  onHourChange,
  onNext,
}: {
  scheduledHour: number;
  onHourChange: (hour: number) => void;
  onNext: () => void;
}) {
  const today = new Date();
  const miniCal = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      done: i < 5,
      isToday: i === 6,
    };
  });

  return (
    <View style={styles.step}>
      <MascotBounce emoji="🔥" />
      <Text style={styles.headline}>Pick your{'\n'}daily window.</Text>
      <Text style={styles.body}>Choose the time you can defend. Miss a day and the streak resets.</Text>

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

      <View style={styles.noteRow}>
        <Text style={styles.noteEmoji}>🔥</Text>
        <Text style={styles.noteText}>Every completed day extends the streak. Earn freeze tokens later by staying consistent.</Text>
      </View>

      <View style={styles.timePicker}>
        <Text style={styles.timePickerLabel}>Reminder window</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hourRow}
        >
          {HOURS.map(hour => (
            <TouchableOpacity
              key={hour}
              style={[styles.hourChip, hour === scheduledHour && styles.hourChipActive]}
              onPress={() => onHourChange(hour)}
              activeOpacity={0.75}
            >
              <Text style={[styles.hourChipText, hour === scheduledHour && styles.hourChipTextActive]}>
                {formatHour(hour)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.btn} onPress={onNext}>
        <Text style={styles.btnText}>USE {formatHour(scheduledHour).toUpperCase()} →</Text>
      </TouchableOpacity>
    </View>
  );
}

function Step3({
  scheduledHour,
  submitting,
  onAllow,
  onSkip,
}: {
  scheduledHour: number;
  submitting: boolean;
  onAllow: () => void;
  onSkip: () => void;
}) {
  return (
    <View style={styles.step}>
      <MascotBounce emoji="😤" />
      <Text style={styles.headline}>We will keep{'\n'}you honest.</Text>
      <Text style={styles.body}>
        Your {formatHour(scheduledHour)} window opens first. If you miss it, backup nudges begin.
      </Text>

      <View style={styles.notifPreview}>
        <View style={styles.notifRow}>
          <Text style={styles.notifIcon}>⏰</Text>
          <Text style={styles.notifMsg}>{formatHour(scheduledHour)} window is open. 10 minutes.</Text>
        </View>
        <View style={styles.notifDivider} />
        <View style={styles.notifRow}>
          <Text style={styles.notifIcon}>🙄</Text>
          <Text style={styles.notifMsg}>Missed it? Fine. Fallback nudges begin.</Text>
        </View>
        <View style={styles.notifDivider} />
        <View style={styles.notifRow}>
          <Text style={styles.notifIcon}>💢</Text>
          <Text style={styles.notifMsg}>More nudges means less XP. Do the 20.</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.btn, submitting && styles.btnDisabled]}
        onPress={onAllow}
        disabled={submitting}
      >
        <Text style={styles.btnText}>{submitting ? 'SAVING...' : 'ALLOW NOTIFICATIONS →'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSkip} style={styles.skipBtn} disabled={submitting}>
        <Text style={styles.skipText}>skip (not recommended)</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  kav: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  backBtn: { minWidth: 64 },
  backText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.subtext },
  counter: { fontSize: fontSize.sm, fontWeight: '700', color: colors.subtext },

  content: { flex: 1 },
  contentScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },

  step: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
  },

  mascot: { fontSize: 72 },
  headline: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: -1.4,
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

  // Username input (Step 1)
  input: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  inputError: { borderColor: colors.accent },
  errorText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textAlign: 'center',
  },

  btn: {
    backgroundColor: colors.text,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    minWidth: width * 0.7,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.62 },
  btnText: {
    color: colors.bg,
    fontSize: fontSize.md,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  skipBtn: { paddingVertical: spacing.sm },
  skipText: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // Mini calendar (Step 2)
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

  noteRow: {
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
  noteEmoji: { fontSize: 20 },
  noteText: { flex: 1, fontSize: fontSize.sm, color: colors.subtext, fontWeight: '500', lineHeight: 18 },

  timePicker: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  timePickerLabel: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  hourRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  hourChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hourChipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  hourChipText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.subtext,
  },
  hourChipTextActive: { color: colors.bg },

  // Mechanic card (Step 3)
  mechCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mechRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  mechIconBox: {
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

  // Notification preview (Step 4)
  notifPreview: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  notifDivider: { height: 1, backgroundColor: colors.border },
  notifIcon: { fontSize: 20 },
  notifMsg: { flex: 1, fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },

  // Step dots
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.text, width: 20, borderRadius: 4 },
});
