import type { CalibrationProfile, PoseFrame, PoseKeypoint, PostureMetrics } from "../types/pose";

const DEFAULT_REQUIRED_VISIBILITY = 0.25;

function byName(frame: PoseFrame, name: PoseKeypoint["name"], minScore: number): PoseKeypoint | undefined {
  return frame.keypoints.find((point) => point.name === name && point.score >= minScore);
}

function distance(a: PoseKeypoint, b: PoseKeypoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function createCalibration(frame: PoseFrame, minScore = DEFAULT_REQUIRED_VISIBILITY): CalibrationProfile | null {
  const nose = byName(frame, "nose", minScore);
  const leftShoulder = byName(frame, "left_shoulder", minScore);
  const rightShoulder = byName(frame, "right_shoulder", minScore);

  if (!nose || !leftShoulder || !rightShoulder) {
    return null;
  }

  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;

  return {
    headOffset: nose.x - shoulderCenterX,
    shoulderSpan: distance(leftShoulder, rightShoulder),
    shoulderTilt: Math.abs(leftShoulder.y - rightShoulder.y),
    noseY: nose.y,
  };
}

export function calculateMetrics(
  frame: PoseFrame,
  calibration: CalibrationProfile | null,
  previousFrame: PoseFrame | null,
  minScore = DEFAULT_REQUIRED_VISIBILITY,
): PostureMetrics {
  const nose = byName(frame, "nose", minScore);
  const leftShoulder = byName(frame, "left_shoulder", minScore);
  const rightShoulder = byName(frame, "right_shoulder", minScore);
  const leftEye = byName(frame, "left_eye", minScore);
  const rightEye = byName(frame, "right_eye", minScore);

  const visiblePoints = frame.keypoints.filter((point) => point.score >= minScore).length;
  const visibility = Math.round((visiblePoints / Math.max(frame.keypoints.length, 1)) * 100);

  if (!nose || !leftShoulder || !rightShoulder) {
    return {
      headTilt: 100,
      shoulderTilt: 100,
      headOffset: 100,
      distanceRisk: 70,
      stability: 80,
      visibility,
    };
  }

  const shoulderSpan = distance(leftShoulder, rightShoulder);
  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
  const baselineSpan = calibration?.shoulderSpan || shoulderSpan;
  const baselineOffset = calibration?.headOffset || 0;
  const baselineNoseY = calibration?.noseY || nose.y;

  const eyeTilt = leftEye && rightEye ? Math.abs(leftEye.y - rightEye.y) : 0;
  const shoulderTilt = Math.max(0, Math.abs(leftShoulder.y - rightShoulder.y) - (calibration?.shoulderTilt ?? 0));
  const headOffset = Math.abs(nose.x - shoulderCenterX - baselineOffset);
  const closeRatio = shoulderSpan / Math.max(baselineSpan, 1);
  const forwardRatio = Math.max(0, (nose.y - baselineNoseY) / Math.max(baselineSpan, 1));

  let stability = 0;
  if (previousFrame) {
    const previousNose = byName(previousFrame, "nose", minScore);
    if (previousNose) {
      stability = Math.min(100, (distance(nose, previousNose) / Math.max(baselineSpan, 1)) * 220);
    }
  }

  return {
    headTilt: Math.min(100, (eyeTilt / Math.max(baselineSpan, 1)) * 260),
    shoulderTilt: Math.min(100, (shoulderTilt / Math.max(baselineSpan, 1)) * 230),
    headOffset: Math.min(100, (headOffset / Math.max(baselineSpan, 1)) * 230),
    distanceRisk: Math.min(100, Math.max(0, (closeRatio - 1.12) * 190 + forwardRatio * 140)),
    stability,
    visibility,
  };
}
