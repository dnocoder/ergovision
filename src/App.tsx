import { BrainCircuit, Download, PauseCircle, Settings, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateMetrics, createCalibration } from "./ai/postureMetrics";
import { estimatePose } from "./ai/poseModel";
import { smoothPoseFrame, smoothPostureResult } from "./ai/poseSmoothing";
import { scorePosture } from "./ai/riskScoring";
import { BaselineTimer } from "./components/BaselineTimer";
import { CameraPanel } from "./components/CameraPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { MetricsPanel } from "./components/MetricsPanel";
import { RiskGauge } from "./components/RiskGauge";
import { SettingsPanel } from "./components/SettingsPanel";
import { SessionChart } from "./components/SessionChart";
import { clearSessions, loadSessions, saveSession } from "./storage/sessionStore";
import type {
  AnalysisSettings,
  CalibrationProfile,
  PoseFrame,
  PostureResult,
  SessionPoint,
  SessionSummary,
} from "./types/pose";

const emptyResult: PostureResult = {
  metrics: {
    headTilt: 0,
    shoulderTilt: 0,
    headOffset: 0,
    distanceRisk: 0,
    stability: 0,
    visibility: 0,
  },
  riskScore: 0,
  riskLevel: "low",
  reasons: [],
};

const defaultSettings: AnalysisSettings = {
  sensitivity: 1,
  keypointSmoothing: 0.68,
  metricSmoothing: 0.52,
  minKeypointScore: 0.2,
  targetFps: 12,
};

export function App() {
  const [running, setRunning] = useState(false);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [frame, setFrame] = useState<PoseFrame | null>(null);
  const [calibration, setCalibration] = useState<CalibrationProfile | null>(null);
  const [result, setResult] = useState<PostureResult>(emptyResult);
  const [points, setPoints] = useState<SessionPoint[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>(() => loadSessions());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AnalysisSettings>(defaultSettings);
  const previousFrameRef = useRef<PoseFrame | null>(null);
  const previousResultRef = useRef<PostureResult | null>(null);
  const sessionStartedAt = useRef<Date>(new Date());
  const lastPointAt = useRef(0);
  const lastInferenceAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    let animationFrame = 0;
    let disposed = false;

    async function tick() {
      const now = performance.now();
      if (now - lastInferenceAt.current < 1000 / settings.targetFps) {
        animationFrame = window.requestAnimationFrame(tick);
        return;
      }

      lastInferenceAt.current = now;

      const rawFrame = video ? await estimatePose(video) : null;
      const nextFrame = rawFrame ? smoothPoseFrame(previousFrameRef.current, rawFrame, settings) : null;
      if (disposed || !nextFrame) return;

      const metrics = calculateMetrics(nextFrame, calibration, previousFrameRef.current, settings.minKeypointScore);
      const scoredResult = scorePosture(metrics, settings.sensitivity);
      const nextResult = smoothPostureResult(previousResultRef.current, scoredResult, settings);

      previousFrameRef.current = nextFrame;
      previousResultRef.current = nextResult;
      setFrame(nextFrame);
      setResult(nextResult);

      if (now - lastPointAt.current > 900) {
        lastPointAt.current = now;
        setPoints((current) => [
          ...current.slice(-59),
          {
            time: new Date().toLocaleTimeString("ru-RU", { minute: "2-digit", second: "2-digit" }),
            riskScore: nextResult.riskScore,
            riskLevel: nextResult.riskLevel,
          },
        ]);
      }

      animationFrame = window.requestAnimationFrame(tick);
    }

    animationFrame = window.requestAnimationFrame(tick);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
    };
  }, [calibration, running, settings, video]);

  const toggleSession = useCallback(() => {
    if (running) {
      const summary = saveSession(points, sessionStartedAt.current);
      if (summary) setSessions(loadSessions());
      setRunning(false);
      return;
    }

    sessionStartedAt.current = new Date();
    setPoints([]);
    setFrame(null);
    setResult(emptyResult);
    previousFrameRef.current = null;
    previousResultRef.current = null;
    lastInferenceAt.current = 0;
    setRunning(true);
  }, [points, running]);

  const calibrate = useCallback(() => {
    if (!frame) return;
    const profile = createCalibration(frame, settings.minKeypointScore);
    if (profile) setCalibration(profile);
  }, [frame, settings.minKeypointScore]);

  const handleClearSessions = useCallback(() => {
    clearSessions();
    setSessions([]);
  }, []);

  const exportReport = useCallback(() => {
    const payload = {
      generatedAt: new Date().toISOString(),
      calibration,
      latestResult: result,
      sessionPoints: points,
      sessions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ergovision-session-report.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [calibration, points, result, sessions]);

  const statusText = useMemo(() => {
    if (!running) return "Ожидание запуска";
    if (!calibration) return "Идет анализ, калибровка не задана";
    return "Идет анализ с калибровкой";
  }, [calibration, running]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ErgoVision</p>
          <h1>AI-анализ посадки за компьютером</h1>
        </div>
        <div className="status-cluster">
          <span className="status-pill">
            {running ? <BrainCircuit size={17} /> : <PauseCircle size={17} />}
            {statusText}
          </span>
          <button className="secondary-button" type="button" onClick={exportReport}>
            <Download size={18} />
            Экспорт
          </button>
          <button className="secondary-button" type="button" onClick={() => setSettingsOpen((value) => !value)}>
            <Settings size={18} />
            Настройки
          </button>
        </div>
      </header>

      <section className="hero-grid">
        <CameraPanel
          frame={frame}
          running={running}
          onVideoReady={setVideo}
          onToggle={toggleSession}
          onCalibrate={calibrate}
        />
        <div className="side-stack">
          <RiskGauge score={result.riskScore} level={result.riskLevel} />
          <SettingsPanel open={settingsOpen} settings={settings} onChange={setSettings} />
          <MetricsPanel result={result} modelSource={frame?.source ?? "demo"} />
        </div>
      </section>

      <section className="lower-grid">
        <SessionChart points={points} />
        <div className="side-stack">
          <BaselineTimer />
          <section className="panel privacy-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Privacy</p>
                <h2>Локальная обработка</h2>
              </div>
              <ShieldCheck size={20} />
            </div>
            <p className="muted">
              Видео не сохраняется и не отправляется на сервер. В историю попадают только числовые результаты сессии.
            </p>
          </section>
          <HistoryPanel sessions={sessions} onClear={handleClearSessions} />
        </div>
      </section>
    </main>
  );
}
