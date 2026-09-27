// types/types.ts
// Shared TypeScript interfaces and types used across the app. Import with
// a relative path, matching this project's existing import convention
// (the "@/*" alias in tsconfig.json resolves too, but no file here uses it).

/**
 * Loose shape for a value caught in a `catch` block. A thrown value is
 * `unknown` at the type level and is not guaranteed to be a real `Error`
 * instance, SDK and RPC provider code in this app often throws plain
 * objects, so every field here is optional.
 */
export interface ErrorLike {
  message?: string;
  code?: string | number;
  stack?: string;
}

/**
 * A real, on-chain send from the Relay wallet, fetched server-side from
 * Etherscan's V2 API (see app/api/real-sends/route.ts). isEip7702 is a
 * best-effort detection from the transaction's type field, present only
 * when it can genuinely be confirmed, never assumed true by default.
 */
export interface LiveSend {
  hash: string;
  to: string;
  valueEth: string;
  timestamp: number;
  isEip7702: boolean;
}

export interface RealSendsResponse {
  sends: LiveSend[];
  error?: string;
}
