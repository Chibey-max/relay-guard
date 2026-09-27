"use client";
/**
 * components/marketing/QuoteCarousel.tsx
 *
 * Rotating example sentences with dot navigation and autoplay.
 * Decorative copy only, no parsing actually happens here.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const QUOTES = [
  {
    say: "send 5 USDC to 0xd06e…5a91",
    result:
      "Relay Guard parses the address, unifies your balance, settles on Arbitrum",
  },
  {
    say: "pay 0x4a2f…9e21 20 USDC for lunch",
    result: "Relay Guard parses the address, sends, gas covered",
  },
  {
    say: "move 50 USDC to 0x71c3…44b2",
    result: "Relay Guard confirms the funds are there and sends, gas covered",
  },
  {
    say: "split rent, 300 USDC to 0x8f19…c73d",
    result: "Relay Guard parses the amount and recipient, confirms before sending",
  },
];

export default function QuoteCarousel({ motionOn }: { motionOn: boolean }) {
  const [qi, setQi] = useState(0);

  useEffect(() => {
    if (!motionOn) return;
    const id = setInterval(() => setQi((i) => (i + 1) % QUOTES.length), 4200);
    return () => clearInterval(id);
  }, [motionOn]);

  const q = QUOTES[qi];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 text-center">
      <p className="font-mono text-sm text-mkt-muted">You could just say</p>
      {/**
       * mode="wait": the outgoing quote fully fades out before the next
       * one fades in, rather than crossfading on top of each other,
       * which reads better for line-length changes. A short quote
       * arriving while a longer one is still exiting would otherwise
       * jump around at the intersection.
       */}
      <div className="flex min-h-[4em] items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={qi}
            initial={motionOn ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={motionOn ? { opacity: 0, y: -12 } : undefined}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-3xl italic leading-tight text-mkt-ink sm:text-4xl"
          >
            &ldquo;{q.say}&rdquo;
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-mkt-line bg-mkt-card py-2 pl-2 pr-4 text-sm">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full bg-mkt-sage-soft"
          aria-hidden="true"
        >
          ↗
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={qi}
            initial={motionOn ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={motionOn ? { opacity: 0 } : undefined}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="text-mkt-ink"
          >
            <b className="font-semibold">{q.result.match(/^Relay Guard \S+/)?.[0]}</b>{" "}
            {q.result.replace(/^Relay Guard \S+ /, "")}
          </motion.span>
        </AnimatePresence>
      </div>
      <div
        className="flex items-center justify-center gap-2"
        role="tablist"
        aria-label="Example commands"
      >
        {QUOTES.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === qi}
            onClick={() => setQi(i)}
            aria-label={`Show example ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === qi ? "w-5 bg-mkt-sage" : "w-[7px] bg-mkt-line"}`}
          />
        ))}
      </div>
    </div>
  );
}
