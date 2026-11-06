"use client";
import { useEffect, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
const MEDIAPIPE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
type Rect = { x: number; y: number; w: number; h: number };
function useCamera(facingMode: "environment" | "user") {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let stream: MediaStream | undefined;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error("unsupported");
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        setReady(true);
      } catch (e) {
        if (cancelled) return;
        setError(
          (e as Error).name === "NotAllowedError"
            ? "Camera access was blocked. Allow camera access for this site in your browser settings, then try again."
            : "We couldn't open your camera. Make sure no other app is using it and try again.",
        );
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]);
  return { video, error, ready };
}
// Maps a rectangle on screen to the video's own pixels (video uses object-fit: cover).
function toVideoRect(v: HTMLVideoElement, guide: DOMRect): Rect {
  const box = v.getBoundingClientRect();
  const scale = Math.max(box.width / v.videoWidth, box.height / v.videoHeight);
  const ox = (box.width - v.videoWidth * scale) / 2;
  const oy = (box.height - v.videoHeight * scale) / 2;
  const x = Math.max(0, (guide.left - box.left - ox) / scale);
  const y = Math.max(0, (guide.top - box.top - oy) / scale);
  return {
    x,
    y,
    w: Math.min(v.videoWidth - x, guide.width / scale),
    h: Math.min(v.videoHeight - y, guide.height / scale),
  };
}
function snapshot(v: HTMLVideoElement, r: Rect, maxWidth: number) {
  const scale = Math.min(1, maxWidth / r.w);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(r.w * scale);
  canvas.height = Math.round(r.h * scale);
  canvas
    .getContext("2d")!
    .drawImage(v, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject()), "image/jpeg", 0.9),
  );
}
// Brightness, contrast and sharpness (variance of the Laplacian) of a small grayscale copy.
function measure(v: HTMLVideoElement, r: Rect, canvas: HTMLCanvasElement) {
  const w = 240;
  const h = Math.max(1, Math.round((w * r.h) / r.w));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(v, r.x, r.y, r.w, r.h, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    gray[i] = px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114;
    sum += gray[i];
  }
  const mean = sum / (w * h);
  let variance = 0;
  let lapSum = 0;
  let lapSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap =
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      lapSum += lap;
      lapSq += lap * lap;
      n++;
    }
  for (let i = 0; i < w * h; i++) variance += (gray[i] - mean) ** 2;
  return {
    gray,
    brightness: mean,
    contrast: Math.sqrt(variance / (w * h)),
    sharpness: lapSq / n - (lapSum / n) ** 2,
  };
}
export function DocumentCamera({
  title,
  hint,
  passport,
  onCapture,
  onClose,
}: {
  title: string;
  hint: string;
  passport: boolean;
  onCapture: (photo: Blob) => void;
  onClose: () => void;
}) {
  const { video, error, ready } = useCamera("environment");
  const guide = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState(
    "Place your document inside the frame",
  );
  const [progress, setProgress] = useState(0);
  const [manual, setManual] = useState(false);
  const done = useRef(false);
  async function take() {
    const v = video.current;
    if (!v || !guide.current || done.current) return;
    done.current = true;
    const r = toVideoRect(v, guide.current.getBoundingClientRect());
    const pad = 0.06;
    const rect = {
      x: Math.max(0, r.x - r.w * pad),
      y: Math.max(0, r.y - r.h * pad),
      w: Math.min(v.videoWidth, r.w * (1 + 2 * pad)),
      h: Math.min(v.videoHeight, r.h * (1 + 2 * pad)),
    };
    onCapture(await snapshot(v, rect, 1800));
  }
  useEffect(() => {
    if (!ready) return;
    const canvas = document.createElement("canvas");
    let previous: Float32Array | null = null;
    let peak = 0;
    let stable = 0;
    let timer = 0;
    const started = Date.now();
    const tick = () => {
      const v = video.current;
      if (!v || !guide.current || done.current || !v.videoWidth) return;
      if (Date.now() - started > 6000) setManual(true);
      const m = measure(
        v,
        toVideoRect(v, guide.current.getBoundingClientRect()),
        canvas,
      );
      let motion = 0;
      if (previous && previous.length === m.gray.length) {
        for (let i = 0; i < m.gray.length; i += 4)
          motion += Math.abs(m.gray[i] - previous[i]);
        motion /= m.gray.length / 4;
      } else motion = 99;
      previous = m.gray;
      peak = Math.max(peak * 0.995, m.sharpness);
      let next = "Hold steady…";
      if (m.brightness < 55) next = "Too dark. Move somewhere brighter";
      else if (m.brightness > 225) next = "Too bright. Avoid glare on the card";
      else if (m.contrast < 22) next = "Place your document inside the frame";
      else if (motion > 6) next = "Hold your phone still";
      else if (m.sharpness < Math.max(60, peak * 0.6))
        next = "Hold still while we focus";
      stable = next === "Hold steady…" ? stable + 1 : 0;
      setMessage(next);
      setProgress(Math.min(1, stable / 8));
      if (stable >= 8) void take();
    };
    timer = window.setInterval(tick, 120);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  return (
    <div className="kyc-camera" role="dialog" aria-label={title}>
      <video ref={video} playsInline muted />
      <div className="kyc-shade" />
      <header>
        <button type="button" onClick={onClose} aria-label="Close camera">
          ×
        </button>
        <div>
          <strong>{title}</strong>
          <small>{hint}</small>
        </div>
      </header>
      <div
        ref={guide}
        className={"kyc-card-guide" + (passport ? " passport" : "")}
        style={{ "--progress": progress } as React.CSSProperties}
      >
        <i />
      </div>
      <footer>
        {error ? (
          <p className="kyc-error" role="alert">
            {error}
          </p>
        ) : (
          <p role="status">{ready ? message : "Opening camera…"}</p>
        )}
        {ready && manual && (
          <button type="button" className="button secondary" onClick={take}>
            Take photo manually
          </button>
        )}
      </footer>
    </div>
  );
}
let landmarker: Promise<FaceLandmarker> | null = null;
function loadLandmarker() {
  landmarker ??= (async () => {
    const { FaceLandmarker, FilesetResolver } =
      await import("@mediapipe/tasks-vision");
    const files = await FilesetResolver.forVisionTasks(MEDIAPIPE + "/wasm");
    const options = (delegate: "GPU" | "CPU") => ({
      baseOptions: { modelAssetPath: FACE_MODEL, delegate },
      runningMode: "VIDEO" as const,
      numFaces: 2,
      outputFaceBlendshapes: true,
    });
    return FaceLandmarker.createFromOptions(files, options("GPU")).catch(() =>
      FaceLandmarker.createFromOptions(files, options("CPU")),
    );
  })().catch((e) => {
    landmarker = null;
    throw e;
  });
  return landmarker;
}
type Stage = "center" | "blink" | "turn" | "back" | "done";
const stageText: Record<Stage, string> = {
  center: "Position your face inside the oval",
  blink: "Blink your eyes",
  turn: "Slowly turn your head to one side",
  back: "Now look straight at the camera",
  done: "Great, hold still",
};
export function SelfieCamera({
  onCapture,
  onClose,
}: {
  onCapture: (photo: Blob) => void;
  onClose: () => void;
}) {
  const { video, error, ready } = useCamera("user");
  const [stage, setStage] = useState<Stage>("center");
  const [hint, setHint] = useState("");
  const [modelError, setModelError] = useState("");
  const done = useRef(false);
  async function take() {
    const v = video.current;
    if (!v || done.current) return;
    done.current = true;
    onCapture(
      await snapshot(
        v,
        { x: 0, y: 0, w: v.videoWidth, h: v.videoHeight },
        1280,
      ),
    );
  }
  useEffect(() => {
    if (!ready) return;
    let stopped = false;
    let frame = 0;
    let current: Stage = "center";
    let closed = false;
    let centered = 0;
    let last = -1;
    const go = (s: Stage) => {
      current = s;
      setStage(s);
    };
    loadLandmarker()
      .then((model) => {
        const loop = () => {
          if (stopped || done.current) return;
          const v = video.current;
          if (v && v.videoWidth && v.currentTime !== last) {
            last = v.currentTime;
            const result = model.detectForVideo(v, performance.now());
            const faces = result.faceLandmarks;
            if (faces.length !== 1) {
              setHint(
                faces.length
                  ? "Only one person should be in view"
                  : "We can't see your face",
              );
              centered = 0;
            } else {
              const p = faces[0];
              const xs = p.map((l) => l.x);
              const ys = p.map((l) => l.y);
              const width = Math.max(...xs) - Math.min(...xs);
              const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
              const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
              const cheekR = p[234];
              const cheekL = p[454];
              const yaw =
                (p[1].x - (cheekR.x + cheekL.x) / 2) /
                Math.abs(cheekL.x - cheekR.x);
              const shapes = Object.fromEntries(
                (result.faceBlendshapes[0]?.categories || []).map((c) => [
                  c.categoryName,
                  c.score,
                ]),
              );
              const blink = Math.min(
                shapes.eyeBlinkLeft ?? 0,
                shapes.eyeBlinkRight ?? 0,
              );
              const inOval =
                Math.abs(cx - 0.5) < 0.12 && Math.abs(cy - 0.5) < 0.15;
              const size =
                width < 0.28
                  ? "Move closer"
                  : width > 0.75
                    ? "Move back a little"
                    : "";
              setHint(!inOval ? "Center your face in the oval" : size);
              const good = inOval && !size;
              if (current === "center") {
                centered = good && Math.abs(yaw) < 0.08 ? centered + 1 : 0;
                if (centered > 8) go("blink");
              } else if (current === "blink") {
                if (blink > 0.5) closed = true;
                else if (closed && blink < 0.25) go("turn");
              } else if (current === "turn") {
                if (Math.abs(yaw) > 0.18) go("back");
              } else if (current === "back") {
                centered =
                  good && Math.abs(yaw) < 0.06 && blink < 0.3
                    ? centered + 1
                    : 0;
                if (centered > 5) {
                  go("done");
                  void take();
                  return;
                }
              }
            }
          }
          frame = requestAnimationFrame(loop);
        };
        loop();
      })
      .catch(() =>
        setModelError(
          "Face check couldn't load on this device. Take your selfie with the button below.",
        ),
      );
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  const steps: Stage[] = ["center", "blink", "turn", "back"];
  return (
    <div className="kyc-camera selfie" role="dialog" aria-label="Take a selfie">
      <video ref={video} playsInline muted />
      <div className="kyc-shade" />
      <header>
        <button type="button" onClick={onClose} aria-label="Close camera">
          ×
        </button>
        <div>
          <strong>Take a selfie</strong>
          <small>
            Remove glasses or hats. Make sure your face is well lit.
          </small>
        </div>
      </header>
      <div className={"kyc-face-guide " + stage} />
      <footer>
        {error || modelError ? (
          <p className="kyc-error" role="alert">
            {error || modelError}
          </p>
        ) : (
          <>
            <ol className="kyc-liveness" aria-hidden="true">
              {steps.map((s) => (
                <li
                  key={s}
                  className={
                    s === stage
                      ? "active"
                      : steps.indexOf(s) < steps.indexOf(stage) ||
                          stage === "done"
                        ? "complete"
                        : ""
                  }
                />
              ))}
            </ol>
            <p role="status">
              {!ready ? "Opening camera…" : stageText[stage]}
              {ready && hint && stage !== "done" && <small>{hint}</small>}
            </p>
          </>
        )}
        {ready && modelError && (
          <button type="button" className="button primary" onClick={take}>
            Take selfie
          </button>
        )}
      </footer>
    </div>
  );
}
