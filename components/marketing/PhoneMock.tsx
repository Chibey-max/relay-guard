"use client";
/**
 * components/marketing/PhoneMock.tsx
 *
 * Decorative hero phone mockup: agent identity, then compose, then
 * processing, then success, looping. Ported from
 * design-reference/relay-landing-v10 (1).html. Purely local animation
 * state (useAgentPhoneLoop), no SDK or API calls.
 *
 * Note on scope: the margin utilities inside the phone screens below
 * are a pixel-precise device mockup's internal rhythm, not general page
 * layout, so they are kept as is rather than converted to the
 * gap-based sibling spacing pattern used elsewhere on this page. See
 * docs/frontend.md.
 */

import { useAgentPhoneLoop } from "./useAgentPhoneLoop";
import { useRealSendCycle } from "./useRealSendCycle";

function Layer({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute inset-0 flex flex-col overflow-y-auto bg-mkt-card px-6 pb-5 pt-5 transition-all duration-400 ${
        active
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      }`}
      /**
       * "safe center" (not plain center) centers short content, but
       * falls back to top alignment instead of clipping the top if a
       * screen's content ever grows taller than the phone's height, the
       * same scroll safety the overflow-y-auto above is there for.
       */
      style={{ justifyContent: "safe center" }}
    >
      {children}
    </div>
  );
}

export default function PhoneMock({ motionOn }: { motionOn: boolean }) {
  const { screen, typedText, rowsShown, ctaShown, ctaPressed, procDone } =
    useAgentPhoneLoop(motionOn);

  const rows = [
    { label: "Recipient", value: "0x2c9b…7fa4" },
    { label: "Amount", value: "5.00 USDC" },
    { label: "Network fee", value: "Sponsored", chip: true },
    { label: "Settling on", value: "Arbitrum" },
  ];

  return (
    <div className="flex min-w-0 justify-center">
      {/* Outer box reserves exactly the scaled-down footprint at each breakpoint (320 times the same 0.6/0.85/1 factors used below) so there is no leftover dead space around a visually-shrunk phone. The inner phone (next div) always renders at its native 320px design width and is scaled and centered to fill this box exactly. */}
      <div
        className="relative w-full max-w-[192px] sm:max-w-[272px] lg:max-w-[320px]"
        style={{ aspectRatio: "9 / 18" }}
      >
        <div
          // Fixed 320px design width, never responsive, only the transform scales it via --phone-scale, so nothing inside ever reflows or collides at smaller sizes. It is the same layout at every size, just visually bigger or smaller as one image.
          className="absolute left-1/2 top-1/2 w-[320px] rounded-[54px] border-[1px] border-mkt-phone-ring bg-mkt-phone-frame p-3 [--phone-scale:0.6] sm:[--phone-scale:0.85] lg:[--phone-scale:1]"
          style={{
            /**
             * 9/18, not the real device 9/19.5, on purpose: a little
             * shorter than an actual phone so the mockup fits within a
             * standard laptop viewport at 100% zoom alongside the
             * headline and CTAs, without needing more vertical hero
             * padding to compensate.
             */
            aspectRatio: "9 / 18",
            /**
             * The wide, soft drop shadow picks up a faint warm amber
             * cast (rather than plain neutral gray) since this phone
             * sits near the amber anchor of the page's ambient
             * background gradient, a small detail toward reading as "in"
             * that light instead of pasted on top of it.
             *
             * The transition below exists because --mkt-amber's value
             * differs between themes: without it, this shadow layer
             * snapped to its new color instantly on toggle while the
             * rest of the page (which does have a transition on
             * background and color) faded smoothly, and that mismatch
             * was a visible flash on theme switch.
             */
            boxShadow:
              "0 40px 80px -20px rgba(0,0,0,0.45), 0 15px 30px -15px rgba(0,0,0,0.3), 0 60px 90px -35px rgb(var(--mkt-amber) / 0.18), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 1px rgba(0,0,0,0.25)",
            transition: "box-shadow 0.3s ease",
            transform: "translate(-50%, -50%) scale(var(--phone-scale))",
          }}
        >
          {/* Side buttons, raised via their own tiny highlight/shadow gradient rather than a flat rectangle. */}
          <div
            className="absolute -right-[2px] top-[26%] h-[62px] w-[3px] rounded-l-sm"
            style={{
              background:
                "linear-gradient(90deg, rgb(var(--mkt-muted2)) 0%, rgb(var(--mkt-line)) 100%)",
              boxShadow: "1px 0 1px rgba(0,0,0,0.2)",
            }}
          />
          <div
            className="absolute -right-[2px] top-[42%] h-[36px] w-[3px] rounded-l-sm"
            style={{
              background:
                "linear-gradient(90deg, rgb(var(--mkt-muted2)) 0%, rgb(var(--mkt-line)) 100%)",
              boxShadow: "1px 0 1px rgba(0,0,0,0.2)",
            }}
          />

          <div
            className="relative flex h-full flex-col overflow-hidden rounded-[42px] border-[2px] border-mkt-line bg-mkt-card"
            // A real border, not box-shadow: the Layer screens inside paint their own opaque background edge to edge via inset-0, which sits above a box-shadow and would silently cover all but the sliver where no Layer background reached. A real border occupies its own space outside the content box, so children can never paint over it.
          >
            <StatusBar />

            <div className="relative flex-1 overflow-hidden">
              <Layer active={screen === "agent"}>
                <AgentScreen />
              </Layer>
              <Layer active={screen === "compose"}>
                <ComposeScreen
                  typedText={typedText}
                  rowsShown={rowsShown}
                  ctaShown={ctaShown}
                  ctaPressed={ctaPressed}
                  rows={rows}
                />
              </Layer>
              <Layer active={screen === "processing"}>
                <ProcessingScreen procDone={procDone} />
              </Layer>
              <Layer active={screen === "success"}>
                <SuccessScreen motionOn={motionOn} />
              </Layer>
            </div>

            {/* Screen glare, light hitting glass at an angle. pointer-events-none so it never intercepts clicks on real links underneath. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[42px]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Grid (not flex plus manual margins) so the dynamic island's center column stays mathematically centered regardless of how wide the status icon group on the right ends up. The previous flex version left that group empty, which happened to center the island by accident.
function StatusBar() {
  return (
    <div className="grid h-[46px] shrink-0 grid-cols-[1fr_auto_1fr] items-center px-5 text-mkt-ink">
      <span className="font-mono text-[13px] font-medium">9:41</span>
      <div className="relative h-[22px] w-[76px] justify-self-center rounded-xl bg-mkt-fixed-dark">
        <span
          aria-hidden="true"
          className="absolute right-2 top-1/2 h-[6px] w-[6px] -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, #3f3f3f, #050505 70%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
          }}
        />
      </div>
      <span
        className="flex items-center justify-end gap-[5px]"
        aria-hidden="true"
      >
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <rect x="0" y="7" width="3" height="4" rx="0.6" fill="currentColor" />
          <rect
            x="4.5"
            y="5"
            width="3"
            height="6"
            rx="0.6"
            fill="currentColor"
          />
          <rect x="9" y="3" width="3" height="8" rx="0.6" fill="currentColor" />
          <rect
            x="13.5"
            y="0.5"
            width="3"
            height="10.5"
            rx="0.6"
            fill="currentColor"
          />
        </svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
          <path
            d="M1 4.2C4.8 0.8 10.2 0.8 14 4.2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M3.3 6.8C5.9 4.5 9.1 4.5 11.7 6.8"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="7.5" cy="9.3" r="1.1" fill="currentColor" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect
            x="0.75"
            y="0.75"
            width="20.5"
            height="10.5"
            rx="2.75"
            stroke="currentColor"
            strokeWidth="1"
          />
          <rect
            x="2.25"
            y="2.25"
            width="17.5"
            height="7.5"
            rx="1.5"
            fill="currentColor"
          />
          <rect x="22" y="4" width="2" height="4" rx="1" fill="currentColor" />
        </svg>
      </span>
    </div>
  );
}

function AgentScreen() {
  return (
    <div className="flex flex-col items-center gap-1 pb-10 text-center">
      <div
        className="mb-1 h-11 w-11 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 32% 28%, rgb(var(--mkt-sage-soft)) 0%, rgb(var(--mkt-sage)) 72%)",
        }}
      />
      <h4 className="font-display text-lg font-medium text-mkt-ink">Relay</h4>
      <div className="-mt-1 text-xs text-mkt-muted">your payment agent</div>
      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-mkt-sage-soft/35 px-2.5 py-1 text-[11px] font-medium text-mkt-sage">
        Verified on Arbitrum
      </div>
      <div className="mt-0.5 font-mono text-[10px] text-mkt-muted2">
        RelayPolicy.sol · 0x8DD2…c3974e ↗
      </div>

      <div className="mt-2 flex w-full rounded-xl border border-mkt-line bg-mkt-cream py-2.5">
        {[
          { num: "2", lbl: "Real sends" },
          { num: "100%", lbl: "Gas sponsored", mid: true },
          { num: "0", lbl: "Seed phrases" },
        ].map((s, i) => (
          <div
            key={s.lbl}
            className={`flex-1 text-center ${i !== 2 ? "border-r border-mkt-line" : ""}`}
          >
            <div
              className={`text-sm font-semibold ${s.mid ? "text-mkt-sage" : "text-mkt-ink"}`}
            >
              {s.num}
            </div>
            <div className="mt-0.5 text-[9px] uppercase tracking-wide text-mkt-muted2">
              {s.lbl}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex w-full items-center gap-2.5 rounded-xl bg-mkt-sage px-3 py-2 text-left">
        <span className="font-medium text-[13px] text-white">
          Send with Relay
        </span>
      </div>
      <div className="mt-1.5 flex w-full items-center gap-2.5 rounded-xl border border-mkt-line bg-mkt-cream px-3 py-2 text-left">
        <span className="font-medium text-[13px] text-mkt-ink">
          View real transactions
        </span>
      </div>

      <div className="mt-2.5 rounded-xl border border-mkt-line bg-mkt-cream px-3 py-2.5 text-left text-[11px] leading-snug text-mkt-muted">
        I only move funds you approve. Every real send is signed and public, you
        don&apos;t have to take my word for it.
      </div>
    </div>
  );
}

function ComposeScreen({
  typedText,
  rowsShown,
  ctaShown,
  ctaPressed,
  rows,
}: {
  typedText: string;
  rowsShown: number;
  ctaShown: boolean;
  ctaPressed: boolean;
  rows: { label: string; value: string; chip?: boolean }[];
}) {
  return (
    <div>
      <div className="mb-2 text-xs text-mkt-muted2">Say it</div>
      <div className="mb-4 flex min-h-[1.3em] items-center gap-2 rounded-lg border border-mkt-line bg-mkt-cream px-3.5 py-3 text-sm">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-mkt-sage"
          aria-hidden="true"
        />
        <span className="text-mkt-ink">{typedText}</span>
        <span
          className="ml-px inline-block h-[1em] w-px animate-blink bg-mkt-ink"
          aria-hidden="true"
        />
      </div>
      <div className="mb-1 text-xs text-mkt-muted2">Relay reads it as</div>
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={`flex items-center justify-between border-t py-2.5 text-sm transition-all duration-300 ${
            i === 0 ? "border-transparent" : "border-mkt-line"
          } ${i < rowsShown ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"}`}
        >
          <span className="text-mkt-muted">{row.label}</span>
          {row.chip ? (
            <span className="rounded bg-mkt-sage-soft/40 px-2 py-0.5 font-mono text-[11px] text-mkt-sage">
              {row.value}
            </span>
          ) : (
            <span className="text-mkt-ink">{row.value}</span>
          )}
        </div>
      ))}
      <div
        className={`mt-4 rounded-lg bg-mkt-sage py-3 text-center text-sm font-medium text-white transition-all duration-300 ${
          ctaShown ? "opacity-100" : "opacity-0"
        } ${ctaPressed ? "scale-95" : "scale-100"}`}
      >
        Confirm send
      </div>
    </div>
  );
}

function ProcessingScreen({ procDone }: { procDone: number }) {
  const items = [
    "Confirming instruction",
    "Sponsoring the gas",
    "Settling on Arbitrum",
  ];
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-mkt-sage-soft/40">
        <div
          className="h-5.5 w-5.5 animate-spin rounded-full border-2 border-t-transparent"
          style={{
            borderColor: "rgb(var(--mkt-sage))",
            borderTopColor: "transparent",
          }}
        />
      </div>
      <h4 className="mb-4 font-display text-base font-medium text-mkt-ink">
        Sending your payment
      </h4>
      <div className="rounded-xl border border-mkt-line bg-mkt-cream px-4 py-1">
        {items.map((item, i) => {
          const done = i < procDone;
          return (
            <div
              key={item}
              className={`flex items-center gap-2.5 py-2.5 text-sm transition-colors ${
                i !== items.length - 1 ? "border-b border-mkt-line" : ""
              } ${done ? "text-mkt-ink" : "text-mkt-muted2"}`}
            >
              <span
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border text-[10px] text-white ${
                  done
                    ? "border-mkt-sage bg-mkt-sage"
                    : "border-mkt-line bg-transparent"
                }`}
                aria-hidden="true"
              >
                {done ? "✓" : ""}
              </span>
              {item}
            </div>
          );
        })}
      </div>
      <div className="mt-4 font-mono text-[11px] text-mkt-muted2">
        Gas-free · signed on-chain
      </div>
    </div>
  );
}

function SuccessScreen({ motionOn }: { motionOn: boolean }) {
  const { idx, visible, current } = useRealSendCycle(motionOn);

  return (
    <div className="flex flex-col items-center text-center">
      <div
        key={idx}
        className="mb-4 flex h-14 w-14 animate-stamp items-center justify-center rounded-full bg-mkt-sage"
        aria-hidden="true"
      >
        <span className="text-2xl text-white">✓</span>
      </div>
      <div
        className={`w-full transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        <h4 className="font-display text-lg font-medium text-mkt-ink">Sent.</h4>
        <p className="mb-4 text-sm text-mkt-muted">{current.title}</p>
        <div className="w-full rounded-lg border border-mkt-line bg-mkt-cream p-3.5 text-left text-xs">
          {[
            ["Network fee", "Sponsored"],
            ["Settled on", "Arbitrum"],
            ["Status", "Confirmed"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1 text-mkt-muted">
              <span>{k}</span>
              <b className="font-medium text-mkt-ink">{v}</b>
            </div>
          ))}
        </div>
        {current.href ? (
          <a
            href={current.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block font-mono text-xs text-mkt-sage underline-offset-2 hover:underline"
          >
            {current.hash} ↗
          </a>
        ) : (
          <div className="mt-3 font-mono text-xs text-mkt-sage">
            {current.hash} ↗
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {[0, 1].map((i) => (
          <span
            key={i}
            className={`h-1 w-1 rounded-full transition-colors ${i === idx ? "bg-mkt-sage" : "bg-mkt-line"}`}
          />
        ))}
      </div>
    </div>
  );
}
