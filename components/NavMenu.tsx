"use client";
// components/NavMenu.tsx
/**
 * Compact icon-button + dropdown for moving between the marketing page and
 * the app. Used on BOTH pages so there's always a way to get from one to
 * the other, including from inside /app itself (which intentionally has no
 * full marketing nav bar anymore). Styled entirely via inline colors passed
 * in by the caller rather than Tailwind color utilities, since the two
 * pages use different token systems (--mkt-* vs --c-*) and this component
 * has no way to know which cascade it's rendered under.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type NavMenuColors = {
  ink: string;
  muted: string;
  line: string;
  card: string;
  accent: string;
};

export default function NavMenu({
  page,
  colors,
  buttonColors,
}: {
  /** Which page this menu is rendered on: controls which links show and which one is the primary "go to the other side" link. */
  page: "marketing" | "app";
  colors: NavMenuColors;
  /** Override just the CLOSED button's icon/border colors, independent of colors.ink/line. Needed when the button sits over a variable background (e.g. the hero video) but the opened dropdown panel is still a normal opaque card that should use the page's regular theme colors. Falls back to colors.ink/colors.line when omitted. */
  buttonColors?: { icon: string; border: string };
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const primary =
    page === "marketing"
      ? { href: "/app", label: "Open the app" }
      : { href: "/", label: "Back to home" };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Navigation menu"
        aria-expanded={open}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition hover:opacity-80"
        style={{
          borderColor: buttonColors?.border ?? colors.line,
          color: buttonColors?.icon ?? colors.ink,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <line
            x1="1.5"
            y1="4"
            x2="14.5"
            y2="4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <line
            x1="1.5"
            y1="8"
            x2="14.5"
            y2="8"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <line
            x1="1.5"
            y1="12"
            x2="14.5"
            y2="12"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 overflow-hidden rounded-xl border py-1.5 text-sm shadow-lg"
          style={{
            background: colors.card,
            borderColor: colors.line,
            color: colors.ink,
          }}
        >
          <Link
            href={primary.href}
            onClick={() => setOpen(false)}
            className="block px-4 py-2 font-medium transition hover:opacity-70"
            style={{ color: colors.accent }}
          >
            {primary.label}
          </Link>
          {page === "marketing" && (
            <>
              <Link
                href="/app?mode=demo"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 transition hover:opacity-70"
              >
                Try the demo
              </Link>
              <a
                href="#how"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 transition hover:opacity-70"
              >
                How it works
              </a>
              <a
                href="#faq"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 transition hover:opacity-70"
              >
                FAQ
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
