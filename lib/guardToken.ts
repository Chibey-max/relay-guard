// lib/guardToken.ts
/**
 * Signed guard receipts.
 *
 * /api/parse-intent issues an HMAC-signed receipt binding the exact
 * (text, amount, token, recipient) to the verdict. /api/execute refuses
 * any transfer without a valid, unexpired receipt whose fields match the
 * intent being executed. A client cannot edit the amount or recipient
 * after review, and cannot upgrade a BLOCK to an ALLOW.
 */
import crypto from "node:crypto";
import type { Verdict } from "./serv";

const TTL_MS = 10 * 60_000;

function secret(): string {
  const s =
    process.env.RELAY_GUARD_SECRET ||
    process.env.SERV_API_KEY ||
    "relay-guard-dev-secret";
  return crypto.createHash("sha256").update(`relay-guard:${s}`).digest("hex");
}

export interface GuardClaims {
  raw: string;
  amount: string | null;
  token: string | null;
  recipient: string | null;
  verdict: Verdict;
  exp: number;
}

function b64(s: string) {
  return Buffer.from(s).toString("base64url");
}

export function signGuard(c: Omit<GuardClaims, "exp">): string {
  const claims: GuardClaims = { ...c, exp: Date.now() + TTL_MS };
  const body = b64(JSON.stringify(claims));
  const mac = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifyGuard(
  token: unknown
): { ok: true; claims: GuardClaims } | { ok: false; error: string } {
  if (typeof token !== "string" || !token.includes(".")) {
    return { ok: false, error: "Missing Relay Guard receipt. Review the payment first." };
  }
  const [body, mac] = token.split(".");
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: "Relay Guard receipt signature is invalid." };
  }
  const claims = JSON.parse(Buffer.from(body, "base64url").toString()) as GuardClaims;
  if (Date.now() > claims.exp) {
    return { ok: false, error: "Relay Guard receipt expired. Review the payment again." };
  }
  return { ok: true, claims };
}
