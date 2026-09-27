"use client";
// components/UnifiedBalance.tsx
/**
 * THE SIGNATURE ELEMENT. Money scattered across chains, converging into one
 * number. Editorial monochrome: the number itself carries the weight, not
 * color. Fraunces for the hero figure, IBM Plex Mono for chain metadata.
 */

import { useEffect, useState } from "react";
import type { UnifiedBalance as Balance } from "../lib/config";

const CHAIN_COLOR: Record<string, string> = {
  Base: "#0052FF",
  Arbitrum: "#28A0F0",
  Optimism: "#FF0420",
  Polygon: "#8247E5",
};

export default function UnifiedBalance({
  balance,
}: {
  balance: Balance | null;
}) {
  const [revealed, setRevealed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (balance) {
      const t = setTimeout(() => setRevealed(true), 120);
      return () => clearTimeout(t);
    }
  }, [balance]);

  if (!balance) return null;

  /**
   * Particle surfaces every supported chain, most sitting at $0 for a given
   * wallet. Honest (nothing hidden), but a long scroll of zero rows dilutes
   * the reveal moment. Show funded chains by default; zero-balance chains
   * stay one click away, never actually hidden.
   */
  const nonZero = balance.perChain.filter((c) => Number(c.amount) > 0);
  const zero = balance.perChain.filter((c) => Number(c.amount) <= 0);
  const visibleChains = showAll ? balance.perChain : nonZero;

  return (
    <div className="rounded-2xl border border-line bg-slate/80 backdrop-blur-md p-6 transition-colors">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-dim">
          Your balance · unified
        </span>
        <span className="font-mono text-[10px] text-mist">
          {balance.perChain.length} chains → 1
        </span>
      </div>

      <div className="mb-1">
        <span className="font-display text-5xl font-medium tracking-tight text-chalk">
          ${balance.totalUsd}
        </span>
      </div>
      <p className="mb-4 text-xs text-mist">spendable anywhere</p>

      <div>
        {visibleChains.map((c, i) => (
          <div
            key={`${c.chain}-${c.token}`}
            className={`flex items-center justify-between gap-3 border-t border-line py-2.5 transition-transform hover:translate-x-1 first:border-t-0 first:mt-2 ${
              revealed ? "animate-converge" : "opacity-0"
            }`}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  background: CHAIN_COLOR[c.chain] ?? "rgb(var(--c-dim))",
                }}
              />
              <span className="truncate font-mono text-[11px] text-mist">
                {c.chain}
              </span>
            </span>
            {/* Amount + usd stacked, not a 3rd competing column. Keeps
                every row a clean two-column layout at any width. */}
            <span className="flex shrink-0 flex-col items-end">
              <span className="text-sm font-medium text-chalk">
                {c.amount} {c.token}
              </span>
              <span className="font-mono text-[10px] text-dim">${c.usd}</span>
            </span>
          </div>
        ))}
      </div>

      {zero.length > 0 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 font-mono text-[10px] uppercase tracking-wider text-dim hover:text-chalk"
        >
          {showAll
            ? "hide zero-balance chains"
            : `show all ${balance.perChain.length} chains`}
        </button>
      )}

      <p className="mt-4 text-xs leading-relaxed text-mist">
        Relay Guard sees funds on every chain as one balance. You never bridge, never
        switch networks, never pick where the money comes from.
      </p>
    </div>
  );
}
