import type { RiskLevel } from "../types/pose";

interface RiskGaugeProps {
  score: number;
  level: RiskLevel;
}

const LABELS: Record<RiskLevel, string> = {
  low: "Норма",
  medium: "Средний риск",
  high: "Высокий риск",
};

export function RiskGauge({ score, level }: RiskGaugeProps) {
  return (
    <section className={`risk-gauge risk-${level}`} aria-label="Индикатор риска">
      <div className="gauge-ring" style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}>
        <div>
          <strong>{score}</strong>
          <span>/100</span>
        </div>
      </div>
      <div>
        <p className="eyebrow">Risk score</p>
        <h2>{LABELS[level]}</h2>
      </div>
    </section>
  );
}
