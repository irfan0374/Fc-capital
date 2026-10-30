import Link from "next/link";
import { Arrow } from "../ui";
export function AccountCard({
  account,
  index,
}: {
  account: string;
  index: number;
}) {
  return (
    <article
      key={account}
      className={"panel account-card " + (index ? "featured" : "")}
    >
      <div className="between">
        <span className="eyebrow">
          {index ? "A DIFFERENT APPROACH" : "A SIMPLE START"}
        </span>
        {index === 1 && <span className="tiny-pill">ACCOUNT PREVIEW</span>}
      </div>
      <h3>{account}</h3>
      <p>
        {index
          ? "Explore a commission-based pricing structure."
          : "Explore a spread-based pricing structure."}
      </p>
      <ul className="feature-list">
        <li>
          <span>Platform</span>
          <strong>MetaTrader 5</strong>
        </li>
        <li>
          <span>Spreads & commission</span>
          <strong>To be confirmed</strong>
        </li>
        <li>
          <span>Minimum deposit</span>
          <strong>To be confirmed</strong>
        </li>
        <li>
          <span>Leverage</span>
          <strong>Subject to eligibility</strong>
        </li>
      </ul>
      <Link
        href={"/register?account=" + account}
        className={"button " + (index ? "primary" : "secondary")}
      >
        Explore {account} <Arrow />
      </Link>
    </article>
  );
}
