import { Bell, BellRing, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

const INTERVAL_SECONDS = 60;
const RING_SECONDS = 4;

export function BaselineTimer() {
  const [secondsLeft, setSecondsLeft] = useState(INTERVAL_SECONDS);
  const [ringing, setRinging] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (secondsLeft > 0) return;
    setRinging(true);
    setSecondsLeft(INTERVAL_SECONDS);
  }, [secondsLeft]);

  useEffect(() => {
    if (!ringing) return;
    const id = window.setTimeout(() => setRinging(false), RING_SECONDS * 1000);
    return () => window.clearTimeout(id);
  }, [ringing]);

  const progress = Math.round(((INTERVAL_SECONDS - secondsLeft) / INTERVAL_SECONDS) * 100);

  return (
    <section className={`panel baseline-panel${ringing ? " ringing" : ""}`}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">Для сравнения</p>
          <h2>Обычный таймер</h2>
        </div>
        {ringing ? <BellRing size={20} aria-hidden="true" /> : <Bell size={20} aria-hidden="true" />}
      </div>
      <div className="timer-row">
        <span>{ringing ? "Проверьте посадку!" : "Следующее напоминание"}</span>
        <strong>{secondsLeft} с</strong>
        <button
          className="icon-button"
          type="button"
          aria-label="Сбросить таймер"
          title="Сбросить таймер"
          onClick={() => {
            setSecondsLeft(INTERVAL_SECONDS);
            setRinging(false);
          }}
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <div className="metric-bar large" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="muted small">
        Классический подход — напоминание раз в минуту без анализа изображения. ErgoVision предупреждает только тогда,
        когда посадка действительно нарушена.
      </p>
    </section>
  );
}
