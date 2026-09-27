// components/GuardPanel.tsx
/**
 * Relay Guard verdict card. Shows the SERV Reasoning verdict, the reasons
 * behind it, every deterministic policy check, and the per-call SERV
 * trace (model, latency, tokens, request id) so the decision is auditable
 * by the person about to sign.
 */
"use client";

import { useState } from "react";
import type { GuardReview, ServCallTrace } from "../lib/serv";

const TONE = {
  ALLOW: {
    ring: "border-check/50",
    chip: "bg-check/15 text-check",
    label: "Cleared",
  },
  REVIEW: {
    ring: "border-amber-400/50",
    chip: "bg-amber-400/15 text-amber-500",
    label: "Needs your review",
  },
  BLOCK: {
    ring: "border-red-500/50",
    chip: "bg-red-500/15 text-red-500",
    label: "Blocked",
  },
} as const;

const DOT = {
  PASS: "bg-check",
  WARN: "bg-amber-400",
  FAIL: "bg-red-500",
} as const;

export default function GuardPanel({
  guard,
  trace,
  reviewAck,
  onReviewAck,
}: {
  guard: GuardReview;
  trace: ServCallTrace[];
  reviewAck: boolean;
  onReviewAck: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const tone = TONE[guard.verdict];
  const servLive = trace.some((t) => t.engine === "serv" && !t.error);

  return (
    <div className={`rounded-2xl border ${tone.ring} bg-slate/80 backdrop-blur-md p-6`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-dim">
          Relay Guard · SERV Reasoning
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone.chip}`}
        >
          {guard.verdict} · {tone.label}
        </span>
      </div>

      <p className="mt-3 text-sm text-chalk">{guard.summary}</p>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink">
        <div
          className={`h-full ${guard.verdict === "BLOCK" ? "bg-red-500" : guard.verdict === "REVIEW" ? "bg-amber-400" : "bg-check"}`}
          style={{ width: `${Math.max(4, guard.riskScore)}%` }}
        />
      </div>
      <p className="mt-1 font-mono text-[10px] text-dim">
        risk {guard.riskScore}/100
        {guard.policyEscalated && guard.modelVerdict
          ? ` · model said ${guard.modelVerdict}, policy raised it to ${guard.verdict}`
          : ""}
      </p>

      {guard.reasons.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {guard.reasons.map((r, i) => (
            <li key={i} className="flex gap-2 text-xs text-mist">
              <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-mist" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      {guard.verdict === "REVIEW" && (
        <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-lg border border-line2 bg-ink p-3 text-xs text-chalk">
          <input
            type="checkbox"
            checked={reviewAck}
            onChange={(e) => onReviewAck(e.target.checked)}
            className="mt-0.5"
          />
          I checked the amount and the full recipient address, and I want to
          send anyway.
        </label>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-4 font-mono text-[10px] uppercase tracking-wider text-dim hover:text-chalk"
      >
        {open ? "hide" : "show"} audit trail ({guard.policy.checks.length} checks
        · {trace.filter((t) => t.engine === "serv").length} SERV call
        {trace.filter((t) => t.engine === "serv").length === 1 ? "" : "s"})
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          <div className="space-y-1.5">
            {guard.policy.checks.map((c) => (
              <div key={c.id} className="flex items-start gap-2 text-xs">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 flex-none rounded-full ${DOT[c.status]}`}
                />
                <span className="w-40 flex-none text-mist">{c.label}</span>
                <span className="text-dim">{c.detail}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1 rounded-lg border border-line bg-ink p-3 font-mono text-[10px] text-dim">
            {trace.map((t, i) => (
              <div key={i}>
                {t.step.padEnd(5)} · {t.engine === "serv" ? "SERV" : "fallback"}{" "}
                · {t.model} · {t.latencyMs}ms
                {t.promptTokens != null
                  ? ` · ${t.promptTokens}+${t.completionTokens ?? 0} tok`
                  : ""}
                {t.servTools.length ? ` · ${t.servTools.join(", ")}` : ""}
                {t.requestId ? ` · ${t.requestId.slice(0, 18)}` : ""}
                {t.retried ? " · retried once" : ""}
                {t.error ? ` · error: ${t.error.slice(0, 80)}` : ""}
              </div>
            ))}
            {!servLive && (
              <div className="text-amber-500">
                SERV was not reached for this request; the verdict is from
                deterministic policy only.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
