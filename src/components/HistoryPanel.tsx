import { History, Trash2 } from "lucide-react";
import { getRiskLevel } from "../ai/riskScoring";
import type { SessionSummary } from "../types/pose";
import { formatDuration, formatPercent } from "../utils/format";

interface HistoryPanelProps {
  sessions: SessionSummary[];
  onClear: () => void;
}

export function HistoryPanel({ sessions, onClear }: HistoryPanelProps) {
  return (
    <section className="panel history-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">История</p>
          <h2>Прошлые сессии</h2>
        </div>
        {sessions.length > 0 && (
          <button className="icon-button" type="button" aria-label="Очистить историю" title="Очистить историю" onClick={onClear}>
            <Trash2 size={17} />
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <History size={22} aria-hidden="true" />
          <span>Завершенные сессии появятся здесь.</span>
        </div>
      ) : (
        <div className="history-list">
          {sessions.map((session) => {
            const durationSec = (Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 1000;
            return (
              <article className="history-item" key={session.id}>
                <span className={`level-dot risk-${getRiskLevel(session.averageRisk)}`} aria-hidden="true" />
                <div>
                  <strong>
                    {new Date(session.startedAt).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                  <span>{formatDuration(durationSec)}</span>
                </div>
                <div className="history-values">
                  <span>
                    средний <b>{session.averageRisk}</b> · макс <b>{session.maxRisk}</b>
                  </span>
                  {session.lowRiskFrames !== undefined && (
                    <span>в норме {formatPercent(session.lowRiskFrames, session.totalFrames)}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
