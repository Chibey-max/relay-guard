"use client";
// components/ArchitectureFlow.tsx
/**
 * A self-playing demo reel of the request lifecycle. No interaction
 * required. Reuses the wordmark's own node/line visual language (small
 * dim nodes, thin low-opacity connecting strokes) instead of a new
 * diagram style, and the app's existing `stamp` keyframe for the
 * activation pulse instead of introducing another animation.
 */

import { useEffect, useState } from "react";

interface FlowNode {
  label: string;
  detail: string;
}

const NODES: FlowNode[] = [
  { label: "You type", detail: "“send 5 USDC to 0x…”" },
  { label: "SERV Reasoning", detail: "parses and guards the intent" },
  { label: "Magic", detail: "signs, no seed phrase" },
  { label: "Particle UA", detail: "unifies funds across chains, EIP-7702" },
  { label: "ZeroDev", detail: "sponsors the gas" },
  { label: "Arbitrum", detail: "settles" },
];

const ACTIVE_MS = 1000;
const END_HOLD_MS = 1500;
const REWIND_STEP_MS = 320;
const RESTART_PAUSE_MS = 500;

type NodeState = "idle" | "active" | "done";

/**
 * rewindIndex !== null means we're playing the reverse-rewind: nodes with
 * array index >= rewindIndex have already faded back to idle (in order,
 * starting from the LAST node), nodes before it are still "done". Never
 * reports "active" during rewind. It's a fade, not a re-trigger of the
 * activation pulse.
 */
function stateFor(
  i: number,
  activeIndex: number,
  rewindIndex: number | null
): NodeState {
  if (rewindIndex !== null) return i < rewindIndex ? "done" : "idle";
  if (activeIndex === -1) return "idle";
  if (i < activeIndex) return "done";
  if (i === activeIndex) return "active";
  return "idle";
}

/**
 * Connector i sits between node i and node i+1. During rewind it stays
 * drawn only as long as its downstream node (i+1) hasn't retracted yet,
 * which makes the last connector (ZeroDev -> Arbitrum) retract first,
 * matching the reverse order the nodes themselves fade in.
 */
function isDrawn(
  i: number,
  activeIndex: number,
  rewindIndex: number | null
): boolean {
  if (rewindIndex !== null) return i + 1 < rewindIndex;
  return activeIndex > i;
}

export default function ArchitectureFlow({
  motionOn = true,
}: {
  motionOn?: boolean;
}) {
  /**
   * -1 = reset pause (all idle), 0..NODES.length-1 = that node active,
   * NODES.length = past the last node. Every node reads "done", which is
   * the fully-lit hold state before the rewind plays.
   */
  const [activeIndex, setActiveIndex] = useState(-1);
  const [rewindIndex, setRewindIndex] = useState<number | null>(null);
  const [cycleCount, setCycleCount] = useState(0);

  useEffect(() => {
    if (!motionOn) {
      /**
       * Reduced-motion / motion-off: show the complete picture at rest
       * (every node settled, every connector drawn, no looping or
       * rewind), not a frozen mid-animation and not an empty idle state.
       */
      setActiveIndex(NODES.length);
      setRewindIndex(null);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    const after = (ms: number, fn: () => void) => {
      timeoutId = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    };

    function step(i: number) {
      if (cancelled) return;
      setRewindIndex(null);
      setActiveIndex(i);
      if (i === 0) setCycleCount((c) => c + 1);
      if (i === NODES.length) {
        /**
         * Hold on the fully-complete state long enough to actually
         * register "done" before the rewind starts.
         */
        after(END_HOLD_MS, () => rewind(NODES.length));
      } else {
        after(ACTIVE_MS, () => step(i + 1));
      }
    }

    /**
     * Plays the reverse choreography: Arbitrum fades first (its incoming
     * connector retracts with it), then ZeroDev, Particle UA, Magic, SERV,
     * and finally "You type". The connector feeding each node retracts
     * in the same step, so the rewind reads as one continuous unwind
     * rather than a cut back to idle.
     */
    function rewind(cursor: number) {
      if (cancelled) return;
      setRewindIndex(cursor);
      if (cursor === 0) {
        after(RESTART_PAUSE_MS, () => step(0));
      } else {
        after(REWIND_STEP_MS, () => rewind(cursor - 1));
      }
    }

    step(0);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [motionOn]);

  return (
    <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:gap-0">
      {NODES.map((n, i) => {
        const state = stateFor(i, activeIndex, rewindIndex);
        const drawn = isDrawn(i, activeIndex, rewindIndex);
        return (
          <div key={n.label} className="contents">
            <div className="flex flex-col items-center text-center sm:min-w-0 sm:flex-1">
              <div className="flex h-3 items-center justify-center">
                <span
                  className={`block shrink-0 rounded-full transition-all duration-300 ${
                    state === "active"
                      ? "h-3 w-3 animate-stamp bg-chalk"
                      : state === "done"
                        ? "h-2 w-2 bg-chalk"
                        : "h-1.5 w-1.5 bg-dim"
                  }`}
                />
              </div>
              <p
                className={`mt-3 font-mono text-[11px] uppercase tracking-widest transition-colors duration-300 ${
                  state === "active"
                    ? "font-semibold text-chalk"
                    : state === "done"
                      ? "text-mist"
                      : "text-dim"
                }`}
              >
                {n.label}
              </p>
              <p
                key={i === 0 ? `type-${cycleCount}` : undefined}
                className={`mx-auto mt-1 max-w-[10rem] text-xs leading-relaxed transition-colors duration-300 ${
                  state === "idle" ? "text-dim" : "text-mist"
                } ${i === 0 && state === "active" ? "animate-typewriter" : ""}`}
              >
                {n.detail}
              </p>
            </div>
            {i < NODES.length - 1 && (
              <div className="hidden h-3 shrink-0 items-center px-1 sm:flex sm:min-w-[2rem] sm:flex-1">
                <div className="relative h-px w-full overflow-hidden">
                  <div className="absolute inset-0 bg-line/50" />
                  <div
                    className="absolute inset-0 origin-left bg-chalk transition-transform duration-500 ease-out"
                    style={{ transform: `scaleX(${drawn ? 1 : 0})` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
