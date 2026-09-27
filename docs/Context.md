# Relay: locked project context

This file is the source of truth for engineering conventions on this
repo. It is not a changelog. When a decision below conflicts with older
code, the older code is the thing that is wrong and should be brought
into line, not the other way around.

Domain-specific detail lives in its own file so this index stays short:

- `docs/frontend.md`, the Next.js app: routing, design tokens, spacing
  system, motion system, component patterns.
- `docs/contracts.md`, the Solidity contract: `RelayPolicy.sol`.

## Writing style, everywhere

No em dashes. Not in code, not in comments, not in copy, not in these
docs, not in commit messages. Use a period, a comma, or restructure the
sentence instead.

## Comment style

A comment must earn its place by explaining something the code cannot
say for itself: a constraint, a workaround, a non-obvious reason. It
should never restate what the next line already says in plain English.
If deleting a comment would not confuse a future reader, delete it.

Format:

- One line of explanation: a `//` line comment directly above the code
  it explains.
- More than one line: a `/** ... */` block comment, not a stack of `//`
  lines.

```ts
// Retried once. Groq's endpoint drops the connection under load
// often enough that a bare single attempt fails visibly in demos.
async function callGroq() {}

/**
 * Runs the policy check as a free eth_call before the real UserOp so a
 * policy rejection is distinguishable from an infrastructure failure,
 * and so sponsored gas is never spent on a call that would revert
 * anyway.
 */
async function simulateThenSend() {}
```

## TypeScript: no `any`, no unnecessary casts

Prefer a real type or interface over `any` or an `as` cast. When a
shape is used in more than one file, put it in `types/types.ts`, export
it from there, and import it everywhere it is needed instead of
redeclaring it inline. A cast is acceptable only at a genuine trust
boundary (for example, a third party SDK callback typed as `unknown`)
and should carry a comment saying why the cast is safe there.

## Lint and format

- ESLint: `next/core-web-vitals` plus `eslint-plugin-import` and
  `eslint-plugin-unused-imports`, with Prettier wired in through
  `eslint-config-prettier` (Prettier owns formatting, ESLint owns
  correctness, they do not fight over the same rule).
- Unused variables and unused imports are lint errors, not warnings.
  The only escape hatch is an underscore prefix (`_unused`) for a
  parameter that must exist for its position but is not read.
- `@typescript-eslint/no-explicit-any` is an error.
- Prettier: 80 column print width, 2 space tabs, semicolons on, double
  quotes, trailing commas where valid in ES5, always parenthesize
  arrow function parameters, LF line endings. See `.prettierrc`.
- Run `npm run lint`, `npm run typecheck`, `npm run format:check`, and
  `npm run build` before considering a change finished. The one
  standing exception is a pre-existing type error inside the `ox`
  package's own source (a transitive dependency, not our code), which
  `npm run typecheck` will still report and which is not fixable from
  this repo.

## Tailwind: canonical values over arbitrary ones

Reach for a value already on Tailwind's default scale (`px-6`, `text-sm`,
`rounded-xl`) before reaching for an arbitrary bracket value
(`px-[23px]`). An arbitrary value is for the rare case where the design
genuinely does not fit the scale, not a default habit. If an arbitrary
value keeps recurring, that is a sign it should become a named token in
`tailwind.config.ts` instead (see the color and spacing tokens in
`docs/frontend.md`), not a sign to keep repeating the bracket syntax.

## Layout: gap over margin for sibling spacing

When several elements stack vertically or sit in a row, the container
gets `flex` or `grid` plus a `gap-*`, and the children stay free of
`mt-*` / `mb-*` / `ml-*` / `mr-*` used purely to create distance from a
sibling. A margin on a child is for a genuine one-off exception, not
the default way to space a list of things. This is the same reasoning
as the Tailwind rule above: a repeated hand-picked value scattered
across many call sites is harder to change later than one value set in
one place.

## Reusability and modularity

Before writing a new one-off pattern, check whether an existing shared
helper already does the job (a hook in `lib/`, a variant in
`lib/motionVariants.ts`, a component in `components/`). Extract a
shared helper once a pattern is used in two or more places, not before,
and not only after it has spread to ten.

## Accessibility

Every interactive element is a real `button` or `a`, not a `div` with an
`onClick`. Icon-only controls carry an `aria-label`. Decorative images
and SVGs carry `aria-hidden="true"` and no redundant `alt` text.
Disclosure patterns (accordions, dropdowns) expose their open state via
`aria-expanded`. Color is never the only signal, text or an icon
carries the meaning too.
