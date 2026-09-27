/**
 * lib/realSends.ts
 *
 * The two real, verified Relay sends kept as a hardcoded last-resort
 * fallback wherever live data (see app/api/real-sends/route.ts) is
 * unavailable, shown across the marketing page's phone mockups and
 * /app's payment receipt and ticker. Both moved between the same two
 * wallets, the Magic-derived Relay wallet
 * 0xE732457153a6dbA7C0E1b9D4B1EA1F4E090cf03E and recipient
 * 0x829Ca89412Df6fe0bBC5C5d94aEf62B5b2102e63. Kept verbatim, these are
 * not placeholders. Shared here (not scoped under components/marketing)
 * since /app needs the same fallback data, not just the marketing page.
 *
 * The first title shows the real recipient as a truncated address, not
 * an ENS name: the app does not resolve ENS (see the explicit notice
 * in app/app/page.tsx), so no display copy anywhere should imply that
 * capability, including this real transaction's own label.
 */

export interface RealSend {
  title: string;
  /** Display form, may be truncated. */
  hash: string;
  /** Arbiscan link. Omitted when the full hash cannot be verified, rather than risk linking to a wrong or incomplete transaction. */
  href?: string;
}

export const REAL_SENDS: RealSend[] = [
  {
    title: "5.00 USDC to 0x829C…2e63",
    hash: "0x118ff4…0dcfe",
    href: "https://arbiscan.io/tx/0x118ff441d1bb070c000b74a940ebc3637dfd3d989781321bd8ec47b22f80dcfe",
  },
  {
    title: "0.00005 ETH · EIP-7702",
    // Only the truncated form is confirmed, the full hash was not reliably recorded (conflicting start and end fragments in source notes), so this deliberately has no href rather than guessing.
    hash: "0x065631…f839e",
    href: undefined,
  },
];
