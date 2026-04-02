export type CameraMode = "photo" | "video";

const PHOTO_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: "environment",
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
  audio: false,
};

const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: "environment",
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: true,
};

export async function openCamera(
  mode: CameraMode,
  facingMode: "environment" | "user" = "environment"
): Promise<MediaStream> {
  const base = mode === "photo" ? PHOTO_CONSTRAINTS : VIDEO_CONSTRAINTS;
  const constraints: MediaStreamConstraints = {
    ...base,
    video: {
      ...(base.video as MediaTrackConstraints),
      facingMode,
    },
  };
  return navigator.mediaDevices.getUserMedia(constraints);
}

export function capturePhoto(
  video: HTMLVideoElement,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to capture photo"));
        }
      },
      "image/jpeg",
      quality
    );
  });
}

export function stopCamera(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

export function hasWebCodecsSupport(): boolean {
  return (
    typeof VideoEncoder !== "undefined" &&
    typeof AudioEncoder !== "undefined"
  );
}
