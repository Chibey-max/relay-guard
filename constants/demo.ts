// constants/demo.ts
/**
 * DEMO mode data. Clearly labelled as demo everywhere it surfaces (Rule 2 + 3).
 * These values let a judge see the full flow without an email login, while the
 * UI states plainly that this is demo mode. Nothing here is presented as a
 * real on-chain result. Live mode produces real hashes.
 */

import type { UnifiedBalance } from "../lib/config";

export const DEMO_SIGNER = {
  email: "demo@relay.app",
  address: "0xD3m0Acc0unt00000000000000000000000000000",
};

/**
 * The unified-balance reveal, demo edition: funds scattered across 3 chains,
 * shown as one spendable total. This is the story the UI tells.
 */
export const DEMO_BALANCE: UnifiedBalance = {
  totalUsd: "47.20",
  perChain: [
    { chain: "Base", token: "USDC", amount: "21.00", usd: "21.00" },
    { chain: "Arbitrum", token: "USDC", amount: "14.20", usd: "14.20" },
    { chain: "Optimism", token: "USDT", amount: "12.00", usd: "12.00" },
  ],
};

/**
 * A deterministic fake execution for demo mode. The UI must badge this as
 * "DEMO, not a real transaction." Live mode replaces it with a real result.
 */
export const DEMO_EXECUTION = {
  ok: true,
  transactionId: "demo-tx-0001",
  explorerUrl: "https://universalx.app/activity/details?id=demo-tx-0001",
  sourcedFrom: [
    { chain: "Base", amount: "3.20" },
    { chain: "Arbitrum", amount: "1.80" },
  ],
};
