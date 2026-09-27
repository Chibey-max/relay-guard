import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /**
         * Colors reference CSS variables (see app/globals.css) so the
         * dark/light toggle works by flipping a class, not by duplicating
         * every utility class across two color sets. Wrapped in
         * rgb(... / <alpha-value>), not just var(--c-x), so Tailwind's
         * opacity modifiers (border-line/40, bg-check/30, etc.) actually
         * splice in an alpha channel instead of silently falling back to
         * the default gray border/bg color. See docs/frontend.md for the
         * full token list and when to reach for a new one.
         */
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        slate: "rgb(var(--c-slate) / <alpha-value>)",
        slate2: "rgb(var(--c-slate2) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        line2: "rgb(var(--c-line2) / <alpha-value>)",
        chalk: "rgb(var(--c-chalk) / <alpha-value>)",
        mist: "rgb(var(--c-mist) / <alpha-value>)",
        dim: "rgb(var(--c-dim) / <alpha-value>)",
        check: "rgb(var(--c-check) / <alpha-value>)",
        /**
         * Marketing page tokens (see app/marketing.css). Same
         * rgb(... / <alpha-value>) wrapping as the app tokens above, kept
         * on a separate "mkt-" prefix so a copy-pasted class never
         * silently resolves to the wrong page's palette.
         */
        "mkt-ink": "rgb(var(--mkt-ink) / <alpha-value>)",
        "mkt-muted": "rgb(var(--mkt-muted) / <alpha-value>)",
        "mkt-muted2": "rgb(var(--mkt-muted2) / <alpha-value>)",
        "mkt-card": "rgb(var(--mkt-card) / <alpha-value>)",
        "mkt-cream": "rgb(var(--mkt-cream) / <alpha-value>)",
        "mkt-line": "rgb(var(--mkt-line) / <alpha-value>)",
        "mkt-sage": "rgb(var(--mkt-sage) / <alpha-value>)",
        "mkt-sage-soft": "rgb(var(--mkt-sage-soft) / <alpha-value>)",
        "mkt-amber": "rgb(var(--mkt-amber) / <alpha-value>)",
        "mkt-fixed-light": "rgb(var(--mkt-fixed-light) / <alpha-value>)",
        "mkt-fixed-dark": "rgb(var(--mkt-fixed-dark) / <alpha-value>)",
        "mkt-phone-frame": "rgb(var(--mkt-phone-frame) / <alpha-value>)",
        "mkt-phone-ring": "rgb(var(--mkt-phone-ring) / <alpha-value>)",
      },
      spacing: {
        /**
         * Section-level padding tokens. Deliberately escalating (not a
         * flat repeat) so mobile gets tighter breathing room and larger
         * screens get more, applied as
         * `px-section-px sm:px-section-px-sm lg:px-section-px-lg` (and the
         * `py-` equivalents) on every top-level marketing section instead
         * of each section picking its own px-6/py-20/py-24 by hand. Change
         * the values here, not at each call site, when the scale needs to
         * move. See docs/frontend.md for the full rationale.
         */
        "section-px": "1rem",
        "section-px-sm": "1.5rem",
        "section-px-lg": "2rem",
        "section-py": "3rem",
        "section-py-sm": "5rem",
        "section-py-lg": "6rem",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        converge: {
          "0%": { transform: "translateY(18px)", opacity: "0" },
          "100%": { transform: "none", opacity: "1" },
        },
        // Opacity-only page-arrival fade — NOT a variant of converge. Any
        // element with an animated "transform" property becomes a
        // containing block for position:fixed descendants, in Chromium,
        // even once the animation settles on a value that's visually
        // identical to identity ("none") — the computed style still
        // resolves to an explicit matrix, not the literal "none" keyword,
        // and that's enough to trigger it. Applying converge (which
        // animates transform) to a page ROOT permanently broke every
        // position:fixed descendant anywhere on that page (the hero nav's
        // "fixed" state was rendering relative to the root div's box
        // instead of the real viewport). This keyframe only ever touches
        // opacity, so it can't cause that regardless of fill-mode.
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseline: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        blink: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        stamp: {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "scroll-left": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        // Mirrored direction for the marketing ticker's second marquee row.
        "scroll-right": {
          from: { transform: "translateX(-50%)" },
          to: { transform: "translateX(0)" },
        },
        // Includes the FULL resting transform (centering translate, the
        // responsive --phone-scale, and the 3D rotateY/rotateX/rotateZ tilt)
        // in every keyframe, not just translateY — a running CSS animation's
        // transform value completely replaces any separately-applied inline
        // transform for the same property, so leaving any part out here
        // would silently drop it for as long as this animation runs (this
        // is what previously produced the "phone renders upright/offset"
        // bug). var(--phone-scale) still resolves per breakpoint since it's
        // inherited from the element the animation is applied to, not
        // hardcoded here.
        "float-phone": {
          "0%,100%": {
            transform:
              "translate(-50%, -50%) scale(var(--phone-scale)) rotateY(29deg) rotateX(4deg) rotateZ(-8deg) translateY(0)",
          },
          "50%": {
            transform:
              "translate(-50%, -50%) scale(var(--phone-scale)) rotateY(29deg) rotateX(4deg) rotateZ(-8deg) translateY(-10px)",
          },
        },
        // Mobile-only: turns the phone in place between its two facing
        // angles (rotateY swings from 29deg to -29deg) instead of the
        // vertical bounce used at sm+ — it's a rotation, not a slide, so
        // position/scale/rotateX/rotateZ all stay fixed and only rotateY
        // animates. animation-direction: alternate (set below, not here)
        // handles the "and back" half of the loop smoothly.
        "float-phone-mobile": {
          "0%": {
            transform:
              "translate(-50%, -50%) scale(var(--phone-scale)) rotateY(29deg) rotateX(4deg) rotateZ(-8deg)",
          },
          "100%": {
            transform:
              "translate(-50%, -50%) scale(var(--phone-scale)) rotateY(-29deg) rotateX(4deg) rotateZ(-8deg)",
          },
        },
        // Left-to-right reveal for the "You type" node's typed-out detail
        // line in ArchitectureFlow, replayed each loop via a remount key.
        typewriter: {
          from: { clipPath: "inset(0 100% 0 0)" },
          to: { clipPath: "inset(0 0% 0 0)" },
        },
      },
      animation: {
        converge: "converge 0.7s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.5s ease-out both",
        pulseline: "pulseline 1.6s ease-in-out infinite",
        blink: "blink 1.1s step-end infinite",
        stamp: "stamp 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
        "scroll-left": "scroll-left 26s linear infinite",
        "scroll-right": "scroll-right 26s linear infinite",
        "float-phone": "float-phone 5.5s ease-in-out infinite",
        "float-phone-mobile":
          "float-phone-mobile 4s ease-in-out infinite alternate",
        typewriter: "typewriter 0.7s steps(20,end) 1",
      },
    },
  },
  plugins: [],
};
export default config;
