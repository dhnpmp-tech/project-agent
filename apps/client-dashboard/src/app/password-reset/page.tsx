"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (error) {
        setError(error.message);
        return;
      }
      setSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-4 font-dcp"
        style={{ background: "var(--dcp-bg)", color: "var(--dcp-ink)" }}
      >
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl" style={{ fontFamily: "Instrument Serif, serif" }}>
            Check your <em className="dcp-em">email</em>.
          </h1>
          <p className="mt-3 text-sm" style={{ color: "var(--dcp-mut)" }}>
            If an account exists for{" "}
            <strong style={{ color: "var(--dcp-ink)" }}>{email}</strong>, we sent a password reset
            link.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block text-sm"
            style={{ color: "var(--dcp-teal)" }}
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 font-dcp"
      style={{ background: "var(--dcp-bg)", color: "var(--dcp-ink)" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl tracking-tight" style={{ fontFamily: "Instrument Serif, serif" }}>
            Reset your <em className="dcp-em">password</em>.
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--dcp-mut)" }}>
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          {error && (
            <div
              className="rounded-md px-4 py-3 text-sm"
              style={{
                background: "color-mix(in oklab, var(--dcp-err) 12%, transparent)",
                color: "var(--dcp-err)",
                border: "1px solid color-mix(in oklab, var(--dcp-err) 30%, transparent)",
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-xs uppercase tracking-wider mb-1.5"
              style={{ color: "var(--dcp-mut)", fontFamily: "var(--mono)" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-md px-3 py-2.5 text-sm focus:outline-none"
              style={{
                background: "var(--dcp-paper)",
                border: "1px solid var(--dcp-line)",
                color: "var(--dcp-ink)",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md px-4 py-3 text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-50"
            style={{ background: "var(--dcp-teal)", color: "var(--dcp-accent-ink, #0a0b1a)" }}
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm" style={{ color: "var(--dcp-mut)" }}>
          Remember your password?{" "}
          <Link href="/login" style={{ color: "var(--dcp-teal)" }} className="font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
