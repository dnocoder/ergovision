import type { SessionPoint, SessionSummary } from "../types/pose";

const STORAGE_KEY = "ergovision.sessions";

export function loadSessions(): SessionSummary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionSummary[]) : [];
  } catch {
    return [];
  }
}

export function saveSession(points: SessionPoint[], startedAt: Date): SessionSummary | null {
  if (points.length === 0) return null;

  const totalRisk = points.reduce((sum, point) => sum + point.riskScore, 0);
  const summary: SessionSummary = {
    id: crypto.randomUUID(),
    startedAt: startedAt.toISOString(),
    endedAt: new Date().toISOString(),
    averageRisk: Math.round(totalRisk / points.length),
    maxRisk: Math.max(...points.map((point) => point.riskScore)),
    highRiskFrames: points.filter((point) => point.riskLevel === "high").length,
    totalFrames: points.length,
  };

  const next = [summary, ...loadSessions()].slice(0, 8);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return summary;
}

export function clearSessions(): void {
  localStorage.removeItem(STORAGE_KEY);
}
