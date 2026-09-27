"use client";
// app/app/page.tsx
/**
 * Relay, editorial monochrome. Type a sentence -> unified balance reveals ->
 * confirm -> cross-chain routing narrated -> real result. Particle field,
 * scroll reveals, and a transaction ticker layer on top without touching the
 * core flow or API contracts.
 */

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import ParticleField from "../../components/ParticleField";
import AmbientGradient from "../../components/AmbientGradient";
import NavMenu from "../../components/NavMenu";
import IntegrationStatus from "../../components/IntegrationStatus";
import UnifiedBalance from "../../components/UnifiedBalance";
import ExecutionSteps, { type Step } from "../../components/ExecutionSteps";
import TransactionTicker, {
  type RealTick,
} from "../../components/TransactionTicker";
import PaymentReceipt from "../../components/PaymentReceipt";
import Icon from "../../components/Icon";
import { RELAY_MODE, RELAY_POLICY_ADDRESS, EXPLORER } from "../../lib/config";
import { useReveal } from "../../lib/useReveal";
import {
  useSessionPersist,
  clearRelaySession,
} from "../../lib/useSessionPersist";
import type {
  UnifiedBalance as Balance,
  ExecutionResult,
} from "../../lib/config";
import type { ErrorLike } from "../../types/types";
import GuardPanel from "../../components/GuardPanel";
import type { GuardedIntent } from "../../lib/serv";

type GuardedClientIntent = GuardedIntent & { guardToken?: string };

// ssr:false keeps magic-sdk out of the SSR webpack bundle
const MagicLogin = dynamic(() => import("../../components/MagicLogin"), {
  ssr: false,
});

type Phase = "login" | "input" | "parsed" | "executing" | "done";

const EXAMPLE = "send 5 USDC to 0x1234abcd5678ef901234abcd5678ef901234abcd";

// catch() gives unknown, thrown values aren't guaranteed to be real Error
// instances, so this narrows only as far as "is it an object" before
// reading the fields used below.
function toErrorLike(err: unknown): ErrorLike {
  return typeof err === "object" && err !== null ? (err as ErrorLike) : {};
}

export default function Home() {
  const [relayMode, setRelayModeState] = useState<"demo" | "live">(RELAY_MODE);
  const [phase, setPhase] = useSessionPersist<Phase>(
    "relay:phase",
    RELAY_MODE === "live" ? "login" : "input"
  );

  /**
   * On mount, decide the effective mode. An explicit ?mode= query param
   * (e.g. the marketing page's "Try the demo" link) wins over whatever's
   * in localStorage: it's a deliberate one-time nudge, so it starts
   * clean instead of mixing in a stale in-progress session, and is
   * intentionally NOT written back to localStorage. That stays reserved
   * for the user's own explicit toggle click, so clicking "Try the demo"
   * once can't silently hijack a later plain /app visit that's supposed
   * to mean "the real product." Without a query param, fall back to
   * localStorage as before (preserves an in-progress session on refresh).
   */
  useEffect(() => {
    const queryMode = new URLSearchParams(window.location.search).get("mode");
    if (queryMode === "demo" || queryMode === "live") {
      setRelayModeState(queryMode);
      setText("");
      setIntent(null);
      setResult(null);
      setSteps([]);
      setError(null);
      setOwnerAddress(null);
      setPhase(queryMode === "live" ? "login" : "input");
      return;
    }

    const saved = localStorage.getItem("relayMode") as "demo" | "live" | null;
    if (saved && saved !== RELAY_MODE) {
      setRelayModeState(saved);
      setPhase(saved === "live" ? "login" : "input");
    }
    /**
     * Deliberately mount-only: the setters used here are stable across
     * renders, and re-running this on every state change would reset
     * the URL/localStorage seed this effect only means to apply once.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [text, setText] = useSessionPersist("relay:text", "");
  const [intent, setIntent] = useSessionPersist<GuardedClientIntent | null>(
    "relay:intent",
    null
  );
  const [reviewAck, setReviewAck] = useState(false);
  const [balance, setBalance] = useSessionPersist<Balance | null>(
    "relay:balance",
    null
  );
  const [steps, setSteps] = useSessionPersist<Step[]>("relay:steps", []);
  const [result, setResult] = useSessionPersist<ExecutionResult | null>(
    "relay:result",
    null
  );
  /**
   * Real, non-demo completed sends only. Accumulates actual proof across
   * the session instead of only ever showing synthetic ticker data.
   * Client-side/sessionStorage only, capped at 10, no backend needed.
   */
  const [realHistory, setRealHistory] = useSessionPersist<RealTick[]>(
    "relay:realHistory",
    []
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useSessionPersist<string | null>(
    "relay:error",
    null
  );
  const [motionOn, setMotionOn] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);

  // On mount, read localStorage and sync: avoids SSR/hydration mismatch
  useEffect(() => {
    const savedTheme = localStorage.getItem("relayTheme") as
      "dark" | "light" | null;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  function toggleMode() {
    const next = relayMode === "demo" ? "live" : "demo";
    localStorage.setItem("relayMode", next);
    setRelayModeState(next);
    setText("");
    setIntent(null);
    setResult(null);
    setSteps([]);
    setError(null);
    setOwnerAddress(null);
    setPhase(next === "live" ? "login" : "input");
  }

  // Default motion off if the OS prefers reduced motion, but this is only
  // the STARTING value. The explicit toggle below always wins after that,
  // which is what makes it a real override instead of a suggestion.
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) setMotionOn(false);
  }, []);

  // Restore Magic session on page load so returning users don't re-enter OTP
  useEffect(() => {
    const queryMode = new URLSearchParams(window.location.search).get("mode");
    // An explicit ?mode=demo nudge should never get quietly overridden by
    // a real Magic session restoring itself underneath it.
    if (queryMode === "demo") return;
    const currentMode =
      queryMode === "live"
        ? "live"
        : ((localStorage.getItem("relayMode") as "demo" | "live") ??
          RELAY_MODE);
    if (currentMode !== "live") return;
    (async () => {
      try {
        const { isLoggedIn, getMagicSigner } = await import("../../lib/magic");
        const loggedIn = await isLoggedIn();
        if (loggedIn) {
          const signer = await getMagicSigner();
          setOwnerAddress(signer.address);
          // Only advance past the login gate, don't stomp a phase (parsed/
          // executing/done) that useSessionPersist already restored.
          setPhase((p) => (p === "login" ? "input" : p));
        }
      } catch {
        // If Magic session check fails, leave on login screen; user will re-auth
      }
    })();
    /**
     * Deliberately mount-only: this checks for a restorable Magic
     * session exactly once on page load. setPhase and setOwnerAddress
     * are stable setters, and re-running this on every phase change
     * would re-trigger the Magic session check whenever the flow moves
     * past login.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [copied, setCopied] = useState<"address" | "deposit" | null>(null);
  const themeToggleRef = useRef<HTMLButtonElement>(null);

  function copyToClipboard(text: string, key: "address" | "deposit") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function handleThemeToggle() {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem("relayTheme", next);
    // Use View Transitions API for the circle-wipe effect if available
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
    const transition = document.startViewTransition(() => {
      setTheme(next);
    });
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

  const tickerReveal = useReveal<HTMLDivElement>();
  const receiptReveal = useReveal<HTMLDivElement>();
  const mainSectionRef = useRef<HTMLDivElement>(null);

  async function handleLoginSuccess(address: string) {
    if (!address) {
      setError(
        "Login succeeded but your wallet address is empty. Please try again."
      );
      return;
    }
    setOwnerAddress(address);
    setPhase("input");
    setTimeout(
      () =>
        mainSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      100
    );
  }

  /**
   * Shared by both the immediate post-login reveal and the refresh-on-parse
   * path below. A plain function (not inlined in either call site) so
   * there's exactly one place that knows how to fetch+auth a balance.
   */
  async function fetchBalance() {
    try {
      // Live mode reads a real cross-chain balance, so prove wallet ownership
      // first so the server isn't just trusting whatever address we send.
      let authProof: Partial<{
        ownerAddress: string;
        authTimestamp: number;
        authSignature: string;
      }> = {};
      if (relayMode === "live" && ownerAddress) {
        const { getMagicSigner } = await import("../../lib/magic");
        const { signAuthProof } = await import("../../lib/authMessage");
        const signer = await getMagicSigner();
        authProof = await signAuthProof(signer);
      }

      const balRes = await fetch("/api/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: relayMode, ...authProof }),
      });
      const balData = await balRes.json();
      if (balData.error) setError(balData.error);
      setBalance(balData.balance ?? null);
    } catch {
      /**
       * Balance is supplementary to whatever else is happening on screen.
       * Fail silently here rather than stomp a more specific error from
       * the caller (e.g. handleParse's own catch).
       */
    }
  }

  /**
   * Show the unified balance the moment the wallet is ready, matching the
   * hero's promise ("Relay shows your unified balance up front") instead of
   * gating the reveal behind typing an intent. Fires on fresh login AND on
   * the restored-session path (both just set ownerAddress), and again if
   * relayMode ever changes while logged in.
   */
  useEffect(() => {
    if (relayMode !== "live" || !ownerAddress) return;
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerAddress, relayMode]);

  async function handleParse() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const parsed: GuardedClientIntent = await res.json();
      if (!res.ok) throw new Error((parsed as { error?: string }).error);
      setIntent(parsed);
      setReviewAck(false);

      /**
       * Refresh too, in case the balance changed between login and typing.
       * The immediate post-login fetch above is the FIRST reveal, not
       * the only one.
       */
      await fetchBalance();
      setPhase("parsed");
    } catch {
      setError("Couldn't read that. Try rephrasing your request.");
    } finally {
      setBusy(false);
    }
  }

  async function handleExecute() {
    if (!intent) return;
    if (relayMode === "live" && !ownerAddress) {
      setError("Please log in before sending in live mode.");
      return;
    }
    setPhase("executing");
    setBusy(true);

    const initial: Step[] = [
      {
        label: "Reading your request",
        state: "done",
        detail: `${intent.amount} ${intent.token} → ${shorten(intent.recipient)}`,
      },
      {
        label: "Relay Guard (SERV Reasoning)",
        state: "done",
        detail: `${intent.guard?.verdict ?? "?"} · risk ${intent.guard?.riskScore ?? "?"}/100`,
      },
      { label: "ZeroDev gas-sponsored check", state: "active" },
      { label: "Routing through your Universal Account", state: "idle" },
      { label: "Confirming on Arbitrum", state: "idle" },
    ];
    setSteps(initial);

    try {
      if (relayMode === "live" && ownerAddress) {
        // Prove wallet ownership before the server fires a real
        // gas-sponsored UserOp on our behalf.
        const { getMagicSigner } = await import("../../lib/magic");
        const { signAuthProof } = await import("../../lib/authMessage");
        const signer = await getMagicSigner();
        const authProof = await signAuthProof(signer);

        // Server fires ZeroDev sponsored UserOp + validates intent
        const validateRes = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent,
            mode: relayMode,
            guardToken: intent.guardToken,
            reviewAck,
            ...authProof,
          }),
        });
        const validateData = await validateRes.json();

        await tick(600);
        // Show ZeroDev result in step 1
        if (validateData.userOpHash) {
          setSteps((s) =>
            mark(s, 2,
              "done",
              `userOp: ${validateData.userOpHash.slice(0, 18)}…`
            )
          );
        } else {
          setSteps((s) =>
            mark(s, 2,
              "done",
              validateData.zdError
                ? `check skipped: ${validateData.zdError.slice(0, 40)}`
                : "gas sponsored"
            )
          );
        }
        setSteps((s) => mark(s, 3, "active"));
        await tick(700);

        if (!validateData.ready) {
          setSteps((s) => mark(s, 3, "error", validateData.error));
          setError(validateData.error ?? "Validation failed.");
          setPhase("done");
          setBusy(false);
          return;
        }

        setSteps((s) => mark(s, 3, "done", "routing to Arbitrum"));
        setSteps((s) => mark(s, 4, "active"));
        await tick(400);

        // Client-side: sign and broadcast via Universal Account (reuse the
        // signer we already fetched above for the ownership proof)
        const { sendUnifiedTransfer } = await import("../../lib/particle-ua");
        const txResult = await sendUnifiedTransfer({
          signer,
          to: intent.recipient!,
          amount: intent.amount!,
          token: intent.token ?? "USDC",
          tokenAddress: validateData.tokenAddress,
        });
        if (!txResult.ok) {
          /**
           * txResult.error already carries the real Particle error message
           * (+ JSON-RPC code, see lib/particle.ts). Log the whole result
           * too so a stale/truncated UI string is never the only record.
           */
          console.error(
            "[handleExecute] sendUnifiedTransfer failed:",
            txResult
          );
          setSteps((s) => mark(s, 4, "error", txResult.error));
          setError(txResult.error ?? "Transfer failed.");
          setPhase("done");
          setBusy(false);
          return;
        }
        setSteps((s) =>
          mark(s, 4,
            "done",
            txResult.userOpHash ?? txResult.transactionId ?? txResult.txHash
          )
        );
        setResult({
          ...txResult,
          ok: true,
          userOpHash: validateData.userOpHash ?? txResult.userOpHash,
        });
        /**
         * Real, non-demo send. Accumulate as verifiable proof for the
         * ticker and receipt, prepended ahead of any live-fetched
         * history in both (see lib/useRealSends.ts) since this is the
         * most immediately relevant real send to whoever just sent it.
         *
         * The live sendUnifiedTransfer() path (lib/particle.ts) never
         * actually sets txHash on its result, only transactionId and
         * explorerUrl. That left a real gap: if transactionId ever came
         * back empty too (and the ZeroDev check's userOpHash was also
         * absent, e.g. via its own zdError branch), every fallback was
         * falsy and this push was silently skipped: a successful send
         * that recorded nothing, with no error anywhere. txResult.ok is
         * already true by this point, so a successful send must always
         * produce SOME id here; synthesize one as a last resort instead
         * of ever silently no-op'ing.
         */
        const realTxHash =
          txResult.txHash ?? txResult.transactionId ?? validateData.userOpHash;
        if (!realTxHash) {
          console.warn(
            "[handleExecute] successful send had no txHash/transactionId/userOpHash. Falling back to a synthetic id.",
            { txResult, validateData }
          );
        }
        setRealHistory((h) =>
          [
            {
              amount: intent.amount!,
              token: intent.token ?? "USDC",
              recipient: intent.recipient!,
              txHash: realTxHash ?? `pending-${Date.now()}`,
              timestamp: Date.now(),
              explorerUrl: txResult.explorerUrl,
            },
            ...h,
          ].slice(0, 10)
        );
        setPhase("done");
      } else {
        // Demo path: server handles everything
        const res = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent,
            mode: relayMode,
            guardToken: intent.guardToken,
            reviewAck,
          }),
        });
        const data = await res.json();
        if (res.status === 403) {
          setSteps((s) => mark(s, 2, "error", data.error));
          setError(data.error ?? "Relay Guard stopped this payment.");
          setPhase("done");
          setBusy(false);
          return;
        }

        await tick(600);
        setSteps((s) =>
          mark(s, 2,
            "done",
            data.sourcedFrom ? "unified across chains" : undefined
          )
        );
        setSteps((s) => mark(s, 3, "active"));
        await tick(700);
        setSteps((s) => mark(s, 3, "done", "no bridging, no gas"));
        setSteps((s) => mark(s, 4, "active"));
        await tick(700);

        if (data.ok || data.mode === "demo") {
          setSteps((s) => mark(s, 4, "done", data.transactionId));
          setResult(data);
          setPhase("done");
        } else {
          setSteps((s) => mark(s, 4, "error", data.error));
          setError(data.error ?? "Execution failed.");
          setPhase("done");
        }
      }
    } catch (rawErr: unknown) {
      const err = toErrorLike(rawErr);
      /**
       * Full underlying error: a generic caught-exception path (network
       * drop, unexpected throw) that isn''''t already logged closer to its
       * source above.
       */
      console.error("[handleExecute] uncaught error:", {
        message: err.message,
        code: err.code,
        stack: err.stack,
        raw: rawErr,
      });
      setError(
        err.message ?? "Execution failed. Check your connection and try again."
      );
      setPhase("done");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPhase(relayMode === "live" && !ownerAddress ? "login" : "input");
    setText("");
    setIntent(null);
    setReviewAck(false);
    setResult(null);
    setSteps([]);
    setError(null);
    clearRelaySession();
    /**
     * clearRelaySession() wipes every "relay:"-prefixed key, but
     * realHistory is cumulative verified proof, not per-flow UI state.
     * "send another" should never erase a real send that already
     * happened. Re-persist the current value right after the blanket
     * clear (React state itself was never touched, only storage).
     */
    setRealHistory(realHistory);
  }

  return (
    /**
     * animate-fade-in (opacity only, see app/page.tsx for why not
     * animate-converge, which animates transform and silently breaks any
     * position:fixed descendant by making this root a containing block
     * for it) fades the page in on mount, so arriving here from / reads
     * as a soft entrance rather than an abrupt cut. Client-side nav
     * between the two routes unmounts/mounts each page tree with no
     * transition otherwise.
     */
    <main
      className={`relative overflow-hidden bg-ink transition-colors duration-300 ${motionOn ? "animate-fade-in" : "motion-off"} ${theme === "light" ? "light" : ""}`}
    >
      <AmbientGradient
        sageVar="--c-check"
        sageSoftVar="--c-check-soft"
        amberVar="--c-amber"
      />
      <ParticleField paused={!motionOn} />

      <div className="relative z-10 mx-auto max-w-4xl px-6 pb-16 lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        {/* Frame rules: only show above 2xl, where the centered column
            leaves enough side margin that it can read as unfinished empty
            space rather than a deliberate editorial gutter. Same hairline
            weight as the border-t dividers already used throughout, just
            vertical and very low opacity so it stays a quiet frame, not a
            new visual element competing with content. Negative z-index
            keeps these behind the (unpositioned, "auto"-stacked) content
            that follows, without needing to touch anything else's z-index. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 -z-10 hidden border-l border-line/40 2xl:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden border-r border-line/40 2xl:block"
        />

        <header className="flex items-center justify-between border-b border-line py-5">
          <Link href="/" className="flex items-center gap-3">
            <svg
              width="28"
              height="28"
              viewBox="0 0 30 30"
              fill="none"
              className="shrink-0 text-chalk"
            >
              <circle cx="6" cy="7" r="2.2" fill="currentColor" opacity="0.5" />
              <circle
                cx="24"
                cy="7"
                r="2.2"
                fill="currentColor"
                opacity="0.5"
              />
              <circle
                cx="15"
                cy="24"
                r="2.2"
                fill="currentColor"
                opacity="0.5"
              />
              <path
                d="M6 7 L15 15 M24 7 L15 15 M15 24 L15 15"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.3"
              />
              <circle cx="15" cy="15" r="3.4" fill="currentColor" />
            </svg>
            <span className="font-display text-2xl font-semibold tracking-tight text-chalk sm:text-3xl">
              Relay
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Separate from the mode toggle below on purpose: this is
                page navigation (home / demo), that's a within-app data
                mode switch (demo/live sandbox vs a real wallet). Keeping
                them as two distinct controls avoids conflating "where am
                I" with "what mode is my data in". */}
            <NavMenu
              page="app"
              colors={{
                ink: "rgb(var(--c-chalk))",
                muted: "rgb(var(--c-mist))",
                line: "rgb(var(--c-line2))",
                card: "rgb(var(--c-slate))",
                accent: "rgb(var(--c-check))",
              }}
            />
            {/* Icon-only controls at every width: real Material Symbols
                glyphs read clearly at 18px, so there's no need for a
                separate mobile/desktop text-label split anymore; this is
                also narrower than the old text-pill versions, which is
                what actually fixes the 375px header overflow. Both header
                buttons are the same filled-pill/badge shape (border + soft
                background tint + icon), so they read as one consistent
                control family; only the accent color differs, reserved
                for the live/demo distinction the badge itself is about. */}
            <button
              onClick={toggleMode}
              className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition hover:opacity-80 ${
                relayMode === "live"
                  ? "border-check bg-check/10 text-check"
                  : "border-line2 bg-line2/20 text-mist"
              }`}
              title={`Switch to ${relayMode === "live" ? "demo" : "live"} mode`}
            >
              {relayMode}
              <Icon
                name={relayMode === "live" ? "bolt" : "science"}
                className="text-[16px] align-middle"
              />
            </button>
            <button
              ref={themeToggleRef}
              onClick={handleThemeToggle}
              title={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              aria-label="Toggle theme"
              className="flex shrink-0 items-center justify-center rounded-full border border-line2 bg-line2/20 p-1.5 text-mist hover:text-chalk"
            >
              <Icon
                name={theme === "dark" ? "dark_mode" : "light_mode"}
                className="text-[18px] align-middle"
              />
            </button>
          </div>
        </header>

        {/* No hero copy/ticker above the interface: the send interface is
            the only thing meant to occupy the first screen. The ticker
            (proof-of-life activity) now lives just above the trust/proof
            section below instead, where it belongs alongside the rest of
            that "check the evidence" zone rather than competing with the
            interface for first attention. */}
        <div ref={mainSectionRef} className="pt-10">
          <section className="mx-auto w-full max-w-xl">
            {phase === "login" && (
              <div className="mb-6 rounded-2xl border border-line bg-slate p-6">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-dim">
                  Step 1 of 2
                </p>
                <h2 className="mb-1 font-display text-xl font-medium text-chalk">
                  Connect your wallet
                </h2>
                <p className="mb-5 text-sm text-mist">
                  Magic creates a non-custodial EOA from your email, no seed
                  phrase, no download.
                </p>
                <MagicLogin onLogin={handleLoginSuccess} />
              </div>
            )}

            {phase === "input" && (
              <div>
                {/* Live mode: always show wallet section, address if known, connect prompt if not */}
                {relayMode === "live" && !ownerAddress && (
                  <div className="mb-6 rounded-2xl border border-line bg-slate p-5">
                    <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-dim">
                      Your wallet
                    </p>
                    <p className="mb-4 text-sm text-mist">
                      Connect your wallet to see your address and start sending.
                    </p>
                    <MagicLogin onLogin={handleLoginSuccess} />
                  </div>
                )}

                {ownerAddress && (
                  <div className="mb-6 rounded-2xl border border-check/30 bg-slate p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-check animate-pulse" />
                      <p className="font-mono text-[10px] uppercase tracking-widest text-check">
                        Wallet ready
                      </p>
                    </div>

                    {/* Magic EOA address: this is what Particle UA reads across all chains */}
                    <div>
                      <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-dim">
                        Your address
                      </p>
                      <div className="flex items-center gap-2 rounded-lg border border-line bg-ink px-3 py-2.5">
                        <p className="flex-1 break-all font-mono text-xs text-chalk leading-relaxed">
                          {ownerAddress}
                        </p>
                        <button
                          onClick={() =>
                            copyToClipboard(ownerAddress, "address")
                          }
                          className="flex shrink-0 items-center gap-1 rounded border border-line px-2.5 py-1 font-mono text-[10px] text-mist transition hover:border-line2 hover:text-chalk"
                        >
                          <Icon
                            name={
                              copied === "address" ? "check" : "content_copy"
                            }
                            className="text-[14px] align-middle"
                          />
                          {copied === "address" ? "copied" : "copy"}
                        </button>
                      </div>
                    </div>

                    {/* Funding guide */}
                    <div className="rounded-lg border border-line bg-ink/60 p-3">
                      <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-dim">
                        Fund your wallet
                      </p>
                      <ol className="space-y-1 text-xs text-mist">
                        <li className="flex gap-2">
                          <span className="shrink-0 text-dim">1.</span>Copy your
                          address above
                        </li>
                        <li className="flex gap-2">
                          <span className="shrink-0 text-dim">2.</span>Send USDC
                          on Arbitrum mainnet for a send that settles right
                          away, funds on Base, Optimism, or Polygon show up in
                          your balance too, but sends currently need the amount
                          already on Arbitrum
                        </li>
                        <li className="flex gap-2">
                          <span className="shrink-0 text-dim">3.</span>Type what
                          you want to send below
                        </li>
                      </ol>
                      <div className="mt-3 flex gap-3 border-t border-line pt-3">
                        <a
                          href="https://faucet.circle.com"
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-0.5 font-mono text-[9px] uppercase tracking-wider text-dim underline hover:text-check transition"
                        >
                          USDC faucet{" "}
                          <Icon
                            name="open_in_new"
                            className="text-[14px] align-middle no-underline"
                          />
                        </a>
                        <a
                          href="https://bridge.arbitrum.io"
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-0.5 font-mono text-[9px] uppercase tracking-wider text-dim underline hover:text-check transition"
                        >
                          Arbitrum bridge{" "}
                          <Icon
                            name="open_in_new"
                            className="text-[14px] align-middle no-underline"
                          />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Up-front reveal: shows as soon as fetchBalance resolves
                    post-login, before any typing. UnifiedBalance itself
                    renders nothing while balance is still null. */}
                {ownerAddress && (
                  <div className="mb-6">
                    <UnifiedBalance balance={balance} />
                  </div>
                )}

                <div className="mb-8">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={EXAMPLE}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-line bg-slate p-4 font-mono text-sm text-chalk placeholder:text-dim focus:border-line2 focus:outline-none"
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() => setText(EXAMPLE)}
                      className="font-mono text-xs text-dim hover:text-chalk"
                    >
                      try an example
                    </button>
                    <button
                      onClick={handleParse}
                      disabled={busy || !text.trim()}
                      className="rounded-lg bg-chalk px-5 py-2.5 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-40"
                    >
                      {busy ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-3 w-3 animate-spin rounded-full border border-ink/30 border-t-ink" />
                          reading…
                        </span>
                      ) : (
                        "Send →"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {phase === "parsed" && intent && (
              <div className="space-y-6">
                <UnifiedBalance balance={balance} />

                {intent.guard && (
                  <GuardPanel
                    guard={intent.guard}
                    trace={intent.trace ?? []}
                    reviewAck={reviewAck}
                    onReviewAck={setReviewAck}
                  />
                )}

                <div className="rounded-2xl border border-line bg-slate p-6">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-dim">
                    Ready to send
                  </span>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-display text-2xl font-medium text-chalk">
                      {intent.amount} {intent.token}
                    </span>
                    <span className="text-dim">→</span>
                    <button
                      onClick={() =>
                        intent.recipient &&
                        copyToClipboard(intent.recipient, "deposit")
                      }
                      className="flex items-center gap-1 font-mono text-sm text-mist hover:text-chalk transition"
                      title={intent.recipient ?? ""}
                    >
                      {shorten(intent.recipient)}
                      <Icon
                        name={copied === "deposit" ? "check" : "content_copy"}
                        className="text-[15px] align-middle"
                      />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-dim">
                    Gas sponsored · settles on Arbitrum · no seed phrase
                  </p>

                  {!intent.recipient && (
                    <p className="mt-3 rounded-lg border border-line2 bg-ink p-2 text-xs text-mist">
                      No recipient found. Add an address like 0x… and try again.
                    </p>
                  )}
                  {intent.recipient && !intent.recipient.startsWith("0x") && (
                    <p className="mt-3 rounded-lg border border-line2 bg-ink p-2 text-xs text-mist">
                      ENS names aren&apos;t supported yet. Paste the full 0x
                      address instead.
                    </p>
                  )}
                  {!intent.amount && (
                    <p className="mt-3 rounded-lg border border-line2 bg-ink p-2 text-xs text-mist">
                      No amount found. Try: &quot;send 5 USDC to 0x…&quot;
                    </p>
                  )}

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={reset}
                      className="rounded-lg border border-line px-4 py-2 text-sm text-mist hover:text-chalk"
                    >
                      back
                    </button>
                    <button
                      onClick={handleExecute}
                      disabled={
                        !intent.recipient ||
                        !intent.recipient.startsWith("0x") ||
                        !intent.amount ||
                        intent.action !== "transfer" ||
                        !intent.guard ||
                        intent.guard.verdict === "BLOCK" ||
                        (intent.guard.verdict === "REVIEW" && !reviewAck)
                      }
                      className="flex-1 rounded-lg bg-chalk px-5 py-2 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-40"
                    >
                      {intent.guard?.verdict === "BLOCK"
                        ? "Blocked by Relay Guard"
                        : "Confirm & send"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(phase === "executing" || phase === "done") && (
              <div className="space-y-6">
                <ExecutionSteps steps={steps} result={result} />

                {phase === "executing" && (
                  <button
                    onClick={reset}
                    className="font-mono text-xs text-dim hover:text-chalk"
                  >
                    stuck? start over
                  </button>
                )}

                {phase === "done" && !result?.ok && !error && (
                  <div className="rounded-2xl border border-line2 bg-slate p-6">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-mist">
                      Didn&apos;t go through
                    </span>
                    <p className="mt-2 text-sm text-chalk">
                      {result?.error ??
                        "We couldn't confirm what happened with this send. It may not have gone through."}
                    </p>
                    <button
                      onClick={reset}
                      className="mt-4 rounded-lg border border-line px-4 py-2 text-sm text-mist hover:text-chalk"
                    >
                      start over
                    </button>
                  </div>
                )}

                {phase === "done" && result?.ok && (
                  <div className="animate-converge rounded-2xl border border-check/40 bg-slate p-6">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-check">
                      Payment sent
                    </span>
                    <p className="mt-2 text-sm text-chalk">
                      {intent?.amount} {intent?.token} delivered. The recipient
                      never knew a chain was involved.
                    </p>
                    {result.explorerUrl && (
                      <div className="mt-3 flex items-center gap-3">
                        <a
                          href={result.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-0.5 font-mono text-xs text-check underline"
                        >
                          view transaction{" "}
                          <Icon
                            name="open_in_new"
                            className="text-[14px] align-middle no-underline"
                          />
                        </a>
                        {(result.txHash ?? result.transactionId) && (
                          <button
                            onClick={() =>
                              copyToClipboard(
                                result.txHash ?? result.transactionId ?? "",
                                "address"
                              )
                            }
                            className="flex items-center gap-1 font-mono text-[10px] text-dim hover:text-chalk transition"
                          >
                            <Icon
                              name={
                                copied === "address" ? "check" : "content_copy"
                              }
                              className="text-[13px] align-middle"
                            />
                            {copied === "address" ? "copied" : "copy tx id"}
                          </button>
                        )}
                      </div>
                    )}
                    {relayMode === "demo" && (
                      <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-dim">
                        demo result, switch to live mode for a real on-chain tx
                      </p>
                    )}
                    <button
                      onClick={reset}
                      className="mt-4 block rounded-lg border border-line px-4 py-2 text-sm text-mist hover:text-chalk"
                    >
                      send another
                    </button>
                  </div>
                )}

                {phase === "done" && error && (
                  <div className="rounded-2xl border border-line2 bg-slate p-6">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-mist">
                      Didn&apos;t go through
                    </span>
                    <p className="mt-2 text-sm text-chalk">{error}</p>
                    <button
                      onClick={reset}
                      className="mt-4 rounded-lg border border-line px-4 py-2 text-sm text-mist hover:text-chalk"
                    >
                      try again
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && phase === "input" && (
              <p className="mt-4 text-sm text-mist">{error}</p>
            )}
          </section>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 pb-16 lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 -z-10 hidden border-l border-line/40 2xl:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden border-r border-line/40 2xl:block"
        />

        {/* Softened into ambient background texture rather than a sharp,
            eye-catching scroll: it's illustrative "proof of life" flavor,
            not the actual evidence (that's the fully-crisp receipt section
            below). pointer-events-none since the blur makes individual
            links unreadable/unclickable-looking anyway; the same real tx
            is still a normal clickable link down in the receipt section. */}
        <div
          ref={tickerReveal.ref}
          className={`mt-16 pointer-events-none select-none opacity-60 blur-[1.5px] ${tickerReveal.className}`}
        >
          <TransactionTicker realHistory={realHistory} />
        </div>

        {/* De-emphasized on purpose, not hidden: this is evidence a judge
            is specifically told to check, so it stays fully legible (no
            blur/opacity tricks), just quieter than the interface above:
            smaller/lighter heading, muted (not full-contrast) color, more
            surrounding whitespace, and a hairline border marking it as a
            distinct secondary zone. PaymentReceipt itself (the actual tx
            hash/link) is untouched: that stays a normal, full-size,
            clickable target regardless. */}
        <div
          ref={receiptReveal.ref}
          className={`mt-20 border-t border-line/60 pt-10 text-center ${receiptReveal.className}`}
        >
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-dim">
            A payment, verified
          </p>
          <h2 className="mx-auto mb-1.5 max-w-md font-display text-base font-medium tracking-tight text-mist">
            Every send, on the record.
          </h2>
          <p className="mx-auto mb-6 max-w-md text-xs text-mist">
            Each payment settles on Arbitrum and is verifiable by anyone: the
            receipt, not a promise.
          </p>
          <div className="mx-auto max-w-lg text-left">
            <PaymentReceipt realHistory={realHistory} />
          </div>
        </div>
      </div>

      {/* Footer intentionally sits on a wider max-w-6xl column than the
          narrower editorial width used above it, so it spreads across
          the page instead of reading as packed to one side. */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-16 2xl:max-w-7xl">
        <footer className="mt-16 border-t border-line pt-8">
          <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
            <div className="flex flex-col gap-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-dim">
                Project
              </p>
              <a
                href="https://github.com/Chibey-max/relay"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-mist hover:text-chalk"
              >
                GitHub{" "}
                <Icon name="open_in_new" className="text-[14px] align-middle" />
              </a>
              <a
                href={`${EXPLORER}/address/${RELAY_POLICY_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-mist hover:text-chalk"
              >
                Contract{" "}
                <Icon name="open_in_new" className="text-[14px] align-middle" />
              </a>
              <a
                href="https://arbiscan.io/tx/0x118ff441d1bb070c000b74a940ebc3637dfd3d989781321bd8ec47b22f80dcfe"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-mist hover:text-chalk"
              >
                Live transaction{" "}
                <Icon name="open_in_new" className="text-[14px] align-middle" />
              </a>
            </div>
            <div className="flex flex-col gap-3 sm:items-end sm:text-right">
              <IntegrationStatus />
            </div>
          </div>
          <p className="mt-8 border-t border-line pt-4 text-xs leading-relaxed text-mist">
            Policy contract verified on Arbitrum Sepolia, settlement proven on
            Arbitrum One mainnet.
          </p>
        </footer>
      </div>
    </main>
  );
}

function shorten(addr: string | null): string {
  if (!addr) return "N/A";
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
function tick(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function mark(
  steps: Step[],
  i: number,
  state: Step["state"],
  detail?: string
): Step[] {
  return steps.map((s, idx) =>
    idx === i ? { ...s, state, detail: detail ?? s.detail } : s
  );
}
