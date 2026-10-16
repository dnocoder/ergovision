import {
  Camera,
  CameraOff,
  CheckCircle2,
  Crosshair,
  Info,
  Loader2,
  Play,
  RotateCcw,
  Square,
  UserX,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Notice } from "../App";
import type { PoseDetectorStatus } from "../ai/poseModel";
import type { CalibrationProfile, PoseFrame, PoseKeypoint, RiskLevel } from "../types/pose";
import { formatDuration } from "../utils/format";

interface CameraPanelProps {
  frame: PoseFrame | null;
  running: boolean;
  detectorStatus: PoseDetectorStatus;
  riskLevel: RiskLevel | null;
  userVisible: boolean;
  minKeypointScore: number;
  calibration: CalibrationProfile | null;
  calibrationMatchesSource: boolean;
  calibrating: boolean;
  elapsedSec: number;
  notice: Notice | null;
  onVideoReady: (video: HTMLVideoElement | null) => void;
  onCameraStateChange: (state: CameraState) => void;
  onToggle: () => void;
  onCalibrate: () => void;
  onResetCalibration: () => void;
}

export type CameraState = "off" | "starting" | "live" | "error";

const OVERLAY_COLORS: Record<RiskLevel | "neutral", string> = {
  neutral: "#41d6b3",
  low: "#41d6b3",
  medium: "#f5c84c",
  high: "#e75f51",
};

function describeCameraError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Браузер не дает доступ к камере (нужен HTTPS или localhost). Включен демо-режим.";
  }
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Доступ к камере запрещен. Разрешите его в настройках браузера — пока работает демо-режим.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "Камера не найдена. Включен демо-режим.";
  }
  if (name === "NotReadableError") {
    return "Камера занята другим приложением. Закройте его и перезапустите анализ — пока работает демо-режим.";
  }
  return "Камера недоступна. Включен демо-режим.";
}

function drawPose(
  context: CanvasRenderingContext2D,
  frame: PoseFrame,
  width: number,
  color: string,
  minScore: number,
) {
  const visible = (name: PoseKeypoint["name"]) =>
    frame.keypoints.find((point) => point.name === name && point.score >= minScore);
  const line = (a?: PoseKeypoint, b?: PoseKeypoint | { x: number; y: number }) => {
    if (!a || !b) return;
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
  };

  const nose = visible("nose");
  const leftShoulder = visible("left_shoulder");
  const rightShoulder = visible("right_shoulder");

  context.lineCap = "round";
  context.lineWidth = Math.max(3, width / 220);
  context.strokeStyle = color;
  context.shadowColor = "rgba(0, 0, 0, 0.45)";
  context.shadowBlur = 6;

  line(leftShoulder, rightShoulder);
  if (nose && leftShoulder && rightShoulder) {
    line(nose, { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 });
  }
  context.globalAlpha = 0.7;
  line(visible("left_eye"), visible("right_eye"));
  line(visible("left_eye"), visible("left_ear"));
  line(visible("right_eye"), visible("right_ear"));
  context.globalAlpha = 1;

  const radius = Math.max(5, width / 150);
  frame.keypoints.forEach((point) => {
    if (point.score < minScore) return;
    context.beginPath();
    context.fillStyle = "#0b0f14";
    context.arc(point.x, point.y, radius + 2, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.fillStyle = color;
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  });
  context.shadowBlur = 0;
}

export function CameraPanel({
  frame,
  running,
  detectorStatus,
  riskLevel,
  userVisible,
  minKeypointScore,
  calibration,
  calibrationMatchesSource,
  calibrating,
  elapsedSec,
  notice,
  onVideoReady,
  onCameraStateChange,
  onToggle,
  onCalibrate,
  onResetCalibration,
}: CameraPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("off");
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    onVideoReady(videoRef.current);
    return () => onVideoReady(null);
  }, [onVideoReady]);

  useEffect(() => {
    onCameraStateChange(cameraState);
  }, [cameraState, onCameraStateChange]);

  useEffect(() => {
    if (!running) {
      setCameraState("off");
      setCameraError(null);
      return;
    }

    let stream: MediaStream | null = null;
    let cancelled = false;
    const video = videoRef.current;

    async function startCamera() {
      setCameraState("starting");
      setCameraError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia is not available");
        const nextStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: "user" },
          audio: false,
        });
        // The session may have been stopped while the permission prompt was open.
        if (cancelled) {
          nextStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = nextStream;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        if (!cancelled) setCameraState("live");
      } catch (error) {
        if (cancelled) return;
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
        if (video) video.srcObject = null;
        setCameraState("error");
        setCameraError(describeCameraError(error));
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    };
  }, [running]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const video = videoRef.current;
    const width = video?.videoWidth || 960;
    const height = video?.videoHeight || 540;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    context.clearRect(0, 0, width, height);

    if (!frame || !running) return;
    drawPose(context, frame, width, OVERLAY_COLORS[riskLevel ?? "neutral"], minKeypointScore);
  }, [frame, minKeypointScore, riskLevel, running]);

  const demoMode = running && frame?.source === "demo";
  const liveCamera = running && cameraState === "live";

  let stageMessage: { icon: JSX.Element; text: string; tone: "info" | "warn" | "error" } | null = null;
  if (running) {
    if (cameraState === "starting") {
      stageMessage = { icon: <Loader2 className="spin" size={18} />, text: "Подключаем камеру…", tone: "info" };
    } else if (cameraError) {
      stageMessage = { icon: <CameraOff size={18} />, text: cameraError, tone: "warn" };
    } else if (liveCamera && detectorStatus === "unavailable") {
      stageMessage = {
        icon: <XCircle size={18} />,
        text: "Не удалось загрузить модель MoveNet. Проверьте интернет и поддержку WebGL в браузере, затем перезапустите анализ.",
        tone: "error",
      };
    } else if (liveCamera && !frame) {
      stageMessage = {
        icon: <Loader2 className="spin" size={18} />,
        text: "Загружаем модель распознавания позы…",
        tone: "info",
      };
    } else if (liveCamera && !userVisible) {
      stageMessage = {
        icon: <UserX size={18} />,
        text: "Вас не видно. Сядьте так, чтобы голова и плечи попадали в кадр.",
        tone: "warn",
      };
    }
  }

  const calibrationLabel = calibrating
    ? "Калибровка…"
    : !calibration
      ? "Калибровка не задана"
      : !calibrationMatchesSource
        ? "Калибровка для другого источника"
        : `Калибровка от ${new Date(calibration.createdAt).toLocaleString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}`;

  return (
    <section className="camera-panel">
      <div className={`camera-stage${demoMode ? " demo" : ""}`}>
        <video ref={videoRef} muted playsInline className={liveCamera ? "active" : ""} />
        <canvas ref={canvasRef} />

        {!running && (
          <div className="camera-placeholder">
            <div className="placeholder-icon">
              <Camera size={34} />
            </div>
            <h2>Начните сессию</h2>
            <ol className="onboarding-steps">
              <li>Нажмите «Запустить» и разрешите доступ к камере.</li>
              <li>Сядьте ровно — голова и плечи должны быть в кадре.</li>
              <li>Нажмите «Калибровать», чтобы запомнить вашу нормальную посадку.</li>
            </ol>
          </div>
        )}

        {running && (
          <div className="stage-chips">
            <span className="stage-chip live">
              <span className="rec-dot" aria-hidden="true" />
              {formatDuration(elapsedSec)}
            </span>
            {demoMode && <span className="stage-chip">Демо-поза</span>}
          </div>
        )}

        {stageMessage && (
          <div className={`stage-message tone-${stageMessage.tone}`} role="status">
            {stageMessage.icon}
            <span>{stageMessage.text}</span>
          </div>
        )}

        {notice && (
          <div className={`stage-toast tone-${notice.tone}`} role="status">
            {notice.tone === "success" ? (
              <CheckCircle2 size={18} />
            ) : notice.tone === "error" ? (
              <XCircle size={18} />
            ) : (
              <Info size={18} />
            )}
            <span>{notice.text}</span>
          </div>
        )}
      </div>

      <div className="camera-toolbar">
        <div className="toolbar-group">
          <button className={running ? "danger-button" : "primary-button"} type="button" onClick={onToggle}>
            {running ? <Square size={18} /> : <Play size={18} />}
            {running ? "Остановить" : "Запустить"}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={onCalibrate}
            disabled={!running || !frame || !userVisible || calibrating}
            title="Сядьте ровно и нажмите, чтобы запомнить нормальную посадку"
          >
            {calibrating ? <Loader2 className="spin" size={18} /> : <Crosshair size={18} />}
            {calibrating ? "Калибровка…" : "Калибровать"}
          </button>
        </div>
        <div className="toolbar-group calibration-status">
          <span className={calibration && calibrationMatchesSource ? "ok" : ""}>{calibrationLabel}</span>
          {calibration && !calibrating && (
            <button
              className="icon-button"
              type="button"
              aria-label="Сбросить калибровку"
              title="Сбросить калибровку"
              onClick={onResetCalibration}
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
