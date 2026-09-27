// app/api/execute/route.ts
/**
 * Validates a transfer intent.
 *
 * DEMO mode: returns a clearly-labelled demo result (no real tx).
 * LIVE mode: fires a ZeroDev-sponsored UserOp (gas sponsorship proof),
 * then hands the client what it needs to broadcast via Particle UA.
 * The actual Particle transfer is signed and broadcast client-side
 * because Magic + the signer live in the browser.
 */

import { NextRequest, NextResponse } from "next/server";
import { RELAY_MODE, RELAY_POLICY_ADDRESS } from "../../../lib/config";
import { DEMO_EXECUTION } from "../../../constants/demo";
import { verifyOwnerAuth } from "../../../lib/auth";
import { rateLimit, clientIp } from "../../../lib/rate-limit";
import { parseEther, type Address } from "viem";
import type { ErrorLike } from "../../../types/types";
import { verifyGuard } from "../../../lib/guardToken";
import { runPolicy } from "../../../lib/policy";

/**
 * catch() gives unknown, a thrown value is not guaranteed to be a real
 * Error instance, so this narrows only as far as "is it an object"
 * before reading the fields callers actually use.
 */
function toErrorLike(err: unknown): ErrorLike {
  return typeof err === "object" && err !== null ? (err as ErrorLike) : {};
}

// Mainnet USDC addresses per chain (Particle UA is mainnet-only)
const TOKEN_ADDRESSES: Record<string, string> = {
  USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Arbitrum mainnet
  USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // Arbitrum mainnet
  ETH: "0x0000000000000000000000000000000000000000", // native
};

const RECIPIENT_RE = /^0x[a-fA-F0-9]{40}$/;

export async function POST(req: NextRequest) {
  const rl = rateLimit(`execute:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Slow down and try again." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { intent, ownerAddress, authTimestamp, authSignature } = body;
  const mode = body.mode ?? RELAY_MODE;

  if (!intent || intent.action !== "transfer") {
    return NextResponse.json(
      { ok: false, error: "Not a transfer intent." },
      { status: 400 }
    );
  }
  if (!intent.recipient || !RECIPIENT_RE.test(intent.recipient)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'No valid recipient address found. Try: "send 5 USDC to 0x..."',
      },
      { status: 400 }
    );
  }
  if (!intent.amount) {
    return NextResponse.json(
      { ok: false, error: 'No amount found. Try: "send 5 USDC to 0x..."' },
      { status: 400 }
    );
  }

  /**
   * Relay Guard gate. Enforced here on the server, in demo AND live mode,
   * so the UI is never the only thing standing between a BLOCK and a send.
   *  1. The signed receipt from /api/parse-intent must be valid and match
   *     this exact intent (no edits after review).
   *  2. BLOCK never executes. REVIEW executes only with explicit human
   *     acknowledgement.
   *  3. Deterministic policy is re-run here against the original text.
   */
  const receipt = verifyGuard(body.guardToken);
  if (!receipt.ok) {
    return NextResponse.json(
      { ok: false, guard: "missing", error: receipt.error },
      { status: 403 }
    );
  }
  const c = receipt.claims;
  if (
    c.amount !== intent.amount ||
    (c.token ?? null) !== (intent.token ?? null) ||
    (c.recipient ?? "").toLowerCase() !== intent.recipient.toLowerCase()
  ) {
    return NextResponse.json(
      {
        ok: false,
        guard: "mismatch",
        error: "This payment changed after Relay Guard reviewed it. Review it again.",
      },
      { status: 403 }
    );
  }
  if (c.verdict === "BLOCK") {
    return NextResponse.json(
      { ok: false, guard: "BLOCK", error: "Relay Guard blocked this payment." },
      { status: 403 }
    );
  }
  if (c.verdict === "REVIEW" && body.reviewAck !== true) {
    return NextResponse.json(
      {
        ok: false,
        guard: "REVIEW",
        error: "Relay Guard flagged this payment. Confirm you reviewed it first.",
      },
      { status: 403 }
    );
  }
  const serverPolicy = runPolicy(c.raw, { ...intent, raw: c.raw }, {
    injectionSuspected: false,
  });
  if (serverPolicy.floor === "BLOCK") {
    return NextResponse.json(
      {
        ok: false,
        guard: "BLOCK",
        error:
          serverPolicy.checks.find((x) => x.status === "FAIL")?.detail ??
          "Relay Guard policy blocked this payment.",
      },
      { status: 403 }
    );
  }

  const token = (intent.token ?? "USDC").toUpperCase();
  const tokenAddress = TOKEN_ADDRESSES[token];
  if (!tokenAddress) {
    return NextResponse.json(
      {
        ok: false,
        error: `Token ${token} not supported yet. Try USDC or USDT.`,
      },
      { status: 400 }
    );
  }

  if (mode === "demo") {
    return NextResponse.json({ mode: "demo", ...DEMO_EXECUTION });
  }

  /**
   * Live mode moves real gas-sponsored transactions. Require proof the
   * caller actually controls ownerAddress before doing anything on-chain.
   */
  const auth = await verifyOwnerAuth({
    ownerAddress,
    authTimestamp,
    authSignature,
  });
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  /**
   * Live mode: fire ZeroDev sponsored check. This is a REAL on-chain call
   * to RelayPolicy.checkAndRecord, so a policy rejection (over limit,
   * paused, no default for a brand-new recipient) must actually block the
   * transfer. Only infra-level hiccups (RPC, bundler) are non-blocking.
   */
  let userOpHash: string | undefined;
  let agentAddress: string | undefined;
  let zdError: string | undefined;

  try {
    const { sendSponsoredCheck } = await import("../../../lib/zerodev");
    /**
     * RelayPolicy tracks spend limits in an 18-decimal "wei" convention
     * regardless of the token actually transferred (it never moves tokens
     * itself, it only bounds a number), so amounts are normalized via
     * parseEther the same way on both the deploy script and here.
     */
    const amountWei = parseEther(intent.amount);
    const zdResult = await sendSponsoredCheck({
      recipient: intent.recipient as Address,
      amountWei,
      policyAddress: RELAY_POLICY_ADDRESS as Address,
    });
    if (zdResult.policyRejected) {
      return NextResponse.json({
        mode: "live",
        ready: false,
        error: zdResult.error ?? "Spend policy rejected this transfer.",
        agentAddress: zdResult.agentAddress ?? null,
      });
    }
    if (zdResult.ok) {
      userOpHash = zdResult.userOpHash;
      agentAddress = zdResult.agentAddress;
    } else {
      zdError = zdResult.error;
    }
  } catch (rawErr: unknown) {
    /**
     * Infra-level failure (RPC down, missing env, etc.) is non-blocking.
     * Log it but let the transfer proceed.
     */
    const err = toErrorLike(rawErr);
    zdError = err.message ?? "ZeroDev check failed";
  }

  return NextResponse.json({
    mode: "live",
    ready: true,
    tokenAddress,
    amount: intent.amount,
    receiver: intent.recipient,
    // ZeroDev proof, present even if null so the UI can surface it
    userOpHash: userOpHash ?? null,
    agentAddress: agentAddress ?? null,
    zdError: zdError ?? null,
  });
}
