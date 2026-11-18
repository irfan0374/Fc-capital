"use client";
import { useEffect, useRef, useState } from "react";
import "./gold-demo.css";

type Candle = { o: number; h: number; l: number; c: number };
type Side = "buy" | "sell";
type Position = { id: number; side: Side; lots: number; open: number };
type Deal = Position & { close: number; profit: number };
type Market = { candles: Candle[]; ticks: number; anchor: number };
type Tab = "quotes" | "chart" | "trade" | "history";

// MT5 mobile-style practice terminal on simulated Gold prices. Nothing here is
// sent anywhere and nothing is saved.
const START_BALANCE = 10000;
const SPREAD = 0.3;
const OZ_PER_LOT = 100;
const CANDLES = 40;
const TICK_MS = 600;
const TICKS_PER_CANDLE = 5;
const MAX_POSITIONS = 6;
const LOT_SIZES = [0.01, 0.05, 0.1, 0.5, 1];
const W = 360;
const H = 540;
const AXIS = 52;
const TOP = 70; // room for the one-click panel

const round = (n: number) => Math.round(n * 100) / 100;
// MT5 shows prices plainly and account values with a space as thousands separator.
const px = (n: number) => n.toFixed(2);
const amount = (n: number) =>
  (n < 0 ? "-" : "") +
  Math.abs(n)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

function step(p: number, anchor: number) {
  const drift = (anchor - p) * 0.01;
  const shock = (Math.random() - 0.5) * 2.4;
  return round(p + drift + shock);
}
function tick(market: Market): Market {
  const candles = market.candles.slice();
  const last = candles.at(-1)!;
  const p = step(last.c, market.anchor);
  const ticks = market.ticks + 1;
  if (ticks % TICKS_PER_CANDLE === 0) {
    candles.push({
      o: last.c,
      h: Math.max(last.c, p),
      l: Math.min(last.c, p),
      c: p,
    });
    if (candles.length > CANDLES) candles.shift();
  } else {
    candles[candles.length - 1] = {
      ...last,
      h: Math.max(last.h, p),
      l: Math.min(last.l, p),
      c: p,
    };
  }
  return {
    candles,
    ticks,
    anchor: market.anchor + (Math.random() - 0.5) * 0.8,
  };
}
function newMarket(): Market {
  const start = round(3990 + Math.random() * 40);
  let market: Market = {
    candles: [{ o: start, h: start, l: start, c: start }],
    ticks: 0,
    anchor: start,
  };
  for (let i = 0; i < CANDLES * TICKS_PER_CANDLE; i++) market = tick(market);
  return market;
}
const profit = (p: Position, bid: number) =>
  round(
    (p.side === "buy" ? bid - p.open : p.open - (bid + SPREAD)) *
      OZ_PER_LOT *
      p.lots,
  );
const tone = (n: number) => (n > 0 ? "pos" : n < 0 ? "neg" : "");

// Price with the last two digits enlarged, as on the MT5 one-click panel.
function BigPrice({ value }: { value: number }) {
  const text = px(value);
  return (
    <span className="mt-big">
      {text.slice(0, -2)}
      <b>{text.slice(-2)}</b>
    </span>
  );
}

export function GoldDemo() {
  const root = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const [market, setMarket] = useState<Market | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [balance, setBalance] = useState(START_BALANCE);
  const [lots, setLots] = useState(0.1);
  const [tab, setTab] = useState<Tab>("chart");
  const [toast, setToast] = useState("");
  const [visible, setVisible] = useState(false);
  const [clock, setClock] = useState("9:41");

  // Prices are random, so they are created in the browser only.
  useEffect(() => setMarket(newMarket()), []);
  // Status bar clock in the visitor's local time, like a real iPhone.
  useEffect(() => {
    const update = () =>
      setClock(
        new Date()
          .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
          .replace(/\s?[AP]M$/i, ""),
      );
    update();
    const id = setInterval(update, 15000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      if (!document.hidden) setMarket((m) => m && tick(m));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [visible]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const candles = market?.candles ?? [];
  const bid = candles.at(-1)?.c ?? 0;
  const ask = round(bid + SPREAD);
  const open0 = candles[0]?.o ?? bid;
  const dayLow = candles.length ? Math.min(...candles.map((c) => c.l)) : 0;
  const dayHigh = candles.length ? Math.max(...candles.map((c) => c.h)) : 0;
  const floating = round(positions.reduce((n, p) => n + profit(p, bid), 0));
  const equity = round(balance + floating);

  function trade(side: Side) {
    if (!market) return;
    if (positions.length >= MAX_POSITIONS) {
      setToast(`Demo limit: ${MAX_POSITIONS} open positions`);
      return;
    }
    const at = side === "buy" ? ask : bid;
    const id = nextId.current++;
    setPositions((all) => [...all, { id, side, lots, open: at }]);
    setToast(`${side} ${lots.toFixed(2)} XAUUSD at ${px(at)}`);
  }
  function close(p: Position) {
    const result = profit(p, bid);
    const at = p.side === "buy" ? bid : ask;
    setBalance((b) => round(b + result));
    setPositions((all) => all.filter((x) => x.id !== p.id));
    setDeals((all) =>
      [{ ...p, close: at, profit: result }, ...all].slice(0, 20),
    );
    setToast(`close #${p.id} ${p.side} ${p.lots.toFixed(2)} at ${px(at)}`);
  }
  function closeAll() {
    positions.forEach(close);
  }
  function reset() {
    setPositions([]);
    setDeals([]);
    setBalance(START_BALANCE);
    setMarket(newMarket());
    setTab("chart");
  }
  function changeLots(dir: 1 | -1) {
    const i = LOT_SIZES.indexOf(lots) + dir;
    if (i >= 0 && i < LOT_SIZES.length) setLots(LOT_SIZES[i]);
  }

  // Chart scale: candle range plus any open position levels.
  const levels = [
    ...candles.flatMap((c) => [c.h, c.l]),
    ...positions.map((p) => p.open),
    ask,
  ];
  const lo = levels.length ? Math.min(...levels) : 0;
  const hi = levels.length ? Math.max(...levels) : 1;
  const pad = Math.max((hi - lo) * 0.08, 0.5);
  const min = lo - pad;
  const max = hi + pad;
  const y = (v: number) => TOP + ((max - v) / (max - min)) * (H - TOP - 18);
  const slot = (W - AXIS) / CANDLES;
  const gridStep = (max - min) / 6;
  const grid = [1, 2, 3, 4, 5].map((i) => min + gridStep * i);

  const titles: Record<Tab, string> = {
    quotes: "Quotes",
    chart: "XAUUSD, M1",
    trade: amount(floating) + " USD",
    history: "History",
  };

  return (
    <div className="mt-device" ref={root}>
      <span className="mt-btn action" aria-hidden="true" />
      <span className="mt-btn vol-up" aria-hidden="true" />
      <span className="mt-btn vol-down" aria-hidden="true" />
      <span className="mt-btn power" aria-hidden="true" />
      <span className="mt-btn camera" aria-hidden="true" />
      <div className="mt-phone">
        <div className="mt-status" aria-hidden="true">
          <span className="mt-clock">{clock}</span>
          <span className="mt-island" />
          <span className="mt-icons">
            <svg viewBox="0 0 18 12">
              <rect x="0" y="8" width="3" height="4" rx="0.8" />
              <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
              <rect x="10" y="3" width="3" height="9" rx="0.8" />
              <rect x="15" y="0" width="3" height="12" rx="0.8" />
            </svg>
            <svg viewBox="0 0 16 12">
              <path d="M8 11.5 10.4 9a3.4 3.4 0 0 0-4.8 0Z" />
              <path d="M3.6 7a6.3 6.3 0 0 1 8.8 0l1.5-1.5a8.4 8.4 0 0 0-11.8 0Z" />
              <path d="M.6 4a10.5 10.5 0 0 1 14.8 0L16 3.4A11.9 11.9 0 0 0 0 3.4Z" />
            </svg>
            <span className="mt-battery">
              <i />
            </span>
          </span>
        </div>
        <p className="mt-brand">MetaTrader 5 · FC Capital Demo</p>
        <header className="mt-bar">
          <span className="mt-title">
            <strong className={tab === "trade" ? tone(floating) : ""}>
              {titles[tab]}
            </strong>
            {tab === "chart" && <small>Gold vs US Dollar</small>}
          </span>
          {tab === "trade" && positions.length > 1 && (
            <button type="button" className="mt-link" onClick={closeAll}>
              Close all
            </button>
          )}
          {(tab === "trade" || tab === "history") && (
            <button type="button" className="mt-link" onClick={reset}>
              Reset
            </button>
          )}
          {tab === "chart" && (
            <span className="mt-tools" aria-hidden="true">
              <i>✛</i>
              <i>
                <em>f</em>
              </i>
              <i>M1</i>
            </span>
          )}
        </header>

        <div className="mt-screen">
          {tab === "chart" && (
            <div className="mt-chart">
              <div
                className="mt-oneclick"
                role="group"
                aria-label="One-click trading"
              >
                <button
                  type="button"
                  className="mt-sell"
                  onClick={() => trade("sell")}
                  disabled={!market}
                  aria-label={`Sell ${lots.toFixed(2)} lots at ${px(bid)}`}
                >
                  <small>SELL</small>
                  {market ? <BigPrice value={bid} /> : "—"}
                </button>
                <div className="mt-volume">
                  <button
                    type="button"
                    onClick={() => changeLots(-1)}
                    aria-label="Lower volume"
                  >
                    −
                  </button>
                  <span aria-live="polite">{lots.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => changeLots(1)}
                    aria-label="Raise volume"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="mt-buy"
                  onClick={() => trade("buy")}
                  disabled={!market}
                  aria-label={`Buy ${lots.toFixed(2)} lots at ${px(ask)}`}
                >
                  <small>BUY</small>
                  {market ? <BigPrice value={ask} /> : "—"}
                </button>
              </div>
              <svg
                viewBox={`0 0 ${W} ${H}`}
                role="img"
                aria-label={`Simulated XAUUSD M1 chart. Bid ${px(bid)}, ask ${px(ask)}.`}
              >
                {market &&
                  grid.map((g) => (
                    <g key={g} className="mt-grid">
                      <line x1="0" x2={W - AXIS} y1={y(g)} y2={y(g)} />
                      <text x={W - AXIS + 5} y={y(g) + 3}>
                        {px(g)}
                      </text>
                    </g>
                  ))}
                <line
                  className="mt-axis"
                  x1={W - AXIS}
                  x2={W - AXIS}
                  y1="0"
                  y2={H}
                />
                {candles.map((c, i) => {
                  const x = i * slot + slot / 2;
                  const top = y(Math.max(c.o, c.c));
                  return (
                    <g key={i} className={c.c >= c.o ? "mt-up" : "mt-down"}>
                      <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} />
                      <rect
                        x={x - slot * 0.33}
                        y={top}
                        width={slot * 0.66}
                        height={Math.max(1, y(Math.min(c.o, c.c)) - top)}
                      />
                    </g>
                  );
                })}
                {positions.map((p) => (
                  <g key={p.id} className="mt-level">
                    <line x1="0" x2={W - AXIS} y1={y(p.open)} y2={y(p.open)} />
                    <text x="3" y={y(p.open) - 3}>
                      #{p.id} {p.side} {p.lots.toFixed(2)}
                    </text>
                  </g>
                ))}
                {market && (
                  <>
                    <g className="mt-askline">
                      <line x1="0" x2={W - AXIS} y1={y(ask)} y2={y(ask)} />
                    </g>
                    <g className="mt-bidline">
                      <line x1="0" x2={W - AXIS} y1={y(bid)} y2={y(bid)} />
                      <rect
                        x={W - AXIS}
                        y={y(bid) - 7}
                        width={AXIS}
                        height="14"
                      />
                      <text x={W - AXIS + 5} y={y(bid) + 3.5}>
                        {px(bid)}
                      </text>
                    </g>
                  </>
                )}
              </svg>
            </div>
          )}

          {tab === "quotes" && (
            <ul className="mt-list">
              <li>
                <button
                  type="button"
                  className="mt-quote"
                  onClick={() => setTab("chart")}
                >
                  <span>
                    <small className={tone(bid - open0)}>
                      {bid - open0 >= 0 ? "+" : ""}
                      {px(bid - open0)} (
                      {(((bid - open0) / open0) * 100).toFixed(2)}%)
                    </small>
                    <strong>XAUUSD</strong>
                    <small>Spread: {Math.round(SPREAD * 100)}</small>
                  </span>
                  <span className="mt-quote-price neg">
                    <BigPrice value={bid} />
                    <small>L: {px(dayLow)}</small>
                  </span>
                  <span className="mt-quote-price pos">
                    <BigPrice value={ask} />
                    <small>H: {px(dayHigh)}</small>
                  </span>
                </button>
              </li>
            </ul>
          )}

          {tab === "trade" && (
            <div className="mt-trade">
              <dl className="mt-account">
                <div>
                  <dt>Balance:</dt>
                  <dd>{amount(balance)}</dd>
                </div>
                <div>
                  <dt>Equity:</dt>
                  <dd>{amount(equity)}</dd>
                </div>
                <div>
                  <dt>Floating P/L:</dt>
                  <dd>{amount(floating)}</dd>
                </div>
              </dl>
              <p className="mt-section">Positions</p>
              {positions.length ? (
                <ul className="mt-list">
                  {positions.map((p) => {
                    const pl = profit(p, bid);
                    return (
                      <li key={p.id} className="mt-pos">
                        <span>
                          <strong>
                            XAUUSD,{" "}
                            <em className={p.side}>
                              {p.side} {p.lots.toFixed(2)}
                            </em>
                          </strong>
                          <small>
                            {px(p.open)} → {px(p.side === "buy" ? bid : ask)}
                          </small>
                        </span>
                        <b className={tone(pl)}>{amount(pl)}</b>
                        <button
                          type="button"
                          onClick={() => close(p)}
                          aria-label={`Close position ${p.id}`}
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-empty">
                  No open positions. Use SELL or BUY on the chart.
                </p>
              )}
            </div>
          )}

          {tab === "history" && (
            <div className="mt-trade">
              <dl className="mt-account">
                <div>
                  <dt>Profit:</dt>
                  <dd className={tone(balance - START_BALANCE)}>
                    {amount(balance - START_BALANCE)}
                  </dd>
                </div>
                <div>
                  <dt>Deposit:</dt>
                  <dd>{amount(START_BALANCE)}</dd>
                </div>
                <div>
                  <dt>Balance:</dt>
                  <dd>{amount(balance)}</dd>
                </div>
              </dl>
              {deals.length ? (
                <ul className="mt-list">
                  {deals.map((d) => (
                    <li key={d.id} className="mt-pos">
                      <span>
                        <strong>
                          XAUUSD,{" "}
                          <em className={d.side}>
                            {d.side} {d.lots.toFixed(2)}
                          </em>
                        </strong>
                        <small>
                          {px(d.open)} → {px(d.close)}
                        </small>
                      </span>
                      <b className={tone(d.profit)}>{amount(d.profit)}</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-empty">No closed trades yet.</p>
              )}
            </div>
          )}

          {toast && (
            <p className="mt-toast" role="status">
              {toast}
            </p>
          )}
        </div>

        <nav className="mt-tabs" aria-label="Demo terminal">
          {(
            [
              [
                "quotes",
                "Quotes",
                "M7 4v16M7 4 3 8M7 4l4 4M17 20V4M17 20l-4-4M17 20l4-4",
              ],
              [
                "chart",
                "Chart",
                "M5 3v18M5 7h0M3 7h4v8H3zM12 5v14M10 9h4v6h-4zM19 3v16M17 6h4v9h-4z",
              ],
              ["trade", "Trade", "M3 17l6-6 4 4 8-8M15 7h6v6"],
              [
                "history",
                "History",
                "M12 7v5l3 2M3 12a9 9 0 1 0 3-6.7M3 4v4h4",
              ],
            ] as const
          ).map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "active" : ""}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={icon} />
              </svg>
              {label}
              {id === "trade" && positions.length > 0 && (
                <i className="mt-count">{positions.length}</i>
              )}
            </button>
          ))}
        </nav>
        <span className="mt-home" aria-hidden="true" />
      </div>
    </div>
  );
}
