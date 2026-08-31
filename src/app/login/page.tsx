"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function OperatorLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = searchParams.get("next") || "/finance";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        setError("Sign-in failed.");
        setPassword("");
        return;
      }
      setPassword("");
      router.replace(nextPath.startsWith("/") ? nextPath : "/finance");
      router.refresh();
    } catch {
      setError("Sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#111] flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm border border-[#d4d4d0] rounded-xl p-6 space-y-4"
      >
        <div>
          <p className="text-xs text-[#888] uppercase tracking-wider">Synapse Ops</p>
          <h1 className="text-2xl font-bold mt-1">Operator sign-in</h1>
          <p className="text-sm text-[#666] mt-2">
            Authenticate once. The server issues an httpOnly session. The operator secret is never stored in the browser.
          </p>
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-[#666]">Operator password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#d4d4d0] rounded-lg px-3 py-2 text-sm"
            required
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#111] text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function OperatorLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <OperatorLoginForm />
    </Suspense>
  );
}
