// lib/authMessage.ts
/**
 * Shared between client and server: the exact challenge text a live-mode
 * caller must sign to prove they control `ownerAddress`. Keeping the message
 * format in one file guarantees the client signs and the server verifies
 * byte-for-byte the same string.
 */

import type { Signer } from "./particle";

export function authMessage(ownerAddress: string, timestamp: number): string {
  return `Relay live-mode request\naddress: ${ownerAddress.toLowerCase()}\ntimestamp: ${timestamp}`;
}

export interface AuthProof {
  ownerAddress: string;
  authTimestamp: number;
  authSignature: string;
}

/**
 * Client-side only: sign a freshly-timestamped challenge with the connected
 * wallet. Call this right before hitting a live-mode API route.
 */
export async function signAuthProof(signer: Signer): Promise<AuthProof> {
  const authTimestamp = Date.now();
  const message = authMessage(signer.address, authTimestamp);
  const authSignature = await signer.signMessage(
    new TextEncoder().encode(message)
  );
  return { ownerAddress: signer.address, authTimestamp, authSignature };
}
