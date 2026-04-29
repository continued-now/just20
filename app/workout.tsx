import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  CameraRuntimeError,
  runAsync,
  runAtTargetFps,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useSharedValue, Worklets } from 'react-native-worklets-core';
import { BrandLogo } from '../components/BrandLogo';
import { RepCounter } from '../components/RepCounter';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import {
  KP,
  analyzePose,
  getPoseBounds,
  mapCropKeypoints,
  parseMoveNetOutput,
  smoothPoseAnalysis,
  type Keypoint,
  type PushupPhase,
} from '../lib/poseDetection';
import {
  getFiredNudgeCountToday,
  getSetting,
  saveSession,
  setSetting,
  type RecoveryType,
  type TrackingMethod,
  type WorkoutMode,
} from '../lib/db';
import {
  DEFAULT_SCHEDULED_HOUR,
  cancelAllNudges,
  scheduleRandomNudges,
  scheduleWindowWithFallbackNudges,
  scheduleWindowedNotification,
} from '../lib/notifications';
import { markMonthlyTestTaken } from '../lib/viral';
import { scheduleSharedJust20StatusUpdate } from '../lib/widgetStatus';
import { devLog } from '../lib/diagnostics';

const STANDARD_TARGET = 20;
const TEST_TARGET = 100;
const MIN_OVERLAY_SCORE = 0.2;
const MODEL_INPUT_SIZE = 192;
const PRIMARY_CROP_SCALE = 0.78;
const SECONDARY_CROP_SCALE = 0.5;
const PRIMARY_LOCK_LOST_MS = 900;
const SECONDARY_INFERENCE_INTERVAL_MS = 220;
const ACTIVE_REP_CONFIDENCE_MIN = 0.42;
const TEST_REP_CONFIDENCE_MIN = 0.55;
const REP_TRACKING_QUALITY_MIN = 0.38;

const DEVICE_PERFORMANCE_CONFIG = {
  previewFps: 3,
  activeFps: 12,
  recoveryFps: 7,
  smoothingAlpha: 0.32,
};

const EMULATOR_PERFORMANCE_CONFIG = {
  previewFps: 1,
  activeFps: 5,
  recoveryFps: 2,
  smoothingAlpha: 0.32,
};

const PERFORMANCE_CONFIG = Constants.isDevice
  ? DEVICE_PERFORMANCE_CONFIG
  : EMULATOR_PERFORMANCE_CONFIG;

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
  calibration: string;
  trackingQuality: number;
  bodyInFrame: boolean;
  targetFps: number;
  inferenceMs: number;
  updateFps: number;
  manuallyAdjusted: boolean;
};

type OverlaySize = {
  width: number;
  height: number;
};

type ReadinessState =
  | 'permission_needed'
  | 'loading_model'
  | 'camera_missing'
  | 'waiting_for_frames'
  | 'calibrating'
  | 'ready'
  | 'tracking_unstable'
  | 'manual_mode';

type ReadinessPanel = {
  state: ReadinessState;
  title: string;
  detail: string;
  action: string;
  quality: number;
  ready: boolean;
};

function PoseSkeleton({
  pose,
  size,
  mirrored,
  secondary = false,
}: {
  pose: PoseOverlayFrame | null;
  size: OverlaySize;
  mirrored: boolean;
  secondary?: boolean;
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
              secondary && styles.skeletonLineSecondary,
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
              secondary && styles.skeletonJointSecondary,
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

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function clamp01(value: number): number {
  'worklet';
  return Math.max(0, Math.min(1, value));
}

function makeSquareCrop(frameWidth: number, frameHeight: number, centerX: number, centerY: number, scale: number): CropRect {
  'worklet';
  const maxSide = Math.min(frameWidth, frameHeight);
  const side = Math.max(96, maxSide * scale);
  const x = Math.max(0, Math.min(frameWidth - side, centerX * frameWidth - side / 2));
  const y = Math.max(0, Math.min(frameHeight - side, centerY * frameHeight - side / 2));
  return { x, y, width: side, height: side };
}

function isTapInsidePose(pose: PoseOverlayFrame | null, x: number, y: number, mirrored: boolean): boolean {
  if (!pose) return false;
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  let visible = 0;

  for (const kp of pose.keypoints) {
    if (kp.score < MIN_OVERLAY_SCORE) continue;
    const screenX = mirrored ? 1 - kp.x : kp.x;
    minX = Math.min(minX, screenX);
    minY = Math.min(minY, kp.y);
    maxX = Math.max(maxX, screenX);
    maxY = Math.max(maxY, kp.y);
    visible += 1;
  }

  if (visible < 4) return false;
  const pad = 0.08;
  return x >= minX - pad && x <= maxX + pad && y >= minY - pad && y <= maxY + pad;
}

export default function WorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    duelTarget?: string;
    duelCode?: string;
    recoveryType?: string;
    repairedDate?: string;
  }>();
  const { hasPermission, requestPermission } = useCameraPermission();
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const device = frontDevice ?? backDevice;
  const usingFallbackCamera = !frontDevice && !!backDevice;
  const workoutMode: WorkoutMode = params.mode === 'test' ? 'test' : params.mode === 'duel' ? 'duel' : 'daily';
  const isTestMode = workoutMode === 'test';
  const isDuelMode = workoutMode === 'duel';
  const requestedRecoveryType: RecoveryType =
    params.recoveryType === 'streak_patch' || params.recoveryType === 'debt_set'
      ? params.recoveryType
      : 'none';
  const recoveryType: RecoveryType = workoutMode === 'daily' ? requestedRecoveryType : 'none';
  const repairedDate = typeof params.repairedDate === 'string' && params.repairedDate.length > 0
    ? params.repairedDate
    : null;
  const targetReps = isTestMode
    ? TEST_TARGET
    : recoveryType === 'streak_patch'
    ? 40
    : recoveryType === 'debt_set'
    ? 30
    : STANDARD_TARGET;
  const duelTarget = Math.max(10, Number.parseInt(params.duelTarget ?? '60', 10) || 60);
  const performanceConfig = PERFORMANCE_CONFIG;
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
  const [secondaryPoseFrame, setSecondaryPoseFrame] = useState<PoseOverlayFrame | null>(null);
  const [overlaySize, setOverlaySize] = useState<OverlaySize>({ width: 0, height: 0 });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [frameSeen, setFrameSeen] = useState(false);
  const [cameraFrameTimedOut, setCameraFrameTimedOut] = useState(false);
  const [manualAdjustments, setManualAdjustments] = useState(0);
  const [manualAdjustmentCount, setManualAdjustmentCount] = useState(0);
  const [trackingMethod, setTrackingMethod] = useState<TrackingMethod>('camera');
  const [cameraReadyMs, setCameraReadyMs] = useState<number | null>(null);
  const [modelLoadMs, setModelLoadMs] = useState<number | null>(null);
  const [secondaryTrackingRequested, setSecondaryTrackingRequested] = useState(false);
  const [cameraPaused, setCameraPaused] = useState(false);
  const [screenFocused, setScreenFocused] = useState(true);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  const startTimeRef = useRef<number>(0);
  const finishedRef = useRef(false);
  const finishingRef = useRef(false);
  const stopConfirmedRef = useRef(false);
  const milestoneClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenOpenedAtRef = useRef(Date.now());
  const modelLoadStartRef = useRef(Date.now());
  const cameraReadyLoggedRef = useRef(false);

  // Worklet-accessible shared state
  const wentDown = useSharedValue(false);
  const lastDownTime = useSharedValue(0);
  const repCount = useSharedValue(0);
  const isStarted = useSharedValue(false);
  const lastSentCount = useSharedValue(-1);
  const lastFeedbackTime = useSharedValue(0);
  const isKneeDrop = useSharedValue(false);
  const lastPoseTime = useSharedValue(0);
  const smoothedElbowAngle = useSharedValue(0);
  const smoothedConfidence = useSharedValue(0);
  const secondarySmoothedElbowAngle = useSharedValue(0);
  const secondarySmoothedConfidence = useSharedValue(0);
  const modelInputResizeDataType = useSharedValue<'uint8' | 'float32'>('uint8');
  const repConfidenceMin = useSharedValue(isTestMode ? TEST_REP_CONFIDENCE_MIN : ACTIVE_REP_CONFIDENCE_MIN);
  const previewPoseFps = useSharedValue(PERFORMANCE_CONFIG.previewFps);
  const activePoseFps = useSharedValue(PERFORMANCE_CONFIG.activeFps);
  const recoveryPoseFps = useSharedValue(PERFORMANCE_CONFIG.recoveryFps);
  const smoothingAlpha = useSharedValue(PERFORMANCE_CONFIG.smoothingAlpha);
  const manuallyAdjusted = useSharedValue(false);
  const primaryLocked = useSharedValue(false);
  const primaryCenterX = useSharedValue(0.5);
  const primaryCenterY = useSharedValue(0.5);
  const primaryLostAt = useSharedValue(0);
  const secondaryEnabled = useSharedValue(false);
  const secondaryCenterX = useSharedValue(0.5);
  const secondaryCenterY = useSharedValue(0.5);
  const lastSecondaryPoseTime = useSharedValue(0);
  const lastSecondaryInferenceTime = useSharedValue(0);

  useEffect(() => {
    if (!hasPermission) {
      devLog('camera_permission_requested');
      requestPermission().then((granted) => {
        if (!granted) devLog('camera_permission_denied');
      });
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    return () => {
      if (milestoneClearRef.current) clearTimeout(milestoneClearRef.current);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => {
        setScreenFocused(false);
        setCameraFrameTimedOut(false);
      };
    }, [])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const nextActive = nextState === 'active';
      setAppActive(nextActive);
      if (!nextActive) setCameraFrameTimedOut(false);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setFrameSeen(false);
    setCameraFrameTimedOut(false);
  }, [device?.id]);

  useEffect(() => {
    if (!device || model.state !== 'loaded' || cameraError || finished || cameraPaused || !screenFocused || !appActive) {
      setCameraFrameTimedOut(false);
      return;
    }

    if (frameSeen) {
      setCameraFrameTimedOut(false);
      return;
    }

    const timer = setTimeout(() => setCameraFrameTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, [device, model.state, cameraError, finished, cameraPaused, screenFocused, appActive, frameSeen]);

  useEffect(() => {
    previewPoseFps.value = performanceConfig.previewFps;
    activePoseFps.value = performanceConfig.activeFps;
    recoveryPoseFps.value = performanceConfig.recoveryFps;
    smoothingAlpha.value = performanceConfig.smoothingAlpha;
  }, [performanceConfig, previewPoseFps, activePoseFps, recoveryPoseFps, smoothingAlpha]);

  useEffect(() => {
    repConfidenceMin.value = isTestMode ? TEST_REP_CONFIDENCE_MIN : ACTIVE_REP_CONFIDENCE_MIN;
  }, [isTestMode, repConfidenceMin]);

  // MoveNet TFLite uses RGB [0,255]; avoid float buffers unless the loaded model requires them.
  useEffect(() => {
    if (model.state !== 'loaded') return;
    const inputType = model.model.inputs[0]?.dataType;
    modelInputResizeDataType.value = inputType === 'float32' ? 'float32' : 'uint8';
  }, [model.state, model.model, modelInputResizeDataType]);

  useEffect(() => {
    if (model.state === 'loaded' && modelLoadMs === null) {
      const elapsedMs = Date.now() - modelLoadStartRef.current;
      setModelLoadMs(elapsedMs);
      devLog('model_loaded', { elapsedMs });
    } else if (model.state === 'error') {
      devLog('model_load_failed');
    }
  }, [model.state, modelLoadMs]);

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
      calibration: string,
      trackingQuality: number,
      bodyInFrame: boolean,
      targetFps: number,
      inferenceMs: number,
      updateFps: number,
      count: number,
      fb: string,
      adjusted: boolean
    ) => {
      setFrameSeen((seen) => {
        if (!seen && !cameraReadyLoggedRef.current) {
          cameraReadyLoggedRef.current = true;
          const elapsedMs = Date.now() - screenOpenedAtRef.current;
          setCameraReadyMs(elapsedMs);
          devLog('camera_frames_ready', { elapsedMs });
        }
        return seen ? seen : true;
      });
      setCameraFrameTimedOut((timedOut) => (timedOut ? false : timedOut));
      setPoseFrame({
        keypoints: kps,
        phase,
        confidence,
        elbowAngle,
        calibration,
        trackingQuality,
        bodyInFrame,
        targetFps,
        inferenceMs,
        updateFps,
        feedback: fb,
        manuallyAdjusted: adjusted,
      });
      setReps(count);
      setFeedback(fb);
      if (count >= targetReps && !finishedRef.current) {
        finishedRef.current = true;
        setFinished(true);
      }
    })
  ).current;

  const onSecondaryTrackingUpdate = useRef(
    Worklets.createRunOnJS((
      kps: Keypoint[],
      phase: PushupPhase,
      confidence: number,
      elbowAngle: number,
      calibration: string,
      trackingQuality: number,
      bodyInFrame: boolean,
      targetFps: number,
      inferenceMs: number,
      updateFps: number,
      fb: string
    ) => {
      setSecondaryPoseFrame({
        keypoints: kps,
        phase,
        confidence,
        elbowAngle,
        calibration,
        trackingQuality,
        bodyInFrame,
        targetFps,
        inferenceMs,
        updateFps,
        feedback: fb,
        manuallyAdjusted: false,
      });
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
        newRep === 10 || newRep === 15 || newRep === targetReps
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
      startTimeRef.current = Date.now();
      isStarted.value = true;
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, isStarted]);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      const loadedModel = model.model;
      if (model.state !== 'loaded' || !loadedModel) return;
      const targetFps = !isStarted.value
        ? previewPoseFps.value
        : smoothedConfidence.value < 0.4
        ? recoveryPoseFps.value
        : activePoseFps.value;

      runAtTargetFps(targetFps, () => {
        'worklet';
        runAsync(frame, () => {
          'worklet';
        const inferenceStart = performance.now();
        const now = Date.now();
        const primaryCrop = primaryLocked.value
          ? makeSquareCrop(frame.width, frame.height, primaryCenterX.value, primaryCenterY.value, PRIMARY_CROP_SCALE)
          : makeSquareCrop(frame.width, frame.height, 0.5, 0.5, 1);
        const resized = resize(frame, {
          crop: primaryCrop,
          scale: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE },
          pixelFormat: 'rgb',
          dataType: modelInputResizeDataType.value,
        });

        const outputs = loadedModel.runSync([resized]);
        const raw = outputs[0] as Float32Array;
        const rawKps = parseMoveNetOutput(raw);
        const kps = mapCropKeypoints(
          rawKps,
          primaryCrop.x,
          primaryCrop.y,
          primaryCrop.width,
          primaryCrop.height,
          frame.width,
          frame.height
        );
        const rawAnalysis = analyzePose(rawKps);
        const primaryBounds = getPoseBounds(kps, 0.25);
        if (primaryBounds && (rawAnalysis.bodyInFrame || rawAnalysis.confidence > 0.35)) {
          primaryLostAt.value = 0;
          if (!primaryLocked.value) {
            primaryCenterX.value = primaryBounds.centerX;
            primaryCenterY.value = primaryBounds.centerY;
          } else {
            primaryCenterX.value = primaryCenterX.value * 0.78 + primaryBounds.centerX * 0.22;
            primaryCenterY.value = primaryCenterY.value * 0.78 + primaryBounds.centerY * 0.22;
          }
          primaryLocked.value = true;
        } else if (primaryLocked.value) {
          if (primaryLostAt.value === 0) primaryLostAt.value = now;
          if (now - primaryLostAt.value > PRIMARY_LOCK_LOST_MS) {
            primaryLocked.value = false;
            primaryLostAt.value = 0;
            primaryCenterX.value = 0.5;
            primaryCenterY.value = 0.5;
            smoothedElbowAngle.value = 0;
            smoothedConfidence.value = 0;
          }
        }

        if (rawAnalysis.elbowAngle > 0 && rawAnalysis.confidence > 0) {
          const alpha = smoothingAlpha.value;
          smoothedElbowAngle.value = smoothedElbowAngle.value === 0
            ? rawAnalysis.elbowAngle
            : smoothedElbowAngle.value * (1 - alpha) + rawAnalysis.elbowAngle * alpha;
          smoothedConfidence.value = smoothedConfidence.value === 0
            ? rawAnalysis.confidence
            : smoothedConfidence.value * 0.75 + rawAnalysis.confidence * 0.25;
        } else {
          smoothedElbowAngle.value = smoothedElbowAngle.value * 0.82;
          smoothedConfidence.value = smoothedConfidence.value * 0.82;
        }

        const analysis = smoothPoseAnalysis(
          rawAnalysis,
          smoothedElbowAngle.value,
          smoothedConfidence.value
        );
        const { phase, feedback: fb, confidence, elbowAngle } = analysis;
        const lastPoseAt = lastPoseTime.value;
        const updateFps = lastPoseAt > 0 ? Math.min(60, 1000 / Math.max(1, now - lastPoseAt)) : targetFps;
        const inferenceMs = performance.now() - inferenceStart;
        const poseReliableForCounting =
          confidence >= repConfidenceMin.value &&
          analysis.trackingQuality >= REP_TRACKING_QUALITY_MIN &&
          (analysis.bodyInFrame || confidence >= repConfidenceMin.value + 0.12);

        if (secondaryEnabled.value && now - lastSecondaryInferenceTime.value > SECONDARY_INFERENCE_INTERVAL_MS) {
          lastSecondaryInferenceTime.value = now;
          const secondaryStart = performance.now();
          const secondaryCrop = makeSquareCrop(
            frame.width,
            frame.height,
            secondaryCenterX.value,
            secondaryCenterY.value,
            SECONDARY_CROP_SCALE
          );
          const secondaryResized = resize(frame, {
            crop: secondaryCrop,
            scale: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE },
            pixelFormat: 'rgb',
            dataType: modelInputResizeDataType.value,
          });
          const secondaryOutputs = loadedModel.runSync([secondaryResized]);
          const secondaryRaw = secondaryOutputs[0] as Float32Array;
          const secondaryRawKps = parseMoveNetOutput(secondaryRaw);
          const secondaryKps = mapCropKeypoints(
            secondaryRawKps,
            secondaryCrop.x,
            secondaryCrop.y,
            secondaryCrop.width,
            secondaryCrop.height,
            frame.width,
            frame.height
          );
          const secondaryRawAnalysis = analyzePose(secondaryRawKps);
          if (secondaryRawAnalysis.elbowAngle > 0 && secondaryRawAnalysis.confidence > 0) {
            const alpha = smoothingAlpha.value;
            secondarySmoothedElbowAngle.value = secondarySmoothedElbowAngle.value === 0
              ? secondaryRawAnalysis.elbowAngle
              : secondarySmoothedElbowAngle.value * (1 - alpha) + secondaryRawAnalysis.elbowAngle * alpha;
            secondarySmoothedConfidence.value = secondarySmoothedConfidence.value === 0
              ? secondaryRawAnalysis.confidence
              : secondarySmoothedConfidence.value * 0.75 + secondaryRawAnalysis.confidence * 0.25;
          } else {
            secondarySmoothedElbowAngle.value = secondarySmoothedElbowAngle.value * 0.82;
            secondarySmoothedConfidence.value = secondarySmoothedConfidence.value * 0.82;
          }

          const secondaryAnalysis = smoothPoseAnalysis(
            secondaryRawAnalysis,
            secondarySmoothedElbowAngle.value,
            secondarySmoothedConfidence.value
          );
          const secondaryBounds = getPoseBounds(secondaryKps, 0.25);
          if (secondaryBounds && (secondaryRawAnalysis.bodyInFrame || secondaryRawAnalysis.confidence > 0.3)) {
            secondaryCenterX.value = secondaryCenterX.value * 0.72 + secondaryBounds.centerX * 0.28;
            secondaryCenterY.value = secondaryCenterY.value * 0.72 + secondaryBounds.centerY * 0.28;
          }

          if (now - lastSecondaryPoseTime.value > 140) {
            lastSecondaryPoseTime.value = now;
            onSecondaryTrackingUpdate(
              secondaryKps,
              secondaryAnalysis.phase,
              secondaryAnalysis.confidence,
              secondaryAnalysis.elbowAngle,
              secondaryAnalysis.calibration,
              secondaryAnalysis.trackingQuality,
              secondaryAnalysis.bodyInFrame,
              targetFps,
              performance.now() - secondaryStart,
              updateFps,
              secondaryAnalysis.feedback
            );
          }
        }

        if (!isStarted.value) {
          if (now - lastPoseTime.value > 120) {
            lastPoseTime.value = now;
            onTrackingUpdate(
              kps,
              phase,
              confidence,
              elbowAngle,
              analysis.calibration,
              analysis.trackingQuality,
              analysis.bodyInFrame,
              targetFps,
              inferenceMs,
              updateFps,
              repCount.value,
              fb,
              manuallyAdjusted.value
            );
          }
          return;
        }

        if (!poseReliableForCounting) {
          wentDown.value = false;
          isKneeDrop.value = false;
          if (now - lastPoseTime.value > 120) {
            lastPoseTime.value = now;
            onTrackingUpdate(
              kps,
              phase,
              confidence,
              elbowAngle,
              analysis.calibration,
              analysis.trackingQuality,
              analysis.bodyInFrame,
              targetFps,
              inferenceMs,
              updateFps,
              repCount.value,
              analysis.calibration,
              manuallyAdjusted.value
            );
          }
          return;
        }

        // Knee-drop detection: knees at floor level (near wrist Y) + hip sagging
        if (phase === 'down') {
          const lk = rawKps[13]; // LEFT_KNEE
          const rk = rawKps[14]; // RIGHT_KNEE
          const lkOk = lk.score > 0.3;
          const rkOk = rk.score > 0.3;
          if (lkOk || rkOk) {
            const kneeY = lkOk ? lk.y : rk.y;
            const lw = rawKps[9]; const rw = rawKps[10]; // LEFT_WRIST, RIGHT_WRIST
            const ls = rawKps[5]; const rs = rawKps[6]; // LEFT_SHOULDER, RIGHT_SHOULDER
            const lh = rawKps[11]; const rh = rawKps[12]; // LEFT_HIP, RIGHT_HIP
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
            onTrackingUpdate(
              kps,
              phase,
              confidence,
              elbowAngle,
              analysis.calibration,
              analysis.trackingQuality,
              analysis.bodyInFrame,
              targetFps,
              inferenceMs,
              updateFps,
              repCount.value,
              'Great rep!',
              manuallyAdjusted.value
            );
          }
        } else {
          const countChanged = repCount.value !== lastSentCount.value;
          const poseStale = now - lastPoseTime.value > 120;
          if (countChanged || now - lastFeedbackTime.value > 500 || poseStale) {
            lastSentCount.value = repCount.value;
            lastFeedbackTime.value = now;
            lastPoseTime.value = now;
            onTrackingUpdate(
              kps,
              phase,
              confidence,
              elbowAngle,
              analysis.calibration,
              analysis.trackingQuality,
              analysis.bodyInFrame,
              targetFps,
              inferenceMs,
              updateFps,
              repCount.value,
              fb,
              manuallyAdjusted.value
            );
          }
        }
        });
      });
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
      smoothedElbowAngle,
      smoothedConfidence,
      secondarySmoothedElbowAngle,
      secondarySmoothedConfidence,
      modelInputResizeDataType,
      repConfidenceMin,
      previewPoseFps,
      activePoseFps,
      recoveryPoseFps,
      smoothingAlpha,
      manuallyAdjusted,
      primaryLocked,
      primaryCenterX,
      primaryCenterY,
      primaryLostAt,
      secondaryEnabled,
      secondaryCenterX,
      secondaryCenterY,
      lastSecondaryPoseTime,
      lastSecondaryInferenceTime,
      onTrackingUpdate,
      onSecondaryTrackingUpdate,
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
    devLog('camera_error', { message: error.message, code: error.code });
  }

  function handleRetryCamera() {
    setCameraError(null);
    setFrameSeen(false);
    setCameraFrameTimedOut(false);
    setCameraPaused(false);
    cameraReadyLoggedRef.current = false;
    screenOpenedAtRef.current = Date.now();
    handleCalibrate();
    devLog('camera_retry_requested');
  }

  function handleStart(method: TrackingMethod = 'camera') {
    wentDown.value = false;
    lastDownTime.value = 0;
    repCount.value = 0;
    lastSentCount.value = -1;
    lastFeedbackTime.value = 0;
    isKneeDrop.value = false;
    lastPoseTime.value = 0;
    primaryLostAt.value = 0;
    lastSecondaryInferenceTime.value = 0;
    smoothedElbowAngle.value = 0;
    smoothedConfidence.value = 0;
    secondarySmoothedElbowAngle.value = 0;
    secondarySmoothedConfidence.value = 0;
    manuallyAdjusted.value = false;
    finishedRef.current = false;
    finishingRef.current = false;
    prevRepsRef.current = 0;
    startTimeRef.current = 0;
    setReps(0);
    setFinished(false);
    setCameraPaused(method === 'manual');
    setStarted(true);
    setCountdown(method === 'manual' ? null : 3);
    setFirstRepTime(null);
    setElapsed(0);
    setRepTimestamps([]);
    setMilestoneMsg(null);
    setManualAdjustments(0);
    setManualAdjustmentCount(0);
    setTrackingMethod(method);
    setFeedback(method === 'manual' ? 'Manual mode: tap + rep after each clean pushup' : 'Get ready');
    if (method === 'manual') {
      startTimeRef.current = Date.now();
      setFirstRepTime(Date.now());
      devLog('manual_mode_started');
    }
    // isStarted.value set after countdown reaches 0
  }

  function handleCalibrate() {
    primaryLocked.value = false;
    primaryCenterX.value = 0.5;
    primaryCenterY.value = 0.5;
    primaryLostAt.value = 0;
    smoothedElbowAngle.value = 0;
    smoothedConfidence.value = 0;
    secondaryEnabled.value = false;
    secondaryCenterX.value = 0.5;
    secondaryCenterY.value = 0.5;
    secondarySmoothedElbowAngle.value = 0;
    secondarySmoothedConfidence.value = 0;
    lastSecondaryPoseTime.value = 0;
    lastSecondaryInferenceTime.value = 0;
    setSecondaryPoseFrame(null);
    setSecondaryTrackingRequested(false);
    setFeedback('Get into position');
    Haptics.selectionAsync();
  }

  function handleStopSecondaryTracking() {
    secondaryEnabled.value = false;
    secondaryCenterX.value = 0.5;
    secondaryCenterY.value = 0.5;
    secondarySmoothedElbowAngle.value = 0;
    secondarySmoothedConfidence.value = 0;
    lastSecondaryPoseTime.value = 0;
    lastSecondaryInferenceTime.value = 0;
    setSecondaryPoseFrame(null);
    setSecondaryTrackingRequested(false);
    Haptics.selectionAsync();
  }

  function handleCameraTap(event: GestureResponderEvent) {
    if (overlaySize.width <= 0 || overlaySize.height <= 0 || finished) return;

    const screenX = clamp01(event.nativeEvent.locationX / overlaySize.width);
    const screenY = clamp01(event.nativeEvent.locationY / overlaySize.height);
    const mirrored = device?.position === 'front';

    if (isTapInsidePose(poseFrame, screenX, screenY, mirrored)) {
      return;
    }

    const frameX = mirrored ? 1 - screenX : screenX;
    secondaryCenterX.value = clamp01(frameX);
    secondaryCenterY.value = screenY;
    secondaryEnabled.value = true;
    secondarySmoothedElbowAngle.value = 0;
    secondarySmoothedConfidence.value = 0;
    lastSecondaryPoseTime.value = 0;
    lastSecondaryInferenceTime.value = 0;
    setSecondaryPoseFrame(null);
    setSecondaryTrackingRequested(true);
    Haptics.selectionAsync();
  }

  function handleManualRep(delta: number) {
    if (!started || countdown !== null || finished) return;
    if (isTestMode) return;

    const next = Math.max(0, Math.min(targetReps, reps + delta));
    if (next === reps) return;

    repCount.value = next;
    lastSentCount.value = next;
    lastFeedbackTime.value = Date.now();
    if (trackingMethod === 'manual') {
      setManualAdjustments(0);
      setManualAdjustmentCount(0);
    } else {
      manuallyAdjusted.value = true;
      setTrackingMethod('camera_adjusted');
      setManualAdjustments((current) => current + delta);
      setManualAdjustmentCount((current) => current + 1);
    }
    setReps(next);
    setFeedback(
      trackingMethod === 'manual'
        ? `${next}/${targetReps} manually counted`
        : delta > 0
        ? 'Rep added'
        : 'Rep removed'
    );
    if (delta < 0) {
      prevRepsRef.current = next;
      setRepTimestamps((prev) => prev.slice(0, -1));
    }

    if (next >= targetReps && !finishedRef.current) {
      finishedRef.current = true;
      setFinished(true);
    }
  }

  async function clearCompletedWorkoutReminders() {
    const [savedMode, savedHour] = await Promise.all([
      getSetting('notification_mode'),
      getSetting('scheduled_hour'),
    ]);

    if (savedMode === 'scheduled_fallback') {
      const scheduledHour = Number.parseInt(savedHour ?? String(DEFAULT_SCHEDULED_HOUR), 10) || DEFAULT_SCHEDULED_HOUR;
      await scheduleWindowWithFallbackNudges(scheduledHour, { skipToday: true });
      return;
    }

    if (savedMode === 'scheduled' || savedMode === 'strict') {
      const scheduledHour = Number.parseInt(savedHour ?? String(DEFAULT_SCHEDULED_HOUR), 10) || DEFAULT_SCHEDULED_HOUR;
      await scheduleWindowedNotification(scheduledHour, { skipToday: true });
      return;
    }

    if (savedMode === 'random') {
      await scheduleRandomNudges({ skipToday: true });
      return;
    }

    await cancelAllNudges();
  }

  function getWorkoutDurationMs(): number {
    const startedAt = firstRepTime ?? startTimeRef.current;
    return startedAt > 0 ? Math.max(0, Date.now() - startedAt) : 0;
  }

  function getFinalTrackingMethod(): TrackingMethod {
    if (trackingMethod === 'manual') return 'manual';
    return manualAdjustmentCount > 0 ? 'camera_adjusted' : 'camera';
  }

  function getSessionMetadata() {
    return {
      trackingMethod: getFinalTrackingMethod(),
      manualAdjustments: manualAdjustmentCount,
      trackingQuality: poseFrame?.trackingQuality ?? null,
      cameraReadyMs,
      modelLoadMs,
      workoutMode,
      targetReps,
      recoveryType,
      repairedDate,
    };
  }

  async function handleFinish() {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setCameraPaused(true);
    isStarted.value = false;
    try {
      const duration = getWorkoutDurationMs();
      const nudgesUsed = await getFiredNudgeCountToday();
      const metadata = getSessionMetadata();
      const sessionId = await saveSession(reps, duration, metadata);
      if (isTestMode) await markMonthlyTestTaken();
      if (reps >= STANDARD_TARGET) await clearCompletedWorkoutReminders();
      scheduleSharedJust20StatusUpdate();
      devLog('workout_saved', {
        reps,
        duration,
        trackingMethod: metadata.trackingMethod,
        manualAdjustments: metadata.manualAdjustments,
        trackingQuality: metadata.trackingQuality,
      });
      router.replace({
        pathname: '/completion',
        params: {
          reps: String(reps),
          duration: String(duration),
          sessionId: String(sessionId ?? ''),
          nudgesUsed: String(nudgesUsed),
          mode: workoutMode,
          duelTarget: String(duelTarget),
          recoveryType,
          repairedDate: repairedDate ?? '',
          targetReps: String(targetReps),
          manualAdjustments: String(manualAdjustmentCount),
          trackingMethod: metadata.trackingMethod,
          trackingQuality: String(metadata.trackingQuality ?? ''),
          cameraReadyMs: String(cameraReadyMs ?? ''),
          modelLoadMs: String(modelLoadMs ?? ''),
        },
      });
    } catch (error) {
      devLog('workout_save_failed', { message: error instanceof Error ? error.message : String(error) });
      finishingRef.current = false;
      finishedRef.current = false;
      setFinished(false);
      setCameraPaused(false);
      isStarted.value = started && countdown === null;
      Alert.alert('Could not save workout', 'Please try finishing again.');
    }
  }

  function handleClose() {
    if (started && reps > 0) {
      setCameraPaused(true);
      stopConfirmedRef.current = false;
      Alert.alert('Stop workout?', 'Your reps will still be saved.', [
        {
          text: 'Keep going',
          style: 'cancel',
          onPress: () => {
            stopConfirmedRef.current = false;
            setCameraPaused(false);
          },
        },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            stopConfirmedRef.current = true;
            setCameraPaused(true);
            isStarted.value = false;
            try {
              const duration = getWorkoutDurationMs();
              await saveSession(reps, duration, getSessionMetadata());
              if (reps >= STANDARD_TARGET) await clearCompletedWorkoutReminders();
              scheduleSharedJust20StatusUpdate();
              router.back();
            } catch (error) {
              devLog('workout_stop_save_failed', { message: error instanceof Error ? error.message : String(error) });
              stopConfirmedRef.current = false;
              setCameraPaused(false);
              isStarted.value = started && countdown === null;
              Alert.alert('Could not save workout', 'Please try ending the session again.');
            }
          },
        },
      ], {
        onDismiss: () => {
          if (!stopConfirmedRef.current) setCameraPaused(false);
        },
      });
    } else {
      setCameraPaused(true);
      router.back();
    }
  }

  useEffect(() => {
    if (finished) {
      const t = setTimeout(handleFinish, 600);
      return () => clearTimeout(t);
    }
  }, [finished]);

  if (!hasPermission && trackingMethod !== 'manual') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionCenter}>
          <Text style={styles.permTitle}>Camera permission needed</Text>
          <Text style={styles.permText}>
            Just 20 counts reps on-device. If the camera is blocked, you can still save today manually for reduced XP.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.82}>
            <Text style={styles.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
          {!isTestMode && (
            <TouchableOpacity style={styles.manualFallbackLightBtn} onPress={() => handleStart('manual')} activeOpacity={0.78}>
              <Text style={styles.manualFallbackLightText}>Count manually today</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const modelReady = model.state === 'loaded';
  const modelError = model.state === 'error';
  const workoutActive = started && countdown === null && !finished;
  const isCameraActive = trackingMethod !== 'manual' && !finished && !cameraPaused && screenFocused && appActive;

  const isBigCountdown = countdown !== null && countdown > 0;
  const isMilestone = countdown === null && !!milestoneMsg;
  const activeFeedback =
    countdown !== null
      ? countdown === 0
        ? 'Go!'
        : String(countdown)
      : milestoneMsg ?? feedback;
  const readiness: ReadinessPanel = trackingMethod === 'manual'
    ? {
        state: 'manual_mode',
        title: 'Manual count mode',
        detail: 'Tap + rep after each clean pushup. This preserves the streak with reduced XP.',
        action: 'Manual mode active',
        quality: 1,
        ready: true,
      }
    : modelError
    ? {
        state: 'loading_model',
        title: 'Pose model failed',
        detail: 'Close and reopen this screen. If it keeps happening, use manual count today and try camera tracking again later.',
        action: 'Retry camera',
        quality: 0,
        ready: false,
      }
    : !device
    ? {
        state: 'camera_missing',
        title: 'No camera found',
        detail: 'Make sure camera access is available, then try again. You can still count manually today for reduced XP.',
        action: 'Retry camera',
        quality: 0,
        ready: false,
      }
    : !!cameraError
    ? {
        state: 'camera_missing',
        title: 'Camera unavailable',
        detail: cameraError,
        action: 'Retry camera',
        quality: 0,
        ready: false,
      }
    : !modelReady
    ? {
        state: 'loading_model',
        title: 'Loading pose model',
        detail: 'Warming up on-device MoveNet. No video leaves your phone.',
        action: 'Loading...',
        quality: 0.2,
        ready: false,
      }
    : cameraFrameTimedOut || !frameSeen
    ? {
        state: 'waiting_for_frames',
        title: 'Waiting for camera frames',
        detail: 'If this is the emulator, restart it with webcam access. Real phones are more reliable.',
        action: 'Waiting...',
        quality: 0.3,
        ready: false,
      }
    : poseFrame && !poseFrame.bodyInFrame
    ? {
        state: 'calibrating',
        title: 'Calibrating camera',
        detail: poseFrame.calibration,
        action: 'Keep calibrating',
        quality: poseFrame.trackingQuality,
        ready: false,
      }
    : poseFrame && poseFrame.trackingQuality < REP_TRACKING_QUALITY_MIN
    ? {
        state: 'tracking_unstable',
        title: 'Tracking is unstable',
        detail: poseFrame.calibration || 'Improve lighting and keep shoulders, hands, and hips visible.',
        action: 'Keep calibrating',
        quality: poseFrame.trackingQuality,
        ready: false,
      }
    : {
        state: 'ready',
        title: 'Ready to track',
        detail: 'Body locked. Start when your full pushup position is visible.',
        action: 'Ready',
        quality: poseFrame?.trackingQuality ?? 1,
        ready: true,
      };
  const startDisabled = trackingMethod !== 'manual' && !readiness.ready;

  return (
    <View style={styles.root}>
      {device && hasPermission && trackingMethod !== 'manual' ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isCameraActive}
          photo={false}
          video={false}
          audio={false}
          frameProcessor={frameProcessor}
          pixelFormat="yuv"
          onError={handleCameraError}
        />
      ) : (
        <View style={styles.cameraFallback}>
          <Text style={styles.cameraFallbackTitle}>
            {trackingMethod === 'manual' ? 'Manual count mode' : 'No camera found'}
          </Text>
          <Text style={styles.cameraFallbackText}>
            {trackingMethod === 'manual'
              ? 'Do clean reps and tap + rep after each one.'
              : 'Connect a camera, use a real phone, or enable one in the emulator.'}
          </Text>
        </View>
      )}

      <View style={styles.poseLayer} pointerEvents="none" onLayout={handleOverlayLayout}>
        <PoseSkeleton
          pose={secondaryPoseFrame}
          size={overlaySize}
          mirrored={device?.position === 'front'}
          secondary
        />
        <PoseSkeleton pose={poseFrame} size={overlaySize} mirrored={device?.position === 'front'} />
      </View>

      <Pressable style={styles.tapLayer} onPress={handleCameraTap} />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header}>
          <BrandLogo size="sm" />
          {started && firstRepTime !== null && (
            <View style={styles.timerWrap}>
              <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
            </View>
          )}
          {(workoutMode !== 'daily' || recoveryType !== 'none') && (
            <View style={styles.modePill}>
              <Text style={styles.modePillText}>
                {isTestMode
                  ? 'TEST ME'
                  : recoveryType === 'streak_patch'
                  ? 'STREAK PATCH 40'
                  : recoveryType === 'debt_set'
                  ? 'DEBT SET 30'
                  : `DUEL ${duelTarget}s`}
              </Text>
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
          {!started && (
            <View style={[
              styles.readinessCard,
              readiness.ready && styles.readinessCardReady,
              readiness.state === 'manual_mode' && styles.readinessCardManual,
            ]}>
              <Text style={styles.readinessEyebrow}>Tracking check</Text>
              <Text style={styles.readinessTitle}>{readiness.title}</Text>
              <Text style={styles.readinessText}>{readiness.detail}</Text>
              <View style={styles.qualityTrack}>
                <View
                  style={[
                    styles.qualityFill,
                    readiness.ready && styles.qualityFillReady,
                    readiness.state === 'manual_mode' && styles.qualityFillManual,
                    { width: `${Math.round(readiness.quality * 100)}%` },
                  ]}
                />
              </View>
              <View style={styles.readinessStatusRow}>
                <Text style={styles.readinessStatus}>
                  {readiness.ready ? 'Ready' : readiness.action}
                </Text>
                {readiness.state !== 'ready' && readiness.state !== 'manual_mode' && (
                  <TouchableOpacity onPress={handleRetryCamera} activeOpacity={0.75}>
                    <Text style={styles.readinessRetry}>Retry</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          {!started && (
            <TouchableOpacity
              onPress={handleCalibrate}
              style={styles.calibrationBtn}
              activeOpacity={0.75}
            >
              <Text style={styles.calibrationBtnText}>
                {poseFrame?.bodyInFrame ? 'Recalibrate camera' : 'Calibrate camera'}
              </Text>
            </TouchableOpacity>
          )}
          {secondaryTrackingRequested && (
            <View style={styles.secondaryTrackerPill}>
              <Text style={styles.secondaryTrackerText}>
                {secondaryPoseFrame?.bodyInFrame ? 'Extra body tracked' : 'Looking for tapped body'}
              </Text>
              <TouchableOpacity onPress={handleStopSecondaryTracking} activeOpacity={0.75}>
                <Text style={styles.secondaryTrackerStop}>Stop</Text>
              </TouchableOpacity>
            </View>
          )}
          {usingFallbackCamera && (
            <Text style={styles.cameraNote}>Using back camera fallback</Text>
          )}
          {cameraError && (
            <Text style={styles.cameraNote}>{cameraError}</Text>
          )}
          {cameraFrameTimedOut && !cameraError && (
            <Text style={styles.cameraNote}>
              Camera opened, but no frames are arriving. Restart the Android simulator with webcam access enabled.
            </Text>
          )}
          {!started && !isTestMode && trackingMethod !== 'manual' && !readiness.ready && (
            <TouchableOpacity
              style={styles.manualFallbackBtn}
              onPress={() => handleStart('manual')}
              activeOpacity={0.8}
            >
              <Text style={styles.manualFallbackText}>Count manually today · reduced XP</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottom}>
          {finished ? (
            <View style={styles.finishedBanner}>
              <Text style={styles.finishedText}>Done! 🎉</Text>
            </View>
          ) : (
            <>
              <RepCounter count={reps} target={targetReps} />
              {isTestMode ? (
                <View style={styles.testProgress}>
                  <View style={styles.testTrack}>
                    <View style={[styles.testFill, { width: `${Math.min((reps / targetReps) * 100, 100)}%` }]} />
                  </View>
                  <Text style={styles.testHint}>Monthly test keeps counting until you tap finish.</Text>
                </View>
              ) : (
                <View style={styles.dots}>
                  {Array.from({ length: targetReps }).map((_, i) => (
                    <View key={i} style={[styles.dot, i < reps && styles.dotFilled]} />
                  ))}
                </View>
              )}
              {workoutActive && repTimestamps.length >= 2 && (
                <PaceGraph timestamps={repTimestamps} />
              )}
              {workoutActive && !isTestMode && (
                <View style={styles.adjustRow}>
                  <TouchableOpacity
                    onPress={() => handleManualRep(-1)}
                    style={styles.adjustBtn}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.adjustBtnText}>- rep</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleManualRep(1)}
                    style={styles.adjustBtn}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.adjustBtnText}>+ rep</Text>
                  </TouchableOpacity>
                </View>
              )}
              {workoutActive && isTestMode && (
                <TouchableOpacity
                  onPress={handleFinish}
                  style={[styles.finishTestBtn, reps === 0 && styles.finishTestBtnDisabled]}
                  activeOpacity={0.8}
                  disabled={reps === 0}
                >
                  <Text style={styles.finishTestText}>finish monthly test →</Text>
                </TouchableOpacity>
              )}
              {trackingMethod === 'manual' && (
                <Text style={styles.manualNote}>
                  {recoveryType === 'none'
                    ? 'manual count mode · reduced XP'
                    : 'manual recovery count · reduced recovery XP'}
                </Text>
              )}
              {trackingMethod !== 'manual' && manualAdjustments !== 0 && (
                <Text style={styles.manualNote}>
                  manual adjustment {manualAdjustments > 0 ? '+' : ''}{manualAdjustments}
                </Text>
              )}
              {!started && (
                <TouchableOpacity
                  style={[styles.startBtn, startDisabled && styles.startBtnDisabled]}
                  onPress={() => handleStart('camera')}
                  disabled={startDisabled}
                >
                  <Text style={styles.startBtnText}>
                    {readiness.ready ? 'START' : readiness.action}
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
  poseLayer: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  tapLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
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
  skeletonLineSecondary: {
    backgroundColor: 'rgba(91, 196, 245, 0.82)',
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
  skeletonJointSecondary: {
    borderColor: colors.ice,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  skeletonJointLow: {
    opacity: 0.55,
    borderColor: '#FFE082',
  },
  safe: { flex: 1, backgroundColor: colors.bg },
  overlay: { flex: 1, justifyContent: 'space-between', zIndex: 3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  permissionCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  timerWrap: { position: 'absolute', left: spacing.lg, top: spacing.md, padding: spacing.sm },
  timerText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  modePill: {
    position: 'absolute',
    left: spacing.lg,
    top: spacing.xl + spacing.md,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,107,53,0.88)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  modePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
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
  readinessCard: {
    width: '100%',
    maxWidth: 360,
    marginTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: spacing.md,
    gap: spacing.xs,
  },
  readinessCardReady: {
    borderColor: 'rgba(88,204,2,0.44)',
    backgroundColor: 'rgba(9,58,13,0.66)',
  },
  readinessCardManual: {
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(32,32,32,0.72)',
  },
  readinessEyebrow: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  readinessTitle: {
    color: '#FFF',
    fontSize: fontSize.sm,
    fontWeight: '900',
    textAlign: 'center',
  },
  readinessText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: fontSize.xs,
    fontWeight: '700',
    textAlign: 'center',
  },
  qualityTrack: {
    height: 6,
    marginTop: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  qualityFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  qualityFillReady: {
    backgroundColor: colors.success,
  },
  qualityFillManual: {
    backgroundColor: colors.streak,
  },
  readinessStatusRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  readinessStatus: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: fontSize.xs,
    fontWeight: '900',
  },
  readinessRetry: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  calibrationBtn: {
    marginTop: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  calibrationBtnText: {
    color: '#FFF',
    fontSize: fontSize.xs,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  secondaryTrackerPill: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(91,196,245,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(91,196,245,0.32)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryTrackerText: {
    color: '#FFF',
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  secondaryTrackerStop: {
    color: colors.ice,
    fontSize: fontSize.xs,
    fontWeight: '900',
  },
  cameraNote: {
    marginTop: spacing.xs,
    color: 'rgba(255,255,255,0.78)',
    fontSize: fontSize.xs,
    fontWeight: '700',
    textAlign: 'center',
  },
  manualFallbackBtn: {
    marginTop: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  manualFallbackText: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: '900',
  },
  bottom: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
    borderRadius: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    flexWrap: 'nowrap',
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotFilled: { backgroundColor: colors.success },
  testProgress: {
    width: '100%',
    gap: spacing.xs,
    alignItems: 'center',
  },
  testTrack: {
    width: '100%',
    height: 12,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  testFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.streak,
  },
  testHint: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: fontSize.xs,
    fontWeight: '700',
    textAlign: 'center',
  },
  adjustRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  adjustBtn: {
    minWidth: 92,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  adjustBtnText: {
    color: '#FFF',
    fontSize: fontSize.sm,
    fontWeight: '900',
  },
  finishTestBtn: {
    borderRadius: radius.full,
    backgroundColor: colors.streak,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  finishTestBtnDisabled: {
    opacity: 0.45,
  },
  finishTestText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  manualNote: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  startBtn: {
    backgroundColor: '#FFF',
    borderRadius: radius.md,
    width: '100%',
    maxWidth: 280,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    alignItems: 'center',
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
  permTitle: { fontSize: fontSize.lg, color: colors.text, fontWeight: '900', textAlign: 'center' },
  permText: {
    fontSize: fontSize.md,
    color: colors.subtext,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  permBtn: {
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  permBtnText: { color: '#FFF', fontWeight: '700', fontSize: fontSize.md },
  manualFallbackLightBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  manualFallbackLightText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
});
