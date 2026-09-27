# Contracts

Foundry project at `contracts/`. Read `docs/Context.md` first, the same
comment and style rules apply here.

## RelayPolicy.sol

`contracts/src/RelayPolicy.sol`. Deployed to Arbitrum Sepolia. This is
the on-chain, verifiable half of Relay's spending policy: the agent
proposes a transfer, this contract is the only thing that can allow or
block it.

Core rules, on purpose:

- Every limit is per-recipient and read from storage, never a hardcoded
  global constant. A recipient the owner has never configured is
  auto-enrolled under the owner-set default bounds
  (`defaultPerTxMaxWei` / `defaultDailyMaxWei`) rather than rejected
  outright, since Relay's product lets a user type any address in one
  sentence. Leaving both defaults at `0` means unconfigured recipients
  are rejected, matching behavior from before the default mechanism
  existed.
- `checkAndRecord` is the single entry point the agent calls before
  executing a spend. It enforces the per-transaction cap, rolls the 24
  hour spending window forward when it has elapsed, and enforces the
  rolling daily cap, in that order.
- `paused` is a guardian kill switch the owner can flip at any time,
  checked first in `checkAndRecord`.
- `owner` is immutable, set once at deployment to the deployer. `agent`
  is mutable via `setAgent`, so the owner can rotate which address is
  allowed to call `checkAndRecord` without redeploying.

## Testing and deployment

- Tests: `contracts/test/RelayPolicy.t.sol`, run with `forge test` from
  `contracts/`.
- Deployment script: `contracts/script/Deploy.s.sol`.
- `contracts/out`, `contracts/cache`, `contracts/broadcast`, and
  `contracts/lib` are generated or vendored (Foundry build artifacts
  and `forge-std`). Do not hand edit anything there, and do not run
  Prettier or ESLint over them, they are excluded in `.prettierignore`
  and are not part of the frontend project's lint scope at all.

## Referenced on the frontend

The verified contract address and the two real, verified transaction
hashes shown on the marketing page
(`components/marketing/realSends.ts`) point at this contract and real
sends through it. See `docs/frontend.md` for where that data surfaces
in the UI.
