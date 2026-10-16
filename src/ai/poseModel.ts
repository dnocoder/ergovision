import type { KeypointName, PoseFrame, PoseKeypoint } from "../types/pose";

type PoseDetector = import("@tensorflow-models/pose-detection").PoseDetector;
export type PoseDetectorStatus = "idle" | "loading" | "ready" | "unavailable";

const LOCAL_MOVENET_MODEL_URL = `${import.meta.env.BASE_URL}models/movenet-lightning/model.json`;

const KEYPOINT_MAP: Record<string, KeypointName | undefined> = {
  nose: "nose",
  left_eye: "left_eye",
  right_eye: "right_eye",
  left_ear: "left_ear",
  right_ear: "right_ear",
  left_shoulder: "left_shoulder",
  right_shoulder: "right_shoulder",
};

let detectorPromise: Promise<PoseDetector | null> | null = null;
let detectorStatus: PoseDetectorStatus = "idle";

async function loadDetector(): Promise<PoseDetector | null> {
  if (!detectorPromise) {
    detectorStatus = "loading";
    detectorPromise = (async () => {
      try {
        await import("@tensorflow/tfjs-backend-webgl");
        const tf = await import("@tensorflow/tfjs-core");
        const poseDetection = await import("@tensorflow-models/pose-detection");
        const webglReady = await tf.setBackend("webgl");
        if (!webglReady) throw new Error("WebGL backend is not supported in this browser.");
        await tf.ready();

        let detector: PoseDetector;
        const detectorConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
        };

        try {
          detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
            ...detectorConfig,
            modelUrl: LOCAL_MOVENET_MODEL_URL,
          });
        } catch (localModelError) {
          console.warn("Local MoveNet model is unavailable, falling back to TFHub.", localModelError);
          detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
        }

        detectorStatus = "ready";
        return detector;
      } catch (error) {
        console.warn("MoveNet failed to load.", error);
        detectorStatus = "unavailable";
        // Allow the next session start to retry instead of caching the failure forever.
        detectorPromise = null;
        return null;
      }
    })();
  }

  return detectorPromise;
}

function hasLiveCamera(video: HTMLVideoElement): boolean {
  const stream = video.srcObject;
  return (
    stream instanceof MediaStream &&
    stream.getVideoTracks().some((track) => track.readyState === "live")
  );
}

function canUseVideoFrame(video: HTMLVideoElement): boolean {
  return (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  );
}

export function getPoseDetectorStatus(): PoseDetectorStatus {
  return detectorStatus;
}

export function preloadPoseDetector(): Promise<PoseDetector | null> {
  return loadDetector();
}

/**
 * Runs MoveNet on the current video frame. When `allowDemo` is set (the camera
 * failed to start), a synthetic pose is returned instead so the dashboard can
 * still be demonstrated without a webcam.
 */
export async function estimatePose(video: HTMLVideoElement, allowDemo = false): Promise<PoseFrame | null> {
  const liveCamera = hasLiveCamera(video);
  const fallback = () => (allowDemo && !liveCamera ? createDemoPose(video) : null);

  if (!canUseVideoFrame(video)) {
    return fallback();
  }

  // After a failed load, retry only when a new session starts (preloadPoseDetector),
  // not on every frame.
  const detector = detectorStatus === "unavailable" ? null : await loadDetector();

  if (!detector) {
    return fallback();
  }

  const poses = await detector.estimatePoses(video, {
    maxPoses: 1,
    flipHorizontal: false,
  });

  const keypoints = poses[0]?.keypoints
    .map((point) => {
      const name = KEYPOINT_MAP[point.name ?? ""];
      if (!name) return null;
      return {
        name,
        x: point.x,
        y: point.y,
        score: point.score ?? 0,
      };
    })
    .filter((point): point is PoseKeypoint => Boolean(point)) ?? [];

  if (keypoints.length < 3) {
    return fallback();
  }

  return {
    keypoints,
    source: "movenet",
    timestamp: performance.now(),
  };
}

/**
 * Synthetic pose for demo mode. It cycles through ~30 s: mostly an upright
 * posture with light sway, then a slouch (head forward and tilted, shoulders
 * uneven) so that risk changes and warnings can be demonstrated without a camera.
 */
export function createDemoPose(video?: HTMLVideoElement): PoseFrame {
  const width = video?.videoWidth || 960;
  const height = video?.videoHeight || 540;
  const t = performance.now() / 1000;
  const phase = (t % 30) / 30;
  // 0 while upright, rises to 1 and holds there during the slouch window (40%–95% of the cycle).
  const slouch = phase < 0.4 || phase > 0.95 ? 0 : Math.min(1, Math.sin(((phase - 0.4) / 0.55) * Math.PI) * 1.8);

  const sway = Math.sin(t * 1.25) * 8;
  const cx = width / 2 + sway + slouch * width * 0.05;
  const shoulderY = height * 0.66;
  const span = width * 0.3 * (1 + slouch * 0.35);
  const shoulderShift = Math.sin(t * 0.75) * 3 + slouch * height * 0.09;
  const headDrop = slouch * height * 0.14;
  const headTilt = slouch * height * 0.08;
  const headShift = slouch * width * 0.11;
  const eyeY = height * 0.3 + headDrop;

  const points: PoseKeypoint[] = [
    { name: "nose", x: cx + headShift, y: height * 0.34 + headDrop, score: 0.96 },
    { name: "left_eye", x: cx + headShift - 30, y: eyeY - headTilt, score: 0.92 },
    { name: "right_eye", x: cx + headShift + 30, y: eyeY + headTilt, score: 0.92 },
    { name: "left_ear", x: cx + headShift - 64, y: eyeY + 14 - headTilt * 1.6, score: 0.84 },
    { name: "right_ear", x: cx + headShift + 64, y: eyeY + 14 + headTilt * 1.6, score: 0.84 },
    { name: "left_shoulder", x: cx - span / 2, y: shoulderY - shoulderShift, score: 0.93 },
    { name: "right_shoulder", x: cx + span / 2, y: shoulderY + shoulderShift, score: 0.93 },
  ];

  return {
    keypoints: points,
    source: "demo",
    timestamp: performance.now(),
  };
}
