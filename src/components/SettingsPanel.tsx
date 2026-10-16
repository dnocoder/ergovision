import { BellRing, Gauge, MonitorSmartphone, RotateCcw, SlidersHorizontal, Timer, Volume2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { defaultSettings } from "../storage/settingsStore";
import type { AnalysisSettings } from "../types/pose";
import { notificationsSupported, playChime, requestNotificationPermission } from "../utils/alerts";

interface SettingsPanelProps {
  open: boolean;
  settings: AnalysisSettings;
  onChange: (settings: AnalysisSettings) => void;
  onClose: () => void;
}

interface RangeSettingProps {
  icon: ReactNode;
  label: string;
  hint: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

function RangeSetting({ icon, label, hint, value, display, min, max, step = 1, onChange }: RangeSettingProps) {
  return (
    <label className="setting-row">
      <span className="setting-label">
        {icon}
        {label}
      </span>
      <strong>{display}</strong>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <small>{hint}</small>
    </label>
  );
}

interface ToggleSettingProps {
  icon: ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSetting({ icon, label, hint, checked, disabled, onChange }: ToggleSettingProps) {
  return (
    <label className={`toggle-row${disabled ? " disabled" : ""}`}>
      <span className="setting-label">
        {icon}
        <span>
          {label}
          <small>{hint}</small>
        </span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

const percent = (value: number) => Math.round(value * 100);

export function SettingsPanel({ open, settings, onChange, onClose }: SettingsPanelProps) {
  const [notificationHint, setNotificationHint] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, open]);

  if (!open) return null;

  const update = (patch: Partial<AnalysisSettings>) => onChange({ ...settings, ...patch });

  const toggleNotifications = async (checked: boolean) => {
    if (!checked) {
      update({ desktopNotifications: false });
      return;
    }
    const granted = await requestNotificationPermission();
    setNotificationHint(granted ? null : "Браузер запретил уведомления. Разрешите их в настройках сайта.");
    update({ desktopNotifications: granted });
  };

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Настройки</p>
            <h2 id="settings-title">Параметры анализа</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Закрыть настройки" onClick={onClose} autoFocus>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          <h3 className="settings-group-title">Предупреждения</h3>
          <RangeSetting
            icon={<Timer size={17} />}
            label="Задержка предупреждения"
            hint="Сколько секунд высокий риск должен держаться, прежде чем появится предупреждение."
            value={settings.alertDelaySec}
            display={`${settings.alertDelaySec} с`}
            min={3}
            max={60}
            onChange={(alertDelaySec) => update({ alertDelaySec })}
          />
          <ToggleSetting
            icon={<Volume2 size={17} />}
            label="Звуковой сигнал"
            hint="Короткий сигнал при предупреждении."
            checked={settings.soundAlerts}
            onChange={(soundAlerts) => {
              if (soundAlerts) playChime();
              update({ soundAlerts });
            }}
          />
          <ToggleSetting
            icon={<BellRing size={17} />}
            label="Системные уведомления"
            hint={
              notificationsSupported()
                ? "Предупреждение придет, даже если вкладка свернута."
                : "Браузер не поддерживает уведомления."
            }
            checked={settings.desktopNotifications}
            disabled={!notificationsSupported()}
            onChange={toggleNotifications}
          />
          {notificationHint && <p className="setting-warning">{notificationHint}</p>}

          <h3 className="settings-group-title">Анализ</h3>
          <RangeSetting
            icon={<SlidersHorizontal size={17} />}
            label="Чувствительность"
            hint="Выше — строже оценка, предупреждения срабатывают раньше."
            value={percent(settings.sensitivity)}
            display={`${percent(settings.sensitivity)}%`}
            min={60}
            max={140}
            onChange={(value) => update({ sensitivity: value / 100 })}
          />
          <RangeSetting
            icon={<Gauge size={17} />}
            label="Сглаживание точек"
            hint="Убирает дрожание ключевых точек, но добавляет задержку."
            value={percent(settings.keypointSmoothing)}
            display={`${percent(settings.keypointSmoothing)}%`}
            min={0}
            max={90}
            onChange={(value) => update({ keypointSmoothing: value / 100 })}
          />
          <RangeSetting
            icon={<Gauge size={17} />}
            label="Сглаживание оценки"
            hint="Делает индекс риска плавнее."
            value={percent(settings.metricSmoothing)}
            display={`${percent(settings.metricSmoothing)}%`}
            min={0}
            max={90}
            onChange={(value) => update({ metricSmoothing: value / 100 })}
          />
          <RangeSetting
            icon={<SlidersHorizontal size={17} />}
            label="Порог уверенности"
            hint="Точки с меньшей уверенностью модели не учитываются."
            value={percent(settings.minKeypointScore)}
            display={`${percent(settings.minKeypointScore)}%`}
            min={15}
            max={60}
            onChange={(value) => update({ minKeypointScore: value / 100 })}
          />
          <RangeSetting
            icon={<MonitorSmartphone size={17} />}
            label="Частота анализа"
            hint="Меньше — ниже нагрузка на процессор и батарею."
            value={settings.targetFps}
            display={`${settings.targetFps} к/с`}
            min={4}
            max={24}
            onChange={(targetFps) => update({ targetFps })}
          />
        </div>

        <div className="drawer-footer">
          <button className="secondary-button" type="button" onClick={() => onChange(defaultSettings)}>
            <RotateCcw size={17} />
            Сбросить настройки
          </button>
          <button className="primary-button" type="button" onClick={onClose}>
            Готово
          </button>
        </div>
      </aside>
    </div>
  );
}
