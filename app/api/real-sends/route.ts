/**
 * app/api/real-sends/route.ts
 *
 * Server-side proxy to Etherscan's V2 API for the Relay wallet's real
 * transaction history on Arbitrum One mainnet. Runs server-side so
 * ETHERSCAN_API_KEY never reaches the browser.
 *
 * Arbiscan's own standalone API and its per-chain API keys were
 * deprecated in 2025 in favor of Etherscan's unified V2 API, which
 * covers every supported chain through one key and an explicit
 * chainid parameter. There is no such thing as a separate "Arbiscan
 * API key" anymore, an Etherscan.io key is what this needs.
 *
 * Known limitation, confirmed against the wallet's actual real sends:
 * this filters txlist by tx.from === RELAY_WALLET, but Particle's
 * Universal Account executes real sends as EIP-7702 (type 4)
 * transactions where a relayer submits and pays gas. The relayer
 * address is tx.from, the Relay wallet only appears in the
 * transaction's authorizationList and inside the calldata, neither of
 * which txlist exposes. In practice this route will keep returning an
 * empty sends array for this wallet's normal send pattern, every
 * consumer's fallback chain (see lib/useRealSends.ts's callers) is what
 * actually keeps showing genuinely real data via session tracking and
 * the hardcoded pair in lib/realSends.ts. Detecting 7702-delegated
 * sends properly would mean scanning raw transactions for
 * authorizationList matches, there is no txlist-equivalent for that, a
 * meaningfully bigger undertaking left undone on purpose for now.
 */
import { NextResponse } from "next/server";
import type { LiveSend } from "../../../types/types";

const RELAY_WALLET = "0xE732457153a6dbA7C0E1b9D4B1EA1F4E090cf03E";
const ARBITRUM_ONE_CHAIN_ID = 42161;

interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  isError: string;
  type?: string;
}

/**
 * EIP-7702 transactions are type 4 (SET_CODE_TX_TYPE). Etherscan reports
 * this as a hex string on the tx object. Absent or unrecognized values
 * default to false rather than assume a delegation that can't be
 * confirmed.
 */
function isEip7702(tx: EtherscanTx): boolean {
  return tx.type === "0x4";
}

export async function GET() {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { sends: [], error: "ETHERSCAN_API_KEY not configured" },
      { status: 200 }
    );
  }

  const url =
    `https://api.etherscan.io/v2/api?chainid=${ARBITRUM_ONE_CHAIN_ID}` +
    `&module=account&action=txlist&address=${RELAY_WALLET}` +
    `&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;

  try {
    // Cached server-side for 60s so repeated page loads don't hammer
    // Etherscan's rate limit; every visitor within that window shares
    // one upstream fetch.
    const res = await fetch(url, { next: { revalidate: 60 } });
    const data = await res.json();

    if (data.status !== "1" || !Array.isArray(data.result)) {
      return NextResponse.json(
        { sends: [], error: "unavailable" },
        { status: 200 }
      );
    }

    const sends: LiveSend[] = (data.result as EtherscanTx[])
      .filter(
        (tx) =>
          tx.from.toLowerCase() === RELAY_WALLET.toLowerCase() &&
          tx.isError === "0"
      )
      .slice(0, 10)
      .map((tx) => ({
        hash: tx.hash,
        to: tx.to,
        valueEth: (Number(tx.value) / 1e18).toFixed(5),
        timestamp: Number(tx.timeStamp),
        isEip7702: isEip7702(tx),
      }));

    return NextResponse.json({ sends });
  } catch {
    return NextResponse.json(
      { sends: [], error: "fetch failed" },
      { status: 200 }
    );
  }
}
