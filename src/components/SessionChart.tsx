import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SessionPoint } from "../types/pose";

interface SessionChartProps {
  points: SessionPoint[];
}

export function SessionChart({ points }: SessionChartProps) {
  return (
    <section className="panel chart-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Session</p>
          <h2>Динамика риска</h2>
        </div>
        <span>{points.length} кадров</span>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points}>
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e75f51" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#41d6b3" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="time" stroke="#82909f" tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis domain={[0, 100]} stroke="#82909f" tickLine={false} axisLine={false} width={34} />
            <Tooltip
              contentStyle={{
                background: "#171d24",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                color: "#f4f7fb",
              }}
            />
            <Area type="monotone" dataKey="riskScore" stroke="#e75f51" fill="url(#riskGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
