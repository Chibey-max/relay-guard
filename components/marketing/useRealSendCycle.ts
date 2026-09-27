"use client";
// components/marketing/useRealSendCycle.ts
// Drives the "which real send is showing" state for phone-mockup success
// screens: fully fades out, swaps, then fades back in (no cross-fade
// overlap), on a ~3.8s cadence. Respects reduced motion / motionOn=false
// by simply never advancing past the first entry.

import { useEffect, useState } from "react";
import { REAL_SENDS } from "../../lib/realSends";

export function useRealSendCycle(
  motionOn: boolean,
  intervalMs = 3800,
  fadeMs = 300
) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!motionOn || REAL_SENDS.length < 2) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % REAL_SENDS.length);
        setVisible(true);
      }, fadeMs);
    }, intervalMs);
    return () => clearInterval(id);
  }, [motionOn, intervalMs, fadeMs]);

  return { idx, visible, current: REAL_SENDS[idx] };
}
