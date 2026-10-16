import { useCallback, useEffect, useRef, useState } from "react";
import { averageCalibration, calculateMetrics, createCalibration, hasRequiredKeypoints } from "./ai/postureMetrics";
import { estimatePose, getPoseDetectorStatus, preloadPoseDetector } from "./ai/poseModel";
import type { PoseDetectorStatus } from "./ai/poseModel";
import { smoothPoseFrame, smoothPostureResult } from "./ai/poseSmoothing";
import { scorePosture } from "./ai/riskScoring";
import { AlertBanner } from "./components/AlertBanner";
import { AppHeader } from "./components/AppHeader";
import { BaselineTimer } from "./components/BaselineTimer";
import { CameraPanel } from "./components/CameraPanel";
import type { CameraState } from "./components/CameraPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { MetricsPanel } from "./components/MetricsPanel";
import { PrivacyPanel } from "./components/PrivacyPanel";
import { RiskGauge } from "./components/RiskGauge";
import { SessionChart } from "./components/SessionChart";
import { SettingsPanel } from "./components/SettingsPanel";
import { clearSessions, createEmptyStats, loadSessions, saveSession } from "./storage/sessionStore";
import { loadCalibration, loadSettings, saveCalibration, saveSettings } from "./storage/settingsStore";
import type {
  AnalysisSettings,
  CalibrationProfile,
  PoseFrame,
  PostureResult,
  SessionPoint,
  SessionStats,
  SessionSummary,
} from "./types/pose";
import { playChime, showPostureNotification } from "./utils/alerts";

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

const CHART_POINT_INTERVAL_MS = 1000;
const MAX_CHART_POINTS = 180;
const CALIBRATION_DURATION_MS = 1500;
const MIN_CALIBRATION_SAMPLES = 3;

export interface Notice {
  tone: "success" | "error" | "info";
  text: string;
}

interface CalibrationSampling {
  startedAt: number;
  samples: CalibrationProfile[];
}

export function App() {
  const [running, setRunning] = useState(false);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [frame, setFrame] = useState<PoseFrame | null>(null);
  const [userVisible, setUserVisible] = useState(true);
  const [calibration, setCalibration] = useState<CalibrationProfile | null>(loadCalibration);
  const [calibrating, setCalibrating] = useState(false);
  const [result, setResult] = useState<PostureResult>(emptyResult);
  const [points, setPoints] = useState<SessionPoint[]>([]);
  const [stats, setStats] = useState<SessionStats>(createEmptyStats);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [sessions, setSessions] = useState<SessionSummary[]>(loadSessions);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AnalysisSettings>(loadSettings);
  const [detectorStatus, setDetectorStatus] = useState<PoseDetectorStatus>(getPoseDetectorStatus);
  const [alertReasons, setAlertReasons] = useState<string[] | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  // The analysis loop reads these through refs so that moving a slider
  // does not restart the loop (and spawn parallel inference calls).
  const settingsRef = useRef(settings);
  const calibrationRef = useRef(calibration);
  const runningRef = useRef(running);
  const cameraStateRef = useRef<CameraState>("off");
  const statsRef = useRef<SessionStats>(createEmptyStats());
  const previousFrameRef = useRef<PoseFrame | null>(null);
  const previousResultRef = useRef<PostureResult | null>(null);
  const sessionStartedAt = useRef<Date>(new Date());
  const lastPointAt = useRef(0);
  const highRiskSince = useRef<number | null>(null);
  const alertActive = useRef(false);
  const calibrationSampling = useRef<CalibrationSampling | null>(null);

  settingsRef.current = settings;
  calibrationRef.current = calibration;
  runningRef.current = running;

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveCalibration(calibration), [calibration]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    if (!running) return;
    let disposed = false;
    setDetectorStatus(getPoseDetectorStatus());
    preloadPoseDetector().finally(() => {
      if (!disposed) setDetectorStatus(getPoseDetectorStatus());
    });
    return () => {
      disposed = true;
    };
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const tick = () => setElapsedSec((Date.now() - sessionStartedAt.current.getTime()) / 1000);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Save an in-progress session if the tab is closed or reloaded.
  useEffect(() => {
    const handleUnload = () => {
      if (runningRef.current) saveSession(statsRef.current, sessionStartedAt.current);
    };
    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, []);

  useEffect(() => {
    if (!running || !video) return;
    let timeoutId = 0;
    let disposed = false;

    const finishCalibration = (now: number) => {
      const sampling = calibrationSampling.current;
      if (!sampling || now - sampling.startedAt < CALIBRATION_DURATION_MS) return;
      calibrationSampling.current = null;
      setCalibrating(false);

      const profile = sampling.samples.length >= MIN_CALIBRATION_SAMPLES ? averageCalibration(sampling.samples) : null;
      if (profile) {
        setCalibration(profile);
        previousResultRef.current = null;
        setNotice({ tone: "success", text: "Калибровка сохранена. Эта посадка теперь считается нормой." });
      } else {
        setNotice({
          tone: "error",
          text: "Не удалось откалибровать: голова и оба плеча должны быть хорошо видны в кадре.",
        });
      }
    };

    const triggerAlert = (reasons: string[]) => {
      const { soundAlerts, desktopNotifications } = settingsRef.current;
      statsRef.current = { ...statsRef.current, alerts: statsRef.current.alerts + 1 };
      setAlertReasons(reasons);
      if (soundAlerts) playChime();
      if (desktopNotifications) {
        showPostureNotification(reasons.length > 0 ? `Обнаружено: ${reasons.join(", ")}.` : "Высокий риск посадки.");
      }
    };

    const processFrame = async (now: number) => {
      const currentSettings = settingsRef.current;
      const rawFrame = await estimatePose(video, cameraStateRef.current === "error");
      if (disposed) return;
      setDetectorStatus(getPoseDetectorStatus());
      if (!rawFrame) return;

      const previousFrame = previousFrameRef.current;
      const nextFrame = smoothPoseFrame(previousFrame, rawFrame, currentSettings);
      previousFrameRef.current = nextFrame;
      setFrame(nextFrame);

      const visible = hasRequiredKeypoints(nextFrame, currentSettings.minKeypointScore);
      setUserVisible(visible);

      if (calibrationSampling.current) {
        const sample = createCalibration(nextFrame, currentSettings.minKeypointScore);
        if (sample) calibrationSampling.current.samples.push(sample);
        finishCalibration(now);
      }

      // Nobody in front of the camera: pause scoring instead of reporting "high risk".
      if (!visible) {
        highRiskSince.current = null;
        return;
      }

      const activeCalibration =
        calibrationRef.current?.source === nextFrame.source ? calibrationRef.current : null;
      const previousComparableFrame = previousFrame?.source === nextFrame.source ? previousFrame : null;
      const metrics = calculateMetrics(
        nextFrame,
        activeCalibration,
        previousComparableFrame,
        currentSettings.minKeypointScore,
      );
      const scoredResult = scorePosture(metrics, currentSettings.sensitivity);
      const nextResult = smoothPostureResult(previousResultRef.current, scoredResult, currentSettings);
      previousResultRef.current = nextResult;
      setResult(nextResult);

      if (nextResult.riskLevel === "high") {
        highRiskSince.current ??= now;
        if (!alertActive.current && now - highRiskSince.current >= currentSettings.alertDelaySec * 1000) {
          alertActive.current = true;
          triggerAlert(nextResult.reasons);
        }
      } else {
        highRiskSince.current = null;
        if (nextResult.riskLevel === "low" && alertActive.current) {
          alertActive.current = false;
          setAlertReasons(null);
        }
      }

      if (now - lastPointAt.current >= CHART_POINT_INTERVAL_MS) {
        lastPointAt.current = now;
        const current = statsRef.current;
        statsRef.current = {
          ...current,
          samples: current.samples + 1,
          riskSum: current.riskSum + nextResult.riskScore,
          maxRisk: Math.max(current.maxRisk, nextResult.riskScore),
          highSamples: current.highSamples + (nextResult.riskLevel === "high" ? 1 : 0),
          lowSamples: current.lowSamples + (nextResult.riskLevel === "low" ? 1 : 0),
        };
        setStats(statsRef.current);
        setPoints((list) => [
          ...list.slice(-(MAX_CHART_POINTS - 1)),
          {
            time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            riskScore: nextResult.riskScore,
            riskLevel: nextResult.riskLevel,
          },
        ]);
      }
    };

    // setTimeout instead of requestAnimationFrame: rAF is paused in background
    // tabs, and a posture monitor has to keep working while the user is in
    // another window.
    const loop = async () => {
      const startedAt = performance.now();
      try {
        await processFrame(startedAt);
      } catch (error) {
        console.warn("Pose analysis frame failed.", error);
      }
      if (disposed) return;
      const frameBudget = 1000 / settingsRef.current.targetFps;
      const delay = Math.max(0, frameBudget - (performance.now() - startedAt));
      timeoutId = window.setTimeout(loop, delay);
    };

    timeoutId = window.setTimeout(loop, 0);
    return () => {
      disposed = true;
      window.clearTimeout(timeoutId);
    };
  }, [running, video]);

  const resetSessionState = useCallback(() => {
    setFrame(null);
    setUserVisible(true);
    setAlertReasons(null);
    setCalibrating(false);
    previousFrameRef.current = null;
    previousResultRef.current = null;
    calibrationSampling.current = null;
    highRiskSince.current = null;
    alertActive.current = false;
  }, []);

  const toggleSession = useCallback(() => {
    if (running) {
      const summary = saveSession(statsRef.current, sessionStartedAt.current);
      if (summary) {
        setSessions(loadSessions());
        setNotice({ tone: "success", text: "Сессия сохранена в истории." });
      }
      resetSessionState();
      setRunning(false);
      return;
    }

    sessionStartedAt.current = new Date();
    statsRef.current = createEmptyStats();
    lastPointAt.current = 0;
    resetSessionState();
    setStats(statsRef.current);
    setPoints([]);
    setResult(emptyResult);
    setElapsedSec(0);
    setRunning(true);
  }, [resetSessionState, running]);

  const startCalibration = useCallback(() => {
    if (!running || calibrationSampling.current) return;
    calibrationSampling.current = { startedAt: performance.now(), samples: [] };
    setCalibrating(true);
    setNotice({ tone: "info", text: "Сидите ровно и не двигайтесь пару секунд…" });
  }, [running]);

  const resetCalibration = useCallback(() => {
    setCalibration(null);
    previousResultRef.current = null;
    setNotice({ tone: "info", text: "Калибровка сброшена." });
  }, []);

  const handleClearSessions = useCallback(() => {
    if (!window.confirm("Удалить всю историю сессий? Это действие нельзя отменить.")) return;
    clearSessions();
    setSessions([]);
  }, []);

  const exportReport = useCallback(() => {
    const payload = {
      app: "ErgoVision",
      version: __APP_VERSION__,
      generatedAt: new Date().toISOString(),
      settings,
      calibration,
      currentSession: running
        ? {
            startedAt: sessionStartedAt.current.toISOString(),
            durationSec: Math.round(elapsedSec),
            stats,
            latestResult: result,
            points,
          }
        : null,
      sessions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ergovision-report-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice({ tone: "success", text: "Отчет экспортирован в JSON." });
  }, [calibration, elapsedSec, points, result, running, sessions, settings, stats]);

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const handleCameraStateChange = useCallback((state: CameraState) => {
    cameraStateRef.current = state;
  }, []);

  const calibrationMatchesSource = !calibration || !frame || calibration.source === frame.source;
  const hasLiveData = running && userVisible && stats.samples > 0;

  return (
    <div className="app-shell">
      <AppHeader
        running={running}
        detectorStatus={detectorStatus}
        source={frame?.source ?? null}
        userVisible={userVisible}
        onExport={exportReport}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {alertReasons && <AlertBanner reasons={alertReasons} onDismiss={() => setAlertReasons(null)} />}

      <main>
        <section className="hero-grid">
          <CameraPanel
            frame={frame}
            running={running}
            detectorStatus={detectorStatus}
            riskLevel={hasLiveData ? result.riskLevel : null}
            userVisible={userVisible}
            calibration={calibration}
            calibrationMatchesSource={calibrationMatchesSource}
            calibrating={calibrating}
            elapsedSec={elapsedSec}
            notice={notice}
            minKeypointScore={settings.minKeypointScore}
            onVideoReady={setVideo}
            onCameraStateChange={handleCameraStateChange}
            onToggle={toggleSession}
            onCalibrate={startCalibration}
            onResetCalibration={resetCalibration}
          />
          <div className="side-stack">
            <RiskGauge
              score={result.riskScore}
              level={result.riskLevel}
              reasons={result.reasons}
              state={!running ? "idle" : !userVisible ? "absent" : stats.samples === 0 ? "warming" : "live"}
            />
            <MetricsPanel result={result} active={hasLiveData} />
          </div>
        </section>

        <section className="lower-grid">
          <SessionChart points={points} stats={stats} elapsedSec={elapsedSec} running={running} />
          <div className="side-stack">
            <HistoryPanel sessions={sessions} onClear={handleClearSessions} />
            <BaselineTimer />
            <PrivacyPanel />
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <span>ErgoVision v{__APP_VERSION__}</span>
        <span>Не является медицинским изделием. Видео обрабатывается локально и никуда не отправляется.</span>
      </footer>

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={closeSettings}
      />
    </div>
  );
}
