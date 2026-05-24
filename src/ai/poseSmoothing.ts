import { getRiskLevel } from "./riskScoring";
import type { AnalysisSettings, PoseFrame, PoseKeypoint, PostureMetrics, PostureResult } from "../types/pose";

function smoothNumber(previous: number, next: number, smoothing: number): number {
  const alpha = 1 - smoothing;
  return previous * smoothing + next * alpha;
}

function byName(frame: PoseFrame | null, name: PoseKeypoint["name"]): PoseKeypoint | undefined {
  return frame?.keypoints.find((point) => point.name === name);
}

export function smoothPoseFrame(
  previousFrame: PoseFrame | null,
  nextFrame: PoseFrame,
  settings: AnalysisSettings,
): PoseFrame {
  if (!previousFrame || settings.keypointSmoothing <= 0) return nextFrame;

  return {
    ...nextFrame,
    keypoints: nextFrame.keypoints.map((point) => {
      const previousPoint = byName(previousFrame, point.name);

      if (!previousPoint) return point;

      if (point.score < settings.minKeypointScore && previousPoint.score >= settings.minKeypointScore) {
        return {
          ...previousPoint,
          score: Math.max(settings.minKeypointScore, previousPoint.score * 0.92),
        };
      }

      return {
        ...point,
        x: smoothNumber(previousPoint.x, point.x, settings.keypointSmoothing),
        y: smoothNumber(previousPoint.y, point.y, settings.keypointSmoothing),
        score: Math.max(point.score, previousPoint.score * 0.8),
      };
    }),
  };
}

export function smoothPostureResult(
  previousResult: PostureResult | null,
  nextResult: PostureResult,
  settings: AnalysisSettings,
): PostureResult {
  if (!previousResult || settings.metricSmoothing <= 0) return nextResult;

  const metrics = Object.fromEntries(
    Object.entries(nextResult.metrics).map(([key, value]) => [
      key,
      smoothNumber(previousResult.metrics[key as keyof PostureMetrics], value, settings.metricSmoothing),
    ]),
  ) as unknown as PostureMetrics;

  const riskScore = Math.round(smoothNumber(previousResult.riskScore, nextResult.riskScore, settings.metricSmoothing));

  return {
    ...nextResult,
    metrics,
    riskScore,
    riskLevel: getRiskLevel(riskScore),
  };
}
