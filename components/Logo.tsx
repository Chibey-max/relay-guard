import { useId } from "react";

/**
 * The Relay Guard mark: a shield split down the middle by the threshold
 * every payment has to cross, with the latch sitting on that seam.
 *
 * Inlined rather than loaded as <img src="/brand/relay-guard-icon.svg">
 * so it costs no extra request and cannot flash in after the header has
 * painted. The tile carries its own deep navy background, so it reads as
 * an app icon on the light landing page and on the dark app shell alike.
 *
 * The two clipPaths are what create the seam, and their ids have to be
 * unique per instance: the landing page renders this mark twice (header
 * and footer), and duplicate ids in one document make the second copy
 * clip against the first one's rects.
 */
export default function Logo({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const left = `rg-clip-l-${uid}`;
  const right = `rg-clip-r-${uid}`;
  const shield =
    "M32 5 L55 13.5 V30 C55 44.5 45.5 54 32 59 C18.5 54 9 44.5 9 30 V13.5 Z";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      role="img"
      aria-label="Relay Guard"
      className={className}
    >
      <rect width="512" height="512" rx="112" fill="#070B14" />
      <g transform="translate(96 88) scale(5)">
        <defs>
          <clipPath id={left}>
            <rect x="0" y="0" width="28.5" height="64" />
          </clipPath>
          <clipPath id={right}>
            <rect x="35.5" y="0" width="28.5" height="64" />
          </clipPath>
        </defs>
        <path clipPath={`url(#${left})`} d={shield} fill="#5EEAD4" />
        <path clipPath={`url(#${right})`} d={shield} fill="#5EEAD4" />
        <rect
          x="29.25"
          y="15"
          width="5.5"
          height="5.5"
          rx="1.2"
          fill="#F5A524"
        />
      </g>
    </svg>
  );
}
