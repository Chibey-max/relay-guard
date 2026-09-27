// lib/auth.ts
/**
 * Server-side verification for the live-mode ownership proof described in
 * lib/authMessage.ts. Magic's session lives only in the browser, so the
 * server has no cookie/JWT to check. Instead the client signs a short-lived
 * challenge with the same wallet, and we verify the signature recovers to
 * the claimed ownerAddress. This is what stops an anonymous caller from
 * hitting /api/execute or /api/balance with someone else's address (or a
 * made-up one) and getting live-mode treatment: real sponsored gas, real
 * balance reads.
 */

import { verifyMessage } from "viem";
import { authMessage } from "./authMessage";

const MAX_AGE_MS = 5 * 60 * 1000; // signed proof must be fresh; blunts replay

export async function verifyOwnerAuth(params: {
  ownerAddress?: string;
  authTimestamp?: number;
  authSignature?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { ownerAddress, authTimestamp, authSignature } = params;
  if (!ownerAddress || !authTimestamp || !authSignature) {
    return { ok: false, error: "Missing wallet ownership proof." };
  }
  if (Math.abs(Date.now() - authTimestamp) > MAX_AGE_MS) {
    return { ok: false, error: "Ownership proof expired. Please retry." };
  }
  try {
    const valid = await verifyMessage({
      address: ownerAddress as `0x${string}`,
      message: authMessage(ownerAddress, authTimestamp),
      signature: authSignature as `0x${string}`,
    });
    return valid
      ? { ok: true }
      : { ok: false, error: "Signature does not match wallet." };
  } catch {
    return { ok: false, error: "Could not verify wallet signature." };
  }
}
