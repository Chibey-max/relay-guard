"use client";
/**
 * components/marketing/HeroVideo.tsx
 *
 * Hero background video, sits behind the headline, CTAs, and phone
 * mockup inside the hero <header>. Takes motionOn as a prop, the same
 * reduced-motion signal the rest of the page already derives from
 * matchMedia("(prefers-reduced-motion: reduce)") in app/page.tsx,
 * instead of re-deriving it here, so there is one source of truth
 * instead of a second listener that could drift out of sync with the
 * rest of the page.
 *
 * When motionOn is false, this renders the poster as a plain <img>
 * instead of a <video> element entirely, not a paused video, so no
 * video decoding or loading ever happens for a reduced-motion visitor.
 */

import { useEffect, useRef, useState } from "react";

export default function HeroVideo({
  motionOn,
  theme,
}: {
  motionOn: boolean;
  theme: "dark" | "light";
}) {
  /**
   * Fades the video/poster's bottom edge only, blending it into the
   * section below. No top fade, since the hero is the first thing on
   * the page with nothing above it to blend into. A top fade here would
   * reveal the page's own background through the video's transparent
   * mask before the dark footage becomes fully opaque a bit further
   * down. In light mode that page background is light, so the reveal
   * then darken read as an added shadow descending from the top edge,
   * not a blend. Applied to whichever of video/poster is actually
   * rendered, so it looks identical whether or not reduced-motion
   * swapped one for the other.
   */
  const edgeFadeStyle = {
    maskImage: "linear-gradient(to bottom, black 90%, transparent 100%)",
    WebkitMaskImage: "linear-gradient(to bottom, black 90%, transparent 100%)",
  };

  // Fades the whole hero visual out as the user scrolls past it, smoother than an abrupt disappearance once the hero scrolls out of the layout. Scoped to this component's own root so it does not need to touch the page's other scroll-driven state (the nav's show/hide tracking).
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrollOpacity, setScrollOpacity] = useState(1);

  useEffect(() => {
    /**
     * The hero's rendered height is only slightly taller than a typical
     * viewport, so a fade starting at scrollY 0 was already visibly
     * dimming the hero within the first 100 to 200px of scroll, well
     * before the user was anywhere near its actual bottom edge. DEAD_ZONE
     * holds full opacity for the first 60% of the hero's height, then
     * fades linearly over the remaining 40%, so the fade genuinely
     * tracks "close to the bottom" instead of "as soon as scrolling
     * starts."
     */
    const DEAD_ZONE = 0.6;
    let ticking = false;

    function updateScrollOpacity() {
      const el = rootRef.current;
      if (!el) return;
      const heroHeight = el.offsetHeight || 1;
      const raw = window.scrollY / heroHeight - DEAD_ZONE;
      const progress = Math.min(Math.max(raw / (1 - DEAD_ZONE), 0), 1);
      setScrollOpacity(1 - progress);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateScrollOpacity();
        ticking = false;
      });
    }

    updateScrollOpacity();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={rootRef}
      className="absolute inset-0"
      style={{ opacity: scrollOpacity }}
    >
      {motionOn ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/videos/hero-bg-poster.jpg"
          className="absolute inset-0 z-0 h-full w-full object-cover"
          style={edgeFadeStyle}
        >
          <source src="/videos/hero-bg.mp4" type="video/mp4" />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- deliberately a plain <img>, not next/image: this is a full-bleed absolute background layer sized by its parent, not a content image that needs Next's responsive srcset handling.
        <img
          src="/videos/hero-bg-poster.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 z-0 h-full w-full object-cover"
          style={edgeFadeStyle}
        />
      )}
      {/**
       * Soft wash, not a heavy shadow. Clear at the top (no darkening
       * there at all) and only a short, gentle dim confined to roughly
       * the bottom quarter. The headline itself carries a text-shadow
       * (see app/page.tsx) as its own contrast insurance, so this does
       * not need to do all the legibility work by itself.
       */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, transparent 45%, rgba(0,0,0,0.18) 70%, transparent 100%)",
        }}
      />
      {/* Radial vignette, only in dark mode. In light mode its faint reach toward the top/center still read as an unwanted shadow over the video, so it is cut entirely there rather than just reduced. */}
      {theme === "dark" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 45%, transparent 55%, rgba(0,0,0,0.14) 100%)",
          }}
        />
      )}
    </div>
  );
}
