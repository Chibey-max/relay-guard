"use client";
/**
 * components/marketing/useAgentPhoneLoop.ts
 *
 * Decorative state machine for the hero phone mockup, ported from the
 * design reference's <script> timing
 * (design-reference/relay-landing-v10 (1).html), as a React hook
 * instead of raw DOM manipulation. Never calls a real SDK or API, this
 * is purely a scripted animation loop.
 */

import { useEffect, useState } from "react";

export type PhoneScreen = "agent" | "compose" | "processing" | "success";

const SENTENCE = "send 5 USDC to 0x2c9b…7fa4";

interface PhoneLoopState {
  screen: PhoneScreen;
  typedText: string;
  rowsShown: number; // 0-4
  ctaShown: boolean;
  ctaPressed: boolean;
  procDone: number; // 0-3
}

const STATIC_END_STATE: PhoneLoopState = {
  screen: "success",
  typedText: SENTENCE,
  rowsShown: 4,
  ctaShown: true,
  ctaPressed: false,
  procDone: 3,
};

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function useAgentPhoneLoop(motionOn: boolean): PhoneLoopState {
  const [state, setState] = useState<PhoneLoopState>({
    screen: "agent",
    typedText: "",
    rowsShown: 0,
    ctaShown: false,
    ctaPressed: false,
    procDone: 0,
  });

  useEffect(() => {
    if (!motionOn) {
      setState(STATIC_END_STATE);
      return;
    }

    let cancelled = false;
    const patch = (p: Partial<PhoneLoopState>) => {
      if (!cancelled) setState((s) => ({ ...s, ...p }));
    };

    async function loop() {
      while (!cancelled) {
        // ---- Screen 0: agent identity ----
        patch({ screen: "agent" });
        await wait(2600);
        if (cancelled) return;

        // ---- Screen 1: compose ----
        patch({
          screen: "compose",
          typedText: "",
          rowsShown: 0,
          ctaShown: false,
          ctaPressed: false,
          procDone: 0,
        });
        await wait(400);
        if (cancelled) return;

        for (let i = 1; i <= SENTENCE.length; i++) {
          patch({ typedText: SENTENCE.slice(0, i) });
          await wait(38);
          if (cancelled) return;
        }
        await wait(350);
        if (cancelled) return;

        for (let i = 1; i <= 4; i++) {
          patch({ rowsShown: i });
          await wait(160);
          if (cancelled) return;
        }
        patch({ ctaShown: true });
        await wait(650);
        if (cancelled) return;

        patch({ ctaPressed: true });
        await wait(200);
        if (cancelled) return;
        patch({ ctaPressed: false });

        // ---- Screen 2: processing ----
        patch({ screen: "processing" });
        for (let i = 1; i <= 3; i++) {
          await wait(500);
          if (cancelled) return;
          patch({ procDone: i });
        }
        await wait(500);
        if (cancelled) return;

        // ---- Screen 3: success ----
        // Long enough to catch one real-send crossfade (see
        // useRealSendCycle's ~3.8s cadence) before the loop moves on.
        patch({ screen: "success" });
        await wait(4200);
        if (cancelled) return;
      }
    }

    loop();
    return () => {
      cancelled = true;
    };
  }, [motionOn]);

  return state;
}
