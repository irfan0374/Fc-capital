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
          <p>Loading demo receipt…</p>
        ) : !receipt ? (
          <>
            <h1>No demo application yet.</h1>
            <p>Complete the sample onboarding to see a receipt.</p>
            <Link href="/register" className="button primary">
              Start the demo →
            </Link>
          </>
        ) : (
          <>
            <div className="receipt-check">✓</div>
            <p className="eyebrow">YOUR DEMO JOURNEY IS COMPLETE</p>
            <h1>
              Thank you, {receipt.firstName}.<br />
              <span>Your next chapter awaits.</span>
            </h1>
            <p className="lede">Demo application received.</p>
            <p>
              A fixed fictional application was saved in MongoDB.
              <br />
              No real client details were submitted. Any private test uploads
              are linked to this record.
            </p>
            <p role="status">
              {receipt.emailStatus === "accepted"
                ? "Resend accepted the test admin notification. Inbox delivery is not yet confirmed."
                : "Test application saved. Admin email status: " +
                  (receipt.emailStatus || "unconfirmed") +
                  ". No applicant email was sent."}
            </p>
            <div className="reference">
              <span>DEMO REFERENCE</span>
              <strong>{receipt.reference}</strong>
              <small>{receipt.account} account preference</small>
            </div>
            <div className="panel receipt-next">
              <h2>What would happen next?</h2>
              <ol>
                <li>
                  <span>01</span>
                  <div>
                    <h3>Application review</h3>
                    <p>
                      Your team would review the submitted information and
                      request any missing details.
                    </p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <h3>An update by email</h3>
                    <p>
                      The applicant would receive an update about the
                      application.
                    </p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <h3>Separate CRM access</h3>
                    <p>
                      After approval, your team would provide CRM login
                      instructions separately.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
            <details className="notification-preview panel">
              <summary>Notification details</summary>
              <p className="eyebrow">TEST APPLICATION</p>
              <div>
                <strong>Admin test notification</strong>
                <p>To: irfanfinisso@gmail.com</p>
                <p>Subject: New application · {receipt.reference}</p>
                <p>
                  A completed application would be available through a secure,
                  authenticated review link. The test record is stored; admin
                  review requires the approved Google account; Google
                  credentials must be configured to enable it.
                </p>
              </div>
              <div>
                <strong>Applicant confirmation (not sent)</strong>
                <p>To: {receipt.email}</p>
                <p>Subject: We have received your application</p>
                <p>
                  Thank you for applying. Our team will review your details and
                  contact you about the next steps.
                </p>
              </div>
            </details>
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
              Start another demo →
            </button>
          </>
        )}
      </main>
    </>
  );
}
