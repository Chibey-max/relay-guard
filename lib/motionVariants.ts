// lib/motionVariants.ts
// Shared framer-motion variants for the marketing page (and, as this
// rolls out further, other pages) — named per the kind of content they're
// for, not per literal section, so the same variant is reused wherever
// that content shape recurs instead of every section inventing its own
// timing/easing by hand. All durations/eases below are deliberately
// slower and softer than a default CSS transition (ease-in-out over
// 0.6-0.8s, not the ~0.2-0.3s snap of a hover-state transition) — the
// brief here is a "premium" unhurried feel, not a quick UI acknowledgment.

import type { Variants } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const; // matches the existing "converge" cubic-bezier elsewhere in the app

/** Generic section reveal — fade + rise. The default for most content blocks. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/** For content that shouldn't shift position (backgrounds, decorative layers). */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
};

/** Parent wrapper for a grid/row of items that should reveal in sequence rather than all at once. Pair with staggerItem on each child. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

/** Child of staggerContainer — same motion language as fadeUp, sized down slightly since these are usually smaller card-level content. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/** Hero headline block — a touch more travel distance and a longer duration than the generic fadeUp, since it's the first, most prominent thing a visitor sees. Meant to be the parent of a staggerItem-style children group (headline, subhead, CTAs each register as their own child). */
export const heroText: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

export const heroTextItem: Variants = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

/** The hero phone mockup — scale + fade instead of a vertical rise, since it's a device illustration, not a line of text; a slight zoom-in reads as the object settling into place. */
export const phoneReveal: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE },
  },
};

/** Cards/tiles that should feel like they're gently scaling into place rather than sliding — used for the feature card grid. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE } },
};
