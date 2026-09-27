// app/api/balance/route.ts
/**
 * Returns the unified cross-chain balance. In demo mode, returns seeded data
 * (badged as demo client-side). In live mode, the client passes the UA owner
 * address and we fetch real Primary Assets from Particle.
 */

import { NextRequest, NextResponse } from "next/server";
import { RELAY_MODE } from "../../../lib/config";
import { DEMO_BALANCE } from "../../../constants/demo";
import { verifyOwnerAuth } from "../../../lib/auth";
import { rateLimit, clientIp } from "../../../lib/rate-limit";
import type { ErrorLike } from "../../../types/types";

/**
 * catch() gives unknown, a thrown value is not guaranteed to be a real
 * Error instance, so this narrows only as far as "is it an object"
 * before reading the fields callers actually use.
 */
function toErrorLike(err: unknown): ErrorLike {
  return typeof err === "object" && err !== null ? (err as ErrorLike) : {};
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`balance:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Slow down and try again." },
      { status: 429 }
    );
  }

  const body = await req.json();
  // Client-side mode toggle overrides the build-time env default
  const mode = body.mode ?? RELAY_MODE;

  if (mode === "demo") {
    return NextResponse.json({ mode: "demo", balance: DEMO_BALANCE });
  }

  // Live: fetch from Particle using the owner address.
  const { ownerAddress, authTimestamp, authSignature } = body;
  if (!ownerAddress) {
    return NextResponse.json(
      { error: "ownerAddress required in live mode." },
      { status: 400 }
    );
  }

  /**
   * Prove the caller actually controls ownerAddress before we read (and
   * return) their real cross-chain balance.
   */
  const auth = await verifyOwnerAuth({
    ownerAddress,
    authTimestamp,
    authSignature,
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { createUniversalAccount, getUnifiedBalance } =
      await import("../../../lib/particle");
    const ua = createUniversalAccount(ownerAddress);
    const balance = await getUnifiedBalance(ua);
    return NextResponse.json({ mode: "live", balance });
  } catch (rawErr: unknown) {
    /**
     * Honest failure (Rule 6): surface the real reason, including the V2
     * migration notice if Particle returns it.
     */
    const err = toErrorLike(rawErr);
    return NextResponse.json(
      { mode: "live", error: err.message ?? "Balance fetch failed" },
      { status: 502 }
    );
  }
}
