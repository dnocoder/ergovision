import type { KeypointName, PoseFrame, PoseKeypoint } from "../types/pose";

type PoseDetector = import("@tensorflow-models/pose-detection").PoseDetector;
export type PoseDetectorStatus = "idle" | "loading" | "ready" | "unavailable";

const LOCAL_MOVENET_MODEL_URL = "/models/movenet-lightning/model.json";

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
        await tf.setBackend("webgl");
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
        console.warn("MoveNet failed to load, demo mode is active.", error);
        detectorStatus = "unavailable";
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

export async function estimatePose(video: HTMLVideoElement): Promise<PoseFrame | null> {
  const liveCamera = hasLiveCamera(video);

  if (!canUseVideoFrame(video)) {
    return liveCamera ? null : createDemoPose(video);
  }

  const detector = await loadDetector();

  if (!detector) {
    return liveCamera ? null : createDemoPose(video);
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
    return liveCamera ? null : createDemoPose(video);
  }

  return {
    keypoints,
    source: "movenet",
    timestamp: performance.now(),
  };
}

export function createDemoPose(video?: HTMLVideoElement): PoseFrame {
  const width = video?.videoWidth || 960;
  const height = video?.videoHeight || 540;
  const t = performance.now() / 1000;
  const sway = Math.sin(t * 1.25) * 18;
  const shoulderShift = Math.sin(t * 0.75) * 11;
  const forwardLean = Math.max(0, Math.sin(t * 0.45)) * 34;

  const cx = width / 2 + sway;
  const shoulderY = height * 0.63;
  const span = width * 0.29 - forwardLean * 0.7;

  const points: PoseKeypoint[] = [
    { name: "nose", x: cx + sway * 0.35, y: height * 0.31 + forwardLean, score: 0.96 },
    { name: "left_eye", x: cx - 32, y: height * 0.28 + forwardLean * 0.4, score: 0.9 },
    { name: "right_eye", x: cx + 32, y: height * 0.28 - forwardLean * 0.1, score: 0.9 },
    { name: "left_ear", x: cx - 66, y: height * 0.32, score: 0.84 },
    { name: "right_ear", x: cx + 66, y: height * 0.32, score: 0.84 },
    { name: "left_shoulder", x: cx - span / 2, y: shoulderY - shoulderShift, score: 0.92 },
    { name: "right_shoulder", x: cx + span / 2, y: shoulderY + shoulderShift, score: 0.92 },
  ];

  return {
    keypoints: points,
    source: "demo",
    timestamp: performance.now(),
  };
}
