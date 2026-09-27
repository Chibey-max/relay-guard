#!/usr/bin/env node
// scripts/get-agent-address.mjs
/**
 * Prints the Kernel smart account address for RELAY_AGENT_PRIVATE_KEY.
 *
 * This is the address RelayPolicy's `agent` must be set to, NOT the raw
 * EOA address of the private key. On-chain, `msg.sender` inside
 * checkAndRecord is the Kernel account (the smart contract wallet that
 * executes the UserOp), not the EOA that signs for it. Pass this value as
 * AGENT_ADDRESS when running contracts/script/Deploy.s.sol.
 *
 * Usage: node scripts/get-agent-address.mjs
 * Reads RELAY_AGENT_PRIVATE_KEY and ZERODEV_BUNDLER_RPC from .env.local.
 */

import { readFileSync } from "node:fs";
import { createKernelAccount } from "@zerodev/sdk";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { KERNEL_V3_1, getEntryPoint } from "@zerodev/sdk/constants";
import { http, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

function loadEnvLocal() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local not found, rely on already-exported env vars
  }
}

loadEnvLocal();

const agentKey = process.env.RELAY_AGENT_PRIVATE_KEY;
const bundlerRpc = process.env.ZERODEV_BUNDLER_RPC;

if (!agentKey) throw new Error("RELAY_AGENT_PRIVATE_KEY not set in .env.local");
if (!bundlerRpc) throw new Error("ZERODEV_BUNDLER_RPC not set in .env.local");

const entryPoint = getEntryPoint("0.7");
const agentSigner = privateKeyToAccount(agentKey);

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(bundlerRpc),
});

const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
  signer: agentSigner,
  entryPoint,
  kernelVersion: KERNEL_V3_1,
});

const account = await createKernelAccount(publicClient, {
  plugins: { sudo: ecdsaValidator },
  entryPoint,
  kernelVersion: KERNEL_V3_1,
});

console.log("Agent EOA (signer):       ", agentSigner.address);
console.log("Kernel account (AGENT_ADDRESS to deploy with):", account.address);
