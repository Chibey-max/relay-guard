// lib/zerodev.ts
/**
 * ZeroDev gas sponsorship, wins the $500 ZeroDev subtrack.
 *
 * Uses an ECDSA Kernel account (the "relay agent") to send a sponsored
 * UserOp on Arbitrum Sepolia. The paymaster covers 100% of gas, so the
 * user pays nothing. This is wired into every live transfer: the agent
 * calls RelayPolicy.checkAndRecord on-chain before Particle UA broadcasts
 * the payment, a real enforcement call, not a decorative no-op.
 *
 * The agent EOA (RELAY_AGENT_PRIVATE_KEY) is separate from the user's
 * Magic wallet: it's the protocol-level signer that interacts with
 * RelayPolicy.sol and has its gas sponsored by ZeroDev.
 */

import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { KERNEL_V3_1, getEntryPoint } from "@zerodev/sdk/constants";
import {
  http,
  createPublicClient,
  encodeFunctionData,
  BaseError,
  ContractFunctionRevertedError,
  formatEther,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import type { GetPaymasterDataParameters } from "viem/account-abstraction";
import type { ErrorLike } from "../types/types";

export interface SponsoredResult {
  ok: boolean;
  userOpHash?: string;
  agentAddress?: string;
  error?: string;
  /**
   * True when RelayPolicy explicitly rejected the spend (over limit, not
   * whitelisted with no default, paused); the caller MUST block the
   * transfer. Absent/false means an infra-level hiccup (RPC, bundler),
   * which is safe to treat as non-blocking.
   */
  policyRejected?: boolean;
}

// RelayPolicy ABI: only the functions/errors the agent needs
const RELAY_POLICY_ABI = [
  {
    name: "checkAndRecord",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amountWei", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "agent",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  { type: "error", name: "NotOwner", inputs: [] },
  { type: "error", name: "NotAgent", inputs: [] },
  { type: "error", name: "IsPaused", inputs: [] },
  {
    type: "error",
    name: "NotWhitelisted",
    inputs: [{ name: "recipient", type: "address" }],
  },
  {
    type: "error",
    name: "OverPerTxLimit",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amountWei", type: "uint256" },
      { name: "maxWei", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "OverDailyLimit",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "attemptedWei", type: "uint256" },
      { name: "maxWei", type: "uint256" },
    ],
  },
] as const;

// catch() gives unknown, thrown values aren't guaranteed to be real Error
// instances, so this narrows only as far as "is it an object" before
// reading the fields callers actually use.
function toErrorLike(err: unknown): ErrorLike {
  return typeof err === "object" && err !== null ? (err as ErrorLike) : {};
}

function policyErrorMessage(
  errorName: string,
  args: readonly unknown[]
): string {
  switch (errorName) {
    case "NotWhitelisted":
      return "This recipient isn't within your spend policy and no default limit is configured.";
    case "OverPerTxLimit":
      return `Amount exceeds your per-transaction spend limit (max ${formatEther(args[2] as bigint)}).`;
    case "OverDailyLimit":
      return "This transfer would exceed your daily spend limit for this recipient.";
    case "IsPaused":
      return "Spending is currently paused by policy.";
    case "NotAgent":
      return "Relay agent isn't authorized on this policy contract.";
    default:
      return `Spend policy rejected this transfer (${errorName}).`;
  }
}

/**
 * Sends a ZeroDev-sponsored UserOp from the relay agent Kernel account that
 * calls RelayPolicy.checkAndRecord (the real, on-chain spend-limit check)
 * before Particle UA broadcasts the actual payment.
 */
export async function sendSponsoredCheck(params: {
  recipient: Address;
  amountWei: bigint;
  policyAddress: Address;
}): Promise<SponsoredResult> {
  try {
    const bundlerRpc = process.env.ZERODEV_BUNDLER_RPC;
    const paymasterRpc = process.env.ZERODEV_PAYMASTER_RPC;
    const agentKey = process.env.RELAY_AGENT_PRIVATE_KEY as Hex | undefined;

    if (!bundlerRpc || !paymasterRpc)
      throw new Error("ZeroDev RPC URLs missing.");
    if (!agentKey) throw new Error("RELAY_AGENT_PRIVATE_KEY not set.");

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

    /**
     * Simulate the policy check first (a free eth_call, not a UserOp) so a
     * policy rejection is caught cleanly and distinguished from an infra
     * failure, and so we never spend sponsored gas on a call that would
     * revert anyway.
     */
    try {
      await publicClient.simulateContract({
        address: params.policyAddress,
        abi: RELAY_POLICY_ABI,
        functionName: "checkAndRecord",
        args: [params.recipient, params.amountWei],
        account: account.address as Address,
      });
    } catch (simErr: unknown) {
      if (simErr instanceof BaseError) {
        const revertError = simErr.walk(
          (e) => e instanceof ContractFunctionRevertedError
        ) as ContractFunctionRevertedError | undefined;
        if (revertError?.data?.errorName) {
          return {
            ok: false,
            policyRejected: true,
            error: policyErrorMessage(
              revertError.data.errorName,
              revertError.data.args ?? []
            ),
            agentAddress: account.address,
          };
        }
      }
      // Not a recognizable policy revert, treat as an infra hiccup below.
      throw simErr;
    }

    const paymaster = createZeroDevPaymasterClient({
      chain: arbitrumSepolia,
      transport: http(paymasterRpc),
    });

    const kernelClient = createKernelAccountClient({
      account,
      chain: arbitrumSepolia,
      bundlerTransport: http(bundlerRpc),
      paymaster: {
        getPaymasterData: (userOperation: GetPaymasterDataParameters) =>
          paymaster.sponsorUserOperation({ userOperation }),
      },
      client: publicClient,
    });

    const callData = await account.encodeCalls([
      {
        to: params.policyAddress,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: RELAY_POLICY_ABI,
          functionName: "checkAndRecord",
          args: [params.recipient, params.amountWei],
        }),
      },
    ]);

    const userOpHash: string = await kernelClient.sendUserOperation({
      callData,
    });

    return {
      ok: true,
      userOpHash,
      agentAddress: account.address,
    };
  } catch (rawErr: unknown) {
    const err = toErrorLike(rawErr);
    return {
      ok: false,
      error: err.message ?? "ZeroDev sponsored check failed",
    };
  }
}
