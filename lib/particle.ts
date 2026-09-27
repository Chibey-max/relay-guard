// lib/particle.ts
/**
 * Particle Universal Accounts, the STAR of Relay.
 *
 * This is what wins the Universal Accounts Track (30% "prominent/innovative
 * use of UA + EIP-7702"). The user's EOA (from Magic) becomes a
 * chain-abstracted account in place. One balance, any chain, no bridging.
 *
 * Call signatures here match the official quickstart:
 *   new UniversalAccount({ projectId, projectClientKey, projectAppUuid, ownerAddress })
 *   ua.getPrimaryAssets()              -> unified balance
 *   ua.createTransferTransaction(...)  -> cross-chain transfer
 *   ua.sendTransaction(tx, signature)  -> broadcast
 *
 * NOTE: Particle UA is migrating to V2. If getPrimaryAssets throws a
 * migration error, surface it honestly in the UI (Rule 6) rather than faking.
 */

import {
  CHAIN_ID as PARTICLE_CHAIN_ID,
  UniversalAccount,
  type ISmartAccountOptions,
  type IAsset,
  type IChainAggregation,
  type EIP7702Authorization,
} from "@particle-network/universal-account-sdk";
import { getBytes } from "ethers";
import {
  SOURCE_CHAINS,
  type UnifiedBalance,
  type ExecutionResult,
} from "./config";
import type { ErrorLike } from "../types/types";

/**
 * SDK returns a numeric chainId (e.g. 42161), but the UI's balance reveal
 * keys its chain-dot colors and labels off human names ("Arbitrum", "Base"),
 * so map back through the same table the rest of the app uses. Falls back to
 * the raw id for a chain we don't otherwise surface.
 */
function chainName(chainId: number | string): string {
  const id = Number(chainId);
  return SOURCE_CHAINS.find((c) => c.id === id)?.name ?? String(chainId);
}

// catch() gives unknown, thrown values aren't guaranteed to be real Error
// instances, so this narrows only as far as "is it an object" before
// reading the fields callers actually use.
function toErrorLike(err: unknown): ErrorLike {
  return typeof err === "object" && err !== null ? (err as ErrorLike) : {};
}

export interface Signer {
  address: string;
  // signMessage takes raw bytes and returns a hex signature.
  signMessage: (bytes: Uint8Array) => Promise<string>;
  /**
   * EIP-7702 authorization signing, a different digest/signing scheme
   * than signMessage above (see lib/magic.ts). Optional because it's only
   * needed for a real EIP-7702-mode transfer, and only Magic-backed
   * signers currently implement it.
   */
  signEIP7702Authorization?: (params: {
    contractAddress: string;
    chainId: number;
    nonce?: number;
  }) => Promise<{
    contractAddress: string;
    chainId: number;
    nonce: number;
    v: number;
    r: string;
    s: string;
    signature?: string;
  }>;
}

// Shape of one entry returned by UniversalAccount.getEIP7702Auth. The SDK
// itself types this call's return as `any` (no exported type), so this is
// declared here from the documented/observed fields instead.
interface EIP7702AuthTuple {
  chainId: number;
  address: string;
  nonce: number;
}

export function createUniversalAccount(ownerAddress: string): UniversalAccount {
  const projectId = process.env.NEXT_PUBLIC_PARTICLE_PROJECT_ID;
  const clientKey = process.env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY;
  const appId = process.env.NEXT_PUBLIC_PARTICLE_APP_ID;

  if (!projectId || !clientKey || !appId) {
    throw new Error(
      "Particle credentials missing. Set them in .env.local for live mode."
    );
  }

  return new UniversalAccount({
    projectId,
    projectClientKey: clientKey,
    projectAppUuid: appId,
    ownerAddress,
    /**
     * useEIP7702 is required to get an EIP-7702-delegated EOA (the UA
     * hard requirement) instead of the SDK's default separate smart
     * account. Without this flag the account is NOT in 7702 mode.
     * Do NOT set name/version here: the .d.ts marks them required, but
     * the backend validates `version` against its own internal default
     * and rejects an arbitrary string with "Unsupported smart account"
     * (verified live against the Particle project: omitting them and
     * passing only useEIP7702 works, and the SDK fills in its own
     * defaults for the omitted fields at runtime).
     */
    smartAccountOptions: {
      useEIP7702: true,
    } as ISmartAccountOptions,
    tradeConfig: {
      slippageBps: 100, // 1%
      universalGas: true, // let the UA pay gas from any token it holds
    },
  });
}

// The unified-balance reveal. This is the hero data point for the demo:
// "you have $X across N chains, spendable as one."
export async function getUnifiedBalance(
  ua: UniversalAccount
): Promise<UnifiedBalance> {
  const assets = await ua.getPrimaryAssets();
  const perChain = (assets.assets ?? []).flatMap((asset: IAsset) =>
    (asset.chainAggregation ?? []).map((agg: IChainAggregation) => ({
      chain: chainName(agg.token?.chainId ?? "unknown"),
      token: String(asset.tokenType ?? "TOKEN").toUpperCase(),
      amount: String(agg.amount ?? "0"),
      usd: String(agg.amountInUSD ?? "0"),
    }))
  );
  return {
    totalUsd: String(assets.totalAmountInUSD ?? "0"),
    perChain,
  };
}

/**
 * Temporarily wraps the browser's request transports (XHR, axios's default
 * browser adapter, and fetch, as a fallback in case the bundle picks that
 * adapter instead) to log the exact outgoing JSON-RPC method + params sent
 * to Particle's UniversalX RPC, and the raw response body. The SDK is a
 * black box internally (compiled, no request hook exposed), so this is the
 * only way to see the literal wire payload instead of just the parsed
 * error. Scoped to the duration of `fn()` only: restores both globals
 * immediately after, success or failure, so it never affects unrelated
 * requests elsewhere in the app.
 */
async function withRequestLogging<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  if (typeof window === "undefined") return fn();

  const isTargetUrl = (url: string) =>
    /particle|universal-?rpc|universalx/i.test(url);
  // The JSON-RPC body is whatever the SDK's HTTP client happened to send,
  // there's no schema for it at this boundary, so read it as unknown and
  // narrow just enough to pull out the two fields this logger prints.
  const isJsonRpcLike = (
    value: unknown
  ): value is { method?: unknown; params?: unknown } =>
    typeof value === "object" && value !== null;
  const logReq = (url: string, body: unknown) => {
    let parsed: unknown = body;
    if (typeof body === "string") {
      try {
        parsed = JSON.parse(body);
      } catch {
        /* leave as raw string */
      }
    }
    const rpc = isJsonRpcLike(parsed) ? parsed : {};
    /**
     * Print fully-flattened JSON TEXT, not a live object reference.
     * console.log(obj) shows a collapsed/lazy view in some contexts (e.g.
     * "params: Array(2)" with no way to expand further), which is exactly
     * what hid whether `authorizations` actually made it into the wire
     * payload last time. JSON.stringify forces every nested field to
     * print now, unambiguously.
     */
    console.log(
      `[particle-rpc-request:${label}] ${url}\n` +
        JSON.stringify({ method: rpc.method, params: rpc.params }, null, 2)
    );
  };
  const logRes = (url: string, status: number, body: string) => {
    console.log(
      `[particle-rpc-response:${label}]`,
      url,
      "status:",
      status,
      "body:",
      body
    );
  };

  const OriginalXHR = window.XMLHttpRequest;
  class LoggingXHR extends OriginalXHR {
    private _url = "";
    open(
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ) {
      this._url = String(url);
      // Forward to whichever of open()'s two overloads matches: callers
      // that only ever pass (method, url) must not receive an explicit
      // `undefined` async argument, since that trips the other overload.
      return async === undefined
        ? super.open(method, url)
        : super.open(method, url, async, username, password);
    }
    send(body?: Document | XMLHttpRequestBodyInit | null) {
      if (isTargetUrl(this._url)) {
        logReq(this._url, body);
        this.addEventListener("loadend", () => {
          logRes(this._url, this.status, this.responseText?.slice(0, 2000));
        });
      }
      return super.send(body);
    }
  }
  window.XMLHttpRequest = LoggingXHR;

  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    if (isTargetUrl(url) && init?.body) {
      logReq(url, init.body);
      const res = await originalFetch(input, init);
      const clone = res.clone();
      clone.text().then((t) => logRes(url, res.status, t.slice(0, 2000)));
      return res;
    }
    return originalFetch(input, init);
  };

  try {
    return await fn();
  } finally {
    window.XMLHttpRequest = OriginalXHR;
    window.fetch = originalFetch;
  }
}

/**
 * The payment. Settles on Arbitrum One mainnet (hardcoded below).
 * Live-tested and confirmed: createTransferTransaction requires the
 * requested token to already be present on that settlement chain, it
 * does not bridge or convert funds from other chains in real time to
 * fulfill a send. A send attempted while the token sat on a different
 * chain failed with Particle's own -32653 "Insufficient primary token
 * balance" error. Automatic cross-chain sourcing for settlement is not
 * live; the unified balance view getUnifiedBalance() above provides is
 * a separate, confirmed-working feature, don't conflate the two.
 */
export async function sendUnifiedTransfer(
  ua: UniversalAccount,
  signer: Signer,
  params: { tokenAddress: string; amount: string; receiver: string }
): Promise<ExecutionResult> {
  try {
    /**
     * Particle's backend rejects a receiver/token address with any stray
     * whitespace as "Invalid parameters" (JSON-RPC -32602). Trim right
     * before the call as a last line of defense, even though lib/serv.ts
     * already trims at the source.
     */
    const tokenAddress = params.tokenAddress.trim();
    const amount = params.amount.trim();
    const receiver = params.receiver.trim();

    /**
     * Confirm the exact values going in: chainId is hardcoded to
     * ARBITRUM_MAINNET_ONE (42161) here regardless of NEXT_PUBLIC_CHAIN_ID
     * (which is 421614/Sepolia, used only by the separate RelayPolicy/
     * ZeroDev flow). Print it explicitly rather than assuming.
     */
    console.log("[sendUnifiedTransfer] request params:", {
      chainId: PARTICLE_CHAIN_ID.ARBITRUM_MAINNET_ONE,
      tokenAddress,
      amount,
      receiver,
      ownerAddress: signer.address,
    });

    const transaction = await withRequestLogging(
      "createTransferTransaction",
      () =>
        ua.createTransferTransaction({
          token: {
            chainId: PARTICLE_CHAIN_ID.ARBITRUM_MAINNET_ONE,
            address: tokenAddress,
          },
          amount,
          receiver,
        })
    );

    const signature = await signer.signMessage(getBytes(transaction.rootHash));

    /**
     * EIP-7702 mode requires a separate authorization (delegating this EOA
     * to Particle's implementation contract) signed and attached. Without
     * it the backend rejects the broadcast with "Invalid 7702 auth
     * signature". CRITICAL: the SDK's internal matching (verified by
     * tracing actual property reads via a Proxy, not by reading minified
     * source, since that approach previously gave a wrong answer) keys each
     * authorization to a UserOp by **userOpHash**, not chainId:
     *   authorizations.find(auth => auth.userOpHash === userOp.userOpHash)
     * So we need one authorization object per UserOp, each carrying that
     * UserOp's own userOpHash, even though the underlying signed
     * authorization content can be shared (chainId:0 from getEIP7702Auth
     * means "universal", valid across chains) when multiple UserOps share
     * a chain.
     */
    const userOps = transaction.userOps ?? [];
    const chainIds = [...new Set(userOps.map((op) => Number(op.chainId)))];
    let authorizations: EIP7702Authorization[] = [];
    if (signer.signEIP7702Authorization && chainIds.length > 0) {
      // getEIP7702Auth's return type is declared as `any` by the SDK itself
      // (no exported type for it), but its documented shape is this tuple,
      // which is exactly what's read below.
      const authTuples = (await ua.getEIP7702Auth(
        chainIds
      )) as EIP7702AuthTuple[];
      // Sign one authorization per unique chain (avoids duplicate Magic
      // prompts for chains touched by multiple UserOps), keyed by chainId
      // for lookup below.
      const signedByChainId = new Map<number, string>();
      await Promise.all(
        authTuples.map(async (tuple) => {
          /**
           * Print the exact tuple before signing so it can be visually
           * confirmed against getEIP7702Auth's own output before
           * approving the signature prompt.
           */
          console.log(
            "[sendUnifiedTransfer] signing EIP-7702 authorization tuple:",
            {
              chainId: tuple.chainId,
              contractAddress: tuple.address,
              nonce: tuple.nonce,
            }
          );
          const signed = await signer.signEIP7702Authorization!({
            contractAddress: tuple.address,
            chainId: tuple.chainId,
            nonce: tuple.nonce,
          });
          /**
           * JSON.stringify: printing a live object here (as before) shows
           * a collapsed reference in some console contexts and hides the
           * exact field values entirely.
           */
          console.log(
            "[sendUnifiedTransfer] raw signed EIP-7702 authorization:\n" +
              JSON.stringify(
                {
                  contractAddress: signed.contractAddress,
                  chainId: signed.chainId,
                  nonce: signed.nonce,
                  v: signed.v,
                  r: signed.r,
                  s: signed.s,
                  signature: signed.signature,
                },
                null,
                2
              )
          );

          /**
           * Explicit byte-length audit on the RAW (pre-padding) values.
           * If either isn't exactly 64 hex chars (32 bytes), a leading
           * zero byte was stripped by the signer/serialization layer
           * before it ever reached us, which the pad32 step below must
           * correct for.
           */
          const rLen = signed.r.replace(/^0x/, "").length;
          const sLen = signed.s.replace(/^0x/, "").length;
          console.log(
            `[sendUnifiedTransfer] r length: ${rLen} (want 64), s length: ${sLen} (want 64)`
          );
          if (rLen !== 64 || sLen !== 64) {
            console.warn(
              "[sendUnifiedTransfer] r or s is NOT 32 bytes before padding. This is the likely cause of an invalid signature if padding doesn't correct it."
            );
          }

          /**
           * EIP-7702's authorization_list entries are [chainId, address,
           * nonce, y_parity, r, s], a Type-4-transaction-wide convention
           * (same family as EIP-1559/2930), NOT the legacy Ethereum
           * message-signing v (27/28) that personal_sign/eth_sign use.
           * Don't trust a pre-combined `signature` string blindly (we
           * don't know which convention it was built with). Always
           * derive yParity from v ourselves and reconstruct the 65-byte
           * signature so the encoding is verifiably correct:
           *   - v === 27 or 28  -> yParity = v - 27
           *   - v already 0/1   -> yParity = v (defensive, in case Magic
           *     ever returns yParity directly in the `v` field)
           */
          const yParity = signed.v >= 27 ? signed.v - 27 : signed.v;
          const pad32 = (hex: string) =>
            hex.replace(/^0x/, "").padStart(64, "0");
          const paddedR = pad32(signed.r);
          const paddedS = pad32(signed.s);
          const signature = `0x${paddedR}${paddedS}${yParity.toString(16).padStart(2, "0")}`;

          console.log(
            "[sendUnifiedTransfer] reconstructed EIP-7702 signature:\n" +
              JSON.stringify(
                {
                  yParity,
                  paddedRLength: paddedR.length,
                  paddedSLength: paddedS.length,
                  signature,
                  signatureByteLength: (signature.length - 2) / 2,
                },
                null,
                2
              )
          );
          signedByChainId.set(tuple.chainId, signature);
        })
      );

      // Now build the actual authorizations array the SDK expects: one
      // entry per UserOp, keyed by that UserOp's own userOpHash, carrying
      // the signature for whichever chain that UserOp is on (falling back
      // to a chainId:0 "universal" signature if that's what was signed).
      authorizations = userOps
        .map((op) => {
          const opChainId = Number(op.chainId);
          const sig = signedByChainId.get(opChainId) ?? signedByChainId.get(0);
          if (!sig || !op.userOpHash) return null;
          return { userOpHash: op.userOpHash, signature: sig };
        })
        .filter(
          (a): a is { userOpHash: string; signature: string } => a !== null
        );

      console.log(
        "[sendUnifiedTransfer] final authorizations array (keyed by userOpHash):\n" +
          JSON.stringify(authorizations, null, 2)
      );
    } else if (chainIds.length > 0) {
      console.warn(
        "[sendUnifiedTransfer] signer has no signEIP7702Authorization. Broadcast will likely fail with 'Invalid 7702 auth signature'."
      );
    }

    const result = await withRequestLogging("sendTransaction", () =>
      ua.sendTransaction(transaction, signature, authorizations)
    );

    /**
     * transaction.userOps is real data from the SDK, not fabricated,
     * but per the live-tested finding above (this function's own
     * comment), a transfer only succeeds when the token is already on
     * the settlement chain, so this will typically resolve to a single
     * Arbitrum entry in practice, not a genuine multi-chain pull. Kept
     * as real per-chain UserOp data either way, just don't read a
     * single-entry result as evidence cross-chain sourcing happened.
     */
    const sourcedFrom = (transaction.userOps ?? []).map((op) => ({
      chain: chainName(op.chainId),
      amount: String(transaction.totalDepositTokenAmountInUSD ?? ""),
    }));

    return {
      ok: true,
      transactionId: result.transactionId,
      explorerUrl: `https://universalx.app/activity/details?id=${result.transactionId}`,
      sourcedFrom,
    };
  } catch (rawErr: unknown) {
    const err = toErrorLike(rawErr);
    /**
     * Log the full underlying error: err.message alone (e.g. "Invalid
     * parameters") doesn't say which parameter or which call (quote vs.
     * sign vs. broadcast) failed. err.code is Particle's JSON-RPC error
     * code (e.g. -32602 for invalid params, -32624 for insufficient
     * balance) and is the fastest way to tell those apart.
     */
    console.error("[sendUnifiedTransfer] Universal transfer failed:", {
      message: err.message,
      code: err.code,
      stack: err.stack,
      params: {
        tokenAddress: params.tokenAddress,
        amount: params.amount,
        receiver: params.receiver,
      },
      raw: rawErr,
    });
    const detail = err.code ? ` (code ${err.code})` : "";
    return {
      ok: false,
      error: (err.message ?? "Universal transfer failed") + detail,
    };
  }
}
