// lib/config.ts
// Single source of truth for chains, tokens, and runtime mode.

export const RELAY_MODE = (process.env.NEXT_PUBLIC_RELAY_MODE ?? "demo") as
  "demo" | "live";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 421614);
export const EXPLORER =
  process.env.NEXT_PUBLIC_EXPLORER ?? "https://sepolia.arbiscan.io";
export const RELAY_POLICY_ADDRESS =
  process.env.NEXT_PUBLIC_RELAY_POLICY_ADDRESS ??
  "0x8DD23aBBA62f10306805F0B2C8BF8459d1C3974e";

/**
 * Particle Universal Account supported source chains we surface in the UI.
 * The whole point: the user's value can live on ANY of these, and Relay
 * unifies it into one spendable balance.
 */
export const SOURCE_CHAINS = [
  { id: 42161, name: "Arbitrum", short: "ARB" },
  { id: 8453, name: "Base", short: "BASE" },
  { id: 10, name: "Optimism", short: "OP" },
  { id: 137, name: "Polygon", short: "POLY" },
] as const;

export type IntentAction = "transfer" | "balance" | "unknown";

export interface ParsedIntent {
  action: IntentAction;
  amount: string | null; // human-readable, e.g. "5"
  token: string | null; // e.g. "USDC"
  recipient: string | null; // 0x... or ENS
  raw: string; // original user text
  confidence: number; // 0..1 from the parser
}

export interface ExecutionResult {
  ok: boolean;
  userOpHash?: string;
  txHash?: string;
  transactionId?: string; // Particle universalx id
  explorerUrl?: string;
  sourcedFrom?: { chain: string; amount: string }[]; // the UA unification story
  error?: string;
}

export interface UnifiedBalance {
  totalUsd: string;
  perChain: { chain: string; token: string; amount: string; usd: string }[];
}
