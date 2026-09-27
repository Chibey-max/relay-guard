// lib/particle-ua.ts
/**
 * Adapter: wraps lib/particle.ts for the page's live-execute flow.
 * Creates the UA from the signer address, resolves the token, and dispatches.
 */

import {
  createUniversalAccount,
  sendUnifiedTransfer as _send,
} from "./particle";
import type { Signer } from "./particle";
import type { ExecutionResult } from "./config";

// USDC on Arbitrum mainnet (Particle UA only supports mainnet chains)
const USDC_ARB_MAINNET = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

interface TransferParams {
  signer: Signer;
  to: string;
  amount: string;
  token: string;
  tokenAddress?: string;
}

export async function sendUnifiedTransfer(
  params: TransferParams
): Promise<ExecutionResult> {
  const ua = createUniversalAccount(params.signer.address);
  // Use the token address from the server if provided; fallback to USDC mainnet
  const tokenAddress = params.tokenAddress ?? USDC_ARB_MAINNET;
  return _send(ua, params.signer, {
    tokenAddress,
    amount: params.amount,
    receiver: params.to,
  });
}
