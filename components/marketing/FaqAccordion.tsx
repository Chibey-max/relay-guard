"use client";
// components/marketing/FaqAccordion.tsx

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FAQS = [
  {
    q: "What exactly happens when I hit send?",
    a: "Relay Guard reads your sentence, works out who and how much, finds where your funds already sit, and moves them. No chain picker, no gas step for you to fill in.",
  },
  {
    q: "Where does my money actually live?",
    a: "In a wallet only you control, created the moment you log in with your email. Relay Guard never holds your funds.",
  },
  {
    q: "Do I need a seed phrase?",
    a: "No. You log in with email, and your wallet is created for you behind the scenes.",
  },
  {
    q: "What does this cost?",
    a: "Nothing extra right now. Every network fee is sponsored while this is live.",
  },
  {
    q: "Is this really on-chain, or a demo?",
    a: "Both exist in the app, and each is clearly labeled. Two real sends are already public on Arbitrum, you can open them directly from this page.",
  },
  {
    q: "What if my funds aren't already on Arbitrum?",
    a: "Today, Relay Guard settles from funds already unified onto Arbitrum. Sourcing directly from other chains in the same send is the next thing being built, nothing here claims that's live yet.",
  },
];

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div>
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div
            key={f.q}
            className="border-t last:border-b"
            style={{ borderColor: "rgb(var(--mkt-line))" }}
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between py-5 text-left text-base font-medium"
              style={{ color: "rgb(var(--mkt-ink))" }}
            >
              {f.q}
              <motion.span
                className="font-mono"
                style={{ color: "rgb(var(--mkt-muted2))" }}
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                +
              </motion.span>
            </button>
            {/* AnimatePresence plus an animated height (not the previous
                max-height CSS transition). Framer Motion measures the
                real content height via "auto", so the reveal does not
                overshoot or undershoot a hand-picked max-height guess,
                and exit plays the same animation in reverse instead of
                relying on a CSS transition to happen to match going the
                other way. */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden text-sm"
                  style={{ color: "rgb(var(--mkt-muted))" }}
                >
                  <div className="pb-5">{f.a}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
