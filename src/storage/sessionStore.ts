import type { SessionStats, SessionSummary } from "../types/pose";

const STORAGE_KEY = "ergovision.sessions";
const MAX_SESSIONS = 20;

function createId(): string {
  // crypto.randomUUID is only available in secure contexts (https / localhost).
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isSessionSummary(value: unknown): value is SessionSummary {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<SessionSummary>;
  return (
    typeof session.id === "string" &&
    typeof session.startedAt === "string" &&
    typeof session.endedAt === "string" &&
    typeof session.averageRisk === "number" &&
    typeof session.maxRisk === "number" &&
    typeof session.totalFrames === "number"
  );
}

export function createEmptyStats(): SessionStats {
  return { samples: 0, riskSum: 0, maxRisk: 0, highSamples: 0, lowSamples: 0, alerts: 0 };
}

export function loadSessions(): SessionSummary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isSessionSummary) : [];
  } catch {
    return [];
  }
}

export function saveSession(stats: SessionStats, startedAt: Date): SessionSummary | null {
  if (stats.samples === 0) return null;

  const summary: SessionSummary = {
    id: createId(),
    startedAt: startedAt.toISOString(),
    endedAt: new Date().toISOString(),
    averageRisk: Math.round(stats.riskSum / stats.samples),
    maxRisk: stats.maxRisk,
    highRiskFrames: stats.highSamples,
    lowRiskFrames: stats.lowSamples,
    totalFrames: stats.samples,
    alerts: stats.alerts,
  };

  try {
    const next = [summary, ...loadSessions()].slice(0, MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Failed to persist session history.", error);
  }
  return summary;
}

export function clearSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable (private mode); nothing to clear then.
  }
}
