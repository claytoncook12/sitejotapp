export type CameraMode = "photo" | "video";

export async function openCamera(
  mode: CameraMode,
  facingMode: "environment" | "user" = "environment"
): Promise<MediaStream> {
  // Keep constraints minimal so the browser can pick the camera's native
  // sensor mode. Over-constraining (forcing portrait aspect ratio + high
  // resolution) makes getUserMedia negotiation slow and forces the browser
  // to software-scale every frame, causing a choppy preview.
  //
  // We cap width to keep file sizes reasonable; height/aspect are left to
  // the device. The full-screen preview uses `object-contain` so the user
  // sees the entire captured frame regardless of orientation.
  const widthMax = mode === "photo" ? 1920 : 1280;

  const videoConstraints: MediaTrackConstraints = {
    facingMode,
    width: { ideal: widthMax, max: widthMax },
  };

  const constraints: MediaStreamConstraints = {
    video: videoConstraints,
    audio: mode === "video",
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
