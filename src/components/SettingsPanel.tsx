import { Gauge, Settings2, SlidersHorizontal } from "lucide-react";
import type { AnalysisSettings } from "../types/pose";

interface SettingsPanelProps {
  open: boolean;
  settings: AnalysisSettings;
  onChange: (settings: AnalysisSettings) => void;
}

function percent(value: number): number {
  return Math.round(value * 100);
}

export function SettingsPanel({ open, settings, onChange }: SettingsPanelProps) {
  if (!open) return null;

  const update = (patch: Partial<AnalysisSettings>) => onChange({ ...settings, ...patch });

  return (
    <section className="panel settings-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Настройки анализа</h2>
        </div>
        <Settings2 size={20} />
      </div>

      <label className="setting-row">
        <span>
          <SlidersHorizontal size={17} />
          Чувствительность
        </span>
        <strong>{Math.round(settings.sensitivity * 100)}%</strong>
        <input
          type="range"
          min="60"
          max="140"
          value={Math.round(settings.sensitivity * 100)}
          onChange={(event) => update({ sensitivity: Number(event.target.value) / 100 })}
        />
      </label>

      <label className="setting-row">
        <span>
          <Gauge size={17} />
          Сглаживание точек
        </span>
        <strong>{percent(settings.keypointSmoothing)}%</strong>
        <input
          type="range"
          min="0"
          max="90"
          value={percent(settings.keypointSmoothing)}
          onChange={(event) => update({ keypointSmoothing: Number(event.target.value) / 100 })}
        />
      </label>

      <label className="setting-row">
        <span>
          <Gauge size={17} />
          Сглаживание метрик
        </span>
        <strong>{percent(settings.metricSmoothing)}%</strong>
        <input
          type="range"
          min="0"
          max="90"
          value={percent(settings.metricSmoothing)}
          onChange={(event) => update({ metricSmoothing: Number(event.target.value) / 100 })}
        />
      </label>

      <label className="setting-row">
        <span>Минимальная уверенность keypoint</span>
        <strong>{percent(settings.minKeypointScore)}%</strong>
        <input
          type="range"
          min="15"
          max="60"
          value={percent(settings.minKeypointScore)}
          onChange={(event) => update({ minKeypointScore: Number(event.target.value) / 100 })}
        />
      </label>

      <label className="setting-row">
        <span>Частота анализа</span>
        <strong>{settings.targetFps} FPS</strong>
        <input
          type="range"
          min="6"
          max="24"
          value={settings.targetFps}
          onChange={(event) => update({ targetFps: Number(event.target.value) })}
        />
      </label>
    </section>
  );
}
