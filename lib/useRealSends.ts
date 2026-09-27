"use client";
/**
 * lib/useRealSends.ts
 *
 * Shared fetch of /api/real-sends across every consumer on a page (the
 * marketing ticker, /app's ticker, the payment receipt quote). A
 * module-level cached promise means the first mounted consumer
 * triggers the fetch and every other consumer on the same page load
 * awaits that same promise, so they can never show a different "most
 * recent" send than each other from fetching a moment apart.
 */
import { useEffect, useState } from "react";
import type { LiveSend, RealSendsResponse } from "../types/types";

let cachedFetch: Promise<RealSendsResponse> | null = null;

function fetchRealSendsOnce(): Promise<RealSendsResponse> {
  if (!cachedFetch) {
    cachedFetch = fetch("/api/real-sends")
      .then((res) => res.json())
      .catch(() => ({ sends: [] }) as RealSendsResponse);
  }
  return cachedFetch;
}

export function useRealSends(): { sends: LiveSend[]; loading: boolean } {
  const [sends, setSends] = useState<LiveSend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchRealSendsOnce().then((data) => {
      if (cancelled) return;
      setSends(data.sends ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { sends, loading };
}
