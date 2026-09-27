"use client";
/**
 * components/marketing/TxTicker.tsx
 *
 * Real, live-fetched Relay sends (see app/api/real-sends/route.ts,
 * shared via lib/useRealSends.ts) instead of illustrative/fabricated
 * examples. Falls back to the two known-real, hardcoded transactions
 * in lib/realSends.ts if the live fetch is empty, loading, or fails,
 * so this never shows fabricated data and never shows nothing.
 *
 * Static row below MARQUEE_THRESHOLD items, a scrolling marquee at or
 * above it. A scrolling marquee visually implies more content than a
 * viewer can see at once, which reads as dishonest with only 1 or 2
 * genuinely real entries looping, the steady-state case in practice
 * (see docs/frontend.md's live real-send data section: the wallet's
 * real sends are structurally undetectable by the live fetch, so the
 * two-entry fallback is not a temporary loading state, it is normal).
 */

import Icon from "../Icon";
import { useRealSends } from "../../lib/useRealSends";
import { REAL_SENDS } from "../../lib/realSends";
import type { LiveSend } from "../../types/types";

const MARQUEE_THRESHOLD = 5;

interface Tick {
  to: string;
  amt: string;
}

function shortenAddr(a: string): string {
  return a.length <= 12 ? a : `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/**
 * Parsed straight from lib/realSends.ts's title strings ("5.00 USDC to
 * 0x829C…2e63", "0.00005 ETH · EIP-7702") rather than duplicating the
 * amounts/recipients as a second hardcoded list that could drift out
 * of sync with that file.
 */
const FALLBACK_TICKS: Tick[] = REAL_SENDS.map((s) => {
  const toMatch = s.title.match(/to (.+)$/);
  return {
    amt: s.title.split(toMatch ? " to " : " · ")[0],
    to: toMatch ? toMatch[1] : s.hash,
  };
});

function liveSendToTick(send: LiveSend): Tick {
  return { to: shortenAddr(send.to), amt: `${send.valueEth} ETH` };
}

function Chip({ to, amt, reverse }: Tick & { reverse?: boolean }) {
  // Arrow direction matches this row's own scroll direction (arrow_back
  // on the reversed, rightward-scrolling row, arrow_forward on the
  // other) instead of a static arrow pointing the same way regardless
  // of motion. Static (non-marquee) rows always point forward, there is
  // no direction to match.
  return (
    <div className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-mkt-line bg-mkt-card px-3.5 py-2 text-sm transition-transform hover:-translate-y-0.5">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mkt-sage opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mkt-sage" />
      </span>
      <span className="font-mono text-mkt-ink">{amt}</span>
      <span className="flex items-center gap-1 text-mkt-muted">
        <Icon
          name={reverse ? "arrow_back" : "arrow_forward"}
          className="shrink-0 text-[13px] align-middle"
        />
        {to}
      </span>
    </div>
  );
}

function MarqueeRow({ items, reverse }: { items: Tick[]; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div className="mkt-ticker-mask flex overflow-hidden" aria-hidden="true">
      <div
        className={`flex shrink-0 gap-3 pr-3 ${reverse ? "animate-scroll-right" : "animate-scroll-left"}`}
      >
        {doubled.map((t, i) => (
          <Chip key={`${t.to}-${i}`} {...t} reverse={reverse} />
        ))}
      </div>
    </div>
  );
}

export default function TxTicker() {
  const { sends } = useRealSends();
  const items: Tick[] =
    sends.length > 0 ? sends.map(liveSendToTick) : FALLBACK_TICKS;

  return (
    <div className="flex flex-col gap-6 py-10">
      <p className="text-center font-mono text-xs uppercase tracking-widest text-mkt-muted2">
        Real sends, on the record
      </p>
      {items.length >= MARQUEE_THRESHOLD ? (
        // Decorative and duplicated for the seamless scroll illusion, hidden from assistive tech via aria-hidden on each Row above.
        <div className="flex flex-col gap-3">
          <MarqueeRow items={items} />
          <MarqueeRow items={[...items].reverse()} reverse />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {items.map((t) => (
            <Chip key={t.to} {...t} />
          ))}
        </div>
      )}
    </div>
  );
}
