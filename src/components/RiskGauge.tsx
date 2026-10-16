import type { CSSProperties } from "react";
import { getPostureTip } from "../ai/riskScoring";
import type { RiskLevel } from "../types/pose";

export type GaugeState = "idle" | "warming" | "absent" | "live";

interface RiskGaugeProps {
  score: number;
  level: RiskLevel;
  reasons: string[];
  state: GaugeState;
}

const LABELS: Record<RiskLevel, string> = {
  low: "Хорошая посадка",
  medium: "Средний риск",
  high: "Высокий риск",
};

const PLACEHOLDERS: Record<Exclude<GaugeState, "live">, { title: string; text: string }> = {
  idle: { title: "Нет данных", text: "Запустите анализ, чтобы получить оценку посадки в реальном времени." },
  warming: { title: "Анализируем…", text: "Первая оценка появится через пару секунд." },
  absent: { title: "Пауза", text: "Вас не видно в кадре — оценка возобновится, когда вы вернетесь." },
};

export function RiskGauge({ score, level, reasons, state }: RiskGaugeProps) {
  const live = state === "live";
  const placeholder = live ? null : PLACEHOLDERS[state];
  const style = { "--score": `${live ? score * 3.6 : 0}deg` } as CSSProperties;

  return (
    <section className={`risk-gauge ${live ? `risk-${level}` : "risk-idle"}`} aria-label="Оценка риска посадки">
      <div className="gauge-ring" style={style}>
        <div>
          <strong>{live ? score : "—"}</strong>
          <span>из 100</span>
        </div>
      </div>
      <div className="gauge-text">
        <p className="eyebrow">Индекс риска</p>
        <h2>{placeholder ? placeholder.title : LABELS[level]}</h2>
        <p className="muted">{placeholder ? placeholder.text : getPostureTip(reasons)}</p>
      </div>
    </section>
  );
}
