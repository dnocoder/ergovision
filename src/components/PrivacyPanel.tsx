import { ShieldCheck } from "lucide-react";

export function PrivacyPanel() {
  return (
    <section className="panel privacy-panel">
      <ShieldCheck size={22} aria-hidden="true" />
      <div>
        <h2>Приватность</h2>
        <p className="muted">
          Видео обрабатывается прямо в браузере, не записывается и не отправляется на сервер. В истории
          сохраняются только числовые итоги сессий.
        </p>
      </div>
    </section>
  );
}
