import type { AnalysisSettings, CalibrationProfile } from "../types/pose";

const SETTINGS_KEY = "ergovision.settings";
const CALIBRATION_KEY = "ergovision.calibration";

export const defaultSettings: AnalysisSettings = {
  sensitivity: 1,
  keypointSmoothing: 0.68,
  metricSmoothing: 0.52,
  minKeypointScore: 0.2,
  targetFps: 12,
  alertDelaySec: 10,
  soundAlerts: false,
  desktopNotifications: false,
};

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to persist ${key}.`, error);
  }
}

export function loadSettings(): AnalysisSettings {
  const stored = readJson(SETTINGS_KEY);
  if (!stored || typeof stored !== "object") return defaultSettings;

  const merged = { ...defaultSettings };
  for (const key of Object.keys(defaultSettings) as (keyof AnalysisSettings)[]) {
    const value = (stored as Record<string, unknown>)[key];
    if (typeof value === typeof defaultSettings[key]) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}

export function saveSettings(settings: AnalysisSettings): void {
  writeJson(SETTINGS_KEY, settings);
}

export function loadCalibration(): CalibrationProfile | null {
  const stored = readJson(CALIBRATION_KEY) as Partial<CalibrationProfile> | null;
  if (
    !stored ||
    (stored.source !== "movenet" && stored.source !== "demo") ||
    typeof stored.shoulderSpan !== "number" ||
    typeof stored.headOffset !== "number" ||
    typeof stored.shoulderTilt !== "number" ||
    typeof stored.noseY !== "number"
  ) {
    return null;
  }
  return stored as CalibrationProfile;
}

export function saveCalibration(calibration: CalibrationProfile | null): void {
  writeJson(CALIBRATION_KEY, calibration);
}
