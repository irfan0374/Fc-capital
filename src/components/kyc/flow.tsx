"use client";
import { useEffect, useState } from "react";
import {
  cameraKinds,
  kycLabels,
  needsBack,
  type KycKind,
  type KycStatus,
} from "@/lib/kyc";
import { DocumentCamera, SelfieCamera } from "./camera";
import "./kyc.css";
export type KycSessionRef = { id: string; secret: string };
export async function kycRequest(
  path: string,
  session: KycSessionRef | null,
  init: RequestInit = {},
): Promise<KycStatus & Partial<KycSessionRef>> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(session
        ? { "x-kyc-id": session.id, "x-kyc-secret": session.secret }
        : {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.error || "Something went wrong. Please try again.");
  return body;
}
export const uploadKyc = (session: KycSessionRef, kind: KycKind, file: Blob) =>
  kycRequest("/api/kyc/upload?kind=" + kind, session, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
const copy: Record<
  Exclude<KycKind, "addressProof">,
  (doc: string) => [string, string]
> = {
  front: (doc) => [
    doc === "Passport" ? "Passport photo page" : doc + " · front side",
    doc === "Passport"
      ? "Open your passport to the page with your photo."
      : "Show the front side of your " + doc + ".",
  ],
  back: (doc) => [
    doc + " · back side",
    "Now turn the card over and show the back side.",
  ],
  selfie: () => [
    "Selfie",
    "A quick face check: blink, then look at the camera.",
  ],
};
export function KycFlow({
  session,
  status,
  onStatus,
}: {
  session: KycSessionRef;
  status: KycStatus;
  onStatus: (s: KycStatus) => void;
}) {
  const kinds = cameraKinds(status.documentType) as Exclude<
    KycKind,
    "addressProof"
  >[];
  const [open, setOpen] = useState<Exclude<KycKind, "addressProof"> | null>(
    null,
  );
  const [photo, setPhoto] = useState<{
    kind: Exclude<KycKind, "addressProof">;
    blob: Blob;
    url: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const next = kinds.find((k) => !status.captured[k]);
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url);
    },
    [photo],
  );
  async function confirm() {
    if (!photo) return;
    setBusy(true);
    setError("");
    try {
      const updated = await uploadKyc(session, photo.kind, photo.blob);
      onStatus(updated);
      setPhoto(null);
      const following = kinds.find(
        (k) => k !== photo.kind && !updated.captured[k],
      );
      setOpen(following ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="kyc-flow">
      <ol className="kyc-checklist">
        {kinds.map((k, i) => {
          const [title, text] = copy[k](status.documentType);
          const done = !!status.captured[k];
          return (
            <li key={k} className={done ? "done" : k === next ? "current" : ""}>
              <span className="kyc-step-icon" aria-hidden="true">
                {done ? "✓" : k === "selfie" ? "☺" : String(i + 1)}
              </span>
              <div>
                <strong>{title}</strong>
                <small>{done ? "Captured" : text}</small>
              </div>
              <button
                type="button"
                className={
                  "button " +
                  (done ? "secondary" : k === next ? "primary" : "secondary")
                }
                disabled={!done && k !== next}
                onClick={() => setOpen(k)}
              >
                {done ? "Retake" : "Start"}
              </button>
            </li>
          );
        })}
      </ol>
      {!next && (
        <p className="success-note" role="status">
          ✓ Identity photos captured. Thank you.
        </p>
      )}
      {open &&
        !photo &&
        (open === "selfie" ? (
          <SelfieCamera
            onClose={() => setOpen(null)}
            onCapture={(blob) =>
              setPhoto({ kind: open, blob, url: URL.createObjectURL(blob) })
            }
          />
        ) : (
          <DocumentCamera
            key={open}
            title={copy[open](status.documentType)[0]}
            hint={copy[open](status.documentType)[1]}
            passport={!needsBack(status.documentType)}
            onClose={() => setOpen(null)}
            onCapture={(blob) =>
              setPhoto({ kind: open, blob, url: URL.createObjectURL(blob) })
            }
          />
        ))}
      {photo && (
        <div
          className="kyc-camera kyc-review"
          role="dialog"
          aria-label="Check your photo"
        >
          <header>
            <div>
              <strong>Check your photo</strong>
              <small>
                {photo.kind === "selfie"
                  ? "Make sure your whole face is clear and well lit."
                  : "Make sure all details are readable, with no glare or blur."}
              </small>
            </div>
          </header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={kycLabels[photo.kind]}
            className={photo.kind === "selfie" ? "mirror" : ""}
          />
          <footer>
            {error && (
              <p className="kyc-error" role="alert">
                {error}
              </p>
            )}
            <div className="kyc-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setPhoto(null)}
              >
                Retake
              </button>
              <button
                type="button"
                className="button primary"
                disabled={busy}
                onClick={confirm}
              >
                {busy ? "Uploading…" : "Use this photo"}
              </button>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
export function KycHandoff({
  session,
  status,
  onStatus,
}: {
  session: KycSessionRef;
  status: KycStatus;
  onStatus: (s: KycStatus) => void;
}) {
  const [qr, setQr] = useState("");
  const kinds = cameraKinds(status.documentType);
  const remaining = kinds.filter((k) => !status.captured[k]).length;
  useEffect(() => {
    let cancelled = false;
    import("qrcode").then(({ toDataURL }) =>
      toDataURL(
        location.origin + "/capture#" + session.id + "." + session.secret,
        {
          width: 320,
          margin: 1,
          errorCorrectionLevel: "M",
        },
      ).then((url) => !cancelled && setQr(url)),
    );
    return () => {
      cancelled = true;
    };
  }, [session.id, session.secret]);
  useEffect(() => {
    if (!remaining) return;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      kycRequest("/api/kyc/session/" + session.id, null, {
        headers: { "x-kyc-secret": session.secret },
      })
        .then(onStatus)
        .catch(() => {});
    };
    const timer = setInterval(check, 3000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [remaining, session.id, session.secret, onStatus]);
  return (
    <div className="kyc-flow">
      {remaining > 0 && (
        <div className="kyc-qr">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code to continue on your phone" />
          ) : (
            <div style={{ width: 168, height: 168 }} />
          )}
          <div>
            <h3>Continue on your phone</h3>
            <p>
              We need your phone&apos;s camera to photograph your document and
              take a selfie.
            </p>
            <ol>
              <li>Open your phone camera and scan this code.</li>
              <li>Follow the steps on your phone.</li>
              <li>Keep this page open. It updates automatically.</li>
            </ol>
            <p className="kyc-live" role="status">
              ● Waiting for your phone… {kinds.length - remaining} of{" "}
              {kinds.length} done
            </p>
          </div>
        </div>
      )}
      <ol className="kyc-checklist">
        {kinds.map((k, i) => (
          <li key={k} className={status.captured[k] ? "done" : ""}>
            <span className="kyc-step-icon" aria-hidden="true">
              {status.captured[k] ? "✓" : String(i + 1)}
            </span>
            <div>
              <strong>
                {
                  copy[k as Exclude<KycKind, "addressProof">](
                    status.documentType,
                  )[0]
                }
              </strong>
              <small>
                {status.captured[k] ? "Captured on your phone" : "Waiting"}
              </small>
            </div>
          </li>
        ))}
      </ol>
      {!remaining && (
        <p className="success-note" role="status">
          ✓ Identity photos received from your phone.
        </p>
      )}
    </div>
  );
}
