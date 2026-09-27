"use client";
// components/CyclingWord.tsx
/**
 * Cycles the hero's closing word to show the range of things Relay parses
 * from a sentence. Stops entirely under motion-off / prefers-reduced-motion:
 * no interval left running in the background, not just visually hidden.
 */

import { useEffect, useState } from "react";

const WORDS = ["speak", "type", "send", "ask"];
const HOLD_MS = 1800;
const FADE_MS = 250;

export default function CyclingWord({
  motionOn = true,
}: {
  motionOn?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!motionOn) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % WORDS.length);
        setVisible(true);
      }, FADE_MS);
    }, HOLD_MS);
    return () => clearInterval(interval);
  }, [motionOn]);

  const word = motionOn ? WORDS[index] : WORDS[0];

  return (
    <em
      className="font-normal italic transition-opacity"
      style={{
        opacity: motionOn && !visible ? 0 : 1,
        transitionDuration: `${FADE_MS}ms`,
      }}
    >
      {word}
    </em>
  );
}
