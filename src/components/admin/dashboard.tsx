"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  applications,
  reviewStatuses,
  type ReviewApplication,
  type ReviewStatus,
} from "@/lib/admin-workspace";
import { AdminBrand, StatusBadge, MetricCard, DetailGroup } from "./shared";
export function AdminDashboard() {
  const [rows, setRows] = useState(applications);
  const [section, setSection] = useState("Overview");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [account, setAccount] = useState("All");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ReviewStatus | null>(null);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [mobile, setMobile] = useState(false);
  const [preview, setPreview] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const app = rows.find((r) => r.id === selected);
  const filtered = rows.filter(
    (r) =>
      (status === "All" || r.status === status) &&
      (account === "All" || r.account === account) &&
      [r.name, r.email, r.id].some((v) =>
        v.toLowerCase().includes(search.toLowerCase()),
      ),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * 5, current * 5);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  function close() {
    setSelected(null);
    setConfirm(null);
    setPreview("");
    setNote("");
  }
  function open(id: string) {
    setSelected(id);
    setConfirm(null);
    setPreview("");
    setNote("");
  }
  function update() {
    if (!app || !confirm) return;
    setRows(
      rows.map((r) =>
        r.id === app.id
          ? {
              ...r,
              status: confirm,
              history: [
                ...r.history,
                "Administrator changed status to " + confirm,
              ],
            }
          : r,
      ),
    );
    setNotice("Presentation record updated. No email was sent.");
    setConfirm(null);
  }
  function exportRows() {
    const text = [
      "Reference,Name,Email,Country,Account,Status",
      ...filtered.map((r) =>
        [r.id, r.name, r.email, r.country, r.account, r.status]
          .map((v) => '"' + v.replaceAll('"', '""') + '"')
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "fc-capital-applications.csv";
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Filtered presentation records exported.");
  }
  return (
    <div className="ad-workspace">
      <aside className={"ad-sidebar " + (mobile ? "open" : "")}>
        <AdminBrand />
        <p className="ad-nav-label">WORKSPACE</p>
        <nav aria-label="Administration">
          {[
            ["Overview", "◫"],
            ["Applications", "▤"],
            ["Documents", "▱"],
            ["Settings", "⚙"],
          ].map(([label, icon]) => (
            <button
              key={label}
              className={section === label ? "active" : ""}
              aria-current={section === label ? "page" : undefined}
              onClick={() => {
                setSection(label);
                setMobile(false);
                setNotice("");
              }}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
              {label === "Applications" && <small>{rows.length}</small>}
            </button>
          ))}
        </nav>
        <div className="ad-sidebar-foot">
          <div className="ad-person">
            <span className="ad-avatar">AD</span>
            <div>
              Administrator<small>Application review</small>
            </div>
          </div>
          <Link href="/admin/login">↪ Sign out</Link>
        </div>
      </aside>
      {mobile && (
        <button
          className="ad-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="ad-main">
        <header className="ad-topbar">
          <div>
            <button
              className="ad-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              ☰
            </button>
            <span className="ad-breadcrumb">
              Workspace <b>/ {section}</b>
            </span>
          </div>
          <div className="ad-top-right">
            <span className="ad-session">Fictional presentation data</span>
            <span className="ad-avatar">AD</span>
          </div>
        </header>
        <main className="ad-content">
          <div className="ad-page-heading">
            <div>
              <p className="ad-kicker">FC CAPITAL / APPLICATION DESK</p>
              <h1>
                {section === "Overview" ? "A clearer overview." : section}
              </h1>
              <p>
                {section === "Overview"
                  ? "Your application pipeline, all in one place."
                  : section === "Applications"
                    ? "Review, organize, and manage incoming applications."
                    : section === "Documents"
                      ? "Sample documents associated with presentation applications."
                      : "Your workspace configuration."}
              </p>
            </div>
            {section !== "Settings" && (
              <button className="ad-button" onClick={exportRows}>
                ↓ Export applications
              </button>
            )}
          </div>
          {notice && (
            <div className="ad-toast" role="status">
              ✓ {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}
          {section === "Settings" ? (
            <section className="ad-panel ad-settings">
              <h2>Workspace settings</h2>
              <dl>
                <dt>Administrator</dt>
                <dd>irfanfinisso@gmail.com</dd>
                <dt>Credential sign-in</dt>
                <dd>Awaiting administrator setup</dd>
                <dt>Presentation records</dt>
                <dd>Changes are held in this page and reset on reload.</dd>
                <dt>CRM access</dt>
                <dd>Managed separately after review.</dd>
              </dl>
              <Link className="ad-button" href="/admin/login">
                View login screen →
              </Link>
              <Link className="ad-button" href="/admin/review">
                Protected application review →
              </Link>
            </section>
          ) : (
            <>
              {section === "Overview" && (
                <div className="ad-metrics">
                  <MetricCard
                    label="Total applications"
                    value={rows.length}
                    symbol="▤"
                    detail="All presentation applications"
                  />
                  {(
                    ["Pending review", "Needs information", "Approved"] as const
                  ).map((label, i) => (
                    <MetricCard
                      key={label}
                      label={label}
                      value={rows.filter((r) => r.status === label).length}
                      symbol={["◷", "↗", "✓"][i]}
                      detail={
                        [
                          "Ready for your review",
                          "Awaiting additional details",
                          "Review completed",
                        ][i]
                      }
                    />
                  ))}
                </div>
              )}
              <section className="ad-panel">
                <div className="ad-panel-heading">
                  <div>
                    <h2>
                      {section === "Documents"
                        ? "Document library"
                        : section === "Overview"
                          ? "Recent applications"
                          : "Application queue"}
                    </h2>
                    <p>
                      {filtered.length}{" "}
                      {filtered.length === 1 ? "application" : "applications"}{" "}
                      in this view
                    </p>
                  </div>
                  <span className="ad-panel-label">
                    {section === "Documents"
                      ? "SAMPLE FILES"
                      : "APPLICATION MANAGEMENT"}
                  </span>
                </div>
                <div className="ad-filters">
                  <label className="ad-search">
                    <span aria-hidden="true">⌕</span>
                    <input
                      aria-label="Search applications"
                      placeholder="Search name, email or reference…"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                  <select
                    aria-label="Filter status"
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="All">All statuses</option>
                    {reviewStatuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter account"
                    value={account}
                    onChange={(e) => {
                      setAccount(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="All">All accounts</option>
                    <option>Standard</option>
                    <option>Raw</option>
                  </select>
                </div>
                {!filtered.length ? (
                  <div className="ad-empty">
                    <span>⌕</span>
                    <h3>No matching applications</h3>
                    <p>Try another name, reference, or filter.</p>
                    <button
                      className="ad-button"
                      onClick={() => {
                        setSearch("");
                        setStatus("All");
                        setAccount("All");
                        setPage(1);
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                ) : section === "Documents" ? (
                  <div className="ad-document-grid">
                    {shown.map((r) => (
                      <button
                        key={r.id}
                        className="ad-document"
                        onClick={() => {
                          open(r.id);
                          setPreview("Identity document");
                        }}
                      >
                        <span>▤</span>
                        <strong>{r.name}</strong>
                        <small>{r.id} · 2 sample documents</small>
                        <b>View documents ↗</b>
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="ad-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            {[
                              "Reference",
                              "Applicant",
                              "Country",
                              "Account",
                              "Submitted",
                              "Status",
                              "",
                            ].map((h, i) => (
                              <th key={i} scope="col">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {shown.map((r) => (
                            <tr key={r.id}>
                              <td className="ad-reference">{r.id}</td>
                              <td>
                                <strong>{r.name}</strong>
                                <small>{r.email}</small>
                              </td>
                              <td>{r.country}</td>
                              <td>
                                <span className="ad-account">{r.account}</span>
                              </td>
                              <td>{r.submitted}</td>
                              <td>
                                <StatusBadge status={r.status} />
                              </td>
                              <td>
                                <button
                                  className="ad-view"
                                  aria-label={"View application for " + r.name}
                                  onClick={() => open(r.id)}
                                >
                                  View ↗
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="ad-mobile-list">
                      {shown.map((r) => (
                        <button
                          className="ad-mobile-row"
                          key={r.id}
                          onClick={() => open(r.id)}
                        >
                          <div>
                            <span className="ad-reference">{r.id}</span>
                            <StatusBadge status={r.status} />
                          </div>
                          <strong>{r.name}</strong>
                          <small>{r.email}</small>
                          <div>
                            <span>
                              {r.account} · {r.country}
                            </span>
                            <b>View ↗</b>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div className="ad-pagination">
                  <span>
                    Showing {filtered.length ? (current - 1) * 5 + 1 : 0}–
                    {Math.min(current * 5, filtered.length)} of{" "}
                    {filtered.length}
                  </span>
                  <div>
                    <button
                      aria-label="Previous page"
                      disabled={current === 1}
                      onClick={() => setPage(current - 1)}
                    >
                      ←
                    </button>
                    <span>
                      {current} / {pages}
                    </span>
                    <button
                      aria-label="Next page"
                      disabled={current === pages}
                      onClick={() => setPage(current + 1)}
                    >
                      →
                    </button>
                  </div>
                </div>
              </section>
              <div className="ad-bottom-note">
                <span>◈</span> Review decisions and CRM access are managed
                separately.<Link href="/">Public website ↗</Link>
              </div>
            </>
          )}
        </main>
      </div>
      <dialog
        aria-label="Application details"
        className="ad-drawer"
        ref={dialog}
        onCancel={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {app && (
          <div className="ad-drawer-inner">
            <header>
              <div>
                <p className="ad-kicker">{app.id} / APPLICATION DETAILS</p>
                <h2>{app.name}</h2>
                <StatusBadge status={app.status} />
              </div>
              <button
                className="ad-icon-button"
                aria-label="Close application"
                onClick={close}
              >
                ×
              </button>
            </header>
            <div className="ad-drawer-body">
              <p className="ad-fictional-note">
                Fictional presentation record · Submitted {app.submitted}
              </p>
              <DetailGroup title="01 / Contact & personal information">
                <dl>
                  <dt>Email</dt>
                  <dd>{app.email}</dd>
                  <dt>Country of residence</dt>
                  <dd>{app.country}</dd>
                  <dt>Date of birth</dt>
                  <dd>15 June 1990</dd>
                  <dt>Tax residency</dt>
                  <dd>{app.country}</dd>
                </dl>
              </DetailGroup>
              <DetailGroup title="02 / Financial profile & experience">
                <dl>
                  <dt>Employment</dt>
                  <dd>Employed</dd>
                  <dt>Annual income</dt>
                  <dd>$25,000–$75,000</dd>
                  <dt>Source of funds</dt>
                  <dd>Employment income</dd>
                  <dt>Trading experience</dt>
                  <dd>1–3 years</dd>
                </dl>
              </DetailGroup>
              <DetailGroup title="03 / Account preferences">
                <dl>
                  <dt>Account</dt>
                  <dd>{app.account}</dd>
                  <dt>Platform</dt>
                  <dd>MetaTrader 5</dd>
                  <dt>Base currency</dt>
                  <dd>USD</dd>
                </dl>
              </DetailGroup>
              <DetailGroup title="04 / Documents">
                <div className="ad-doc-buttons">
                  {["Identity document", "Proof of address"].map((t) => (
                    <button
                      className="ad-button"
                      key={t}
                      onClick={() => setPreview(preview === t ? "" : t)}
                    >
                      ▤ {t} ↗
                    </button>
                  ))}
                </div>
                {preview && (
                  <div className="ad-file-preview">
                    <p>SAMPLE / NOT A VALID DOCUMENT</p>
                    <h3>{preview}</h3>
                    <strong>{app.name}</strong>
                    <small>{app.id} · Fictional placeholder</small>
                    <button className="ad-view" onClick={() => setPreview("")}>
                      Close preview
                    </button>
                  </div>
                )}
              </DetailGroup>
              <DetailGroup title="05 / Internal notes">
                <label htmlFor="review-note">Add a review note</label>
                <textarea
                  id="review-note"
                  rows={3}
                  placeholder="Write a note for the review team…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                />
                <button
                  className="ad-button"
                  disabled={!note.trim()}
                  onClick={() => {
                    setRows(
                      rows.map((r) =>
                        r.id === app.id
                          ? { ...r, notes: [...r.notes, note.trim()] }
                          : r,
                      ),
                    );
                    setNote("");
                  }}
                >
                  Save note
                </button>
                {app.notes.map((n, i) => (
                  <p className="ad-saved-note" key={i}>
                    <b>Administrator</b>
                    {n}
                  </p>
                ))}
              </DetailGroup>
              <DetailGroup title="06 / Review history">
                <ol className="ad-history">
                  {app.history.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ol>
              </DetailGroup>
            </div>
            <footer>
              {confirm ? (
                <div className="ad-confirm">
                  <h3>Confirm {confirm.toLowerCase()}?</h3>
                  <p>
                    This updates the fictional record. No email or CRM account
                    will be created.
                  </p>
                  <button
                    className="ad-button"
                    onClick={() => setConfirm(null)}
                  >
                    Cancel
                  </button>
                  <button className="ad-button primary" onClick={update}>
                    Confirm status change
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className="ad-button danger"
                    onClick={() => setConfirm("Rejected")}
                  >
                    Reject
                  </button>
                  <button
                    className="ad-button"
                    onClick={() => setConfirm("Needs information")}
                  >
                    Request information
                  </button>
                  <button
                    className="ad-button primary"
                    onClick={() => setConfirm("Approved")}
                  >
                    Approve application
                  </button>
                </>
              )}
            </footer>
          </div>
        )}
      </dialog>
    </div>
  );
}
