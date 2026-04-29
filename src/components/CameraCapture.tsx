import { useState, useRef, useEffect, useCallback } from "react";
import { openCamera, capturePhoto, stopCamera } from "../lib/camera";
import { createMp4Recorder, Mp4RecorderHandle } from "../lib/mp4Recorder";

const MAX_DURATION_S = 15; // Max video duration in seconds

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
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [flipNotice, setFlipNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<Mp4RecorderHandle | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gpsRef = useRef<GpsData | null>(null);

  // Lock body scroll while the fullscreen camera overlay is open (phone-first PWA UX).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousOverscroll = body.style.overscrollBehavior;
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "contain";
    return () => {
      body.style.overflow = previousOverflow;
      body.style.overscrollBehavior = previousOverscroll;
    };
  }, []);

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

      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.srcObject = stream;
        // Don't await play() — it can take hundreds of ms to resolve and
        // would delay the UI transition out of "initializing". Fire and
        // forget; autoplay rejection is non-fatal because the stream is
        // already attached and the <video> element is muted + playsInline.
        void videoEl.play().catch(() => {
          /* ignore autoplay rejection */
        });
      }

      // Show the viewfinder immediately. The first frame paints as soon as
      // the decoder is ready; the user sees progress instead of a 1–3s
      // "Starting camera..." wait.
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

  // Detect whether the device exposes more than one video input so we can
  // hide the flip button on single-camera devices (e.g. most laptops/desktops).
  // Deferred via setTimeout so it doesn't compete with the initial
  // getUserMedia negotiation, which can serialize on some browsers.
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        if (!cancelled) setHasMultipleCameras(videoInputs.length > 1);
      } catch {
        // If enumeration fails, leave the flip button hidden.
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, []);

  const handleFlipCamera = async () => {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    const previousStream = streamRef.current;

    // Try to open the alternate camera *before* tearing down the working one.
    // If the device only has one camera (or the flip is otherwise unavailable),
    // catch the error and keep the current stream running.
    try {
      const newStream = await openCamera(mode, newFacing);

      // Success — swap streams.
      stopCamera(previousStream);
      streamRef.current = newStream;
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        try {
          await videoRef.current.play();
        } catch {
          // Autoplay rejection is non-fatal; the stream is still attached.
        }
      }
      setFacingMode(newFacing);
    } catch (err) {
      console.warn("Flip camera failed:", err);
      // Don't disturb the existing preview — surface a transient notice.
      setHasMultipleCameras(false);
      setFlipNotice("Only one camera is available on this device.");
      setTimeout(() => setFlipNotice(null), 2500);
    }
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

    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      const file = await recorder.stop();
      const url = URL.createObjectURL(file);
      setCapturedBlob(file);
      setCapturedUrl(url);
      setState("review");

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
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-400 mb-6 text-base max-w-sm">{error}</p>
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
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Top bar: cancel + recording indicator */}
      <div className="relative flex items-center justify-between px-4 py-3 z-10">
        <button
          type="button"
          onClick={handleCancel}
          className="px-3 py-2 text-white/80 hover:text-white text-sm font-medium transition-colors"
        >
          Cancel
        </button>

        {state === "recording" && (
          <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-sm font-mono">
              {formatTime(elapsedSeconds)} / {formatTime(MAX_DURATION_S)}
            </span>
          </div>
        )}

        {state === "previewing" && hasMultipleCameras ? (
          <button
            type="button"
            onClick={handleFlipCamera}
            className="p-2 text-white/80 hover:text-white transition-colors"
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
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Transient flip-camera notice (e.g., single-camera device) */}
      {flipNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-black/70 text-white text-sm px-3 py-1.5 rounded-full">
          {flipNotice}
        </div>
      )}

      {/* Viewfinder / Review area — fills available space, object-contain so what you see is what you save */}
      <div className="relative flex-1 min-h-0 bg-black">
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
          className={`absolute inset-0 w-full h-full object-contain ${
            state === "review" ? "hidden" : ""
          }`}
        />

        {/* Photo review */}
        {state === "review" && mode === "photo" && capturedUrl && (
          <img
            src={capturedUrl}
            alt="Captured"
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}

        {/* Video review */}
        {state === "review" && mode === "video" && capturedUrl && (
          <video
            src={capturedUrl}
            controls
            playsInline
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}
      </div>

      {/* Bottom controls bar */}
      <div className="px-4 py-4 bg-black/70 backdrop-blur-sm">
        {/* Previewing: show capture controls */}
        {state === "previewing" && (
          <div className="flex items-center justify-center">
            {mode === "photo" ? (
              <button
                type="button"
                onClick={handleCapturePhoto}
                className="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 active:scale-95 transition-all"
                title="Take photo"
              />
            ) : (
              <button
                type="button"
                onClick={handleStartRecording}
                className="w-20 h-20 rounded-full border-4 border-white bg-red-500 hover:bg-red-600 active:scale-95 transition-all"
                title="Start recording"
              />
            )}
          </div>
        )}

        {/* Recording: show stop control */}
        {state === "recording" && (
          <div className="flex items-center justify-between">
            <div className="text-white/60 text-sm w-16" />

            <button
              type="button"
              onClick={handleStopRecording}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent hover:bg-white/10 active:scale-95 transition-all"
              title="Stop recording"
            >
              <div className="w-8 h-8 rounded-sm bg-red-500" />
            </button>

            <div className="text-white/80 text-sm w-16 text-right font-mono">
              {formatTime(MAX_DURATION_S - elapsedSeconds)}
            </div>
          </div>
        )}

        {/* Review: show retake / use controls */}
        {state === "review" && (
          <div className="space-y-2 max-w-md mx-auto">
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
              className="w-full py-2 text-white/70 hover:text-white text-sm font-medium transition-colors"
            >
              Retake
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
