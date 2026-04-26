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
};

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
    return { phase: 'transition', elbowAngle: 0, feedback: 'Position yourself in frame', confidence: 0 };
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

  return { phase, elbowAngle, feedback, confidence };
}

// Parse raw TFLite output tensor into keypoints
// MoveNet output shape: [1, 1, 17, 3] as flat Float32Array
export function parseMoveNetOutput(output: Float32Array): Keypoint[] {
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
