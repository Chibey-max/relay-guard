import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Relay Guard: SERV decides if your money should move",
  description:
    "Relay Guard turns one sentence into a payment and puts SERV Reasoning between the sentence and the signature. Every request gets an ALLOW, REVIEW or BLOCK verdict with reasons you can check, and the server refuses to execute without a signed SERV receipt.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <head>
        {/**
         * A raw <link>, not next/font/google: this is a variable icon
         * font (Material Symbols), not body text, and next/font's
         * per-weight subsetting model does not fit an opsz/wght/FILL/GRAD
         * variable axis font like this one.
         *
         * display=block, not swap or optional: every character in this
         * font is a ligature-substituted icon glyph, individual letters
         * have no meaningful fallback rendering on their own. swap would
         * flash raw ligature text (e.g. "dark_mode") before the icon
         * substitutes in. optional is worse: it gives up permanently if
         * the font is not ready within its short block window, so an
         * icon can end up invisible for the rest of that page load even
         * after the font finishes downloading. block waits briefly and
         * then always renders the real glyph once available. Next's
         * lint rule recommends swap/optional generically, tuned for
         * body text where a fallback font is readable prose. That
         * advice does not apply to an icon-only ligature font.
         */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font, @next/next/google-font-display */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20,400,0,0&display=block"
        />
      </head>
      <body className="font-sans bg-ink text-chalk antialiased">
        {children}
      </body>
    </html>
  );
}
