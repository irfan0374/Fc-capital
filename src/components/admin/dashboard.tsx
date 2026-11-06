"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { logout, updateApplication } from "@/app/admin/actions";
import {
  detailGroups,
  reviewStatuses,
  type ReviewApplication,
  type ReviewStatus,
} from "@/lib/admin-workspace";
import { AdminBrand, StatusBadge, MetricCard, DetailGroup } from "./shared";
const show = (v: unknown) =>
  v === true ? "Yes" : v === false ? "No" : String(v ?? "").trim() || "—";
export function AdminDashboard({
  initial,
  error,
}: {
  initial: ReviewApplication[];
  error: string;
}) {
  const [rows, setRows] = useState(initial);
  const [section, setSection] = useState("Overview");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [account, setAccount] = useState("All");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ReviewStatus | null>(null);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState(error);
  const [mobile, setMobile] = useState(false);
  const [preview, setPreview] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const app = rows.find((r) => r.id === selected);
  const filtered = rows.filter(
    (r) =>
      (status === "All" || r.status === status) &&
      (account === "All" || r.account === account) &&
      [r.name, r.email, r.reference].some((v) =>
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
  async function save(
    target: ReviewApplication,
    change: { status?: ReviewStatus; note?: string },
    next: ReviewApplication,
  ) {
    const before = rows;
    setRows(rows.map((r) => (r.id === target.id ? next : r)));
    if (target.demo) return true;
    try {
      await updateApplication(target.id, change);
      return true;
    } catch {
      setRows(before);
      setNotice("Could not save the change. Please try again.");
      return false;
    }
  }
  async function update() {
    if (!app || !confirm) return;
    const status = confirm;
    setConfirm(null);
    const ok = await save(
      app,
      { status },
      {
        ...app,
        status,
        history: [...app.history, "Administrator changed status to " + status],
      },
    );
    if (ok)
      setNotice(
        app.demo
          ? "Demo record updated on this page only. No email was sent."
          : "Application status saved. No email was sent.",
      );
  }
  function exportRows() {
    const text = [
      "Reference,Name,Email,Phone,Country,Account,Submitted,Status",
      ...filtered.map((r) =>
        [
          r.reference,
          r.name,
          r.email,
          show(r.data.phone),
          r.country,
          r.account,
          r.submitted,
          r.status,
        ]
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
    setNotice("Filtered applications exported.");
  }
  return (
    <div className="desk-workspace">
      <aside className={"desk-sidebar " + (mobile ? "open" : "")}>
        <AdminBrand />
        <p className="desk-nav-label">WORKSPACE</p>
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
        <div className="desk-sidebar-foot">
          <div className="desk-person">
            <span className="desk-avatar">AD</span>
            <div>
              Administrator<small>Application review</small>
            </div>
          </div>
          <form action={logout}>
            <button type="submit">↪ Sign out</button>
          </form>
        </div>
      </aside>
      {mobile && (
        <button
          className="desk-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="desk-main">
        <header className="desk-topbar">
          <div>
            <button
              className="desk-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              ☰
            </button>
            <span className="desk-breadcrumb">
              Workspace <b>/ {section}</b>
            </span>
          </div>
          <div className="desk-top-right">
            <span className="desk-session">
              {rows.filter((r) => !r.demo).length} client ·{" "}
              {rows.filter((r) => r.demo).length} demo records
            </span>
            <span className="desk-avatar">AD</span>
          </div>
        </header>
        <main className="desk-content">
          <div className="desk-page-heading">
            <div>
              <p className="desk-kicker">FC CAPITAL / APPLICATION DESK</p>
              <h1>
                {section === "Overview" ? "A clearer overview." : section}
              </h1>
              <p>
                {section === "Overview"
                  ? "Your application pipeline, all in one place."
                  : section === "Applications"
                    ? "Review, organize, and manage incoming applications."
                    : section === "Documents"
                      ? "Documents attached to applications."
                      : "Your workspace configuration."}
              </p>
            </div>
            {section !== "Settings" && (
              <button className="desk-button" onClick={exportRows}>
                ↓ Export applications
              </button>
            )}
          </div>
          {notice && (
            <div className="desk-toast" role="status">
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
            <section className="desk-panel desk-settings">
              <h2>Workspace settings</h2>
              <dl>
                <dt>Administrator</dt>
                <dd>irfanfinisso@gmail.com</dd>
                <dt>Sign-in</dt>
                <dd>Admin email and password</dd>
                <dt>Client applications</dt>
                <dd>
                  Saved in the database. Status changes and notes are kept.
                </dd>
                <dt>Demo records</dt>
                <dd>4 sample records. Changes reset on reload.</dd>
                <dt>CRM access</dt>
                <dd>Managed separately after review.</dd>
              </dl>
            </section>
          ) : (
            <>
              {section === "Overview" && (
                <div className="desk-metrics">
                  <MetricCard
                    label="Total applications"
                    value={rows.length}
                    symbol="▤"
                    detail="Client and demo applications"
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
              <section className="desk-panel">
                <div className="desk-panel-heading">
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
                  <span className="desk-panel-label">
                    {section === "Documents"
                      ? "FILES"
                      : "APPLICATION MANAGEMENT"}
                  </span>
                </div>
                <div className="desk-filters">
                  <label className="desk-search">
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
                  <div className="desk-empty">
                    <span>⌕</span>
                    <h3>No matching applications</h3>
                    <p>Try another name, reference, or filter.</p>
                    <button
                      className="desk-button"
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
                  <div className="desk-document-grid">
                    {shown.map((r) => (
                      <button
                        key={r.id}
                        className="desk-document"
                        onClick={() => {
                          open(r.id);
                          setPreview("Identity document");
                        }}
                      >
                        <span>▤</span>
                        <strong>{r.name}</strong>
                        <small>
                          {r.reference} ·{" "}
                          {r.demo
                            ? "2 sample documents"
                            : r.documents.length + " documents"}
                        </small>
                        <b>View documents ↗</b>
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="desk-table-wrap">
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
                              <td className="desk-reference">
                                {r.reference}
                                {r.demo && <small>Demo</small>}
                              </td>
                              <td>
                                <strong>{r.name}</strong>
                                <small>{r.email}</small>
                              </td>
                              <td>{r.country}</td>
                              <td>
                                <span className="desk-account">
                                  {r.account}
                                </span>
                              </td>
                              <td>{r.submitted}</td>
                              <td>
                                <StatusBadge status={r.status} />
                              </td>
                              <td>
                                <button
                                  className="desk-view"
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
                    <div className="desk-mobile-list">
                      {shown.map((r) => (
                        <button
                          className="desk-mobile-row"
                          key={r.id}
                          onClick={() => open(r.id)}
                        >
                          <div>
                            <span className="desk-reference">
                              {r.reference}
                              {r.demo && " · Demo"}
                            </span>
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
                <div className="desk-pagination">
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
              <div className="desk-bottom-note">
                <span>◈</span> Review decisions and CRM access are managed
                separately.<Link href="/">Public website ↗</Link>
              </div>
            </>
          )}
        </main>
      </div>
      <dialog
        aria-label="Application details"
        className="desk-drawer"
        ref={dialog}
        onCancel={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {app && (
          <div className="desk-drawer-inner">
            <header>
              <div>
                <p className="desk-kicker">
                  {app.reference} / APPLICATION DETAILS
                </p>
                <h2>{app.name}</h2>
                <StatusBadge status={app.status} />
              </div>
              <button
                className="desk-icon-button"
                aria-label="Close application"
                onClick={close}
              >
                ×
              </button>
            </header>
            <div className="desk-drawer-body">
              <p className="desk-fictional-note">
                {app.demo ? "Demo record" : "Client application"} · Submitted{" "}
                {app.submitted}
              </p>
              {detailGroups.map((g, i) => (
                <DetailGroup
                  key={g.title}
                  title={String(i + 1).padStart(2, "0") + " / " + g.title}
                >
                  <dl>
                    {g.fields.map(([key, label]) => (
                      <div key={key} style={{ display: "contents" }}>
                        <dt>{label}</dt>
                        <dd>{show(app.data[key])}</dd>
                      </div>
                    ))}
                  </dl>
                </DetailGroup>
              ))}
              <DetailGroup title="06 / Documents">
                {!app.demo && !app.documents.length && (
                  <p>No documents uploaded with this application.</p>
                )}
                {!app.demo && app.documents.some((d) => d.image) && (
                  <div className="desk-photo-grid">
                    {app.documents
                      .filter((d) => d.image)
                      .map((d) => (
                        <a
                          key={d.id}
                          href={d.href}
                          target="_blank"
                          rel="noreferrer"
                          className="desk-photo"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={d.href} alt={d.kind} loading="lazy" />
                          <span>{d.kind} ↗</span>
                        </a>
                      ))}
                  </div>
                )}
                {!app.demo && (
                  <div className="desk-doc-buttons">
                    {app.documents
                      .filter((d) => !d.image)
                      .map((d) => (
                        <a
                          className="desk-button"
                          key={d.id}
                          href={d.href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          ▤ {d.kind} ↗
                        </a>
                      ))}
                  </div>
                )}
                {app.demo && (
                  <div className="desk-doc-buttons">
                    {["Identity document", "Proof of address"].map((t) => (
                      <button
                        className="desk-button"
                        key={t}
                        onClick={() => setPreview(preview === t ? "" : t)}
                      >
                        ▤ {t} ↗
                      </button>
                    ))}
                  </div>
                )}
                {app.demo && preview && (
                  <div className="desk-file-preview">
                    <p>SAMPLE / NOT A VALID DOCUMENT</p>
                    <h3>{preview}</h3>
                    <strong>{app.name}</strong>
                    <small>{app.id} · Fictional placeholder</small>
                    <button
                      className="desk-view"
                      onClick={() => setPreview("")}
                    >
                      Close preview
                    </button>
                  </div>
                )}
              </DetailGroup>
              <DetailGroup title="07 / Internal notes">
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
                  className="desk-button"
                  disabled={!note.trim()}
                  onClick={async () => {
                    const text = note.trim();
                    setNote("");
                    await save(
                      app,
                      { note: text },
                      { ...app, notes: [...app.notes, text] },
                    );
                  }}
                >
                  Save note
                </button>
                {app.notes.map((n, i) => (
                  <p className="desk-saved-note" key={i}>
                    <b>Administrator</b>
                    {n}
                  </p>
                ))}
              </DetailGroup>
              <DetailGroup title="08 / Review history">
                <ol className="desk-history">
                  {app.history.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ol>
              </DetailGroup>
            </div>
            <footer>
              {confirm ? (
                <div className="desk-confirm">
                  <h3>Confirm {confirm.toLowerCase()}?</h3>
                  <p>
                    {app.demo
                      ? "This updates the demo record on this page only."
                      : "This saves the new status."}{" "}
                    No email or CRM account will be created.
                  </p>
                  <button
                    className="desk-button"
                    onClick={() => setConfirm(null)}
                  >
                    Cancel
                  </button>
                  <button className="desk-button primary" onClick={update}>
                    Confirm status change
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className="desk-button danger"
                    onClick={() => setConfirm("Rejected")}
                  >
                    Reject
                  </button>
                  <button
                    className="desk-button"
                    onClick={() => setConfirm("Needs information")}
                  >
                    Request information
                  </button>
                  <button
                    className="desk-button primary"
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
