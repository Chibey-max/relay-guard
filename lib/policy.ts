// lib/policy.ts
/**
 * Deterministic policy for Relay Guard. Pure functions, no network.
 *
 * Each check returns PASS, WARN or FAIL. The strictest status sets the
 * policy "floor": FAIL -> BLOCK, WARN -> REVIEW, all PASS -> ALLOW.
 * The SERV guard verdict is combined with this floor and can only be
 * made stricter by it (see lib/serv.ts).
 */

import type { ParsedIntent } from "./config";

export type CheckStatus = "PASS" | "WARN" | "FAIL";

export interface PolicyCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface PolicyReport {
  checks: PolicyCheck[];
  floor: "ALLOW" | "REVIEW" | "BLOCK";
  perSendLimit: number;
  estimatedUsd: number | null;
}

export const PER_SEND_LIMIT_USD = Number(
  process.env.RELAY_PER_SEND_LIMIT_USD ?? 50
);
const ETH_USD_ESTIMATE = Number(process.env.RELAY_ETH_USD_ESTIMATE ?? 2500);
const SUPPORTED_TOKENS = ["USDC"];
const STABLES = ["USDC", "USDT", "DAI"];

const BURN_ADDRESSES = new Set([
  "0x0000000000000000000000000000000000000000",
  "0x000000000000000000000000000000000000dead",
]);

const BLOCKLIST = new Set(
  (process.env.RELAY_BLOCKLIST ?? "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
);

const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all |any |the )?(previous|prior|above|your) (instructions|rules)/i,
  /disregard (all |the |your )?(rules|instructions|policy)/i,
  /system prompt/i,
  /you are now/i,
  /\b(send|transfer|move) (all|everything|entire|whole|max)\b/i,
  /\bdrain\b/i,
  /override (the )?(limit|policy|guard)/i,
];

const PRESSURE_PATTERNS: RegExp[] = [
  /\burgent(ly)?\b/i,
  /\bimmediately\b/i,
  /\basap\b/i,
  /\bright now\b/i,
  /\bor else\b/i,
  /\bdon'?t tell\b/i,
  /\b(ceo|boss|admin|support) (said|told|asked)\b/i,
];

export function runPolicy(
  text: string,
  intent: ParsedIntent,
  opts: { injectionSuspected: boolean; servRefusal?: string | null }
): PolicyReport {
  const checks: PolicyCheck[] = [];
  const add = (
    id: string,
    label: string,
    status: CheckStatus,
    detail: string
  ) => checks.push({ id, label, status, detail });

  const lowerText = text.toLowerCase();
  const recipient = intent.recipient ?? "";
  const recipientLower = recipient.toLowerCase();
  const amountNum = intent.amount ? Number(intent.amount) : NaN;
  const token = (intent.token ?? "").toUpperCase();

  /* --- injection / social engineering --- */
  const injectionHit = INJECTION_PATTERNS.find((p) => p.test(text));
  if (injectionHit || opts.injectionSuspected) {
    add(
      "injection",
      "Instruction injection",
      "FAIL",
      injectionHit
        ? `Text contains an override-style phrase ("${text.match(injectionHit)?.[0]}").`
        : opts.servRefusal
          ? `SERV declined to process this text ("${opts.servRefusal}"), so Relay has no verified parse to sign.`
          : "SERV flagged the text as attempting to change Relay's rules."
    );
  } else {
    add("injection", "Instruction injection", "PASS", "No override phrases.");
  }

  if (intent.action !== "transfer") {
    return finalize(checks, null);
  }

  /* --- recipient --- */
  if (!recipient) {
    add("recipient_format", "Recipient address", "FAIL", "No recipient found.");
  } else if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
    add(
      "recipient_format",
      "Recipient address",
      "FAIL",
      `"${recipient}" is not a full 0x address (ENS is not supported yet).`
    );
  } else {
    add(
      "recipient_format",
      "Recipient address",
      "PASS",
      "Well-formed 20-byte address."
    );
  }

  if (recipient) {
    if (!lowerText.includes(recipientLower)) {
      add(
        "recipient_in_text",
        "Recipient matches your words",
        "FAIL",
        `Parsed recipient ${short(recipient)} does not appear in what you typed.`
      );
    } else {
      add(
        "recipient_in_text",
        "Recipient matches your words",
        "PASS",
        "Recipient appears verbatim in your request."
      );
    }
  }

  if (BURN_ADDRESSES.has(recipientLower)) {
    add(
      "burn_address",
      "Burn address",
      "FAIL",
      `${short(recipient)} is a burn address. Funds sent there are destroyed.`
    );
  }
  if (BLOCKLIST.has(recipientLower)) {
    add(
      "blocklist",
      "Blocklist",
      "FAIL",
      `${short(recipient)} is on Relay's blocklist.`
    );
  }

  const addressesInText = new Set(
    (text.match(/0x[a-fA-F0-9]{40}/g) ?? []).map((a) => a.toLowerCase())
  );
  if (addressesInText.size > 1) {
    add(
      "ambiguous_recipient",
      "Single recipient",
      "WARN",
      `Your request mentions ${addressesInText.size} different addresses.`
    );
  }

  /* --- amount --- */
  let estimatedUsd: number | null = null;
  if (!intent.amount || !Number.isFinite(amountNum)) {
    add("amount_valid", "Amount", "FAIL", "No valid amount found.");
  } else if (amountNum <= 0) {
    add("amount_valid", "Amount", "FAIL", `Amount ${intent.amount} is not positive.`);
  } else {
    add("amount_valid", "Amount", "PASS", `${intent.amount} ${token}.`);

    const numbersInText = (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
    if (!numbersInText.includes(amountNum)) {
      add(
        "amount_in_text",
        "Amount matches your words",
        "FAIL",
        `Parsed amount ${intent.amount} does not appear in what you typed.`
      );
    } else {
      add(
        "amount_in_text",
        "Amount matches your words",
        "PASS",
        "Amount appears in your request."
      );
    }

    estimatedUsd = STABLES.includes(token)
      ? amountNum
      : token === "ETH" || token === "WETH"
        ? amountNum * ETH_USD_ESTIMATE
        : null;

    if (estimatedUsd === null) {
      add(
        "per_send_limit",
        "Per-send limit",
        "WARN",
        `Cannot price ${token}; limit of $${PER_SEND_LIMIT_USD} not verifiable.`
      );
    } else if (estimatedUsd > PER_SEND_LIMIT_USD) {
      add(
        "per_send_limit",
        "Per-send limit",
        "FAIL",
        `~$${fmt(estimatedUsd)} exceeds the $${PER_SEND_LIMIT_USD} per-send limit.`
      );
    } else if (estimatedUsd > PER_SEND_LIMIT_USD * 0.5) {
      add(
        "per_send_limit",
        "Per-send limit",
        "WARN",
        `~$${fmt(estimatedUsd)} is over half of the $${PER_SEND_LIMIT_USD} per-send limit.`
      );
    } else {
      add(
        "per_send_limit",
        "Per-send limit",
        "PASS",
        `~$${fmt(estimatedUsd)} of $${PER_SEND_LIMIT_USD} limit.`
      );
    }
  }

  /* --- token --- */
  if (token && !SUPPORTED_TOKENS.includes(token)) {
    add(
      "token_supported",
      "Token",
      "FAIL",
      `${token} is not supported yet. Relay settles in ${SUPPORTED_TOKENS.join(", ")}.`
    );
  }

  /* --- pressure language --- */
  const pressureHit = PRESSURE_PATTERNS.find((p) => p.test(text));
  if (pressureHit) {
    add(
      "pressure",
      "Pressure language",
      "WARN",
      `Urgency phrase "${text.match(pressureHit)?.[0]}" is common in payment scams.`
    );
  }

  /* --- parser confidence --- */
  if (intent.confidence < 0.6) {
    add(
      "confidence",
      "Parser confidence",
      "WARN",
      `Parser confidence is ${Math.round(intent.confidence * 100)}%.`
    );
  }

  return finalize(checks, estimatedUsd);
}

function finalize(
  checks: PolicyCheck[],
  estimatedUsd: number | null
): PolicyReport {
  const floor = checks.some((c) => c.status === "FAIL")
    ? "BLOCK"
    : checks.some((c) => c.status === "WARN")
      ? "REVIEW"
      : "ALLOW";
  return { checks, floor, perSendLimit: PER_SEND_LIMIT_USD, estimatedUsd };
}

function short(a: string) {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}
function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
