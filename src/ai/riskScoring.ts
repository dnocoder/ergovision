import type { PostureMetrics, PostureResult, RiskLevel } from "../types/pose";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getRiskLevel(riskScore: number): RiskLevel {
  if (riskScore >= 61) return "high";
  if (riskScore >= 31) return "medium";
  return "low";
}

export function scorePosture(metrics: PostureMetrics, sensitivity = 1): PostureResult {
  const weighted =
    metrics.headTilt * 0.22 +
    metrics.shoulderTilt * 0.24 +
    metrics.headOffset * 0.22 +
    metrics.distanceRisk * 0.22 +
    metrics.stability * 0.1;

  const visibilityPenalty = metrics.visibility < 55 ? 18 : metrics.visibility < 75 ? 8 : 0;
  const riskScore = clampScore(weighted * sensitivity + visibilityPenalty);
  const reasons: string[] = [];

  if (metrics.headTilt > 34) reasons.push("наклон головы");
  if (metrics.shoulderTilt > 30) reasons.push("перекос плеч");
  if (metrics.headOffset > 34) reasons.push("голова смещена от центра плеч");
  if (metrics.distanceRisk > 35) reasons.push("слишком близко к камере");
  if (metrics.visibility < 75) reasons.push("не все ключевые точки видны");

  return {
    metrics,
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    reasons,
  };
}
