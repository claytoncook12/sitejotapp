import { Muxer, ArrayBufferTarget } from "mp4-muxer";

const MAX_DURATION_MS = 15_000;
const VIDEO_BITRATE = 1_500_000;
const AUDIO_BITRATE = 128_000;
const AUDIO_SAMPLE_RATE = 48000;
const KEYFRAME_INTERVAL_MS = 2000;

export interface Mp4RecorderHandle {
  start(): void;
  stop(): Promise<File>;
  getElapsedMs(): number;
  isRecording(): boolean;
}

/**
 * Creates an MP4 recorder using WebCodecs + mp4-muxer for universal playback.
 * Falls back to MediaRecorder (WebM) if WebCodecs is unavailable.
 */
export function createMp4Recorder(
  stream: MediaStream,
  onAutoStop?: () => void
): Mp4RecorderHandle {
  const hasWebCodecs =
    typeof VideoEncoder !== "undefined" &&
    typeof AudioEncoder !== "undefined";

  if (hasWebCodecs) {
    return createWebCodecsRecorder(stream, onAutoStop);
  }
  return createFallbackRecorder(stream, onAutoStop);
}

// --- WebCodecs + mp4-muxer implementation ---

function createWebCodecsRecorder(
  stream: MediaStream,
  onAutoStop?: () => void
): Mp4RecorderHandle {
  let muxer: Muxer<ArrayBufferTarget> | null = null;
  let videoEncoder: VideoEncoder | null = null;
  let audioEncoder: AudioEncoder | null = null;
  let startTime = 0;
  let recording = false;
  let stopped = false;
  let autoStopTimeout: ReturnType<typeof setTimeout> | null = null;
  let frameInterval: ReturnType<typeof setInterval> | null = null;
  let videoTrack: MediaStreamTrack | null = null;
  // @ts-expect-error - MediaStreamTrackProcessor is available in browsers with WebCodecs
  let trackProcessor: MediaStreamTrackProcessor | null = null;
  let trackReader: ReadableStreamDefaultReader<VideoFrame> | null = null;

  const videoSettings = stream.getVideoTracks()[0]?.getSettings();
  const width = videoSettings?.width || 1280;
  const height = videoSettings?.height || 720;
  const fps = videoSettings?.frameRate || 30;

  function finalize(): File {
    if (muxer) {
      muxer.finalize();
      const buffer = muxer.target.buffer;
      return new File([buffer], `observation-${Date.now()}.mp4`, {
        type: "video/mp4",
      });
    }
    return new File([], "empty.mp4", { type: "video/mp4" });
  }

  return {
    start() {
      if (recording) return;
      recording = true;
      stopped = false;
      startTime = performance.now();

      const hasAudio = stream.getAudioTracks().length > 0;

      muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
          codec: "avc",
          width,
          height,
        },
        ...(hasAudio
          ? {
              audio: {
                codec: "aac",
                numberOfChannels: 1,
                sampleRate: AUDIO_SAMPLE_RATE,
              },
            }
          : {}),
        fastStart: "in-memory",
        firstTimestampBehavior: "offset",
      });

      videoEncoder = new VideoEncoder({
        output: (chunk, meta) => {
          if (muxer) muxer.addVideoChunk(chunk, meta ?? undefined);
        },
        error: (e) => console.error("VideoEncoder error:", e),
      });

      videoEncoder.configure({
        codec: "avc1.640028",
        width,
        height,
        bitrate: VIDEO_BITRATE,
        framerate: fps,
        latencyMode: "realtime",
      });

      // Read video frames via MediaStreamTrackProcessor
      videoTrack = stream.getVideoTracks()[0];
      // @ts-expect-error - MediaStreamTrackProcessor exists in WebCodecs-capable browsers
      trackProcessor = new MediaStreamTrackProcessor({ track: videoTrack });
      trackReader = trackProcessor.readable.getReader();

      let frameCount = 0;
      const keyframeEvery = Math.round(
        (KEYFRAME_INTERVAL_MS / 1000) * fps
      );

      const readFrames = async () => {
        try {
          while (recording && !stopped) {
            const { value: frame, done } = await trackReader!.read();
            if (done || !frame) break;
            if (videoEncoder && videoEncoder.state === "configured") {
              const keyFrame = frameCount % keyframeEvery === 0;
              videoEncoder.encode(frame, { keyFrame });
              frameCount++;
            }
            frame.close();
          }
        } catch {
          // reader cancelled on stop
        }
      };
      readFrames();

      // Audio encoding
      if (hasAudio) {
        audioEncoder = new AudioEncoder({
          output: (chunk, meta) => {
            if (muxer) muxer.addAudioChunk(chunk, meta ?? undefined);
          },
          error: (e) => console.error("AudioEncoder error:", e),
        });

        audioEncoder.configure({
          codec: "mp4a.40.2",
          numberOfChannels: 1,
          sampleRate: AUDIO_SAMPLE_RATE,
          bitrate: AUDIO_BITRATE,
        });

        const audioCtx = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
        const source = audioCtx.createMediaStreamSource(stream);
        const workletUrl = URL.createObjectURL(
          new Blob(
            [
              `
class AudioSamplerProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      this.port.postMessage({ samples: input[0], sampleRate });
    }
    return true;
  }
}
registerProcessor("audio-sampler", AudioSamplerProcessor);
`,
            ],
            { type: "application/javascript" }
          )
        );

        audioCtx.audioWorklet.addModule(workletUrl).then(() => {
          const worklet = new AudioWorkletNode(audioCtx, "audio-sampler");
          worklet.port.onmessage = (e: MessageEvent) => {
            if (!recording || !audioEncoder || audioEncoder.state !== "configured") return;
            const { samples } = e.data;
            const data = new AudioData({
              format: "f32-planar",
              sampleRate: AUDIO_SAMPLE_RATE,
              numberOfFrames: samples.length,
              numberOfChannels: 1,
              timestamp: (performance.now() - startTime) * 1000,
              data: new Float32Array(samples),
            });
            audioEncoder.encode(data);
            data.close();
          };
          source.connect(worklet);
          worklet.connect(audioCtx.destination);

          // Store for cleanup
          (audioEncoder as any)._audioCtx = audioCtx;
          (audioEncoder as any)._workletUrl = workletUrl;
        });
      }

      // Auto-stop at 30 seconds
      autoStopTimeout = setTimeout(() => {
        if (recording) {
          if (onAutoStop) {
            onAutoStop();
          } else {
            this.stop();
          }
        }
      }, MAX_DURATION_MS);
    },

    async stop(): Promise<File> {
      if (stopped) return finalize();
      stopped = true;
      recording = false;

      if (autoStopTimeout) {
        clearTimeout(autoStopTimeout);
        autoStopTimeout = null;
      }
      if (frameInterval) {
        clearInterval(frameInterval);
        frameInterval = null;
      }

      // Cancel the track reader
      if (trackReader) {
        try { await trackReader.cancel(); } catch { /* ok */ }
        trackReader = null;
      }

      if (videoEncoder && videoEncoder.state === "configured") {
        await videoEncoder.flush();
        videoEncoder.close();
      }
      if (audioEncoder && audioEncoder.state === "configured") {
        await audioEncoder.flush();
        audioEncoder.close();
        if ((audioEncoder as any)._audioCtx) {
          (audioEncoder as any)._audioCtx.close();
          URL.revokeObjectURL((audioEncoder as any)._workletUrl);
        }
      }

      const file = finalize();
      return file;
    },

    getElapsedMs(): number {
      if (!recording && !stopped) return 0;
      if (recording) return performance.now() - startTime;
      return 0;
    },

    isRecording(): boolean {
      return recording;
    },
  };
}

// --- MediaRecorder fallback (WebM) for Firefox ---

function createFallbackRecorder(
  stream: MediaStream,
  onAutoStop?: () => void
): Mp4RecorderHandle {
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let startTime = 0;
  let recording = false;
  let stopped = false;
  let autoStopTimeout: ReturnType<typeof setTimeout> | null = null;
  let resolveStop: ((file: File) => void) | null = null;
  let stopPromise: Promise<File> | null = null;

  function getMimeType(): string {
    if (MediaRecorder.isTypeSupported("video/webm; codecs=vp9")) {
      return "video/webm; codecs=vp9";
    }
    if (MediaRecorder.isTypeSupported("video/webm; codecs=vp8")) {
      return "video/webm; codecs=vp8";
    }
    return "video/webm";
  }

  return {
    start() {
      if (recording) return;
      recording = true;
      stopped = false;
      chunks = [];
      startTime = performance.now();

      const mimeType = getMimeType();
      mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: VIDEO_BITRATE,
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const ext = mimeType.includes("webm") ? "webm" : "mp4";
        const file = new File([blob], `observation-${Date.now()}.${ext}`, {
          type: mimeType,
        });
        if (resolveStop) resolveStop(file);
      };

      mediaRecorder.start(1000);

      autoStopTimeout = setTimeout(() => {
        if (recording) {
          if (onAutoStop) {
            onAutoStop();
          } else {
            this.stop();
          }
        }
      }, MAX_DURATION_MS);
    },

    stop(): Promise<File> {
      if (stopPromise) return stopPromise;
      stopped = true;
      recording = false;

      if (autoStopTimeout) {
        clearTimeout(autoStopTimeout);
        autoStopTimeout = null;
      }

      stopPromise = new Promise<File>((resolve) => {
        resolveStop = resolve;
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      });

      return stopPromise;
    },

    getElapsedMs(): number {
      if (!recording && !stopped) return 0;
      if (recording) return performance.now() - startTime;
      return 0;
    },

    isRecording(): boolean {
      return recording;
    },
  };
}
