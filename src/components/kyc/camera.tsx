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
        const track = stream.getVideoTracks()[0];
        await track
          ?.applyConstraints({
            advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
          })
          .catch(() => {});
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
const PAD = 0.08;
const expand = (r: Rect, v: HTMLVideoElement): Rect => {
  const x = Math.max(0, r.x - r.w * PAD);
  const y = Math.max(0, r.y - r.h * PAD);
  return {
    x,
    y,
    w: Math.min(v.videoWidth - x, r.w * (1 + 2 * PAD)),
    h: Math.min(v.videoHeight - y, r.h * (1 + 2 * PAD)),
  };
};
// Reads a small grayscale copy of the frame around the guide and scores it:
// brightness, contrast, sharpness (variance of the Laplacian) and how many of
// the guide's four sides have a straight edge (the card's border) close to them.
function measure(v: HTMLVideoElement, r: Rect, canvas: HTMLCanvasElement) {
  const w = 240;
  const h = Math.max(8, Math.round((w * r.h) / r.w));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(v, r.x, r.y, r.w, r.h, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++)
    gray[i] = px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114;
  const mx = Math.round((w * PAD) / (1 + 2 * PAD));
  const my = Math.round((h * PAD) / (1 + 2 * PAD));
  let sum = 0;
  let sq = 0;
  let lapSum = 0;
  let lapSq = 0;
  let n = 0;
  for (let y = my + 1; y < h - my - 1; y++)
    for (let x = mx + 1; x < w - mx - 1; x++) {
      const i = y * w + x;
      const lap =
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      sum += gray[i];
      sq += gray[i] * gray[i];
      lapSum += lap;
      lapSq += lap * lap;
      n++;
    }
  const mean = sum / n;
  // Edge profile across one side band: mean gradient of each line, then how much
  // the strongest line stands out from the band (a straight border makes a spike).
  // For one side of the guide, find the line with the strongest edge and check
  // that the edge runs continuously along most of that side, as a card border does.
  const side = (horizontal: boolean, from: number, to: number) => {
    const [len, other] = horizontal ? [w, h] : [h, w];
    const a = Math.round(len * 0.15);
    const b = Math.round(len * 0.85);
    const grad = (k: number, t: number) =>
      horizontal
        ? Math.abs(gray[(k + 1) * w + t] - gray[(k - 1) * w + t])
        : Math.abs(gray[t * w + k + 1] - gray[t * w + k - 1]);
    let best = 0;
    for (let k = Math.max(2, from); k < Math.min(other - 2, to); k++) {
      let covered = 0;
      for (let t = a; t < b; t++)
        if (Math.max(grad(k - 1, t), grad(k, t), grad(k + 1, t)) > 16)
          covered++;
      best = Math.max(best, covered / (b - a));
    }
    return Math.round(best * 100) / 100;
  };
  const band = (size: number, margin: number) => [
    0,
    margin * 2 + Math.round(size * 0.08),
  ];
  const [t0, t1] = band(h, my);
  const [l0, l1] = band(w, mx);
  const sides = [
    side(true, t0, t1),
    side(true, h - t1, h - t0),
    side(false, l0, l1),
    side(false, w - l1, w - l0),
  ];
  const edges = sides.filter((x) => x > 0.7).length;
  return {
    gray,
    edges,
    brightness: mean,
    contrast: Math.sqrt(Math.max(0, sq / n - mean * mean)),
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
  const done = useRef(false);
  async function take() {
    const v = video.current;
    if (!v || !guide.current || done.current) return;
    done.current = true;
    const rect = expand(
      toVideoRect(v, guide.current.getBoundingClientRect()),
      v,
    );
    onCapture(await snapshot(v, rect, 1800));
  }
  useEffect(() => {
    if (!ready) return;
    const canvas = document.createElement("canvas");
    let previous: Float32Array | null = null;
    const recent: number[] = [];
    let steady = 0;
    let present = 0;
    const started = Date.now();
    const tick = () => {
      const v = video.current;
      if (!v || !guide.current || done.current || !v.videoWidth) return;
      const m = measure(
        v,
        expand(toVideoRect(v, guide.current.getBoundingClientRect()), v),
        canvas,
      );
      let motion = 99;
      if (previous && previous.length === m.gray.length) {
        motion = 0;
        for (let i = 0; i < m.gray.length; i += 3)
          motion += Math.abs(m.gray[i] - previous[i]);
        motion /= m.gray.length / 3;
      }
      previous = m.gray;
      recent.push(m.sharpness);
      if (recent.length > 16) recent.shift();
      const sharp =
        m.sharpness > 15 && m.sharpness >= Math.max(...recent) * 0.45;
      const lit = m.brightness > 40 && m.brightness < 235;
      const card = lit && m.contrast > 14 && m.edges >= 2;
      const late = Date.now() - started > 10000;
      present = card && motion < 25 ? present + 1 : 0;
      steady = card && m.edges >= 3 && motion < 14 && sharp ? steady + 1 : 0;
      let next = "Hold steady…";
      if (!lit)
        next =
          m.brightness <= 40
            ? "Too dark. Move somewhere brighter"
            : "Too bright. Tilt the card to avoid glare";
      else if (!card)
        next =
          Date.now() - started > 5000
            ? "Line the card edges up with the frame. A darker surface helps"
            : "Fit your document inside the frame";
      else if (motion >= 14) next = "Hold still…";
      else if (!sharp) next = "Focusing…";
      setMessage(next);
      // Snap after ~0.5 s of a steady, sharp, framed card; or after ~2 s of a card
      // in the frame even with some hand shake; or, as a last resort after 10 s,
      // once anything well lit and still is in view.
      const target = 4;
      setProgress(Math.min(1, Math.max(steady / target, present / 16)));
      if (
        steady >= target ||
        present >= 16 ||
        (late && lit && m.contrast > 18 && motion < 10 && sharp)
      )
        void take();
    };
    const timer = window.setInterval(tick, 120);
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
          <p role="status">
            {ready ? message : "Opening camera…"}
            {ready && <small>The photo is taken automatically.</small>}
          </p>
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
type Stage = "blink" | "look" | "done";
const stageText: Record<Stage, string> = {
  blink: "Blink your eyes",
  look: "Now look at the camera",
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
  const [stage, setStage] = useState<Stage>("blink");
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
    let current: Stage = "blink";
    let closed = false;
    let looking = 0;
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
                  : "Look at the camera so we can see your face",
              );
              looking = 0;
            } else {
              setHint("");
              const p = faces[0];
              const yaw =
                (p[1].x - (p[234].x + p[454].x) / 2) /
                Math.abs(p[454].x - p[234].x);
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
              if (current === "blink") {
                if (blink > 0.45) closed = true;
                else if (closed && blink < 0.3) go("look");
              } else if (current === "look") {
                looking = blink < 0.3 && Math.abs(yaw) < 0.2 ? looking + 1 : 0;
                if (looking >= 3) {
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
  const steps: Stage[] = ["blink", "look"];
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
            Blink once, then look at the camera. The photo is taken
            automatically.
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
