# Frontend

Next.js 14 App Router, TypeScript, Tailwind CSS. Read `docs/Context.md`
first, the rules there apply to every file in this section.

## Routes

- `/`, `app/page.tsx`. The marketing landing page. Decorative and
  informational only. No SDK imports, no `/api/*` calls.
- `/app`, `app/app/page.tsx`. The real, wallet-connected product: login,
  unified balance, parse, confirm, execute, receipt. Supports
  `?mode=demo` to force the sandboxed demo flow without a wallet.
- `/api/*`, server routes for intent parsing, balance, and execution.
  Shared by both the demo and live flows in `/app`.

`/app` was moved here from the repo root; it was not rebuilt. If you
are looking for the original single-page submission, this is it, just
at a new path.

## Two token systems, kept apart on purpose

The marketing page and `/app` use separate CSS custom property sets so
a copy-pasted class from one page can never silently pick up the
other's palette:

- `/app`, `app/globals.css`, prefix `--c-*` (`--c-ink`, `--c-chalk`,
  `--c-check`, and so on), registered as Tailwind color tokens `ink`,
  `chalk`, `check`, `mist`, `dim`, `slate`, `slate2`, `line`, `line2` in
  `tailwind.config.ts`.
- Marketing, `app/marketing.css`, prefix `--mkt-*`, registered as
  Tailwind color tokens `mkt-ink`, `mkt-muted`, `mkt-muted2`,
  `mkt-card`, `mkt-cream`, `mkt-line`, `mkt-sage`, `mkt-sage-soft`,
  `mkt-amber`, `mkt-fixed-light`, `mkt-fixed-dark`, `mkt-phone-frame`,
  `mkt-phone-ring`.

Both sets flip with a `.dark` / `.light` class toggle, not a media
query, since the toggle is user driven.

When a color is used in more than one place, it belongs in one of these
two token sets and gets used as a Tailwind class (`text-mkt-ink`), not
repeated as an inline `style={{ color: "rgb(var(--mkt-ink))" }}` at
every call site. Add the token to `tailwind.config.ts` once, then
reference it by class everywhere.

`--mkt-fixed-light` / `--mkt-fixed-dark` and `--c-check-soft` /
`--mkt-phone-frame` / `--mkt-phone-ring` are examples of tokens that
deliberately do not flip with the theme toggle, because the element
they style (the hero phone frame, the trust panel) is meant to read as
one fixed physical object regardless of the surrounding page theme.

## Section spacing tokens

Every top level marketing section uses the same escalating spacing
scale instead of picking its own `px-6` / `py-20` / `py-24` by hand:

```
px-section-px sm:px-section-px-sm lg:px-section-px-lg
py-section-py sm:py-section-py-sm lg:py-section-py-lg
```

Values live in `tailwind.config.ts`, `theme.extend.spacing`. The scale
escalates on purpose (tighter on mobile, more generous on larger
screens), it is not a flat repeat of one value under three names. Move
the whole page's spacing by changing the values there, not by editing
every section's className.

## Sibling spacing: gap, not margin

Wrap a list or a stack of elements in a `flex flex-col gap-*` or
`grid gap-*` container. Do not reach for `mt-*` / `mb-*` on each child
to create distance from its sibling. A margin utility on a child is for
a real one-off exception, not the default spacing mechanism.

## Motion

`lib/motionVariants.ts` exports the shared framer-motion variants used
across the landing page: `fadeUp`, `fadeIn`, `staggerContainer` /
`staggerItem`, `heroText` / `heroTextItem`, `phoneReveal`, `scaleIn`.
Add a new named variant there when a new motion shape is needed, do not
hand-roll a one-off transition inline in a page component.

The landing page's `Reveal`, `StaggerGrid`, and `StaggerCard` helpers
(defined inside `MarketingPage` in `app/page.tsx` so they can read the
page's own `motionOn` state without it being threaded through every
call site) wrap these variants for the common case: fade a block in
once, the first time it scrolls into view. When `motionOn` is false
(the user prefers reduced motion), these render a plain, already
visible `div` instead of a `motion.div`, matching the rest of the
page's reduced motion handling.

`/app` and the rest of the codebase still use the older
`lib/useReveal.ts` (IntersectionObserver plus a CSS `animate-converge`
class). That migration has not happened yet. This is a scoped, known
gap, not an oversight: framer-motion work started on the landing page
first, on purpose, before rolling out further.

## Known CSS pitfalls worth remembering

- A CSS animation that touches `transform`, even one whose final
  keyframe is visually identical to the identity transform, makes that
  element a containing block for `position: fixed` descendants in
  Chromium. This broke the hero nav's fixed state once before. If an
  element needs to be an ancestor of something `position: fixed`, keep
  its own animations opacity only.
- `overflow: hidden` on an ancestor clips a `position: fixed`
  descendant too, once the ancestor itself scrolls out of the
  viewport, even though `fixed` is normally viewport relative. Keep a
  `position: fixed` element outside any ancestor that needs
  `overflow: hidden` for an unrelated reason (video clipping, in this
  page's case).
- `-50%` in a `translateX` is relative to the element's own width. If
  the same element has two visual states with different widths, do not
  let a CSS transition animate that transform between them, the
  horizontal centering will visibly slide as a side effect.

## Phone mockup components are a scoped exception to gap-not-margin

`components/marketing/PhoneMock.tsx` and `components/marketing/TrustPanel.tsx`
simulate a physical phone screen at pixel-precise scale. The margin
utilities inside those screens (`AgentScreen`, `ComposeScreen`,
`ProcessingScreen`, `SuccessScreen`, and TrustPanel's mini phone) are
the device mockup's internal rhythm, not general page layout, so they
are kept as `mt-*` / `mb-*` rather than converted to gap wrappers. The
gap-over-margin rule above still applies to everything else in both
files and to the rest of the page.

## Shared types

`types/types.ts` holds shapes used across more than one file, `ErrorLike`
for narrowing a caught `unknown` value without an `any` cast is the
first entry there. A local `toErrorLike(err: unknown): ErrorLike`
helper sits next to each catch site that needs it (`lib/particle.ts`,
`lib/zerodev.ts`, `components/MagicLogin.tsx`, `app/app/page.tsx`),
duplicated on purpose since it is a two line function, not shared
state, pulling it into `types/types.ts` would turn a types file into a
runtime import for no real benefit.

## Contracts data shown on the frontend

The two real, verified transaction hashes and the `RelayPolicy.sol`
address shown on the marketing page (`lib/realSends.ts`)
are genuine, not placeholders. Do not replace them with fixture data.

## Live real-send data, and its known limitation

`app/api/real-sends/route.ts` fetches the Relay wallet's transaction
history from Etherscan's V2 API, shared across consumers via
`lib/useRealSends.ts` (the marketing ticker, `/app`'s ticker, and the
payment receipt quote), each falling back to the session's own
`realHistory` first and the hardcoded pair in `lib/realSends.ts` last.

Confirmed against the wallet's actual transactions: this will keep
returning an empty list for this wallet's normal send pattern. Real
sends execute as EIP-7702 transactions where a relayer submits and
pays gas, so the Relay wallet never appears as `tx.from`, only inside
`authorizationList` and the calldata, neither of which the `txlist`
endpoint exposes. This is not a bug to chase, session tracking and the
hardcoded fallback are what actually keep this honest and populated.
Properly detecting 7702-delegated sends would mean scanning raw
transactions for `authorizationList` matches, a meaningfully bigger
task left undone on purpose.
