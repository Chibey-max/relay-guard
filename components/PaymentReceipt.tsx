"use client";
// components/PaymentReceipt.tsx
/**
 * The "verified" stamp: checkmark and hash fade/scale in ~300-450ms after
 * the quote appears, like a real confirmation landing. Reinforces "verified"
 * through motion and typography, never color decoration.
 *
 * Three-tier source of truth, most specific first: the current session's
 * own just-completed real send (realHistory, from app/app/page.tsx's
 * handleExecute), then the most recent real send fetched live from
 * app/api/real-sends/route.ts (shared across this page via
 * lib/useRealSends.ts, so this and TransactionTicker never disagree on
 * "most recent"), then the hardcoded known-real fallback in
 * lib/realSends.ts as a last resort. Never fabricated data at any tier.
 */

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import type { RealTick } from "./TransactionTicker";
import { useRealSends } from "../lib/useRealSends";
import { REAL_SENDS } from "../lib/realSends";

function shortenHash(h: string): string {
  return h.length <= 20 ? h : `${h.slice(0, 10)}…${h.slice(-7)}`;
}

function shortenAddr(a: string): string {
  return a.length <= 12 ? a : `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/**
 * The one hardcoded last resort: lib/realSends.ts's second entry, the
 * genuinely real EIP-7702 send, parsed from its title string rather than
 * duplicating the amount/recipient as a second hardcoded value that
 * could drift out of sync with that file.
 */
const STATIC_FALLBACK = REAL_SENDS[1];
const STATIC_FALLBACK_AMOUNT = STATIC_FALLBACK.title.split(" ")[0];
const STATIC_FALLBACK_TOKEN = STATIC_FALLBACK.title.split(" ")[1];

interface Quote {
  amount: string;
  token: string;
  recipientText: string;
  hash: string;
  href?: string;
  isEip7702: boolean;
}

/**
 * A real transaction, sent to and confirmed on Arbitrum One mainnet.
 * Genuinely appends the EIP-7702 note only when that can be confirmed
 * (the live-fetched tier carries this from Etherscan's tx type field),
 * never assumed for the session or static fallback tiers.
 */
function buildQuote(q: Quote): string {
  const base = `Verified real transaction. ${q.amount} ${q.token} sent to ${q.recipientText}, settled on Arbitrum One mainnet. Confirmed independently on Arbiscan.`;
  return q.isEip7702 ? `${base} Delegated via EIP-7702.` : base;
}

export default function PaymentReceipt({
  realHistory = [],
}: {
  realHistory?: RealTick[];
}) {
  const { sends } = useRealSends();
  const sessionLatest = realHistory[0];
  const liveLatest = sends[0];

  const quoteData: Quote = sessionLatest
    ? {
        amount: sessionLatest.amount,
        token: sessionLatest.token,
        recipientText: shortenAddr(sessionLatest.recipient),
        hash: shortenHash(sessionLatest.txHash),
        href: sessionLatest.explorerUrl,
        // Not verifiable client-side without a second lookup, defaults
        // to false rather than assume a delegation that can't be shown.
        isEip7702: false,
      }
    : liveLatest
      ? {
          amount: liveLatest.valueEth,
          token: "ETH",
          recipientText: shortenAddr(liveLatest.to),
          hash: shortenHash(liveLatest.hash),
          href: `https://arbiscan.io/tx/${liveLatest.hash}`,
          isEip7702: liveLatest.isEip7702,
        }
      : {
          amount: STATIC_FALLBACK_AMOUNT,
          token: STATIC_FALLBACK_TOKEN,
          recipientText: "Relay",
          hash: STATIC_FALLBACK.hash,
          href: STATIC_FALLBACK.href,
          isEip7702: true,
        };

  const quote = buildQuote(quoteData);
  const who = sessionLatest
    ? `Relay · sent to ${quoteData.recipientText}`
    : "Relay · Arbitrum One mainnet";

  const ref = useRef<HTMLDivElement>(null);
  const [stamped, setStamped] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(() => setStamped(true), 300);
          observer.unobserve(el);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="max-w-lg rounded-2xl border border-line bg-slate p-6 transition-all hover:-translate-y-0.5 hover:border-line2"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-dim">
          Real transaction · confirmed
        </span>
        <span
          className={`flex items-center gap-1 font-mono text-[10px] text-check transition-all duration-500 ${
            stamped ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
        >
          <Icon name="check" className="text-[14px] align-middle" /> verified
        </span>
      </div>
      <p className="mb-4 font-display text-lg italic leading-relaxed text-chalk">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-sm font-medium text-chalk">{who}</span>
        {quoteData.href ? (
          <a
            href={quoteData.href}
            target="_blank"
            rel="noreferrer"
            className={`flex shrink-0 items-center gap-0.5 font-mono text-[10px] text-dim underline transition-opacity duration-500 delay-150 hover:text-check ${
              stamped ? "opacity-100" : "opacity-0"
            }`}
          >
            {quoteData.hash}{" "}
            <Icon
              name="open_in_new"
              className="text-[13px] align-middle no-underline"
            />
          </a>
        ) : (
          <span
            className={`shrink-0 font-mono text-[10px] text-dim transition-opacity duration-500 delay-150 ${
              stamped ? "opacity-100" : "opacity-0"
            }`}
          >
            {quoteData.hash}
          </span>
        )}
      </div>
    </div>
  );
}
