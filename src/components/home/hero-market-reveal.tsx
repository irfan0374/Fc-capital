"use client";

import { useEffect, useRef } from "react";
import "./hero-market-reveal.css";

// Illustrative candles, not a live market feed.
const candles = Array.from({ length: 48 }, (_, index) => {
  const center = 355 - index * 3 + Math.sin(index * 0.63) * 48;
  const height = 14 + ((index * 17) % 48);
  return { x: 16 + index * 25, y: center, height, up: index % 4 !== 1 };
});

export function HeroMarketReveal() {
  const visual = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const hero = visual.current?.closest<HTMLElement>(".hero");
    if (!hero) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const move = (event: PointerEvent) => {
      const bounds = hero.getBoundingClientRect();
      x = event.clientX - bounds.left;
      y = event.clientY - bounds.top;
      hero.dataset.revealActive = "true";
      if (!frame)
        frame = requestAnimationFrame(() => {
          hero.style.setProperty("--reveal-x", `${x}px`);
          hero.style.setProperty("--reveal-y", `${y}px`);
          frame = 0;
        });
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      delete hero.dataset.revealActive;
      hero.style.removeProperty("--reveal-x");
      hero.style.removeProperty("--reveal-y");
    };
    hero.addEventListener("pointermove", move, { passive: true });
    hero.addEventListener("pointerdown", move, { passive: true });
    hero.addEventListener("pointerleave", reset);
    hero.addEventListener("pointercancel", reset);
    const observer = new ResizeObserver(reset);
    observer.observe(hero);
    return () => {
      reset();
      observer.disconnect();
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerdown", move);
      hero.removeEventListener("pointerleave", reset);
      hero.removeEventListener("pointercancel", reset);
    };
  }, []);
  return (
    <div className="hero-market-visual" ref={visual}>
      <div className="hero-market-layer" aria-hidden="true">
        <div className="hero-market-reveal">
          <svg viewBox="0 0 1200 600" preserveAspectRatio="none">
            <defs>
              <pattern
                id="hero-chart-grid"
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M50 0H0V50"
                  fill="none"
                  stroke="#45d6e8"
                  strokeOpacity=".15"
                />
              </pattern>
            </defs>
            <rect width="1200" height="600" fill="url(#hero-chart-grid)" />
            <path
              d="M0 420 Q150 360 250 395 T500 340 T750 280 T1000 230 T1200 170"
              fill="none"
              stroke="#b9f3fa"
              strokeWidth="1.5"
              opacity=".5"
            />
            {candles.map((candle, index) => (
              <g
                key={index}
                className="hero-chart-candle"
                style={{ animationDelay: `${index * -0.17}s` }}
                fill={candle.up ? "#45d6e8" : "#e293a5"}
                stroke={candle.up ? "#45d6e8" : "#e293a5"}
              >
                <path
                  d={`M${candle.x} ${candle.y - 14}V${candle.y + candle.height + 17}`}
                  strokeWidth="1"
                />
                <rect
                  x={candle.x - 6}
                  y={candle.y}
                  width="12"
                  height={candle.height}
                  rx="1.5"
                  stroke="none"
                />
              </g>
            ))}
          </svg>
        </div>
        <div className="hero-market-lens">
          <span>MARKET PERSPECTIVE</span>
          <i />
          <small>ILLUSTRATIVE CHART</small>
        </div>
      </div>
      <div
        className="hero-trading-scene"
        aria-label="Illustrative trading workspace"
      >
        <div className="hero-scene-halo" aria-hidden="true" />
        <div className="hero-chart-backplate" aria-hidden="true" />
        <div className="hero-workspace-card">
          <div className="hero-workspace-top">
            <span>
              <i className="status-dot" /> MARKET PERSPECTIVE
            </span>
            <span>FC / 01</span>
          </div>
          <div className="hero-workspace-title">
            <div>
              <small>FOREIGN EXCHANGE</small>
              <strong>EUR / USD</strong>
            </div>
            <span>H1 ↗</span>
          </div>
          <svg
            viewBox="0 80 1200 440"
            role="img"
            aria-label="Illustrative candlestick chart, not live prices"
          >
            {[160, 240, 320, 400].map((y) => (
              <path
                key={y}
                d={`M0 ${y}H1200`}
                stroke="#294350"
                strokeWidth="2"
                strokeDasharray="4 12"
              />
            ))}
            {candles.map((c, i) => (
              <g
                key={i}
                className="hero-chart-candle"
                style={{ animationDelay: `${i * -0.17}s` }}
                fill={c.up ? "#45d6e8" : "#df95aa"}
                stroke={c.up ? "#45d6e8" : "#df95aa"}
              >
                <path
                  d={`M${c.x} ${c.y - 14}V${c.y + c.height + 17}`}
                  strokeWidth="2"
                />
                <rect
                  x={c.x - 6}
                  y={c.y}
                  width="12"
                  height={c.height}
                  rx="2"
                  stroke="none"
                />
              </g>
            ))}
            <path
              d="M0 420 Q150 360 250 395 T500 340 T750 280 T1000 230 T1200 170"
              fill="none"
              stroke="#b9f3fa"
              strokeWidth="3"
              opacity=".6"
            />
          </svg>
          <div className="hero-workspace-bottom">
            <span>CHART / EXPLORE / PERSPECTIVE</span>
            <span>ILLUSTRATION</span>
          </div>
        </div>
        <div className="hero-instrument-chip">
          <span>Au</span>
          <div>
            <small>COMMODITIES</small>
            <strong>Gold</strong>
          </div>
          <svg viewBox="0 0 80 30" aria-hidden="true">
            <path
              d="M0 25L12 19 24 22 37 9 48 14 60 5 79 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </div>
        <div className="hero-perspective-chip">
          <span>◎</span>
          <div>
            One workspace.
            <br />
            <strong>A world of markets.</strong>
          </div>
        </div>
      </div>
      <div className="hero-market-caption">
        <span className="status-dot" />
        <span className="hero-mouse-hint">MOVE TO EXPLORE THE MARKET</span>
        <span className="hero-touch-hint">TOUCH TO EXPLORE THE MARKET</span>
        <span>↗</span>
      </div>
    </div>
  );
}
