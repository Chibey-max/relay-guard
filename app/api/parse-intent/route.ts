// app/api/parse-intent/route.ts
/**
 * Plain English in, guarded intent out.
 * SERV Reasoning parses the request, deterministic policy checks it, and
 * SERV Reasoning reviews it (see lib/serv.ts). The response always carries
 * the verdict and the per-call trace so the UI can show its work.
 */
import { NextRequest, NextResponse } from "next/server";
import { parseAndGuard } from "../../../lib/serv";
import { signGuard } from "../../../lib/guardToken";
import { rateLimit, clientIp } from "../../../lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const rl = rateLimit(`parse-intent:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Slow down and try again." },
      { status: 429 }
    );
  }

  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing 'text'." }, { status: 400 });
  }
  if (text.length > 500) {
    return NextResponse.json(
      { error: "Keep payment requests under 500 characters." },
      { status: 400 }
    );
  }
  const guarded = await parseAndGuard(text);
  const guardToken = signGuard({
    raw: guarded.raw,
    amount: guarded.amount,
    token: guarded.token,
    recipient: guarded.recipient,
    verdict: guarded.guard.verdict,
  });
  return NextResponse.json({ ...guarded, guardToken });
}
