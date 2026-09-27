// lib/rate-limit.ts
/**
 * Minimal in-memory rate limiter. Blunts scripted abuse of routes that cost
 * real money (ZeroDev sponsored gas, SERV Reasoning calls) on a single-instance
 * deployment. Each server instance keeps its own counters, so this is not a
 * substitute for a distributed limiter (Redis/Upstash) behind a multi-
 * instance deployment, but it closes the "hit it in a loop" hole cheaply.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { ok: true };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}
