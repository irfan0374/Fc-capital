"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo, DemoNotice } from "@/components/ui";
type Receipt = {
  reference: string;
  firstName: string;
  email: string;
  account: string;
  created: string;
  emailStatus?: string;
};
export default function Page() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const r = JSON.parse(
        sessionStorage.getItem("fc-capital-receipt") || "null",
      );
      if (
        r &&
        typeof r.reference === "string" &&
        typeof r.firstName === "string" &&
        typeof r.email === "string" &&
        typeof r.account === "string"
      )
        setReceipt(r);
    } catch {}
    setReady(true);
  }, []);
  return (
    <>
      <DemoNotice />
      <header className="onboarding-header">
        <Logo />
        <Link className="text-button" href="/">
          Back to website ↗
        </Link>
      </header>
      <main className="receipt container">
        {!ready ? (
          <p>Loading your receipt…</p>
        ) : !receipt ? (
          <>
            <h1>No application yet.</h1>
            <p>Complete the application to see a receipt.</p>
            <Link href="/register" className="button primary">
              Open an account →
            </Link>
          </>
        ) : (
          <>
            <div className="receipt-check">✓</div>
            <p className="eyebrow">YOUR APPLICATION IS COMPLETE</p>
            <h1>
              Thank you, {receipt.firstName}.<br />
              <span>Your next chapter awaits.</span>
            </h1>
            <p className="lede">Application received.</p>
            <div className="reference">
              <span>APPLICATION REFERENCE</span>
              <strong>{receipt.reference}</strong>
              <small>{receipt.account} account preference</small>
            </div>
            <div className="panel receipt-next">
              <h2>What happens next?</h2>
              <ol>
                <li>
                  <span>01</span>
                  <div>
                    <h3>Application review</h3>
                    <p>
                      Our team will review your information and request any
                      missing details.
                    </p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <h3>An update by email</h3>
                    <p>
                      You will receive an update about your application by
                      email.
                    </p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <h3>Separate CRM access</h3>
                    <p>
                      After approval, we will send your client area login
                      instructions separately.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
            <Link className="button primary" href="/">
              Return to homepage ↗
            </Link>
            <button
              className="button secondary"
              onClick={() => {
                sessionStorage.removeItem("fc-capital-receipt");
                sessionStorage.removeItem("fc-capital-demo-v1");
                location.href = "/register";
              }}
            >
              Start another application →
            </button>
          </>
        )}
      </main>
    </>
  );
}
