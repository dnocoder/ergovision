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

export interface CalibrationProfile {
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
}
