export type RiskLevel = "low" | "medium" | "high";

export type KeypointName =
  | "nose"
  | "left_eye"
  | "right_eye"
  | "left_ear"
  | "right_ear"
  | "left_shoulder"
  | "right_shoulder";

export interface PoseKeypoint {
  name: KeypointName;
  x: number;
  y: number;
  score: number;
}

export interface PoseFrame {
  keypoints: PoseKeypoint[];
  source: "movenet" | "demo";
  timestamp: number;
}

export type PoseSource = PoseFrame["source"];

export interface CalibrationProfile {
  source: PoseSource;
  createdAt: string;
  headOffset: number;
  shoulderSpan: number;
  shoulderTilt: number;
  noseY: number;
}

export interface PostureMetrics {
  headTilt: number;
  shoulderTilt: number;
  headOffset: number;
  distanceRisk: number;
  stability: number;
  visibility: number;
}

export interface PostureResult {
  metrics: PostureMetrics;
  riskScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
}

export interface AnalysisSettings {
  sensitivity: number;
  keypointSmoothing: number;
  metricSmoothing: number;
  minKeypointScore: number;
  targetFps: number;
  alertDelaySec: number;
  soundAlerts: boolean;
  desktopNotifications: boolean;
}

export interface SessionPoint {
  time: string;
  riskScore: number;
  riskLevel: RiskLevel;
}

export interface SessionSummary {
  id: string;
  startedAt: string;
  endedAt: string;
  averageRisk: number;
  maxRisk: number;
  highRiskFrames: number;
  totalFrames: number;
  lowRiskFrames?: number;
  alerts?: number;
}

export interface SessionStats {
  samples: number;
  riskSum: number;
  maxRisk: number;
  highSamples: number;
  lowSamples: number;
  alerts: number;
}
