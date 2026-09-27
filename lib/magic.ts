// lib/magic.ts
/**
 * Magic embedded wallet, the login layer (wins the $500 Magic bonus).
 *
 * Magic produces a non-custodial EOA from an email/social login. That EOA
 * address becomes the ownerAddress for the Particle Universal Account.
 * No seed phrase ever shown to the user. This is the "no seed phrases" pillar.
 *
 * Client-side only (browser). The Magic instance must not run on the server.
 */

import type { Magic } from "magic-sdk";
import type { Signer } from "./particle";

let magicSingleton: Magic | null = null;

export async function getMagicInstance() {
  return getMagic();
}

async function getMagic() {
  if (typeof window === "undefined") {
    throw new Error("Magic can only be initialized in the browser.");
  }
  if (magicSingleton) return magicSingleton;

  const { Magic } = await import("magic-sdk");
  const key = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;
  if (!key)
    throw new Error("Magic publishable key missing. Set it for live mode.");

  /**
   * No custom network here: ZERODEV_BUNDLER_RPC is server-only and undefined
   * in the browser. Email OTP auth doesn't need an RPC; we set network for
   * signing only when getMagicSigner is called.
   */
  magicSingleton = new Magic(key);
  return magicSingleton;
}

// Email OTP login. Returns the user's email + EOA address.
export async function loginWithEmail(
  email: string
): Promise<{ email: string; address: string }> {
  const magic = await getMagic();
  await magic.auth.loginWithEmailOTP({ email });
  const address = await resolveAddress(magic);
  if (!address)
    throw new Error(
      "Login succeeded but no wallet address returned. Try the manual check."
    );
  return { email, address };
}

export async function logout(): Promise<void> {
  const magic = await getMagic();
  await magic.user.logout();
}

export async function isLoggedIn(): Promise<boolean> {
  try {
    const magic = await getMagic();
    return await magic.user.isLoggedIn();
  } catch {
    return false;
  }
}

/**
 * Gets the EOA address from a Magic instance. Tries getInfo() first, then
 * falls back to eth_accounts since getInfo().publicAddress can be null
 * immediately after OTP completes (session propagation lag).
 */
async function resolveAddress(magic: Magic): Promise<string | null> {
  try {
    const info = await magic.user.getInfo();
    // magic-sdk's MagicUserMetadata type nests the address under
    // wallets.ethereum, not at a top-level publicAddress field. Reading
    // the typed field here (see MagicUserMetadata in @magic-sdk/types).
    const ethAddress = info?.wallets?.ethereum?.publicAddress;
    if (ethAddress) return ethAddress;
  } catch {}
  try {
    const accounts: string[] = await magic.rpcProvider.request({
      method: "eth_accounts",
    });
    if (accounts?.[0]) return accounts[0];
  } catch {}
  return null;
}

// Adapts the Magic provider into the Signer shape Particle's UA needs.
export async function getMagicSigner(): Promise<Signer> {
  const magic = await getMagic();
  const address = await resolveAddress(magic);
  if (!address)
    throw new Error("Could not read wallet address from Magic session.");

  const { BrowserProvider } = await import("ethers");
  const provider = new BrowserProvider(magic.rpcProvider);
  const ethSigner = await provider.getSigner();

  return {
    address,
    signMessage: async (bytes: Uint8Array) => ethSigner.signMessage(bytes),
    signEIP7702Authorization: (params) => signEIP7702Authorization(params),
  };
}

/**
 * EIP-7702 authorization signing, a DIFFERENT digest/signing scheme than
 * personal_sign (used by getMagicSigner above): it signs
 * keccak256(0x05 || rlp([chainId, address, nonce])) with no message prefix,
 * which is why a generic ethers Signer.signMessage() can't produce it.
 * Magic exposes this natively via magic.wallet.sign7702Authorization,
 * confirmed present in the installed @magic-sdk/provider version, and the
 * officially documented way to delegate a Magic-embedded EOA under
 * Particle's Universal Accounts EIP-7702 mode.
 */
export async function signEIP7702Authorization(params: {
  contractAddress: string;
  chainId: number;
  nonce?: number;
}) {
  const magic = await getMagic();
  return magic.wallet.sign7702Authorization(params);
}
