import { Camera, CameraOff, Crosshair, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PoseFrame } from "../types/pose";

interface CameraPanelProps {
  frame: PoseFrame | null;
  running: boolean;
  onVideoReady: (video: HTMLVideoElement | null) => void;
  onToggle: () => void;
  onCalibrate: () => void;
}

export function CameraPanel({ frame, running, onVideoReady, onToggle, onCalibrate }: CameraPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    onVideoReady(videoRef.current);
  }, [onVideoReady]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function startCamera() {
      if (!running) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 960, height: 540, facingMode: "user" },
          audio: false,
        });
        if (cancelled) return;
        setCameraError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setCameraError("Камера недоступна. Можно продолжить в demo-режиме.");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [running]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const width = video?.videoWidth || 960;
    const height = video?.videoHeight || 540;
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);

    if (!frame) return;

    context.lineWidth = Math.max(3, width / 240);
    context.strokeStyle = "#41d6b3";
    context.fillStyle = "#f5c84c";

    const leftShoulder = frame.keypoints.find((point) => point.name === "left_shoulder");
    const rightShoulder = frame.keypoints.find((point) => point.name === "right_shoulder");
    const nose = frame.keypoints.find((point) => point.name === "nose");

    if (leftShoulder && rightShoulder) {
      context.beginPath();
      context.moveTo(leftShoulder.x, leftShoulder.y);
      context.lineTo(rightShoulder.x, rightShoulder.y);
      context.stroke();
    }

    if (nose && leftShoulder && rightShoulder) {
      context.beginPath();
      context.moveTo(nose.x, nose.y);
      context.lineTo((leftShoulder.x + rightShoulder.x) / 2, (leftShoulder.y + rightShoulder.y) / 2);
      context.stroke();
    }

    frame.keypoints.forEach((point) => {
      context.beginPath();
      context.arc(point.x, point.y, Math.max(5, width / 160), 0, Math.PI * 2);
      context.fill();
    });
  }, [frame]);

  return (
    <section className="camera-panel">
      <div className="camera-stage">
        <video ref={videoRef} muted playsInline className={running && !cameraError ? "active" : ""} />
        <canvas ref={canvasRef} />
        {(!running || cameraError) && (
          <div className="camera-placeholder">
            {cameraError ? <CameraOff size={38} /> : <Camera size={38} />}
            <span>{cameraError ?? "Запустите анализ, чтобы подключить камеру"}</span>
          </div>
        )}
      </div>

      <div className="camera-toolbar">
        <button className="primary-button" type="button" onClick={onToggle}>
          {running ? <Square size={18} /> : <Play size={18} />}
          {running ? "Остановить" : "Запустить"}
        </button>
        <button className="secondary-button" type="button" onClick={onCalibrate} disabled={!frame}>
          <Crosshair size={18} />
          Калибровать
        </button>
      </div>
    </section>
  );
}
