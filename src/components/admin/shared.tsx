import type { ReactNode } from "react";
export function AdminBrand() {
  return (
    <a className="ad-brand" href="/">
      <span className="ad-mark">FC</span>
      <span>
        FC CAPITAL<small>APPLICATION DESK</small>
      </span>
    </a>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={
        "ad-status " +
        ({
          "Pending review": "pending",
          "Needs information": "information",
          Approved: "approved",
          Rejected: "rejected",
        }[status] || "")
      }
    >
      <i />
      {status}
    </span>
  );
}
export function MetricCard({
  label,
  value,
  symbol,
  detail,
}: {
  label: string;
  value: number;
  symbol: string;
  detail: string;
}) {
  return (
    <article className="ad-metric">
      <div>
        <span>{label}</span>
        <b aria-hidden="true">{symbol}</b>
      </div>
      <strong>{String(value).padStart(2, "0")}</strong>
      <small>{detail}</small>
    </article>
  );
}
export function DetailGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="ad-detail-group">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
