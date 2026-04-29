// MoveNet Lightning outputs [1, 1, 17, 3]: keypoints as [y, x, score] (normalized 0-1)
// Keypoint indices: https://www.tensorflow.org/hub/tutorials/movenet

export const KP = {
  NOSE: 0,
  LEFT_EYE: 1,
  RIGHT_EYE: 2,
  LEFT_EAR: 3,
  RIGHT_EAR: 4,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,
  RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
} as const;

export type Keypoint = { x: number; y: number; score: number };
export type PushupPhase = 'up' | 'down' | 'transition';
export type PoseBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  visibleKeypoints: number;
};

function angle(a: Keypoint, b: Keypoint, c: Keypoint): number {
  'worklet';
  const bax = a.x - b.x, bay = a.y - b.y;
  const bcx = c.x - b.x, bcy = c.y - b.y;
  const dot = bax * bcx + bay * bcy;
  const mag = Math.sqrt(bax * bax + bay * bay) * Math.sqrt(bcx * bcx + bcy * bcy);
  if (mag === 0) return 0;
  return Math.acos(Math.min(1, Math.max(-1, dot / mag))) * (180 / Math.PI);
}

export type PoseAnalysis = {
  phase: PushupPhase;
  elbowAngle: number;
  feedback: string;
  confidence: number;
  hipSagging: boolean;
  calibration: string;
  trackingQuality: number;
  bodyInFrame: boolean;
};

function classifyPushupPhase(elbowAngle: number, hipSagging: boolean): {
  phase: PushupPhase;
  feedback: string;
} {
  'worklet';
  let phase: PushupPhase;
  let feedback: string;

  if (elbowAngle > 155) {
    phase = 'up';
    feedback = 'Lower yourself down';
  } else if (elbowAngle < 95) {
    phase = 'down';
    feedback = hipSagging ? 'Keep hips level!' : 'Push up!';
  } else {
    phase = 'transition';
    feedback = elbowAngle > 125 ? 'Go lower!' : 'Push up!';
  }

  if (hipSagging && phase !== 'transition') feedback = 'Keep hips level!';
  return { phase, feedback };
}

function getCalibration(kps: Keypoint[], confidence: number): {
  calibration: string;
  trackingQuality: number;
  bodyInFrame: boolean;
} {
  'worklet';
  const CONF = 0.2;
  const required = [
    KP.LEFT_SHOULDER,
    KP.RIGHT_SHOULDER,
    KP.LEFT_WRIST,
    KP.RIGHT_WRIST,
    KP.LEFT_HIP,
    KP.RIGHT_HIP,
    KP.LEFT_KNEE,
    KP.RIGHT_KNEE,
  ];

  let visibleRequired = 0;
  let totalRequiredScore = 0;
  for (let i = 0; i < required.length; i++) {
    const kp = kps[required[i]];
    totalRequiredScore += kp.score;
    if (kp.score > CONF) visibleRequired += 1;
  }

  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  let visibleAny = 0;
  for (let i = 0; i < kps.length; i++) {
    const kp = kps[i];
    if (kp.score <= CONF) continue;
    visibleAny += 1;
    minX = Math.min(minX, kp.x);
    minY = Math.min(minY, kp.y);
    maxX = Math.max(maxX, kp.x);
    maxY = Math.max(maxY, kp.y);
  }

  if (visibleAny === 0) {
    return {
      calibration: 'Face the camera and fit your body in frame',
      trackingQuality: 0,
      bodyInFrame: false,
    };
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const scoreQuality = totalRequiredScore / required.length;
  const visibilityQuality = visibleRequired / required.length;
  let framingQuality = 1;

  if (minX < 0.03 || maxX > 0.97 || minY < 0.03 || maxY > 0.97) {
    framingQuality = 0.55;
  } else if (height < 0.32 || width < 0.2) {
    framingQuality = 0.7;
  }

  const trackingQuality = Math.max(
    0,
    Math.min(1, scoreQuality * 0.45 + visibilityQuality * 0.4 + framingQuality * 0.15)
  );
  const bodyInFrame = visibleRequired >= 5 && trackingQuality >= 0.42;

  if (visibleRequired < 4) {
    return { calibration: 'Face camera: show shoulders, hands, hips', trackingQuality, bodyInFrame: false };
  }
  if (minX < 0.03 || maxX > 0.97 || minY < 0.03 || maxY > 0.97) {
    return { calibration: 'Move back until your full body fits', trackingQuality, bodyInFrame };
  }
  if (height < 0.32 || width < 0.2) {
    return { calibration: 'Move closer; keep camera facing your front', trackingQuality, bodyInFrame };
  }
  if (trackingQuality < 0.45) {
    return { calibration: 'Improve lighting or wear fitted clothing', trackingQuality, bodyInFrame };
  }

  return { calibration: 'Tracking locked', trackingQuality, bodyInFrame };
}

export function getPoseBounds(kps: Keypoint[], minScore = 0.2): PoseBounds | null {
  'worklet';
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  let visibleKeypoints = 0;

  for (let i = 0; i < kps.length; i++) {
    const kp = kps[i];
    if (kp.score < minScore) continue;
    visibleKeypoints += 1;
    minX = Math.min(minX, kp.x);
    minY = Math.min(minY, kp.y);
    maxX = Math.max(maxX, kp.x);
    maxY = Math.max(maxY, kp.y);
  }

  if (visibleKeypoints === 0) return null;

  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
    visibleKeypoints,
  };
}

export function mapCropKeypoints(
  kps: Keypoint[],
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
  frameWidth: number,
  frameHeight: number
): Keypoint[] {
  'worklet';
  const mapped: Keypoint[] = [];
  for (let i = 0; i < kps.length; i++) {
    const kp = kps[i];
    mapped.push({
      x: (cropX + kp.x * cropWidth) / frameWidth,
      y: (cropY + kp.y * cropHeight) / frameHeight,
      score: kp.score,
    });
  }
  return mapped;
}

export function smoothPoseAnalysis(
  analysis: PoseAnalysis,
  elbowAngle: number,
  confidence: number
): PoseAnalysis {
  'worklet';
  if (elbowAngle <= 0 || confidence <= 0) return analysis;

  const { phase, feedback } = classifyPushupPhase(elbowAngle, analysis.hipSagging);
  const calibrationFeedback =
    analysis.bodyInFrame || confidence > 0.5 ? feedback : analysis.calibration;

  return {
    phase,
    elbowAngle,
    feedback: calibrationFeedback,
    confidence,
    hipSagging: analysis.hipSagging,
    calibration: analysis.calibration,
    trackingQuality: analysis.trackingQuality,
    bodyInFrame: analysis.bodyInFrame,
  };
}

export function analyzePose(kps: Keypoint[]): PoseAnalysis {
  'worklet';
  const CONF = 0.25;

  const ls = kps[KP.LEFT_SHOULDER];
  const rs = kps[KP.RIGHT_SHOULDER];
  const le = kps[KP.LEFT_ELBOW];
  const re = kps[KP.RIGHT_ELBOW];
  const lw = kps[KP.LEFT_WRIST];
  const rw = kps[KP.RIGHT_WRIST];
  const lh = kps[KP.LEFT_HIP];
  const rh = kps[KP.RIGHT_HIP];

  const leftOk = ls.score > CONF && le.score > CONF && lw.score > CONF;
  const rightOk = rs.score > CONF && re.score > CONF && rw.score > CONF;

  if (!leftOk && !rightOk) {
    const calibration = getCalibration(kps, 0);
    return {
      phase: 'transition',
      elbowAngle: 0,
      feedback: calibration.calibration,
      confidence: 0,
      hipSagging: false,
      calibration: calibration.calibration,
      trackingQuality: calibration.trackingQuality,
      bodyInFrame: calibration.bodyInFrame,
    };
  }

  let elbowAngle = 0;
  let confidence = 0;

  if (leftOk && rightOk) {
    elbowAngle = (angle(ls, le, lw) + angle(rs, re, rw)) / 2;
    confidence = (ls.score + rs.score + le.score + re.score) / 4;
  } else if (leftOk) {
    elbowAngle = angle(ls, le, lw);
    confidence = (ls.score + le.score + lw.score) / 3;
  } else {
    elbowAngle = angle(rs, re, rw);
    confidence = (rs.score + re.score + rw.score) / 3;
  }

  const shoulderY = (ls.score > CONF ? ls.y : 0) || (rs.score > CONF ? rs.y : 0);
  const hipY = (lh.score > CONF ? lh.y : 0) || (rh.score > CONF ? rh.y : 0);
  const hipSagging = hipY > 0 && shoulderY > 0 && hipY > shoulderY + 0.15;
  const calibration = getCalibration(kps, confidence);
  const classified = classifyPushupPhase(elbowAngle, hipSagging);
  const feedback = calibration.bodyInFrame || confidence > 0.5
    ? classified.feedback
    : calibration.calibration;

  return {
    phase: classified.phase,
    elbowAngle,
    feedback,
    confidence,
    hipSagging,
    calibration: calibration.calibration,
    trackingQuality: calibration.trackingQuality,
    bodyInFrame: calibration.bodyInFrame,
  };
}

// Parse raw TFLite output tensor into keypoints
// MoveNet output shape: [1, 1, 17, 3] as flat Float32Array
export function parseMoveNetOutput(output: Float32Array): Keypoint[] {
  'worklet';
  const kps: Keypoint[] = [];
  for (let i = 0; i < 17; i++) {
    const base = i * 3;
    kps.push({
      y: output[base],
      x: output[base + 1],
      score: output[base + 2],
    });
  }
  return kps;
}
