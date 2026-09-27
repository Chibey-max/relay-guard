"use client";
// lib/useSessionPersist.ts
/**
 * Persists a piece of state to sessionStorage so a reload doesn't wipe the
 * user's progress mid-flow (typed intent, revealed balance, execution steps,
 * result). Uses sessionStorage (not localStorage) deliberately. This is
 * per-tab, per-session state, not something that should survive the user
 * closing the browser or linger indefinitely with financial intent data in it.
 *
 * Usage:
 *   const [phase, setPhase] = useSessionPersist<Phase>("relay:phase", "input");
 *   const [intent, setIntent] = useSessionPersist<ParsedIntent | null>("relay:intent", null);
 *
 * Call `clearRelaySession()` on your reset() function so "send another"
 * actually starts fresh instead of rehydrating stale data.
 */

import { useEffect, useState } from "react";

const PREFIX = "relay:";

export function useSessionPersist<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate once on mount (client-only, sessionStorage doesn't exist server-side)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw));
    } catch {
      // Corrupt or missing entry. Fall back to initial, don't crash the app.
    } finally {
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Persist on every change, after hydration (avoids overwriting stored
   * state with the initial value during the first render).
   */
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /**
       * Storage full or disabled (private browsing). Fail silently,
       * the app still works, it just won't survive a reload.
       */
    }
  }, [key, value, hydrated]);

  return [value, setValue] as const;
}

/** Clears every Relay key from sessionStorage. Call this from reset(). */
export function clearRelaySession() {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}
