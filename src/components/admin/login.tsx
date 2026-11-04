"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { login, loginWithGoogle } from "@/app/admin/actions";
import { AdminBrand } from "./shared";
export function AdminLogin({ google }: { google: boolean }) {
  const [visible, setVisible] = useState(false);
  const [error, action, pending] = useActionState(login, "");
  return (
    <main className="desk-login">
      <header>
        <Link href="/">← Return to website</Link>
        <span>INTERNAL APPLICATION DESK</span>
      </header>
      <div className="desk-login-grid">
        <section className="desk-login-card">
          <AdminBrand />
          <div className="desk-login-heading">
            <p className="desk-kicker">YOUR WORKSPACE, CONNECTED</p>
            <h1>
              Welcome back<span>.</span>
            </h1>
            <p>Sign in to manage client applications.</p>
          </div>
          <form action={action}>
            <label htmlFor="admin-email">Admin email</label>
            <input
              id="admin-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="Enter your admin email"
              aria-describedby={error ? "login-error" : undefined}
            />
            <label htmlFor="admin-password">Password</label>
            <div className="desk-password">
              <input
                id="admin-password"
                name="password"
                required
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
              />
              <button
                type="button"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? "Hide" : "Show"}
              </button>
            </div>
            {error && (
              <p id="login-error" className="desk-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="desk-button primary desk-wide"
              type="submit"
              disabled={pending}
            >
              {pending ? "Signing in…" : "Sign in"} <span>↗</span>
            </button>
          </form>
          {google && (
            <form action={loginWithGoogle}>
              <button className="desk-button desk-wide" type="submit">
                Sign in with Google
              </button>
            </form>
          )}
          <div className="desk-access-note">
            <span aria-hidden="true">◈</span>
            <p>
              Authorized administrator access.
              <br />
              Your workspace for application review.
            </p>
          </div>
        </section>
        <section
          className="desk-login-art"
          aria-label="FC Capital application review illustration"
        >
          <div className="desk-art-top">
            <span className="desk-kicker">ONE CLEAR PERSPECTIVE</span>
            <span>FC / 01</span>
          </div>
          <svg viewBox="0 0 400 400" fill="none" aria-hidden="true">
            <circle cx="200" cy="200" r="172" />
            <circle cx="200" cy="200" r="130" strokeDasharray="4 8" />
            <circle cx="200" cy="200" r="90" />
            <path d="M200 48 316 98v100c0 77-64 139-116 162-52-23-116-85-116-162V98Z" />
            <path d="M200 77 290 116v80c0 59-47 110-90 132-43-22-90-73-90-132v-80Z" />
            <path
              className="desk-key"
              d="M185 192a26 26 0 1 1 30 0v54l-15 14-15-14Z"
            />
            <path d="M200 15v370M15 200h370" />
            <circle className="desk-node" cx="200" cy="48" r="5" />
            <circle className="desk-node" cx="316" cy="98" r="5" />
            <circle className="desk-node" cx="84" cy="198" r="5" />
            <circle className="desk-node" cx="200" cy="360" r="5" />
          </svg>
          <div className="desk-art-copy">
            <h2>Clarity in every decision.</h2>
            <p>
              Everything you need to review applications,
              <br />
              organize documents, and take the next step.
            </p>
          </div>
          <footer>
            <span>01 / REVIEW</span>
            <span>02 / ORGANIZE</span>
            <span>03 / CONNECT</span>
          </footer>
        </section>
      </div>
      <footer className="desk-login-footer">
        © {new Date().getFullYear()} FC Capital{" "}
        <span>A clearer perspective.</span>
      </footer>
    </main>
  );
}
