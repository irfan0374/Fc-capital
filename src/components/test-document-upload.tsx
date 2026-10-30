"use client";
import { useState } from "react";
import { upload } from "@vercel/blob/client";
export function TestDocumentUpload({
  onUploaded,
}: {
  onUploaded?: (id: string, kind: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [kind, setKind] = useState("identity");
  return (
    <section className="panel">
      <h3>Private test-document upload</h3>
      <p>
        Admin sign-in is required. Use fictional files only. PDF, JPG or PNG,
        maximum 5 MB. Files are available only to the admin. Files uploaded here
        during onboarding are linked when you submit.
      </p>
      <a href="/admin/review" target="_blank" rel="noreferrer" className="text-button">
        Open admin sign-in ↗
      </a>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        This file contains fictional test information only.
      </label>
      <div className="field">
        <label htmlFor="test-kind">Document category</label>
        <select
          id="test-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="identity">Passport / ID front</option>
          <option value="identityBack">ID back</option>
          <option value="addressProof">Proof of address</option>
        </select>
        <label htmlFor="test-file">Choose test document</label>
        <input
          id="test-file"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          disabled={!consent || busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const ext = (
              {
                "application/pdf": "pdf",
                "image/jpeg": "jpg",
                "image/png": "png",
              } as Record<string, string>
            )[file.type];
            if (!ext || file.size > 5 * 1024 * 1024) {
              setMessage("Use PDF/JPG/PNG up to 5 MB.");
              return;
            }
            setBusy(true);
            setMessage("Uploading privately…");
            try {
              const pathname =
                "test-documents/" +
                crypto.randomUUID() +
                "/" +
                kind +
                "." +
                ext;
              await upload(pathname, file, {
                access: "private",
                handleUploadUrl: "/api/documents/upload",
              });
              const response = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pathname, fictionalOnly: true }),
              });
              if (!response.ok) throw new Error();
              const result = await response.json();
              onUploaded?.(result.id, result.kind);
              setMessage(
                "Test file stored privately and available in the admin library.",
              );
            } catch {
              setMessage(
                "Upload could not be confirmed. Check admin sign-in and storage configuration.",
              );
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
