"use client";
// components/ExecutionSteps.tsx
/**
 * Shows the payment executing, narrated rather than hidden behind a spinner.
 * Monochrome: done = check-green, active = pulsing chalk, idle = dim.
 */

import type { ExecutionResult } from "../lib/config";

export type StepState = "idle" | "active" | "done" | "error";

export interface Step {
  label: string;
  detail?: string;
  state: StepState;
}

function Glyph({ state }: { state: StepState }) {
  if (state === "done") return <span className="text-check">✓</span>;
  if (state === "error") return <span className="text-dim">!</span>;
  if (state === "active")
    return <span className="animate-pulseline text-chalk">●</span>;
  return <span className="text-line2">○</span>;
}

export default function ExecutionSteps({
  steps,
  result,
}: {
  steps: Step[];
  result?: ExecutionResult | null;
}) {
  return (
    <div className="rounded-2xl border border-line bg-slate/80 backdrop-blur-md p-6 transition-colors">
      <span className="mb-4 block font-mono text-[10px] uppercase tracking-widest text-dim">
        Executing
      </span>

      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 w-3.5 font-mono text-sm">
              <Glyph state={s.state} />
            </span>
            <span className="flex-1">
              <span
                className={`block text-sm ${s.state === "idle" ? "text-dim" : "text-chalk font-medium"}`}
              >
                {s.label}
              </span>
              {s.detail && (
                <span className="mt-0.5 block font-mono text-[10px] text-dim">
                  {s.detail}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      {result?.sourcedFrom && result.sourcedFrom.length > 0 && (
        <div className="mt-4 rounded-lg border border-line bg-ink p-3">
          <span className="font-mono text-[9px] uppercase tracking-widest text-dim">
            Sourced across chains
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {result.sourcedFrom.map((s, i) => (
              <span
                key={i}
                className="rounded border border-line bg-slate/80 backdrop-blur-md px-2 py-0.5 font-mono text-[10px] text-chalk"
              >
                {s.chain}: {s.amount}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
