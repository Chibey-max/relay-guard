"use client";
/**
 * app/page.tsx
 *
 * Marketing landing page ("/"). Ported from
 * design-reference/relay-landing-v10 (1).html into real components. The
 * wallet-connected product lives at /app, this page is purely
 * decorative and informational: no SDK imports, no /api/* calls,
 * everything here is static copy or local animation state.
 *
 * See docs/frontend.md for the token systems, the section spacing
 * scale, and the motion variants this file uses.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  fadeUp,
  staggerContainer,
  staggerItem,
  heroText,
  heroTextItem,
  phoneReveal,
  scaleIn,
} from "../lib/motionVariants";
import ParticleField from "../components/ParticleField";
import AmbientGradient from "../components/AmbientGradient";
import NavMenu from "../components/NavMenu";
import Icon from "../components/Icon";
import Logo from "../components/Logo";
import PhoneMock from "../components/marketing/PhoneMock";
import HeroVideo from "../components/marketing/HeroVideo";
import TxTicker from "../components/marketing/TxTicker";
import QuoteCarousel from "../components/marketing/QuoteCarousel";
import TrustPanel from "../components/marketing/TrustPanel";
import FaqAccordion from "../components/marketing/FaqAccordion";
import ArchitectureFlow from "../components/ArchitectureFlow";
import "./marketing.css";

/** Uniform section padding: `px-section-px sm:px-section-px-sm lg:px-section-px-lg` and the `py-` equivalent, applied to every top level section below instead of each one choosing its own px-6 / py-20 / py-24 by hand. See docs/frontend.md. */
const SECTION_X = "px-section-px sm:px-section-px-sm lg:px-section-px-lg";
const SECTION_Y = "py-section-py sm:py-section-py-sm lg:py-section-py-lg";

const STRIP = [
  { h: "Real transfers", p: "Live on Arbitrum mainnet, not a simulation." },
  {
    h: "No seed phrase",
    p: "Log in with email. Your wallet is created for you.",
  },
  {
    h: "We cover the gas",
    p: "Every network fee is sponsored while this is live.",
  },
  {
    h: "One balance, any chain",
    p: "Relay Guard treats what you own as a single balance.",
  },
];

const STEPS = [
  {
    n: "01",
    h: "Speak",
    p: "Type it the way you'd text a friend. Relay Guard reads the intent, not a form.",
  },
  {
    n: "02",
    h: "Unify",
    p: "See what you have across every chain as one number, no picking a network first.",
  },
  {
    n: "03",
    h: "Settle",
    p: "Sent for real, gas covered, with a receipt you can verify yourself.",
  },
];

const FEATURE_CARDS = [
  {
    h: "No jargon, ever",
    p: "Describe a payment in plain words. Relay Guard handles the chain, the gas, and the routing behind it.",
  },
  {
    h: "Trust you can check",
    p: "Every real send links straight to the transaction on Arbiscan, not a screenshot, the actual record.",
    hashes: ["0x118ff4…0dcfe", "0x065631…f839e"],
  },
  {
    h: "One balance, any chain",
    p: "See every chain you hold funds on as one number, updated in real time.",
  },
  {
    h: "We cover the gas",
    p: "No ETH sitting idle just to pay network fees. Sponsorship is built into every send.",
  },
];

export default function MarketingPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [motionOn, setMotionOn] = useState(true);
  const themeToggleRef = useRef<HTMLButtonElement>(null);

  /**
   * Reveal, StaggerGrid, and StaggerCard are nested (not module level) so
   * they can read motionOn directly instead of it being threaded through
   * as a prop at every one of their call sites below. When motionOn is
   * false (the user prefers reduced motion) each renders a plain,
   * already visible div instead of a motion.div, matching how the rest
   * of the page short-circuits its animations for reduced motion
   * visitors.
   */
  function Reveal({
    children,
    className = "",
    style,
    variants = fadeUp,
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    variants?: typeof fadeUp;
  }) {
    if (!motionOn) {
      return (
        <div className={className} style={style}>
          {children}
        </div>
      );
    }
    return (
      <motion.div
        className={className}
        style={style}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={variants}
      >
        {children}
      </motion.div>
    );
  }

  // Parent for a grid or row of cards that should reveal one after
  // another instead of all at once. Pair with StaggerCard on each child.
  function StaggerGrid({
    children,
    className,
    style,
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }) {
    if (!motionOn) {
      return (
        <div className={className} style={style}>
          {children}
        </div>
      );
    }
    return (
      <motion.div
        className={className}
        style={style}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
      >
        {children}
      </motion.div>
    );
  }

  function StaggerCard({
    children,
    className,
    style,
    variants = staggerItem,
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    variants?: typeof staggerItem;
  }) {
    if (!motionOn) {
      return (
        <div className={className} style={style}>
          {children}
        </div>
      );
    }
    return (
      <motion.div className={className} style={style} variants={variants}>
        {children}
      </motion.div>
    );
  }

  /**
   * Smart sticky nav: always position:fixed, visible near the top,
   * hidden while scrolling down, revealed again the moment the user
   * scrolls up, from anywhere on the page. Deliberately never swaps
   * between position:absolute and position:fixed. That swap changes
   * the element's containing block (viewport vs. document) at the
   * exact instant it happens, which cannot itself be transitioned and
   * previously caused a visible jump whenever the nav lost its pin
   * while scrolling down again. Staying fixed at all times means show
   * and hide are both pure transform/opacity changes, so they always
   * have a real start and end state to animate between.
   */
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem("relayTheme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) setMotionOn(false);
  }, []);

  useEffect(() => {
    // Confirmed direction: down hides (nav falls back into normal flow and
    // scrolls away with the hero), up reveals (nav pins to the viewport
    // and slides back in), matching the intended "get out of the way
    // reading, come back the moment the user looks for it" behavior.
    function updateNavVisibility() {
      const y = window.scrollY;
      if (y < 80) {
        setNavVisible(true);
      } else if (y > lastScrollY.current) {
        setNavVisible(false); // scrolling down, hide
      } else {
        setNavVisible(true); // scrolling up, reveal
      }
      lastScrollY.current = y;
    }

    // requestAnimationFrame-throttled so the visibility check runs at most
    // once per paint instead of once per raw scroll event, keeping the
    // transition smooth during fast or continuous scrolling.
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateNavVisibility();
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleThemeToggle() {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem("relayTheme", next);
    if (!document.startViewTransition || !themeToggleRef.current) {
      setTheme(next);
      return;
    }
    const btn = themeToggleRef.current;
    const { top, left, width, height } = btn.getBoundingClientRect();
    const cx = left + width / 2;
    const cy = top + height / 2;
    const endRadius = Math.hypot(
      Math.max(cx, window.innerWidth - cx),
      Math.max(cy, window.innerHeight - cy)
    );
    const transition = document.startViewTransition(() => setTheme(next));
    await transition.ready;
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${cx}px ${cy}px)`,
          `circle(${endRadius}px at ${cx}px ${cy}px)`,
        ],
      },
      {
        duration: 420,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  }

  return (
    /**
     * "light" (the app's own --c-* token override, from app/globals.css)
     * is added alongside "mkt" and "dark" (this page's own scoped
     * --mkt-* tokens) so components reused from the app's design
     * system, like ArchitectureFlow below, stay theme-reactive too,
     * without needing their own --mkt-* rewrite or risking their /app
     * usage elsewhere.
     *
     * animate-fade-in (opacity only, not animate-converge, which
     * animates transform and would make this root div a containing
     * block for every position:fixed descendant on the page, breaking
     * the hero nav's fixed state) fades the whole page in on mount, so
     * arriving here from /app reads as a soft entrance instead of an
     * abrupt cut. Client-side navigation between the two routes
     * unmounts and mounts each page tree with no transition otherwise.
     */
    <div
      className={`mkt relative ${theme === "dark" ? "dark" : "light"} min-h-screen ${motionOn ? "animate-fade-in" : ""}`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-mkt-sage focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <AmbientGradient
        sageVar="--mkt-sage"
        sageSoftVar="--mkt-sage-soft"
        amberVar="--mkt-amber"
      />
      {/* Same canvas-based particle background /app uses, reused directly (not rebuilt) so density, speed, and reduced-motion behavior stay identical and the two pages cannot drift apart again. */}
      <ParticleField paused={!motionOn} />
      <div className="relative z-10">
        {/**
         * Nav lives outside header on purpose. Header has
         * overflow-hidden (needed to clip the video to the hero's box),
         * and CSS overflow clips position:fixed descendants too once the
         * ancestor scrolls out of view, even though "fixed" is normally
         * viewport relative. Nesting nav inside header meant it silently
         * vanished once scrolled far enough that header itself was
         * off-screen. As a sibling, it is not subject to header's
         * clipping at all.
         */}
        <div className="relative">
          {/**
           * Always position:fixed, never swapped for position:absolute.
           * Show and hide are pure transform/opacity changes, so
           * pointer-events is toggled alongside them: hidden means
           * genuinely non-interactive, not just invisible, so a
           * mid-fade nav can never absorb a click meant for the page
           * underneath it.
           */}
          <nav
            aria-label="Primary"
            className="z-30 fixed left-1/2 top-4 flex w-[calc(100%-2rem)] max-w-7xl items-center justify-between gap-4 rounded-full border px-6 py-3 backdrop-blur-md sm:w-[calc(100%-4rem)]"
            style={{
              background: "rgb(var(--mkt-card) / 0.9)",
              borderColor: "rgb(var(--mkt-line) / 0.6)",
              transform: `translateX(-50%) translateY(${navVisible ? 0 : -32}px)`,
              opacity: navVisible ? 1 : 0,
              pointerEvents: navVisible ? "auto" : "none",
              // Theme-reactive: a shadow opacity tuned for the dark hero read as muddy once the fixed pill floats over light-mode content instead.
              boxShadow:
                theme === "dark"
                  ? "0 8px 24px -8px rgba(0,0,0,0.35)"
                  : "0 8px 24px -8px rgba(0,0,0,0.12)",
              /**
               * Slower and gentler than a typical UI micro-interaction
               * on purpose, this is a large, ever-present element
               * repositioning itself, not a button state change, so it
               * reads as deliberate rather than snappy. The decelerating
               * curve (quick start, soft settle) is shared by opacity
               * too, rather than opacity running its own plain ease, so
               * the fade and the movement finish together instead of
               * opacity visibly lagging or leading the slide.
               */
              transition:
                "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/**
             * Same mark and wordmark treatment as /app's header (same
             * SVG paths, same font-display/tracking-tight wordmark),
             * scaled down to fit this nav's compact pill instead of a
             * full page header, so the Relay brand reads as one
             * consistent identity across both pages.
             */}
            <div className="flex items-center gap-2 text-mkt-ink">
              <Logo size={22} className="shrink-0" />
              <span className="whitespace-nowrap font-display text-lg font-semibold tracking-tight">
                Relay Guard
              </span>
            </div>
            <div className="hidden items-center gap-8 text-sm text-mkt-muted md:flex">
              <a href="#how" className="hover:opacity-100">
                How it works
              </a>
              <Link href="/app?mode=demo" className="hover:opacity-100">
                Try the demo
              </Link>
              <a href="#faq" className="hover:opacity-100">
                FAQ
              </a>
            </div>
            <div className="flex items-center gap-3">
              {/* Mobile only, md:flex above already gives desktop a full text nav, so the compact menu would just duplicate it there. Below md this is the only way to reach How it works and FAQ. */}
              <div className="md:hidden">
                <NavMenu
                  page="marketing"
                  colors={{
                    ink: "rgb(var(--mkt-ink))",
                    muted: "rgb(var(--mkt-muted))",
                    line: "rgb(var(--mkt-line))",
                    card: "rgb(var(--mkt-card))",
                    accent: "rgb(var(--mkt-sage))",
                  }}
                  buttonColors={{
                    icon: "rgb(var(--mkt-ink))",
                    border: "rgb(var(--mkt-line))",
                  }}
                />
              </div>
              <button
                ref={themeToggleRef}
                onClick={handleThemeToggle}
                aria-label={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-mkt-line text-mkt-ink transition hover:-translate-y-px"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={theme}
                    aria-hidden="true"
                    initial={
                      motionOn ? { opacity: 0, rotate: -90, scale: 0.6 } : false
                    }
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={
                      motionOn
                        ? { opacity: 0, rotate: 90, scale: 0.6 }
                        : undefined
                    }
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <Icon
                      name={theme === "dark" ? "dark_mode" : "light_mode"}
                      className="text-[18px] align-middle"
                    />
                  </motion.span>
                </AnimatePresence>
              </button>
              <Link
                href="/app"
                className="rounded bg-mkt-sage px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Open the app
              </Link>
            </div>
          </nav>

          {/**
           * overflow-hidden (not visible): the phone mockup stays fully
           * contained within the hero instead of bleeding past its
           * bottom edge into the ticker section. pt-24 gives real
           * clearance below the fixed nav pill above (nav sits at top-4
           * with roughly a 78px bottom edge, so this is close to the
           * minimum that avoids overlap, not extra room to spare). Kept
           * flat across breakpoints rather than growing further at sm+,
           * since the previous sm:pt-32/pb-24 pushed the CTA row and
           * phone mockup below the fold on a standard laptop viewport
           * at 100% zoom.
           */}
          <header className="relative isolate overflow-hidden pt-24 pb-12 sm:pb-16">
            <HeroVideo motionOn={motionOn} theme={theme} />

            {/**
             * items-start on the grid, not items-center, for the two
             * columns relative to each other. The phone (about 693px) is
             * much taller than the text column (about 350 to 400px):
             * centering them against each other pushed the phone's top
             * above the headline's top, so scrolling down cut the
             * phone's status bar and frame off above the viewport edge
             * while the headline was still fully visible, which looked
             * like the phone was breaking. Top-aligning the columns
             * means the phone's extra height only extends downward past
             * the hero (the intended bleed effect), never upward past
             * the nav. The text column gets its own self-center instead,
             * to visually sit toward the middle of the shared row height
             * (which the taller phone dictates) without affecting the
             * phone's alignment at all.
             */}
            <div
              id="main-content"
              className={`relative z-20 mx-auto grid w-full max-w-6xl items-start gap-12 ${SECTION_X} md:grid-cols-[1.1fr_1fr]`}
            >
              {motionOn ? (
                <motion.div
                  className="flex flex-col gap-8 self-center"
                  initial="hidden"
                  animate="visible"
                  variants={heroText}
                >
                  <div className="flex flex-col gap-5">
                    <motion.h1
                      variants={heroTextItem}
                      className="font-display text-4xl font-medium leading-tight tracking-tight text-mkt-fixed-light sm:text-5xl"
                      style={{ textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
                    >
                      Money that moves
                      <br />
                      the way you <span className="mkt-accent">speak</span>.
                    </motion.h1>
                    <motion.p
                      variants={heroTextItem}
                      className="max-w-md text-lg text-mkt-fixed-light/80"
                      style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
                    >
                      Type a sentence, say &ldquo;send 5 USDC to
                      0x2c9b…7fa4&rdquo;, and Relay Guard unifies your balance, covers
                      the network fee, and sends. No chain picker, no gas quote,
                      no seed phrase.
                    </motion.p>
                  </div>
                  <motion.div
                    variants={heroTextItem}
                    className="flex items-center gap-6"
                  >
                    <Link
                      href="/app"
                      className="inline-block rounded bg-mkt-sage px-5 py-2.5 text-sm font-medium text-white transition hover:-translate-y-px hover:opacity-90"
                    >
                      Open the app
                    </Link>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-8 self-center">
                  <div className="flex flex-col gap-5">
                    <h1
                      className="font-display text-4xl font-medium leading-tight tracking-tight text-mkt-fixed-light sm:text-5xl"
                      style={{ textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
                    >
                      Money that moves
                      <br />
                      the way you <span className="mkt-accent">speak</span>.
                    </h1>
                    <p
                      className="max-w-md text-lg text-mkt-fixed-light/80"
                      style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
                    >
                      Type a sentence, say &ldquo;send 5 USDC to
                      0x2c9b…7fa4&rdquo;, and Relay Guard unifies your balance, covers
                      the network fee, and sends. No chain picker, no gas quote,
                      no seed phrase.
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <Link
                      href="/app"
                      className="inline-block rounded bg-mkt-sage px-5 py-2.5 text-sm font-medium text-white transition hover:-translate-y-px hover:opacity-90"
                    >
                      Open the app
                    </Link>
                  </div>
                </div>
              )}
              {motionOn ? (
                <motion.div
                  className="min-w-0"
                  initial="hidden"
                  animate="visible"
                  variants={phoneReveal}
                >
                  <PhoneMock motionOn={motionOn} />
                </motion.div>
              ) : (
                <div className="min-w-0">
                  <PhoneMock motionOn={motionOn} />
                </div>
              )}
            </div>
          </header>
        </div>

        {/* Dark backdrop band: the ticker, the feature strip and "How it
            works" sit on the /app artwork, so the landing page carries the
            same identity as the product before you open it.

            isolate matters here. It makes this wrapper a stacking context,
            so the -z-10 layer below paints above the wrapper's own
            background but still behind this content. Without it the layer
            would slide behind the page background and disappear.

            "mkt dark" is the page's own scoped dark palette (app/marketing.css
            redefines every --mkt-* token under .mkt.dark). Setting both
            classes here flips the whole subtree to light text in one place,
            including QuoteCarousel's internals, instead of overriding colours
            element by element. The page keeps its own light/dark toggle; this
            band is dark in both, because the artwork under it always is. */}
        <div className="mkt dark relative isolate">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-cover bg-center"
            style={{
              backgroundImage: "url(/app-bg.svg)",
              backgroundColor: "#070B14",
            }}
          />
          <TxTicker />

          <div className="border-y border-mkt-line">
            <div className={`mx-auto max-w-6xl ${SECTION_X} py-9`}>
              <StaggerGrid className="grid grid-cols-2 gap-8 md:grid-cols-4">
                {STRIP.map((s) => (
                  <StaggerCard key={s.h} className="flex flex-col gap-1">
                    <h4 className="text-sm font-semibold text-mkt-ink">{s.h}</h4>
                    <p className="text-sm text-mkt-muted">{s.p}</p>
                  </StaggerCard>
                ))}
              </StaggerGrid>
            </div>
          </div>

          <section id="how" className={SECTION_Y}>
            <div className={`mx-auto max-w-6xl ${SECTION_X}`}>
              <QuoteCarousel motionOn={motionOn} />
            </div>
          </section>
        </div>

        <section id="proof" className={SECTION_Y}>
          <div className={`mx-auto max-w-6xl ${SECTION_X}`}>
            <Reveal>
              <TrustPanel motionOn={motionOn} />
            </Reveal>
          </div>
        </section>

        <section className={SECTION_Y}>
          <div
            className={`mx-auto flex max-w-6xl flex-col gap-12 ${SECTION_X}`}
          >
            <Reveal className="flex max-w-xl flex-col gap-3">
              <p className="font-mono text-xs uppercase tracking-widest text-mkt-muted2">
                From a sentence to a settled send
              </p>
              <h2 className="font-display text-3xl font-medium tracking-tight text-mkt-ink">
                Three steps, <span className="mkt-accent">invisible</span> to
                you.
              </h2>
            </Reveal>
            <StaggerGrid className="grid gap-10 md:grid-cols-3">
              {STEPS.map((s) => (
                <StaggerCard key={s.n} className="flex flex-col gap-2">
                  <p className="font-mono text-sm text-mkt-sage">{s.n}</p>
                  <h3 className="text-lg font-medium text-mkt-ink">{s.h}</h3>
                  <p className="text-sm text-mkt-muted">{s.p}</p>
                </StaggerCard>
              ))}
            </StaggerGrid>
          </div>
        </section>

        <section className={SECTION_Y}>
          <div
            className={`mx-auto flex max-w-6xl flex-col gap-10 ${SECTION_X}`}
          >
            <Reveal className="mx-auto flex max-w-md flex-col gap-2 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-mkt-muted2">
                The full path
              </p>
              <h2 className="font-display text-2xl font-medium tracking-tight text-mkt-ink sm:text-3xl">
                Five steps, <span className="mkt-accent">invisible</span> to
                you.
              </h2>
              <p className="text-sm text-mkt-muted">
                Every one of these happens in under two seconds, you only see
                the first and the last.
              </p>
            </Reveal>
            <Reveal>
              <ArchitectureFlow motionOn={motionOn} />
            </Reveal>
          </div>
        </section>

        <section className={SECTION_Y}>
          <div
            className={`mx-auto flex max-w-6xl flex-col gap-12 ${SECTION_X}`}
          >
            <Reveal className="flex max-w-xl flex-col gap-3">
              <p className="font-mono text-xs uppercase tracking-widest text-mkt-muted2">
                Built for your first send, and your hundredth
              </p>
              <h2 className="font-display text-3xl font-medium tracking-tight text-mkt-ink">
                Nothing to <span className="mkt-accent">learn</span>, everything
                to check.
              </h2>
            </Reveal>
            <StaggerGrid className="grid gap-px overflow-hidden rounded-xl border border-mkt-line bg-mkt-line sm:grid-cols-2">
              {FEATURE_CARDS.map((f) => (
                <StaggerCard
                  key={f.h}
                  variants={scaleIn}
                  className="flex flex-col gap-2 bg-mkt-card p-8 transition-transform hover:-translate-y-1"
                >
                  <h3 className="text-lg font-medium text-mkt-ink">{f.h}</h3>
                  <p className="text-sm text-mkt-muted">{f.p}</p>
                  {f.hashes && (
                    <div className="flex flex-col gap-1.5 font-mono text-xs text-mkt-muted2">
                      {f.hashes.map((h) => (
                        <span key={h}>{h}</span>
                      ))}
                    </div>
                  )}
                </StaggerCard>
              ))}
            </StaggerGrid>
          </div>
        </section>

        <section id="faq" className={SECTION_Y}>
          <div
            className={`mx-auto flex max-w-6xl flex-col gap-12 ${SECTION_X}`}
          >
            <Reveal className="flex max-w-xl flex-col gap-3">
              <p className="font-mono text-xs uppercase tracking-widest text-mkt-muted2">
                Questions you&apos;d actually ask
              </p>
              <h2 className="font-display text-3xl font-medium tracking-tight text-mkt-ink">
                Straight answers, plainly put.
              </h2>
            </Reveal>
            <Reveal>
              <FaqAccordion />
            </Reveal>
          </div>
        </section>

        <section className={`${SECTION_Y} text-center`}>
          <div className={`mx-auto flex max-w-6xl flex-col gap-8 ${SECTION_X}`}>
            <Reveal className="flex flex-col gap-8">
              <h2 className="font-display text-3xl font-medium tracking-tight text-mkt-ink sm:text-4xl">
                Your first send is one sentence away.
              </h2>
              <div className="flex justify-center gap-6">
                <Link
                  href="/app"
                  className="rounded bg-mkt-sage px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Open the app
                </Link>
                <a
                  href="#how"
                  className="border-b border-mkt-line pb-0.5 text-sm text-mkt-muted"
                >
                  How it works
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        <footer className="border-t border-mkt-line py-14">
          <div
            className={`mx-auto flex max-w-6xl flex-col gap-10 ${SECTION_X}`}
          >
            <div className="grid gap-8 sm:grid-cols-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-mkt-ink">
                  <Logo size={20} className="shrink-0" />
                  <span className="whitespace-nowrap font-display text-base font-semibold tracking-tight">
                    Relay Guard
                  </span>
                </div>
                <p className="max-w-xs text-sm text-mkt-muted">
                  Speak your money. SERV Reasoning decides if it should move.
                  Real transfers, sponsored gas, checkable on-chain.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <h5 className="text-xs uppercase tracking-wide text-mkt-muted2">
                  Product
                </h5>
                <div className="flex flex-col gap-2 text-sm text-mkt-muted">
                  <a href="#how">How it works</a>
                  <a href="#proof">Live proof</a>
                  <Link href="/app">Open the app</Link>
                  <Link href="/app?mode=demo">Try the demo</Link>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <h5 className="text-xs uppercase tracking-wide text-mkt-muted2">
                  Learn
                </h5>
                <div className="flex flex-col gap-2 text-sm text-mkt-muted">
                  <a
                    href="https://sepolia.arbiscan.io/address/0x8DD23aBBA62f10306805F0B2C8BF8459d1C3974e"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Verified contract
                  </a>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <h5 className="text-xs uppercase tracking-wide text-mkt-muted2">
                  Connect
                </h5>
                <div className="flex flex-col gap-2 text-sm text-mkt-muted">
                  <a
                    href="https://x.com/Daveilorah"
                    target="_blank"
                    rel="noreferrer"
                  >
                    @Daveilorah on X
                  </a>
                  <span className="font-mono text-xs">
                    Built with Particle, Magic, ZeroDev. Settled on Arbitrum.
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mkt-line pt-6 text-xs text-mkt-muted2">
              <span>
                &copy; 2026 Relay Guard. Sends are real, demo mode is always labeled.
              </span>
              <span className="font-mono">
                Policy verified on Arbitrum Sepolia. Settlement proven on
                Arbitrum One mainnet.
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
