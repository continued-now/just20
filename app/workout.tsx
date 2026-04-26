import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useSharedValue, Worklets } from 'react-native-worklets-core';
import { RepCounter } from '../components/RepCounter';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { analyzePose, parseMoveNetOutput } from '../lib/poseDetection';
import { saveSession } from '../lib/db';
import { cancelAllNudges } from '../lib/notifications';

const TARGET = 20;

export default function WorkoutScreen() {
  const router = useRouter();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const model = useTensorflowModel(require('../assets/model/movenet_lightning.tflite'));
  const { resize } = useResizePlugin();

  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState('Get into position');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const startTimeRef = useRef<number>(0);
  const finishedRef = useRef(false);

  // Worklet-accessible shared state
  const wentDown = useSharedValue(false);
  const lastDownTime = useSharedValue(0);
  const repCount = useSharedValue(0);
  const isStarted = useSharedValue(false);
  const lastSentCount = useSharedValue(-1);
  const lastFeedbackTime = useSharedValue(0);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  // Stable JS-thread callback — created once, never re-created
  const onRepsUpdate = useRef(
    Worklets.createRunOnJS((count: number, fb: string) => {
      setReps(count);
      setFeedback(fb);
      if (count >= TARGET && !finishedRef.current) {
        finishedRef.current = true;
        setFinished(true);
      }
    })
  ).current;

  // Haptic on each rep
  const prevRepsRef = useRef(0);
  useEffect(() => {
    if (reps > prevRepsRef.current) {
      prevRepsRef.current = reps;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [reps]);

  // 3-2-1 countdown
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      setFeedback('Go!');
      isStarted.value = true;
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, isStarted]);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (!isStarted.value || model.state !== 'loaded' || !model.model) return;

      const resized = resize(frame, {
        scale: { width: 192, height: 192 },
        pixelFormat: 'rgb',
        dataType: 'float32',
      });

      const outputs = model.model.runSync([resized]);
      const raw = outputs[0] as Float32Array;
      const kps = parseMoveNetOutput(raw);
      const { phase, feedback: fb } = analyzePose(kps);
      const now = Date.now();

      if (phase === 'down' && !wentDown.value) {
        wentDown.value = true;
        lastDownTime.value = now;
      }

      if (phase === 'up' && wentDown.value && now - lastDownTime.value > 350) {
        repCount.value = repCount.value + 1;
        wentDown.value = false;
        lastSentCount.value = repCount.value;
        lastFeedbackTime.value = now;
        onRepsUpdate(repCount.value, 'Great rep!');
      } else {
        // Throttle feedback updates to ~2 per second to reduce JS thread wake-ups
        const countChanged = repCount.value !== lastSentCount.value;
        if (countChanged || now - lastFeedbackTime.value > 500) {
          lastSentCount.value = repCount.value;
          lastFeedbackTime.value = now;
          onRepsUpdate(repCount.value, fb);
        }
      }
    },
    [model, isStarted, wentDown, lastDownTime, repCount, lastSentCount, lastFeedbackTime, onRepsUpdate, resize]
  );

  function handleStart() {
    wentDown.value = false;
    lastDownTime.value = 0;
    repCount.value = 0;
    lastSentCount.value = -1;
    lastFeedbackTime.value = 0;
    finishedRef.current = false;
    prevRepsRef.current = 0;
    startTimeRef.current = Date.now();
    setReps(0);
    setFinished(false);
    setStarted(true);
    setCountdown(3);
    // isStarted.value set after countdown reaches 0
  }

  async function handleFinish() {
    isStarted.value = false;
    const duration = Date.now() - startTimeRef.current;
    await saveSession(reps, duration);
    await cancelAllNudges();
    router.replace({
      pathname: '/completion',
      params: { reps: String(reps), duration: String(duration) },
    });
  }

  function handleClose() {
    if (started && reps > 0) {
      Alert.alert('Stop workout?', 'Your reps will still be saved.', [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            isStarted.value = false;
            const duration = Date.now() - startTimeRef.current;
            await saveSession(reps, duration);
            await cancelAllNudges();
            router.back();
          },
        },
      ]);
    } else {
      router.back();
    }
  }

  useEffect(() => {
    if (finished) {
      const t = setTimeout(handleFinish, 600);
      return () => clearTimeout(t);
    }
  }, [finished]);

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.permText}>Camera permission needed</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const modelReady = model.state === 'loaded';
  const modelError = model.state === 'error';

  return (
    <View style={styles.root}>
      {device ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={!finished}
          frameProcessor={frameProcessor}
          pixelFormat="yuv"
        />
      ) : (
        <View style={styles.cameraFallback} />
      )}

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header}>
          <Text style={styles.title}>just20</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.feedbackWrap}>
          {countdown !== null ? (
            <Text style={[styles.feedbackText, styles.countdownText]}>
              {countdown === 0 ? 'Go!' : String(countdown)}
            </Text>
          ) : (
            <Text style={styles.feedbackText}>{feedback}</Text>
          )}
        </View>

        <View style={styles.bottom}>
          {finished ? (
            <View style={styles.finishedBanner}>
              <Text style={styles.finishedText}>Done! 🎉</Text>
            </View>
          ) : (
            <>
              <RepCounter count={reps} target={TARGET} />
              <View style={styles.dots}>
                {Array.from({ length: TARGET }).map((_, i) => (
                  <View key={i} style={[styles.dot, i < reps && styles.dotFilled]} />
                ))}
              </View>
              {!started && (
                <TouchableOpacity
                  style={[styles.startBtn, (!modelReady || modelError) && styles.startBtnDisabled]}
                  onPress={handleStart}
                  disabled={!modelReady || modelError}
                >
                  <Text style={styles.startBtnText}>
                    {modelError ? 'Model failed to load' : modelReady ? 'START' : 'Loading model…'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  cameraFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1a1a1a' },
  safe: { flex: 1, backgroundColor: colors.bg },
  overlay: { flex: 1, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: { fontSize: 24, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
  closeBtn: { position: 'absolute', right: spacing.lg, top: spacing.md, padding: spacing.sm },
  closeTxt: { fontSize: 20, color: '#FFF' },
  feedbackWrap: { alignItems: 'center', paddingHorizontal: spacing.lg },
  feedbackText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  countdownText: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -2,
  },
  bottom: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  dots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'center',
    maxWidth: 280,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotFilled: { backgroundColor: colors.success },
  startBtn: {
    backgroundColor: '#FFF',
    borderRadius: radius.md,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  startBtnDisabled: { backgroundColor: colors.disabled },
  startBtnText: { fontSize: fontSize.lg, fontWeight: '900', color: colors.text, letterSpacing: 1 },
  finishedBanner: { paddingVertical: spacing.lg, alignItems: 'center' },
  finishedText: { fontSize: fontSize.xl, fontWeight: '900', color: '#FFF' },
  permText: { fontSize: fontSize.md, color: colors.text },
  permBtn: {
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  permBtnText: { color: '#FFF', fontWeight: '700', fontSize: fontSize.md },
});
