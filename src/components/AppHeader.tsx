import { Download, Settings } from "lucide-react";
import type { PoseDetectorStatus } from "../ai/poseModel";
import type { PoseSource } from "../types/pose";
import { Logo } from "./Logo";

interface AppHeaderProps {
  running: boolean;
  detectorStatus: PoseDetectorStatus;
  source: PoseSource | null;
  userVisible: boolean;
  onExport: () => void;
  onOpenSettings: () => void;
}

function getStatus({ running, detectorStatus, source, userVisible }: AppHeaderProps): { tone: string; text: string } {
  if (!running) return { tone: "idle", text: "Готов к работе" };
  if (source === "demo") return { tone: "demo", text: "Демо-режим" };
  if (!source && detectorStatus === "unavailable") return { tone: "error", text: "Модель недоступна" };
  if (!source) return { tone: "loading", text: "Подготовка…" };
  if (!userVisible) return { tone: "warn", text: "Вас не видно в кадре" };
  return { tone: "live", text: "Идёт анализ" };
}

export function AppHeader(props: AppHeaderProps) {
  const status = getStatus(props);

  return (
    <header className="topbar">
      <div className="brand">
        <Logo />
        <div>
          <strong className="brand-name">ErgoVision</strong>
          <span className="brand-tagline">Контроль посадки за компьютером</span>
        </div>
      </div>
      <div className="topbar-actions">
        <span className={`status-pill status-${status.tone}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          {status.text}
        </span>
        <button className="secondary-button" type="button" onClick={props.onExport} title="Скачать отчет в JSON">
          <Download size={18} />
          <span className="button-label">Экспорт</span>
        </button>
        <button className="secondary-button" type="button" onClick={props.onOpenSettings}>
          <Settings size={18} />
          <span className="button-label">Настройки</span>
        </button>
      </div>
    </header>
  );
}
