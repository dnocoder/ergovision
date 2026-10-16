import { Activity, MoveHorizontal, Ruler, ScanFace, ShieldAlert, UserRoundCheck } from "lucide-react";
import type { PostureResult } from "../types/pose";

interface MetricsPanelProps {
  result: PostureResult;
  active: boolean;
}

const metricRows = [
  { key: "headTilt", label: "Наклон головы", icon: ScanFace },
  { key: "shoulderTilt", label: "Перекос плеч", icon: Ruler },
  { key: "headOffset", label: "Смещение головы", icon: MoveHorizontal },
  { key: "distanceRisk", label: "Близость к экрану", icon: ShieldAlert },
  { key: "stability", label: "Подвижность", icon: Activity },
] as const;

function barTone(value: number): string {
  if (value > 60) return "high";
  if (value > 30) return "medium";
  return "low";
}

export function MetricsPanel({ result, active }: MetricsPanelProps) {
  return (
    <section className="panel metrics-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Признаки позы</p>
          <h2>Детализация</h2>
        </div>
        <span className="source-pill" title="Доля надежно распознанных ключевых точек">
          <UserRoundCheck size={16} aria-hidden="true" />
          {active ? `${Math.round(result.metrics.visibility)}%` : "—"}
        </span>
      </div>

      <div className="metric-list">
        {metricRows.map(({ key, label, icon: Icon }) => {
          const value = active ? Math.round(result.metrics[key]) : 0;
          return (
            <div className="metric-row" key={key}>
              <div className="metric-label">
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </div>
              <div className="metric-bar" aria-hidden="true">
                <span className={`tone-${barTone(value)}`} style={{ width: `${value}%` }} />
              </div>
              <strong>{active ? value : "—"}</strong>
            </div>
          );
        })}
      </div>

      <div className="reason-box">
        <span>Отклонения</span>
        <p>
          {!active
            ? "Появятся во время анализа."
            : result.reasons.length > 0
              ? result.reasons.map((reason) => reason[0].toUpperCase() + reason.slice(1)).join(" · ")
              : "Критичных отклонений нет"}
        </p>
      </div>
    </section>
  );
}
