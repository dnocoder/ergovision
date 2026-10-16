import type { PostureMetrics, PostureResult, RiskLevel } from "../types/pose";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export const REASONS = {
  headTilt: "наклон головы",
  shoulderTilt: "перекос плеч",
  headOffset: "голова смещена от центра плеч",
  distance: "слишком близко к экрану",
  visibility: "не все ключевые точки видны",
} as const;

const TIPS: Record<string, string> = {
  [REASONS.distance]: "Отодвиньтесь от экрана и выпрямите спину — монитор должен быть на расстоянии вытянутой руки.",
  [REASONS.headTilt]: "Держите голову ровно, взгляд — на верхнюю треть экрана.",
  [REASONS.shoulderTilt]: "Выровняйте плечи и опустите их, локти — на подлокотники или стол.",
  [REASONS.headOffset]: "Сядьте по центру перед монитором, не тянитесь головой в сторону.",
  [REASONS.visibility]: "Сядьте так, чтобы голова и плечи полностью попадали в кадр, и проверьте освещение.",
};

export function getPostureTip(reasons: string[]): string {
  for (const reason of reasons) {
    if (TIPS[reason]) return TIPS[reason];
  }
  return "Отличная посадка. Не забывайте каждые 30–40 минут вставать и разминаться.";
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

  if (metrics.headTilt > 34) reasons.push(REASONS.headTilt);
  if (metrics.shoulderTilt > 30) reasons.push(REASONS.shoulderTilt);
  if (metrics.headOffset > 34) reasons.push(REASONS.headOffset);
  if (metrics.distanceRisk > 35) reasons.push(REASONS.distance);
  if (metrics.visibility < 75) reasons.push(REASONS.visibility);

  return {
    metrics,
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    reasons,
  };
}
