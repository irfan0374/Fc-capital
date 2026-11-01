"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";

const INTRO_KEY = "fc-capital-intro-seen-v1";
const candles = [
  [22, 54],
  [40, 39],
  [29, 67],
  [58, 28],
  [37, 49],
  [72, 17],
  [48, 36],
  [64, 22],
  [34, 44],
  [51, 31],
  [76, 10],
];

export default function MarketIntro({
  replay,
  onComplete,
}: {
  replay: number;
  onComplete: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false);
  const finish = useCallback(() => {
    setVisible(false);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onComplete();
      return;
    }
    let seen = false;
    try {
      seen = sessionStorage.getItem(INTRO_KEY) === "1";
    } catch {}
    if (seen && replay === 0) {
      onComplete();
      return;
    }
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {}
    setVisible(true);
  }, [replay, onComplete]);

  useEffect(() => {
    if (!visible || !dialog.current) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => {
      if (media.matches) finish();
    };
    media.addEventListener("change", onMotionChange);
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ onComplete: finish });
      timeline.from(
        ".intro-candle",
        {
          scaleY: 0.05,
          y: 28,
          opacity: 0,
          stagger: 0.035,
          duration: 0.45,
          ease: "power3.out",
          transformOrigin: "center bottom",
        },
        0,
      );
      timeline.to(
        ".intro-candle",
        {
          y: (index) => (index % 2 ? -12 : 10),
          stagger: 0.02,
          duration: 0.32,
          yoyo: true,
          repeat: 1,
          ease: "sine.inOut",
        },
        0.35,
      );
      timeline.fromTo(
        ".intro-sweep",
        { xPercent: -150 },
        {
          xPercent: 150,
          duration: 1.1,
          ease: "power2.inOut",
        },
        0.1,
      );
      timeline.from(".intro-brand", { y: 15, opacity: 0, duration: 0.4 }, 0.55);
      timeline.from(
        ".intro-tagline",
        { y: 8, opacity: 0, duration: 0.35 },
        0.75,
      );
      timeline.to(
        ".intro-progress span",
        { scaleX: 1, duration: 1.3, ease: "power1.inOut" },
        0,
      );
      timeline.to(
        element,
        { opacity: 0, yPercent: -3, duration: 0.4, ease: "power2.inOut" },
        1.45,
      );
    }, element);
    // A failed or interrupted animation must never block access to the homepage.
    const fallback = setTimeout(finish, 2600);
    return () => {
      clearTimeout(fallback);
      context.revert();
      media.removeEventListener("change", onMotionChange);
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [visible, finish]);

  if (!visible) return null;
  return (
    <dialog
      ref={dialog}
      className="market-intro"
      aria-label="Welcome to FC Capital"
      onCancel={finish}
    >
      <div className="intro-grid" aria-hidden="true" />
      <div className="intro-aura" aria-hidden="true" />
      <div className="intro-sweep" aria-hidden="true" />
      <div className="intro-content">
        <div className="intro-chart" aria-hidden="true">
          {candles.map(([height, top], index) => (
            <i
              key={index}
              className={"intro-candle " + (index % 3 === 1 ? "outline" : "")}
              style={{ height, marginTop: top }}
            >
              <span />
            </i>
          ))}
        </div>
        <div className="intro-brand">
          <span className="intro-monogram">FC</span>
          <span>FC CAPITAL</span>
        </div>
        <p className="intro-tagline">A CLEARER PERSPECTIVE</p>
        <div className="intro-progress" aria-hidden="true">
          <span />
        </div>
      </div>
      <span className="intro-caption">MARKET MOTION / BRAND INTRODUCTION</span>
    </dialog>
  );
}
