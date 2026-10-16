import { LineChart } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SessionPoint, SessionStats } from "../types/pose";
import { formatDuration, formatPercent } from "../utils/format";

interface SessionChartProps {
  points: SessionPoint[];
  stats: SessionStats;
  elapsedSec: number;
  running: boolean;
}

export function SessionChart({ points, stats, elapsedSec, running }: SessionChartProps) {
  const averageRisk = stats.samples > 0 ? Math.round(stats.riskSum / stats.samples) : null;

  const tiles = [
    { label: "Длительность", value: running || stats.samples > 0 ? formatDuration(elapsedSec) : "—" },
    { label: "Средний риск", value: averageRisk ?? "—" },
    { label: "Максимум", value: stats.samples > 0 ? stats.maxRisk : "—" },
    { label: "В норме", value: formatPercent(stats.lowSamples, stats.samples) },
    { label: "Предупреждений", value: stats.samples > 0 ? stats.alerts : "—" },
  ];

  return (
    <section className="panel chart-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Текущая сессия</p>
          <h2>Динамика риска</h2>
        </div>
        <span className="muted small">последние 3 минуты</span>
      </div>

      <div className="stat-tiles">
        {tiles.map((tile) => (
          <div className="stat-tile" key={tile.label}>
            <span>{tile.label}</span>
            <strong>{tile.value}</strong>
          </div>
        ))}
      </div>

      <div className="chart-wrap">
        {points.length < 2 ? (
          <div className="chart-empty">
            <LineChart size={28} aria-hidden="true" />
            <span>{running ? "Собираем данные…" : "График появится после запуска анализа."}</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e75f51" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#41d6b3" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="time" stroke="#82909f" tickLine={false} axisLine={false} minTickGap={40} fontSize={12} />
              <YAxis domain={[0, 100]} ticks={[0, 30, 60, 100]} stroke="#82909f" tickLine={false} axisLine={false} width={34} fontSize={12} />
              <ReferenceLine y={30} stroke="rgba(245,200,76,0.45)" strokeDasharray="4 4" />
              <ReferenceLine y={60} stroke="rgba(231,95,81,0.5)" strokeDasharray="4 4" />
              <Tooltip
                formatter={(value: number) => [value, "Риск"]}
                labelStyle={{ color: "#9aa7b5" }}
                contentStyle={{
                  background: "#171d24",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  color: "#f4f7fb",
                }}
              />
              <Area
                type="monotone"
                dataKey="riskScore"
                stroke="#e75f51"
                fill="url(#riskGradient)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
