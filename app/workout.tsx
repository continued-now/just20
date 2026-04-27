import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  CameraRuntimeError,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useSharedValue, Worklets } from 'react-native-worklets-core';
import { RepCounter } from '../components/RepCounter';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import {
  KP,
  analyzePose,
  parseMoveNetOutput,
  type Keypoint,
  type PushupPhase,
} from '../lib/poseDetection';
import { saveSession, setSetting } from '../lib/db';
import { cancelAllNudges } from '../lib/notifications';

const TARGET = 20;
const MIN_OVERLAY_SCORE = 0.2;
const SKELETON_LINKS: Array<[number, number]> = [
  [KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER],
  [KP.LEFT_SHOULDER, KP.LEFT_ELBOW],
  [KP.LEFT_ELBOW, KP.LEFT_WRIST],
  [KP.RIGHT_SHOULDER, KP.RIGHT_ELBOW],
  [KP.RIGHT_ELBOW, KP.RIGHT_WRIST],
  [KP.LEFT_SHOULDER, KP.LEFT_HIP],
  [KP.RIGHT_SHOULDER, KP.RIGHT_HIP],
  [KP.LEFT_HIP, KP.RIGHT_HIP],
  [KP.LEFT_HIP, KP.LEFT_KNEE],
  [KP.LEFT_KNEE, KP.LEFT_ANKLE],
  [KP.RIGHT_HIP, KP.RIGHT_KNEE],
  [KP.RIGHT_KNEE, KP.RIGHT_ANKLE],
];

type PoseOverlayFrame = {
  keypoints: Keypoint[];
  phase: PushupPhase;
  feedback: string;
  confidence: number;
  elbowAngle: number;
};

type OverlaySize = {
  width: number;
  height: number;
};

function PoseSkeleton({
  pose,
  size,
  mirrored,
}: {
  pose: PoseOverlayFrame | null;
  size: OverlaySize;
  mirrored: boolean;
}) {
  if (!pose || size.width <= 0 || size.height <= 0) return null;

  const toPoint = (kp: Keypoint) => ({
    x: (mirrored ? 1 - kp.x : kp.x) * size.width,
    y: kp.y * size.height,
    score: kp.score,
  });

  return (
    <>
      {SKELETON_LINKS.map(([fromIndex, toIndex]) => {
        const from = pose.keypoints[fromIndex];
        const to = pose.keypoints[toIndex];
        if (!from || !to || from.score < MIN_OVERLAY_SCORE || to.score < MIN_OVERLAY_SCORE) {
          return null;
        }

        const start = toPoint(from);
        const end = toPoint(to);
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        return (
          <View
            key={`${fromIndex}-${toIndex}`}
            style={[
              styles.skeletonLine,
              {
                left: (start.x + end.x) / 2 - length / 2,
                top: (start.y + end.y) / 2 - 2,
                width: length,
                transform: [{ rotateZ: `${angle}rad` }],
              },
            ]}
          />
        );
      })}

      {pose.keypoints.map((kp, index) => {
        if (kp.score < MIN_OVERLAY_SCORE) return null;
        const point = toPoint(kp);
        return (
          <View
            key={index}
            style={[
              styles.skeletonJoint,
              kp.score < 0.45 && styles.skeletonJointLow,
              {
                left: point.x - 5,
                top: point.y - 5,
              },
            ]}
          />
        );
      })}
    </>
  );
}

const MILESTONE_MESSAGES: Record<number, string> = {
  5: 'Keep going!',
  10: 'Halfway! 💪',
  15: 'Just 5 more!',
  18: 'So close!',
  19: 'Last one!',
};

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PaceGraph({ timestamps }: { timestamps: number[] }) {
  if (timestamps.length < 2) return null;
  const intervals = timestamps.slice(1).map((t, i) => t - timestamps[i]);
  const maxInterval = Math.max(...intervals);
  const minInterval = Math.min(...intervals);
  const range = maxInterval - minInterval || 1;
  const BAR_MAX = 24;
  const BAR_MIN = 6;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: BAR_MAX + 4 }}>
      {intervals.map((t, i) => {
        const normalized = 1 - (t - minInterval) / range;
        const height = BAR_MIN + normalized * (BAR_MAX - BAR_MIN);
        const barColor =
          normalized > 0.65 ? colors.success : normalized > 0.3 ? colors.streak : 'rgba(255,255,255,0.35)';
        return <View key={i} style={{ width: 7, height, borderRadius: 2, backgroundColor: barColor }} />;
      })}
    </View>
  );
}

export default function WorkoutScreen() {
  const router = useRouter();
  const { hasPermission, requestPermission } = useCameraPermission();
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const device = frontDevice ?? backDevice;
  const usingFallbackCamera = !frontDevice && !!backDevice;
  const model = useTensorflowModel(require('../assets/model/movenet_lightning.tflite'));
  const { resize } = useResizePlugin();

  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState('Get into position');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [firstRepTime, setFirstRepTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [repTimestamps, setRepTimestamps] = useState<number[]>([]);
  const [milestoneMsg, setMilestoneMsg] = useState<string | null>(null);
  const [poseFrame, setPoseFrame] = useState<PoseOverlayFrame | null>(null);
  const [overlaySize, setOverlaySize] = useState<OverlaySize>({ width: 0, height: 0 });
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startTimeRef = useRef<number>(0);
  const finishedRef = useRef(false);
  const milestoneClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Worklet-accessible shared state
  const wentDown = useSharedValue(false);
  const lastDownTime = useSharedValue(0);
  const repCount = useSharedValue(0);
  const isStarted = useSharedValue(false);
  const lastSentCount = useSharedValue(-1);
  const lastFeedbackTime = useSharedValue(0);
  const isKneeDrop = useSharedValue(false);
  const lastPoseTime = useSharedValue(0);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  // Elapsed timer — display only, starts from first rep
  useEffect(() => {
    if (firstRepTime === null || finished) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - firstRepTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [firstRepTime, finished]);

  // Stable JS-thread callbacks — created once, never re-created
  const onTrackingUpdate = useRef(
    Worklets.createRunOnJS((
      kps: Keypoint[],
      phase: PushupPhase,
      confidence: number,
      elbowAngle: number,
      count: number,
      fb: string
    ) => {
      setPoseFrame({ keypoints: kps, phase, confidence, elbowAngle, feedback: fb });
      setReps(count);
      setFeedback(fb);
      if (count >= TARGET && !finishedRef.current) {
        finishedRef.current = true;
        setFinished(true);
      }
    })
  ).current;

  const onNoRep = useRef(
    Worklets.createRunOnJS(() => {
      setFeedback('No rep — knees down!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    })
  ).current;

  const prevRepsRef = useRef(0);
  useEffect(() => {
    if (reps > prevRepsRef.current) {
      const newRep = reps;

      if (prevRepsRef.current === 0) {
        setSetting('countdown_cleared_at', String(Date.now()));
        setFirstRepTime(Date.now());
      }
      prevRepsRef.current = reps;

      Haptics.impactAsync(
        newRep === 10 || newRep === 15 || newRep === TARGET
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Light
      );

      setRepTimestamps((prev) => [...prev, Date.now()]);

      if (MILESTONE_MESSAGES[newRep]) {
        if (milestoneClearRef.current) clearTimeout(milestoneClearRef.current);
        setMilestoneMsg(MILESTONE_MESSAGES[newRep]);
        milestoneClearRef.current = setTimeout(() => setMilestoneMsg(null), 1800);
      }
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
      if (model.state !== 'loaded' || !model.model) return;

      const resized = resize(frame, {
        scale: { width: 192, height: 192 },
        pixelFormat: 'rgb',
        dataType: 'float32',
      });

      const outputs = model.model.runSync([resized]);
      const raw = outputs[0] as Float32Array;
      const kps = parseMoveNetOutput(raw);
      const analysis = analyzePose(kps);
      const { phase, feedback: fb, confidence, elbowAngle } = analysis;
      const now = Date.now();

      if (!isStarted.value) {
        if (now - lastPoseTime.value > 120) {
          lastPoseTime.value = now;
          onTrackingUpdate(kps, phase, confidence, elbowAngle, repCount.value, fb);
        }
        return;
      }

      // Knee-drop detection: knees at floor level (near wrist Y) + hip sagging
      if (phase === 'down') {
        const lk = kps[13]; // LEFT_KNEE
        const rk = kps[14]; // RIGHT_KNEE
        const lkOk = lk.score > 0.3;
        const rkOk = rk.score > 0.3;
        if (lkOk || rkOk) {
          const kneeY = lkOk ? lk.y : rk.y;
          const lw = kps[9]; const rw = kps[10]; // LEFT_WRIST, RIGHT_WRIST
          const ls = kps[5]; const rs = kps[6]; // LEFT_SHOULDER, RIGHT_SHOULDER
          const lh = kps[11]; const rh = kps[12]; // LEFT_HIP, RIGHT_HIP
          const wristY = lw.score > 0.25 ? lw.y : (rw.score > 0.25 ? rw.y : 0);
          const shoulderY = ls.score > 0.25 ? ls.y : (rs.score > 0.25 ? rs.y : 0);
          const hipY = lh.score > 0.25 ? lh.y : (rh.score > 0.25 ? rh.y : 0);
          const kneesAtFloor = wristY > 0 && Math.abs(kneeY - wristY) < 0.12;
          const hipDropped = hipY > 0 && shoulderY > 0 && hipY > shoulderY + 0.1;
          if (kneesAtFloor && hipDropped) {
            isKneeDrop.value = true;
          }
        }
      } else if (phase === 'up') {
        isKneeDrop.value = false;
      }

      if (phase === 'down' && !wentDown.value) {
        wentDown.value = true;
        lastDownTime.value = now;
      }

      if (phase === 'up' && wentDown.value && now - lastDownTime.value > 350) {
        if (isKneeDrop.value) {
          wentDown.value = false;
          isKneeDrop.value = false;
          onNoRep();
        } else {
          repCount.value = repCount.value + 1;
          wentDown.value = false;
          lastSentCount.value = repCount.value;
          lastFeedbackTime.value = now;
          lastPoseTime.value = now;
          onTrackingUpdate(kps, phase, confidence, elbowAngle, repCount.value, 'Great rep!');
        }
      } else {
        const countChanged = repCount.value !== lastSentCount.value;
        const poseStale = now - lastPoseTime.value > 120;
        if (countChanged || now - lastFeedbackTime.value > 500 || poseStale) {
          lastSentCount.value = repCount.value;
          lastFeedbackTime.value = now;
          lastPoseTime.value = now;
          onTrackingUpdate(kps, phase, confidence, elbowAngle, repCount.value, fb);
        }
      }
    },
    [
      model,
      isStarted,
      wentDown,
      lastDownTime,
      repCount,
      lastSentCount,
      lastFeedbackTime,
      lastPoseTime,
      onTrackingUpdate,
      onNoRep,
      resize,
      isKneeDrop,
    ]
  );

  function handleOverlayLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setOverlaySize({ width, height });
  }

  function handleCameraError(error: CameraRuntimeError) {
    setCameraError(error.message);
  }

  function handleStart() {
    wentDown.value = false;
    lastDownTime.value = 0;
    repCount.value = 0;
    lastSentCount.value = -1;
    lastFeedbackTime.value = 0;
    isKneeDrop.value = false;
    lastPoseTime.value = 0;
    finishedRef.current = false;
    prevRepsRef.current = 0;
    startTimeRef.current = Date.now();
    setReps(0);
    setFinished(false);
    setStarted(true);
    setCountdown(3);
    setFirstRepTime(null);
    setElapsed(0);
    setRepTimestamps([]);
    setMilestoneMsg(null);
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

  const isBigCountdown = countdown !== null && countdown > 0;
  const isMilestone = countdown === null && !!milestoneMsg;
  const activeFeedback =
    countdown !== null
      ? countdown === 0
        ? 'Go!'
        : String(countdown)
      : milestoneMsg ?? feedback;

  return (
    <View style={styles.root}>
      {device ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={!finished}
          frameProcessor={frameProcessor}
          pixelFormat="yuv"
          onError={handleCameraError}
        />
      ) : (
        <View style={styles.cameraFallback}>
          <Text style={styles.cameraFallbackTitle}>No camera found</Text>
          <Text style={styles.cameraFallbackText}>Connect a camera or enable one in the emulator.</Text>
        </View>
      )}

      <View style={styles.poseLayer} pointerEvents="none" onLayout={handleOverlayLayout}>
        <PoseSkeleton pose={poseFrame} size={overlaySize} mirrored={device?.position === 'front'} />
      </View>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header}>
          <Text style={styles.title}>just20</Text>
          {started && firstRepTime !== null && (
            <View style={styles.timerWrap}>
              <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
            </View>
          )}
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.feedbackWrap}>
          <Text
            style={[
              styles.feedbackText,
              isBigCountdown && styles.countdownText,
              isMilestone && styles.milestoneText,
            ]}
          >
            {activeFeedback}
          </Text>
          {poseFrame && (
            <View style={styles.poseReadout}>
              <Text style={styles.poseReadoutText}>
                {poseFrame.phase.toUpperCase()} · {Math.round(poseFrame.confidence * 100)}% ·{' '}
                {Math.round(poseFrame.elbowAngle)}°
              </Text>
            </View>
          )}
          {usingFallbackCamera && (
            <Text style={styles.cameraNote}>Using back camera fallback</Text>
          )}
          {cameraError && (
            <Text style={styles.cameraNote}>{cameraError}</Text>
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
              {started && repTimestamps.length >= 2 && (
                <PaceGraph timestamps={repTimestamps} />
              )}
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
              {started && (
                <TouchableOpacity onPress={handleClose} style={styles.quitBtn}>
                  <Text style={styles.quitText}>end session</Text>
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
  cameraFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  cameraFallbackTitle: { color: '#FFF', fontSize: fontSize.lg, fontWeight: '900' },
  cameraFallbackText: { color: 'rgba(255,255,255,0.72)', fontSize: fontSize.sm, textAlign: 'center' },
  poseLayer: { ...StyleSheet.absoluteFillObject },
  skeletonLine: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(60, 179, 113, 0.9)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  skeletonJoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: colors.success,
  },
  skeletonJointLow: {
    opacity: 0.55,
    borderColor: '#FFE082',
  },
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
  timerWrap: { position: 'absolute', left: spacing.lg, top: spacing.md, padding: spacing.sm },
  timerText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  closeBtn: { position: 'absolute', right: spacing.lg, top: spacing.md, padding: spacing.sm },
  closeTxt: { fontSize: 18, color: 'rgba(255,255,255,0.5)' },
  feedbackWrap: { alignItems: 'center', paddingHorizontal: spacing.lg },
  feedbackText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    textAlign: 'center',
  },
  countdownText: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -2,
  },
  milestoneText: {
    fontSize: fontSize.xl,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: '#FFF',
  },
  poseReadout: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  poseReadoutText: {
    color: '#FFF',
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  cameraNote: {
    marginTop: spacing.xs,
    color: 'rgba(255,255,255,0.78)',
    fontSize: fontSize.xs,
    fontWeight: '700',
    textAlign: 'center',
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
    gap: 5,
    justifyContent: 'center',
    flexWrap: 'nowrap',
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
  quitBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  quitText: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.22)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
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
