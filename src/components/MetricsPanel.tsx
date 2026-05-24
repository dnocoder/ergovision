import { Activity, MoveHorizontal, Ruler, ScanFace, ShieldAlert, UserRoundCheck } from "lucide-react";
import type { PostureResult } from "../types/pose";

interface MetricsPanelProps {
  result: PostureResult;
  modelSource: string;
}

const metricRows = [
  { key: "headTilt", label: "Наклон головы", icon: ScanFace },
  { key: "shoulderTilt", label: "Перекос плеч", icon: Ruler },
  { key: "headOffset", label: "Смещение головы", icon: MoveHorizontal },
  { key: "distanceRisk", label: "Близость к камере", icon: ShieldAlert },
  { key: "stability", label: "Нестабильность", icon: Activity },
] as const;

export function MetricsPanel({ result, modelSource }: MetricsPanelProps) {
  return (
    <section className="panel metrics-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">AI metrics</p>
          <h2>Признаки позы</h2>
        </div>
        <span className="source-pill">{modelSource === "movenet" ? "MoveNet" : "Demo fallback"}</span>
      </div>

      <div className="metric-list">
        {metricRows.map(({ key, label, icon: Icon }) => (
          <div className="metric-row" key={key}>
            <div className="metric-label">
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </div>
            <div className="metric-bar" aria-hidden="true">
              <span style={{ width: `${Math.round(result.metrics[key])}%` }} />
            </div>
            <strong>{Math.round(result.metrics[key])}</strong>
          </div>
        ))}
      </div>

      <div className="visibility-box">
        <UserRoundCheck size={20} aria-hidden="true" />
        <span>Видимость keypoints</span>
        <strong>{result.metrics.visibility}%</strong>
      </div>

      <div className="reason-box">
        <span>Причины</span>
        <p>{result.reasons.length > 0 ? result.reasons.join(", ") : "критичных отклонений нет"}</p>
      </div>
    </section>
  );
}
