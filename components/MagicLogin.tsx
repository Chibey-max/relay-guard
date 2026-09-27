"use client";

import { useState } from "react";
import type { ErrorLike } from "../types/types";

interface Props {
  onLogin: (address: string) => void;
}

// catch() gives unknown, thrown values aren't guaranteed to be real Error
// instances, so this narrows only as far as "is it an object" before
// reading the fields used below.
function toErrorLike(err: unknown): ErrorLike {
  return typeof err === "object" && err !== null ? (err as ErrorLike) : {};
}

export default function MagicLogin({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { loginWithEmail } = await import("../lib/magic");
      setSent(true); // optimistic: show instructions while popup opens
      const { address } = await loginWithEmail(email.trim());
      onLogin(address);
    } catch (rawErr: unknown) {
      const err = toErrorLike(rawErr);
      const msg: string = err.message ?? "";
      // Popup closed by user, session may still be valid, keep sent UI
      const isUserClose =
        msg.toLowerCase().includes("close") ||
        msg.toLowerCase().includes("modal");
      if (!isUserClose) {
        setSent(false);
        setError(
          msg || "Login failed. Check your email address and try again."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleManualCheck() {
    setBusy(true);
    setError(null);
    try {
      const { isLoggedIn, getMagicSigner } = await import("../lib/magic");
      if (await isLoggedIn()) {
        const signer = await getMagicSigner();
        onLogin(signer.address);
      } else {
        setError(
          "Session not found. Make sure you entered the correct code, then try again."
        );
        setSent(false);
      }
    } catch (rawErr: unknown) {
      const err = toErrorLike(rawErr);
      setError(err.message ?? "Could not verify session.");
      setSent(false);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-line bg-ink/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-check" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-check">
              Code sent to {email}
            </p>
          </div>
          <ol className="space-y-1.5 text-sm text-mist">
            <li className="flex gap-2">
              <span className="shrink-0 text-dim">1.</span>Check your{" "}
              <strong className="text-chalk">inbox and spam</strong> for a code
              from Magic
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 text-dim">2.</span>Enter it in the Magic
              popup that opened on this page
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 text-dim">3.</span>Click below after
              entering the code
            </li>
          </ol>
        </div>

        <button
          onClick={handleManualCheck}
          disabled={busy}
          className="w-full rounded-xl bg-chalk px-5 py-3 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border border-ink/30 border-t-ink" />
              Verifying…
            </span>
          ) : (
            "I've entered the code, continue →"
          )}
        </button>

        <button
          onClick={() => {
            setSent(false);
            setError(null);
          }}
          className="block w-full text-center font-mono text-xs text-dim hover:text-chalk transition"
        >
          ← use a different email
        </button>

        {error && (
          <p className="rounded-lg border border-line px-3 py-2 font-mono text-xs text-mist">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="block font-mono text-[10px] uppercase tracking-widest text-dim">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-line bg-slate px-4 py-3 font-mono text-sm text-chalk placeholder:text-dim focus:border-line2 focus:outline-none"
        />
      </div>

      <button
        onClick={handleLogin}
        disabled={busy || !email.trim()}
        className="w-full rounded-xl bg-chalk px-5 py-3 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-40"
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border border-ink/30 border-t-ink" />
            Opening wallet…
          </span>
        ) : (
          "Continue with email →"
        )}
      </button>

      {error && (
        <p className="rounded-lg border border-line px-3 py-2 font-mono text-xs text-mist">
          {error}
        </p>
      )}

      <p className="text-center font-mono text-[9px] uppercase tracking-widest text-dim">
        Non-custodial · no seed phrase · Magic
      </p>
    </div>
  );
}
