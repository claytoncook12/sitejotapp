import { useState, useRef, useEffect, useCallback } from "react";
import { openCamera, capturePhoto, stopCamera } from "../lib/camera";
import { createMp4Recorder, Mp4RecorderHandle } from "../lib/mp4Recorder";

const MAX_DURATION_S = 30;

export interface GpsData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface CameraCaptureProps {
  mode: "photo" | "video";
  onCapture: (file: File, gps: GpsData | null) => void;
  onCancel: () => void;
}

type CaptureState = "initializing" | "previewing" | "recording" | "review";

export function CameraCapture({ mode, onCapture, onCancel }: CameraCaptureProps) {
  const [state, setState] = useState<CaptureState>("initializing");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [gpsData, setGpsData] = useState<GpsData | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<Mp4RecorderHandle | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gpsRef = useRef<GpsData | null>(null);

  // Acquire GPS position when camera opens
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const data: GpsData = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        gpsRef.current = data;
        setGpsData(data);
      },
      () => {
        // GPS unavailable — continue without it
        gpsRef.current = null;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopCamera(streamRef.current);
    streamRef.current = null;
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
    }
  }, [capturedUrl]);

  const startStream = useCallback(async (facing: "environment" | "user") => {
    setError(null);
    setState("initializing");

    // Stop any existing stream
    stopCamera(streamRef.current);
    streamRef.current = null;

    try {
      const stream = await openCamera(mode, facing);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState("previewing");
    } catch (err) {
      console.error("Camera error:", err);
      setError(
        "Could not access camera. Please allow camera permissions and try again."
      );
    }
  }, [mode]);

  // Start camera on mount
  useEffect(() => {
    startStream(facingMode);
    return cleanup;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFlipCamera = async () => {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    await startStream(newFacing);
  };

  // --- Photo handlers ---

  const handleCapturePhoto = async () => {
    if (!videoRef.current) return;
    try {
      const blob = await capturePhoto(videoRef.current);
      const url = URL.createObjectURL(blob);
      setCapturedBlob(blob);
      setCapturedUrl(url);
      setState("review");
      // Pause the live feed
      stopCamera(streamRef.current);
      streamRef.current = null;
    } catch (err) {
      console.error("Capture error:", err);
      setError("Failed to capture photo. Please try again.");
    }
  };

  // --- Video handlers ---

  const handleStartRecording = () => {
    if (!streamRef.current) return;

    const recorder = createMp4Recorder(streamRef.current, () => {
      // Auto-stop callback
      handleStopRecording();
    });

    recorderRef.current = recorder;
    recorder.start();
    setState("recording");
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => {
      if (recorderRef.current) {
        const ms = recorderRef.current.getElapsedMs();
        setElapsedSeconds(Math.floor(ms / 1000));
      }
    }, 250);
  };

  const handleStopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recorderRef.current && recorderRef.current.isRecording()) {
      const file = await recorderRef.current.stop();
      const url = URL.createObjectURL(file);
      setCapturedBlob(file);
      setCapturedUrl(url);
      setState("review");
      recorderRef.current = null;

      // Stop camera after recording
      stopCamera(streamRef.current);
      streamRef.current = null;
    }
  };

  // --- Review handlers ---

  const handleRetake = async () => {
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
    }
    setCapturedBlob(null);
    setCapturedUrl(null);
    setElapsedSeconds(0);
    recorderRef.current = null;
    await startStream(facingMode);
  };

  const handleUse = () => {
    if (!capturedBlob) return;
    const ext = mode === "photo" ? "jpg" : "mp4";
    const mimeType = mode === "photo" ? "image/jpeg" : capturedBlob.type;
    const file = new File([capturedBlob], `observation-${Date.now()}.${ext}`, {
      type: mimeType,
    });
    onCapture(file, gpsRef.current);
  };

  const handleCancel = () => {
    cleanup();
    onCancel();
  };

  // --- Format elapsed time ---
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // --- Error state ---
  if (error) {
    return (
      <div className="rounded-lg border-2 border-dashed border-red-300 dark:border-red-700 p-6 text-center">
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => startStream(facingMode)}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 bg-black">
      {/* Viewfinder / Review area */}
      <div className="relative aspect-[4/3] bg-black">
        {state === "initializing" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-sm">Starting camera...</div>
          </div>
        )}

        {/* Live viewfinder */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${
            state === "review" ? "hidden" : ""
          }`}
        />

        {/* Recording indicator */}
        {state === "recording" && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-sm font-mono">
              {formatTime(elapsedSeconds)} / {formatTime(MAX_DURATION_S)}
            </span>
          </div>
        )}

        {/* Photo review */}
        {state === "review" && mode === "photo" && capturedUrl && (
          <img
            src={capturedUrl}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        )}

        {/* Video review */}
        {state === "review" && mode === "video" && capturedUrl && (
          <video
            src={capturedUrl}
            controls
            playsInline
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-slate-900 px-4 py-3">
        {/* Previewing: show capture controls */}
        {state === "previewing" && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-2 text-slate-400 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>

            {mode === "photo" ? (
              <button
                type="button"
                onClick={handleCapturePhoto}
                className="w-14 h-14 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-colors"
                title="Take photo"
              />
            ) : (
              <button
                type="button"
                onClick={handleStartRecording}
                className="w-14 h-14 rounded-full border-4 border-white bg-red-500 hover:bg-red-600 transition-colors"
                title="Start recording"
              />
            )}

            <button
              type="button"
              onClick={handleFlipCamera}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Flip camera"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Recording: show stop control */}
        {state === "recording" && (
          <div className="flex items-center justify-between">
            <div className="text-slate-400 text-sm w-16" />

            <button
              type="button"
              onClick={handleStopRecording}
              className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center bg-transparent hover:bg-white/10 transition-colors"
              title="Stop recording"
            >
              <div className="w-6 h-6 rounded-sm bg-red-500" />
            </button>

            <div className="text-slate-400 text-sm w-16 text-right">
              {formatTime(MAX_DURATION_S - elapsedSeconds)}
            </div>
          </div>
        )}

        {/* Review: show retake / use controls */}
        {state === "review" && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleUse}
              className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg font-medium transition-colors text-base"
            >
              Use {mode === "photo" ? "Photo" : "Video"}
              {capturedBlob && (
                <span className="ml-2 text-slate-700 text-sm">
                  ({(capturedBlob.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleRetake}
              className="w-full py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Retake
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
