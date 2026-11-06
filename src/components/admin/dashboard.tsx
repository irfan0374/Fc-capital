"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { logout, reviewDocument, updateApplication } from "@/app/admin/actions";
import {
  detailGroups,
  reviewStatuses,
  type DocReview,
  type ReviewApplication,
  type ReviewStatus,
} from "@/lib/admin-workspace";
import { AdminBrand, StatusBadge, MetricCard, DetailGroup } from "./shared";
import type { KycKind } from "@/lib/kyc";
type Doc = ReviewApplication["documents"][number];
const digits = (v: string) => v.replace(/\D/g, "");
function matches(r: ReviewApplication, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const phone = String(r.data.phone || "");
  return (
    [
      r.name,
      r.email,
      r.reference,
      phone,
      String(r.data.documentType || ""),
    ].some((v) => v.toLowerCase().includes(q)) ||
    (digits(q).length >= 3 && digits(phone).includes(digits(q)))
  );
}
function Lightbox({
  doc,
  name,
  page,
  onClose,
}: {
  doc: Doc;
  name: string;
  page?: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={"desk-lightbox" + (page ? " page" : "")}
      role="dialog"
      aria-label={doc.kind}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <div className="desk-lightbox-title">
          <strong>{doc.kind}</strong>
          <small>{name}</small>
        </div>
        <div>
          {doc.href && (
            <a href={doc.href} target="_blank" rel="noreferrer">
              Open full size ↗
            </a>
          )}
          <button className="desk-button" onClick={onClose} autoFocus>
            ✕ Close
          </button>
        </div>
      </header>
      {doc.href ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={doc.href} alt={doc.kind} onClick={onClose} />
      ) : (
        <div className="desk-file-preview">
          <p>SAMPLE / NOT A VALID DOCUMENT</p>
          <h3>{doc.kind}</h3>
          <strong>{name}</strong>
        </div>
      )}
    </div>
  );
}
const docProgress = (a: ReviewApplication) => {
  const docs = a.documents.filter((d) => d.reviewable);
  return {
    total: docs.length,
    approved: docs.filter((d) => a.reviews[d.id]?.status === "Approved").length,
  };
};
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
  const [docEdit, setDocEdit] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [lightbox, setLightbox] = useState<Doc | null>(null);
  const [pageView, setPageView] = useState<{ doc: Doc; name: string } | null>(
    null,
  );
  const [changing, setChanging] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const app = rows.find((r) => r.id === selected);
  const filtered = rows.filter(
    (r) =>
      (status === "All" || r.status === status) &&
      (account === "All" || r.account === account) &&
      (section !== "Documents" || r.documents.length > 0) &&
      matches(r, search),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * 5, current * 5);
  useEffect(() => {
    if (!pageView) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPageView(null);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [pageView]);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  function resetDrawer() {
    setConfirm(null);
    setNote("");
    setDocEdit(null);
    setRejecting(null);
    setReason("");
    setLightbox(null);
    setChanging(false);
  }
  function close() {
    setSelected(null);
    resetDrawer();
  }
  function open(id: string) {
    setSelected(id);
    resetDrawer();
  }
  async function decide(
    target: ReviewApplication,
    doc: Doc,
    review: DocReview,
  ) {
    const before = rows;
    const label =
      doc.kind +
      " " +
      review.status.toLowerCase() +
      (review.reason ? ": " + review.reason : "");
    setRows(
      rows.map((r) =>
        r.id === target.id
          ? {
              ...r,
              reviews: { ...r.reviews, [doc.id]: review },
              history: [...r.history, label],
            }
          : r,
      ),
    );
    setDocEdit(null);
    setRejecting(null);
    setReason("");
    if (target.demo) return;
    try {
      await reviewDocument(target.id, doc.id as KycKind, review);
    } catch {
      setRows(before);
      setNotice("Could not save the document review. Please try again.");
    }
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
    setChanging(false);
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
                      placeholder="Search name, email, phone or reference…"
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
                  <div className="desk-doc-library">
                    {shown.map((r) => (
                      <section key={r.id} className="desk-doc-person">
                        <header>
                          <div>
                            <strong>
                              {r.name}
                              {r.demo && (
                                <small className="desk-tag">Demo</small>
                              )}
                            </strong>
                            <span className="desk-contact">
                              <span>✉ {r.email || "—"}</span>
                              <span>☏ {show(r.data.phone)}</span>
                              <span className="desk-reference">
                                {r.reference}
                              </span>
                            </span>
                          </div>
                          <div className="desk-doc-person-side">
                            {docProgress(r).total > 0 && (
                              <small>
                                {docProgress(r).approved}/{docProgress(r).total}{" "}
                                approved
                              </small>
                            )}
                            <button
                              className="desk-view"
                              onClick={() => open(r.id)}
                            >
                              Review ↗
                            </button>
                          </div>
                        </header>
                        <div className="desk-doc-strip">
                          {r.documents.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              className="desk-doc-tile"
                              onClick={() =>
                                d.image
                                  ? setPageView({ doc: d, name: r.name })
                                  : window.open(d.href, "_blank")
                              }
                            >
                              <span className="desk-doc-thumb">
                                {d.image && d.href ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={d.href}
                                    alt={d.kind}
                                    loading="lazy"
                                  />
                                ) : (
                                  <span>{d.image ? "SAMPLE" : "PDF"}</span>
                                )}
                              </span>
                              <span className="desk-doc-meta">
                                <strong>{d.kind}</strong>
                                {d.reviewable && (
                                  <StatusBadge
                                    status={
                                      r.reviews[d.id]?.status || "Pending"
                                    }
                                  />
                                )}
                              </span>
                            </button>
                          ))}
                        </div>
                      </section>
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
                                <span className="desk-contact">
                                  <span>✉ {r.email || "—"}</span>
                                  <span>☏ {show(r.data.phone)}</span>
                                </span>
                              </td>
                              <td>
                                {r.country}
                                <small>{show(r.data.documentType)}</small>
                              </td>
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
                          <small>✉ {r.email || "—"}</small>
                          <small>☏ {show(r.data.phone)}</small>
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
        onCancel={(e) => {
          if (lightbox) {
            e.preventDefault();
            setLightbox(null);
          } else close();
        }}
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
                <span className="desk-contact">
                  <span>✉ {app.email || "—"}</span>
                  <span>☏ {show(app.data.phone)}</span>
                </span>
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
                {!app.documents.length && (
                  <p>No documents uploaded with this application.</p>
                )}
                {docProgress(app).total > 0 && (
                  <p className="desk-doc-progress">
                    {docProgress(app).approved} of {docProgress(app).total}{" "}
                    documents approved
                  </p>
                )}
                <div className="desk-doc-grid">
                  {app.documents.map((d) => {
                    const review = app.reviews[d.id];
                    const editing =
                      d.reviewable && (!review || docEdit === d.id);
                    return (
                      <article className="desk-doc-card" key={d.id}>
                        <button
                          type="button"
                          className="desk-doc-thumb"
                          aria-label={"View " + d.kind}
                          onClick={() =>
                            d.image
                              ? setLightbox(d)
                              : window.open(d.href, "_blank")
                          }
                        >
                          {d.image && d.href ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={d.href} alt={d.kind} />
                          ) : (
                            <span>{d.image ? "SAMPLE" : "PDF"}</span>
                          )}
                        </button>
                        <div className="desk-doc-meta">
                          <strong>{d.kind}</strong>
                          {d.reviewable && (
                            <StatusBadge status={review?.status || "Pending"} />
                          )}
                        </div>
                        {review?.reason && (
                          <p className="desk-doc-reason">{review.reason}</p>
                        )}
                        {editing ? (
                          rejecting === d.id ? (
                            <div className="desk-doc-reject">
                              <label htmlFor={"reason-" + d.id}>
                                Reason for rejecting
                              </label>
                              <input
                                id={"reason-" + d.id}
                                value={reason}
                                maxLength={300}
                                placeholder="e.g. Blurry, expired, details not readable"
                                onChange={(e) => setReason(e.target.value)}
                                autoFocus
                              />
                              <div className="desk-doc-actions">
                                <button
                                  className="desk-button"
                                  onClick={() => {
                                    setRejecting(null);
                                    setReason("");
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  className="desk-button danger"
                                  disabled={!reason.trim()}
                                  onClick={() =>
                                    decide(app, d, {
                                      status: "Rejected",
                                      reason: reason.trim(),
                                    })
                                  }
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="desk-doc-actions">
                              <button
                                className="desk-button danger"
                                onClick={() => {
                                  setRejecting(d.id);
                                  setReason("");
                                }}
                              >
                                Reject
                              </button>
                              <button
                                className="desk-button primary"
                                onClick={() =>
                                  decide(app, d, { status: "Approved" })
                                }
                              >
                                Approve
                              </button>
                              {review && (
                                <button
                                  className="desk-link"
                                  onClick={() => setDocEdit(null)}
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          )
                        ) : (
                          d.reviewable && (
                            <button
                              className="desk-link"
                              onClick={() => {
                                setDocEdit(d.id);
                                setRejecting(null);
                              }}
                            >
                              ✎ Edit decision
                            </button>
                          )
                        )}
                      </article>
                    );
                  })}
                </div>
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
              ) : (app.status === "Approved" || app.status === "Rejected") &&
                !changing ? (
                <div className="desk-final">
                  <span>
                    Application <StatusBadge status={app.status} />
                  </span>
                  <button
                    className="desk-link"
                    onClick={() => setChanging(true)}
                  >
                    ✎ Change status
                  </button>
                </div>
              ) : (
                <>
                  {docProgress(app).approved < docProgress(app).total && (
                    <p className="desk-lock">
                      Approve all documents to enable approval (
                      {docProgress(app).approved}/{docProgress(app).total})
                    </p>
                  )}
                  {changing && (
                    <button
                      className="desk-link"
                      onClick={() => setChanging(false)}
                    >
                      Cancel
                    </button>
                  )}
                  {app.status !== "Rejected" && (
                    <button
                      className="desk-button danger"
                      onClick={() => setConfirm("Rejected")}
                    >
                      Reject
                    </button>
                  )}
                  {app.status !== "Needs information" && (
                    <button
                      className="desk-button"
                      onClick={() => setConfirm("Needs information")}
                    >
                      Request information
                    </button>
                  )}
                  {app.status !== "Approved" && (
                    <button
                      className="desk-button primary"
                      disabled={
                        docProgress(app).approved < docProgress(app).total
                      }
                      onClick={() => setConfirm("Approved")}
                    >
                      Approve application
                    </button>
                  )}
                </>
              )}
            </footer>
            {lightbox && (
              <Lightbox
                doc={lightbox}
                name={app.name}
                onClose={() => setLightbox(null)}
              />
            )}
          </div>
        )}
      </dialog>
      {pageView && !selected && (
        <Lightbox
          doc={pageView.doc}
          name={pageView.name}
          page
          onClose={() => setPageView(null)}
        />
      )}
    </div>
  );
}
