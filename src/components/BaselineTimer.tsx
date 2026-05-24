import { Bell, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const INTERVAL_SECONDS = 60;

export function BaselineTimer() {
  const [secondsLeft, setSecondsLeft] = useState(INTERVAL_SECONDS);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((value) => (value <= 1 ? INTERVAL_SECONDS : value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const progress = useMemo(() => Math.round(((INTERVAL_SECONDS - secondsLeft) / INTERVAL_SECONDS) * 100), [secondsLeft]);

  return (
    <section className="panel baseline-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Baseline</p>
          <h2>Таймер без AI</h2>
        </div>
        <Bell size={20} />
      </div>
      <div className="timer-row">
        <strong>{secondsLeft}s</strong>
        <button className="icon-button" type="button" aria-label="Сбросить таймер" onClick={() => setSecondsLeft(INTERVAL_SECONDS)}>
          <RotateCcw size={17} />
        </button>
      </div>
      <div className="metric-bar large" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="muted">Контрольная версия просто напоминает проверить посадку раз в минуту.</p>
    </section>
  );
}
