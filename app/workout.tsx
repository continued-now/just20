import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { getFiredNudgeCountToday, getSetting, saveSession, setSetting } from '../lib/db';
import {
  DEFAULT_SCHEDULED_HOUR,
  cancelAllNudges,
  scheduleWindowWithFallbackNudges,
  scheduleWindowedNotification,
} from '../lib/notifications';

const TARGET = 20;
const MIN_OVERLAY_SCORE = 0.2;
const MODEL_INPUT_SIZE = 192;
const PRIMARY_CROP_SCALE = 0.78;
const SECONDARY_CROP_SCALE = 0.5;

const DEVICE_PERFORMANCE_CONFIG = {
  previewFps: 3,
  activeFps: 10,
  recoveryFps: 6,
  smoothingAlpha: 0.32,
};

const EMULATOR_PERFORMANCE_CONFIG = {
  previewFps: 1,
  activeFps: 4,
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
  const { hasPermission, requestPermission } = useCameraPermission();
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const device = frontDevice ?? backDevice;
  const usingFallbackCamera = !frontDevice && !!backDevice;
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
  const [manualAdjustments, setManualAdjustments] = useState(0);
  const [showCalibration, setShowCalibration] = useState(false);
  const [secondaryTrackingRequested, setSecondaryTrackingRequested] = useState(false);
  const [cameraPaused, setCameraPaused] = useState(false);

  const startTimeRef = useRef<number>(0);
  const finishedRef = useRef(false);
  const stopConfirmedRef = useRef(false);
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
  const smoothedElbowAngle = useSharedValue(0);
  const smoothedConfidence = useSharedValue(0);
  const secondarySmoothedElbowAngle = useSharedValue(0);
  const secondarySmoothedConfidence = useSharedValue(0);
  const previewPoseFps = useSharedValue(PERFORMANCE_CONFIG.previewFps);
  const activePoseFps = useSharedValue(PERFORMANCE_CONFIG.activeFps);
  const recoveryPoseFps = useSharedValue(PERFORMANCE_CONFIG.recoveryFps);
  const smoothingAlpha = useSharedValue(PERFORMANCE_CONFIG.smoothingAlpha);
  const manuallyAdjusted = useSharedValue(false);
  const primaryLocked = useSharedValue(false);
  const primaryCenterX = useSharedValue(0.5);
  const primaryCenterY = useSharedValue(0.5);
  const secondaryEnabled = useSharedValue(false);
  const secondaryCenterX = useSharedValue(0.5);
  const secondaryCenterY = useSharedValue(0.5);
  const lastSecondaryPoseTime = useSharedValue(0);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    previewPoseFps.value = performanceConfig.previewFps;
    activePoseFps.value = performanceConfig.activeFps;
    recoveryPoseFps.value = performanceConfig.recoveryFps;
    smoothingAlpha.value = performanceConfig.smoothingAlpha;
  }, [performanceConfig, previewPoseFps, activePoseFps, recoveryPoseFps, smoothingAlpha]);

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
      if (count >= TARGET && !finishedRef.current) {
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
        const primaryCrop = primaryLocked.value
          ? makeSquareCrop(frame.width, frame.height, primaryCenterX.value, primaryCenterY.value, PRIMARY_CROP_SCALE)
          : makeSquareCrop(frame.width, frame.height, 0.5, 0.5, 1);
        const resized = resize(frame, {
          crop: primaryCrop,
          scale: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE },
          pixelFormat: 'rgb',
          dataType: 'float32',
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
          if (!primaryLocked.value) {
            primaryCenterX.value = primaryBounds.centerX;
            primaryCenterY.value = primaryBounds.centerY;
          } else {
            primaryCenterX.value = primaryCenterX.value * 0.78 + primaryBounds.centerX * 0.22;
            primaryCenterY.value = primaryCenterY.value * 0.78 + primaryBounds.centerY * 0.22;
          }
          primaryLocked.value = true;
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
        const now = Date.now();
        const lastPoseAt = lastPoseTime.value;
        const updateFps = lastPoseAt > 0 ? Math.min(60, 1000 / Math.max(1, now - lastPoseAt)) : targetFps;
        const inferenceMs = performance.now() - inferenceStart;

        if (secondaryEnabled.value) {
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
            dataType: 'float32',
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
      previewPoseFps,
      activePoseFps,
      recoveryPoseFps,
      smoothingAlpha,
      manuallyAdjusted,
      primaryLocked,
      primaryCenterX,
      primaryCenterY,
      secondaryEnabled,
      secondaryCenterX,
      secondaryCenterY,
      lastSecondaryPoseTime,
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
  }

  function handleStart() {
    wentDown.value = false;
    lastDownTime.value = 0;
    repCount.value = 0;
    lastSentCount.value = -1;
    lastFeedbackTime.value = 0;
    isKneeDrop.value = false;
    lastPoseTime.value = 0;
    smoothedElbowAngle.value = 0;
    smoothedConfidence.value = 0;
    secondarySmoothedElbowAngle.value = 0;
    secondarySmoothedConfidence.value = 0;
    manuallyAdjusted.value = false;
    finishedRef.current = false;
    prevRepsRef.current = 0;
    startTimeRef.current = 0;
    setReps(0);
    setFinished(false);
    setCameraPaused(false);
    setStarted(true);
    setCountdown(3);
    setFirstRepTime(null);
    setElapsed(0);
    setRepTimestamps([]);
    setMilestoneMsg(null);
    setManualAdjustments(0);
    // isStarted.value set after countdown reaches 0
  }

  function handleCalibrate() {
    primaryLocked.value = false;
    primaryCenterX.value = 0.5;
    primaryCenterY.value = 0.5;
    smoothedElbowAngle.value = 0;
    smoothedConfidence.value = 0;
    secondaryEnabled.value = false;
    secondaryCenterX.value = 0.5;
    secondaryCenterY.value = 0.5;
    secondarySmoothedElbowAngle.value = 0;
    secondarySmoothedConfidence.value = 0;
    lastSecondaryPoseTime.value = 0;
    setSecondaryPoseFrame(null);
    setSecondaryTrackingRequested(false);
    setShowCalibration(true);
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
    setSecondaryPoseFrame(null);
    setSecondaryTrackingRequested(true);
    Haptics.selectionAsync();
  }

  function handleManualRep(delta: number) {
    if (!started || countdown !== null || finished) return;

    const next = Math.max(0, Math.min(TARGET, reps + delta));
    if (next === reps) return;

    repCount.value = next;
    lastSentCount.value = next;
    lastFeedbackTime.value = Date.now();
    manuallyAdjusted.value = true;
    setManualAdjustments((current) => current + delta);
    setReps(next);
    setFeedback(delta > 0 ? 'Rep added' : 'Rep removed');
    if (delta < 0) {
      prevRepsRef.current = next;
      setRepTimestamps((prev) => prev.slice(0, -1));
    }

    if (next >= TARGET && !finishedRef.current) {
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

    await cancelAllNudges();
  }

  function getWorkoutDurationMs(): number {
    const startedAt = firstRepTime ?? startTimeRef.current;
    return startedAt > 0 ? Math.max(0, Date.now() - startedAt) : 0;
  }

  async function handleFinish() {
    isStarted.value = false;
    const duration = getWorkoutDurationMs();
    const nudgesUsed = await getFiredNudgeCountToday();
    await saveSession(reps, duration);
    await clearCompletedWorkoutReminders();
    router.replace({
      pathname: '/completion',
      params: { reps: String(reps), duration: String(duration), nudgesUsed: String(nudgesUsed) },
    });
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
            isStarted.value = false;
            const duration = getWorkoutDurationMs();
            await saveSession(reps, duration);
            if (reps >= TARGET) await clearCompletedWorkoutReminders();
            router.back();
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
  const startDisabled = !modelReady || modelError || !device || !!cameraError;
  const workoutActive = started && countdown === null && !finished;

  const isBigCountdown = countdown !== null && countdown > 0;
  const isMilestone = countdown === null && !!milestoneMsg;
  const activeFeedback =
    countdown !== null
      ? countdown === 0
        ? 'Go!'
        : String(countdown)
      : milestoneMsg ?? feedback;
  const shouldShowCalibration = !!poseFrame && !started && (showCalibration || !poseFrame.bodyInFrame);

  return (
    <View style={styles.root}>
      {device ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={!finished && !cameraPaused}
          photo={false}
          video={false}
          audio={false}
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
          {shouldShowCalibration && (
            <View style={styles.calibrationCard}>
              <Text style={styles.calibrationTitle}>
                {poseFrame.bodyInFrame ? 'Ready to track' : 'Calibrating camera'}
              </Text>
              <Text style={styles.calibrationText}>{poseFrame.calibration}</Text>
              <View style={styles.qualityTrack}>
                <View
                  style={[
                    styles.qualityFill,
                    { width: `${Math.round(poseFrame.trackingQuality * 100)}%` },
                  ]}
                />
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
              {workoutActive && repTimestamps.length >= 2 && (
                <PaceGraph timestamps={repTimestamps} />
              )}
              {workoutActive && (
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
              {manualAdjustments !== 0 && (
                <Text style={styles.manualNote}>
                  manual adjustment {manualAdjustments > 0 ? '+' : ''}{manualAdjustments}
                </Text>
              )}
              {!started && (
                <TouchableOpacity
                  style={[styles.startBtn, startDisabled && styles.startBtnDisabled]}
                  onPress={handleStart}
                  disabled={startDisabled}
                >
                  <Text style={styles.startBtnText}>
                    {!device
                      ? 'No camera found'
                      : cameraError
                      ? 'Camera unavailable'
                      : modelError
                      ? 'Model failed to load'
                      : modelReady
                      ? 'START'
                      : 'Loading model…'}
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
  calibrationCard: {
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
  calibrationTitle: {
    color: '#FFF',
    fontSize: fontSize.sm,
    fontWeight: '900',
    textAlign: 'center',
  },
  calibrationText: {
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
  adjustRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  manualNote: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
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
