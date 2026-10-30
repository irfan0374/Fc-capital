"use client";
import Link from "next/link";
import { instruments } from "@/lib/home-content";
import { TradingQuiz } from "./home/trading-quiz";
import { AccountCard } from "./home/account-card";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import MarketIntro from "./market-intro";
import { useHomeMotion } from "./home-motion";
import { Logo, Arrow, Modal } from "./ui";
export default function Home() {
  const root = useRef<HTMLElement>(null);
  const [market, setMarket] = useState("Forex");
  const [modal, setModal] = useState("");
  const [menu, setMenu] = useState(false);
  const [requested, setRequested] = useState(false);
  const [ribbonPaused, setRibbonPaused] = useState(false);
  const [introReady, setIntroReady] = useState(false);
  const [introReplay, setIntroReplay] = useState(0);
  const finishIntro = useCallback(() => setIntroReady(true), []);
  useHomeMotion(root, introReady);
  return (
    <main ref={root} className="home-page">
      <MarketIntro replay={introReplay} onComplete={finishIntro} />
      <div className="risk-bar">
        CFDs are complex instruments and carry a high risk of losing money
        rapidly due to leverage.
      </div>
      <header className="site-header container">
        <Logo />
        <nav aria-label="Main navigation" className={menu ? "nav open" : "nav"}>
          {["Markets", "Accounts", "Platforms", "Learn", "About"].map((x) => (
            <a
              key={x}
              href={"#" + x.toLowerCase()}
              onClick={() => setMenu(false)}
            >
              {x}
            </a>
          ))}
        </nav>
        <Link className="button small primary header-cta" href="/register">
          Open an account <Arrow />
        </Link>
        <button
          className="icon-button menu-toggle"
          onClick={() => setMenu(!menu)}
          aria-expanded={menu}
          aria-label="Toggle navigation"
        >
          ☰
        </button>
      </header>
      <section className="hero container">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="status-dot" /> A CLEARER PERSPECTIVE ON TRADING
          </p>
          <h1>
            Your access to
            <br />
            <span>global markets.</span>
          </h1>
          <p className="lede">
            Explore the markets. Find your perspective.
            <br />
            Take your next step with FC Capital.
          </p>
          <div className="actions">
            <Link className="button primary" href="/register">
              Start your journey <Arrow />
            </Link>
            <button
              className="button secondary"
              onClick={() => {
                setRequested(false);
                setModal("Explore the demo");
              }}
            >
              Explore a demo <span>→</span>
            </button>
          </div>
          <div className="hero-foot">
            <span>01 / DISCOVER</span>
            <span>Forex · Indices · Commodities</span>
          </div>
        </div>
        <div className="orbital" aria-label="Illustration of global markets">
          <div className="orbit-ring ring-one" />
          <div className="orbit-ring ring-two" />
          <div className="orbit-inner">
            <i />
            <i />
            <i />
          </div>
          <div className="globe">
            <div className="globe-grid" />
            <span>
              FC<span>CONNECTED TO POSSIBILITY</span>
            </span>
          </div>
          <div className="floating-card ticker-one">
            <span className="ticker-icon">€</span>
            <div>
              <strong>EUR / USD</strong>
              <small>FOREX</small>
            </div>
            <svg viewBox="0 0 90 36" aria-hidden="true">
              <path d="M0 30L12 22L22 25L34 11L43 18L57 8L67 13L88 2" />
            </svg>
          </div>
          <div className="floating-card ticker-two">
            <span className="ticker-icon gold">Au</span>
            <div>
              <strong>GOLD</strong>
              <small>COMMODITIES</small>
            </div>
            <span className="tiny-pill">EXPLORE ↗</span>
          </div>
          <div className="floating-card ticker-three">
            <span className="status-dot" />
            <div>
              <strong>
                One perspective.
                <br />A world of possibilities.
              </strong>
              <small>FC CAPITAL</small>
            </div>
          </div>
          <span className="orbital-caption">GLOBAL MARKETS / ILLUSTRATION</span>
        </div>
      </section>
      <div
        className={"market-ribbon " + (ribbonPaused ? "paused" : "")}
        aria-label="Market categories"
      >
        <div className="ribbon-window">
          <div className="ribbon-track">
            {[0, 1].map((copy) => (
              <div
                className="ribbon-group"
                key={copy}
                aria-hidden={copy === 1 ? true : undefined}
              >
                {[
                  "FOREX",
                  "INDICES",
                  "COMMODITIES",
                  "YOUR NEXT PERSPECTIVE",
                ].map((label, index) => (
                  <span className="ribbon-item" key={label}>
                    <i className="ribbon-candles" aria-hidden="true">
                      {[0, 1, 2, 3, 4].map((n) => (
                        <b
                          key={n}
                          style={{
                            height: 12 + ((n * 7 + index * 3) % 22),
                            animationDelay: n * 0.13 + "s",
                          }}
                        />
                      ))}
                    </i>
                    {label}
                    <span className="ribbon-star" aria-hidden="true">
                      ✳
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <button
          className="ribbon-control"
          onClick={() => setRibbonPaused(!ribbonPaused)}
          aria-label={
            ribbonPaused ? "Play market animation" : "Pause market animation"
          }
          aria-pressed={ribbonPaused}
        >
          {ribbonPaused ? "▶" : "Ⅱ"}
        </button>
      </div>
      <section id="markets" className="section container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A WORLD OF OPPORTUNITY</p>
            <h2>Find your market.</h2>
          </div>
          <p>
            Explore familiar instruments across global markets.
            <br />
            Product availability will depend on your location.
          </p>
        </div>
        <div className="market-box">
          <div className="market-tabs" role="tablist" aria-label="Asset class">
            {Object.keys(instruments).map((x) => (
              <button
                key={x}
                role="tab"
                aria-selected={market === x}
                onClick={() => setMarket(x)}
                className={market === x ? "selected" : ""}
              >
                {x}
              </button>
            ))}
          </div>
          <div className="market-table">
            <div className="market-row table-label">
              <span>INSTRUMENT</span>
              <span>MARKET</span>
              <span>EXPLORE</span>
            </div>
            {instruments[market].map((i) => (
              <div className="market-row" key={i.symbol}>
                <div className="instrument">
                  <span className="instrument-icon">
                    {i.symbol.slice(0, 2)}
                  </span>
                  <span>
                    <strong>{i.symbol}</strong>
                    <small>{i.name}</small>
                  </span>
                </div>
                <span>{i.type}</span>
                <button
                  aria-label={"Explore " + i.name}
                  onClick={() => setModal(i.name)}
                  className="icon-button"
                >
                  ↗
                </button>
              </div>
            ))}
          </div>
          <p className="table-note">
            Instrument examples only. This preview contains no live prices or
            confirmed trading conditions.
          </p>
        </div>
      </section>
      <section className="section container">
        <p className="eyebrow">YOUR JOURNEY, YOUR PACE</p>
        <h2>A place for your next chapter.</h2>
        <div className="two-col journey">
          <article className="panel journey-card">
            <span className="number">01</span>
            <h3>
              New perspective.
              <br />
              Confident first steps.
            </h3>
            <p>
              Get familiar with the fundamentals and explore a guided
              application experience.
            </p>
            <button
              className="text-button"
              onClick={() => setModal("Getting started")}
            >
              Explore the essentials <Arrow />
            </button>
            <div className="line-art" aria-hidden="true">
              ↗
            </div>
          </article>
          <article className="panel journey-card">
            <span className="number">02</span>
            <h3>
              More experience.
              <br />A fresh point of view.
            </h3>
            <p>
              Discover account options and a trading platform designed around
              your workflow.
            </p>
            <a className="text-button" href="#accounts">
              Find your account <Arrow />
            </a>
            <div className="line-art circles" aria-hidden="true">
              ◎
            </div>
          </article>
        </div>
      </section>
      <TradingQuiz />
      <section id="accounts" className="section container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIND YOUR FIT</p>
            <h2>Two paths. Your choice.</h2>
          </div>
          <p>
            Compare the proposed account options.
            <br />
            Final pricing and availability are being confirmed.
          </p>
        </div>
        <div className="two-col accounts">
          {["Standard", "Raw"].map((account, index) => (
            <AccountCard key={account} account={account} index={index} />
          ))}
        </div>
      </section>
      <section id="about" className="section container">
        <p className="eyebrow">BUILT AROUND YOUR NEXT STEP</p>
        <h2>Clarity at every touchpoint.</h2>
        <div className="four-col benefits">
          {[
            [
              "◎",
              "A focused experience",
              "A clear path from exploring the markets to completing your application.",
            ],
            [
              "↗",
              "Familiar technology",
              "Discover desktop and mobile trading with MetaTrader 5.",
            ],
            [
              "≋",
              "Simple onboarding",
              "Move step by step, review your details and see what happens next.",
            ],
            [
              "✳",
              "A human next step",
              "Your application moves to our team for review before account access.",
            ],
          ].map(([icon, title, desc]) => (
            <article key={title}>
              <span className="benefit-icon">{icon}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section container">
        <div className="center">
          <p className="eyebrow">A CLEAR PATH FORWARD</p>
          <h2>From curiosity to your next step.</h2>
        </div>
        <div className="three-col process">
          {[
            [
              "01",
              "Tell us about yourself",
              "Follow a guided application and provide your experience and preferences.",
            ],
            [
              "02",
              "Review your application",
              "Check your information and the requested documents before submission.",
            ],
            [
              "03",
              "Hear from our team",
              "Our team reviews your application and shares the next steps separately.",
            ],
          ].map(([n, t, d]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="platforms" className="section container platform-section">
        <div className="platform-copy">
          <p className="eyebrow">YOUR MARKETS. YOUR SPACE.</p>
          <h2>
            A familiar platform.
            <br />
            <span>A new perspective.</span>
          </h2>
          <p>
            Explore MetaTrader 5 across desktop and mobile. Charts, market
            analysis and your trading workspace, brought together.
          </p>
          <div className="platform-tags">
            <span>Desktop</span>
            <span>Mobile</span>
            <span>MetaTrader 5</span>
          </div>
          <button
            className="button secondary"
            onClick={() => setModal("MetaTrader 5")}
          >
            Discover the platform <Arrow />
          </button>
        </div>
        <div className="platform-images">
          <div className="platform-ambient" aria-hidden="true" />
          <figure className="desktop-device">
            <figcaption>
              <span>01 / DESKTOP</span>
              <span>THE BIGGER PICTURE ↗</span>
            </figcaption>
            <Image
              src="/images/mt5-desktop.jpg"
              alt="Illustrative MetaTrader 5 desktop trading workspace"
              width={2400}
              height={1340}
              sizes="(max-width: 800px) 90vw, 50vw"
              className="desktop-photo"
            />
          </figure>
          <div className="mobile-device-row">
            <div className="device-caption">
              <span className="eyebrow">02 / MOBILE</span>
              <h3>
                A change
                <br />
                of scenery.
              </h3>
              <p>
                Your perspective.
                <br />
                Wherever you are.
              </p>
              <span className="device-line" aria-hidden="true" />
            </div>
            <figure className="mobile-device">
              <Image
                src="/images/mt5-mobile.jpg"
                alt="Illustrative MetaTrader 5 mobile trading screen"
                width={1792}
                height={2400}
                sizes="(max-width: 800px) 45vw, 20vw"
                className="mobile-photo"
              />
            </figure>
          </div>
          <small>Illustrative imagery. Interface details may differ.</small>
        </div>
      </section>
      <section id="learn" className="section container learning-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">KEEP YOUR CURIOSITY</p>
            <h2>Knowledge shapes perspective.</h2>
          </div>
          <span className="muted">A preview of our learning space</span>
        </div>
        <div className="three-col learn-grid">
          {[
            [
              "01",
              "THE FUNDAMENTALS",
              "Understanding forex",
              "Discover how currency pairs work and what moves their prices.",
            ],
            [
              "02",
              "RISK AWARENESS",
              "Understanding leverage",
              "Learn why leveraged trading can magnify both gains and losses.",
            ],
            [
              "03",
              "PLATFORM BASICS",
              "Your trading workspace",
              "Explore charts, order types and the layout of MetaTrader 5.",
            ],
          ].map(([n, tag, title, desc]) => (
            <button
              className="panel learn-card"
              key={n}
              onClick={() => setModal(title)}
            >
              <div className={"learn-art art-" + n}>
                <span>{n === "01" ? "€ / $" : n === "02" ? "↗" : "▥"}</span>
                <small>FC / PERSPECTIVES</small>
              </div>
              <div className="learn-content">
                <p className="eyebrow">{tag}</p>
                <h3>
                  {title} <Arrow />
                </h3>
                <p>{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="container final-cta">
        <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
        <h2>
          A world of markets.
          <br />
          <span>Your perspective.</span>
        </h2>
        <Link href="/register" className="button primary">
          Start your application <Arrow />
        </Link>
        <p>Explore the demo. No live account will be created.</p>
        <div className="cta-orbit" aria-hidden="true" />
      </section>
      <footer className="container footer">
        <div className="footer-top">
          <Logo />
          <p>A clearer perspective on global markets.</p>
          <a href="#markets">Back to markets ↑</a>
        </div>
        <div className="footer-links">
          <button
            onClick={() => {
              setIntroReady(false);
              setIntroReplay((value) => value + 1);
            }}
          >
            Replay intro
          </button>
          {["Privacy notice", "Terms of use", "Risk disclosure", "Contact"].map(
            (x) => (
              <button key={x} onClick={() => setModal(x)}>
                {x}
              </button>
            ),
          )}
        </div>
        <p>
          FC Capital is a proposed brand presented in an interactive demo.
          Regulatory entity, permissions, eligible jurisdictions and commercial
          terms are not yet confirmed. Nothing on this demo is an offer to trade
          or investment advice.
        </p>
        <div className="between">
          <small>
            © {new Date().getFullYear()} FC Capital · Design preview
          </small>
          <small>ARCTIC CYAN / 01</small>
        </div>
      </footer>
      {modal && (
        <Modal title={modal} onClose={() => setModal("")}>
          {modal === "Explore the demo" ? (
            <>
              <p>
                This interactive preview lets you explore the application using
                fictional details. It does not create a trading account.
              </p>
              {requested ? (
                <div className="success-note" role="status">
                  Demo ready. Continue to the application and select “Fill
                  sample details”.
                </div>
              ) : (
                <button
                  className="button primary"
                  onClick={() => setRequested(true)}
                >
                  Prepare sample journey <Arrow />
                </button>
              )}
              <Link className="button secondary" href="/register">
                Open demo application →
              </Link>
            </>
          ) : (
            <>
              <p>
                {modal === "Understanding leverage"
                  ? "Leverage increases your market exposure relative to your deposit. It can amplify losses as well as gains. A stop-loss does not guarantee execution at your chosen price."
                  : modal === "Understanding forex"
                    ? "Currencies are quoted in pairs. A pair expresses the price of one currency in another. Economic conditions and market sentiment can affect prices."
                    : modal === "MetaTrader 5" ||
                        modal === "Your trading workspace"
                      ? "The platform section previews MetaTrader 5. Download links, account access and supported devices will be confirmed before launch."
                      : [
                            "Privacy notice",
                            "Terms of use",
                            "Risk disclosure",
                          ].includes(modal)
                        ? "This is a demo placeholder, not a final legal document. The approved entity details, applicable terms and privacy information must be added before a public launch."
                        : modal === "Contact"
                          ? "Support contact details will be added before launch. This demo does not send support messages."
                          : modal === "Getting started"
                            ? "Start by understanding the products, costs and risks. This demo walks through the application; it does not assess or approve your eligibility."
                            : "This is an instrument preview. Product availability, contract specifications, costs and trading hours will be confirmed before launch."}
              </p>
              <button className="button secondary" onClick={() => setModal("")}>
                Back to exploring
              </button>
            </>
          )}
        </Modal>
      )}
    </main>
  );
}
