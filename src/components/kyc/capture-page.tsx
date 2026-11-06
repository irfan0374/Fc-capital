"use client";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui";
import { cameraKinds, type KycStatus } from "@/lib/kyc";
import { KycFlow, kycRequest, type KycSessionRef } from "./flow";
export function CapturePage() {
  const [session, setSession] = useState<KycSessionRef | null>(null);
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const [id, secret] = location.hash.slice(1).split(".");
    if (!id || !secret) {
      setError(
        "This link is incomplete. Scan the QR code on your computer again.",
      );
      return;
    }
    const ref = { id, secret };
    kycRequest("/api/kyc/session/" + id, null, {
      headers: { "x-kyc-secret": secret },
    })
      .then((s) => {
        setSession(ref);
        setStatus(s);
      })
      .catch(() =>
        setError(
          "This verification link has expired. Go back to your computer and refresh the page to get a new code.",
        ),
      );
  }, []);
  const done =
    status && cameraKinds(status.documentType).every((k) => status.captured[k]);
  return (
    <div className="onboarding-page">
      <header className="onboarding-header">
        <Logo />
      </header>
      <main
        className="container"
        style={{ maxWidth: 560, padding: "32px 0 64px" }}
      >
        <p className="eyebrow">IDENTITY VERIFICATION</p>
        <h1 style={{ fontSize: 32, marginBottom: 12 }}>
          {done ? "All done." : "Let's verify your identity."}
        </h1>
        <p style={{ marginBottom: 24 }}>
          {done
            ? "Your photos were sent securely. Go back to your computer to finish your application."
            : status
              ? "Have your " +
                status.documentType +
                " ready. The camera will take each photo automatically."
              : "Loading…"}
        </p>
        {error && (
          <p className="error-note" role="alert">
            {error}
          </p>
        )}
        {session && status && (
          <div className="form-card">
            <KycFlow session={session} status={status} onStatus={setStatus} />
          </div>
        )}
        <p className="quiet-note">
          Your photos are sent over an encrypted connection and are only visible
          to the FC Capital review team.
        </p>
      </main>
    </div>
  );
}
