import { Trash2 } from "lucide-react";
import type { SessionSummary } from "../types/pose";

interface HistoryPanelProps {
  sessions: SessionSummary[];
  onClear: () => void;
}

export function HistoryPanel({ sessions, onClear }: HistoryPanelProps) {
  return (
    <section className="panel history-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Local storage</p>
          <h2>История</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Очистить историю" onClick={onClear}>
          <Trash2 size={17} />
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="muted">Завершенные сессии появятся здесь.</p>
      ) : (
        <div className="history-list">
          {sessions.map((session) => (
            <article className="history-item" key={session.id}>
              <div>
                <strong>{new Date(session.startedAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</strong>
                <span>{session.totalFrames} кадров</span>
              </div>
              <div>
                <span>avg {session.averageRisk}</span>
                <span>max {session.maxRisk}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
