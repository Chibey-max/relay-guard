// components/AmbientGradient.tsx
/**
 * A static (non-animated) ambient background wash sitting behind all page
 * content: sage green and warm amber blobs overlapping, echoing the Stax
 * reference's "circles of color" look instead of a flat page background.
 *
 * A previous attempt at this (components/AmbientOrb.tsx, since removed)
 * read as a visible smudge rather than ambient atmosphere: a fixed 700px
 * circle, blurred, animated, and confined to one corner at 2xl+ only. This
 * version is deliberately built differently to avoid the same failure:
 *   - No filter: blur() at all. The softness comes from each gradient's
 *     own falloff (color -> transparent well before its own edge), which
 *     stays smooth at any resolution instead of reading as a rasterized,
 *     edged blob.
 *   - THREE SEPARATE radial-gradient layers, not one gradient with color
 *     stops. Each blob has its own center, color, and size, so they don't
 *     relate proportionally the way stops on one gradient would. This is
 *     what produces the reference's look of distinct, overlapping colored
 *     circles (with natural blending where they intersect) rather than one
 *     smooth two-tone wash.
 *   - Genuinely low opacity per layer (8-15%), no animation, present at
 *     every viewport width (not gated to one breakpoint).
 *
 * Usage: place once per page, as an early sibling of the page's content
 * (before ParticleField, so the particle canvas paints on top of it),
 * with position:relative on the page's own root element.
 */
export default function AmbientGradient({
  sageVar = "--mkt-sage",
  sageSoftVar = "--mkt-sage-soft",
  amberVar = "--mkt-amber",
}: {
  /** CSS custom property name (no rgb()/var() wrapper) holding the sage RGB triplet for this page's token system. */
  sageVar?: string;
  /** CSS custom property name holding a second, softer sage-family RGB triplet for the third (lower, smaller) blob. */
  sageSoftVar?: string;
  /** CSS custom property name holding the amber RGB triplet for this page's token system. */
  amberVar?: string;
}) {
  return (
    <div
      aria-hidden="true"
      /**
       * z-0 (NOT a negative z-index), same reasoning as ParticleField:
       * this page's root has no z-index of its own, so a NEGATIVE z-index
       * here would paint behind the root's own opaque background instead
       * of on top of it, hiding the gradient completely. Placed earlier in
       * the DOM than ParticleField so the canvas (also z-0) still paints
       * above it, and both stay below the z-10 content wrapper.
       */
      className="pointer-events-none absolute inset-x-0 top-0 z-0"
      style={{
        height: "130vh",
        backgroundImage: `
          radial-gradient(circle at 22% 26%, rgb(var(${sageVar}) / 0.14) 0%, transparent 45%),
          radial-gradient(circle at 78% 58%, rgb(var(${amberVar}) / 0.12) 0%, transparent 50%),
          radial-gradient(circle at 46% 88%, rgb(var(${sageSoftVar}) / 0.1) 0%, transparent 40%)
        `,
      }}
    />
  );
}
