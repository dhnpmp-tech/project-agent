"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
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
            Password <em className="dcp-em">updated</em>.
          </h1>
          <p className="mt-3 text-sm" style={{ color: "var(--dcp-mut)" }}>
            Your password has been changed successfully.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-block rounded-md px-5 py-2.5 text-sm font-semibold"
            style={{ background: "var(--dcp-teal)", color: "var(--dcp-accent-ink, #0a0b1a)" }}
          >
            Go to dashboard
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
            Set a new <em className="dcp-em">password</em>.
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--dcp-mut)" }}>
            Choose a new password for your account.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
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

          {(
            [
              ["password", "New password", "new-password", password, setPassword, "At least 8 characters"],
              [
                "confirm-password",
                "Confirm new password",
                "new-password",
                confirmPassword,
                setConfirmPassword,
                "Repeat your new password",
              ],
            ] as const
          ).map(([id, label, ac, val, setter, ph]) => (
            <div key={id}>
              <label
                htmlFor={id}
                className="block text-xs uppercase tracking-wider mb-1.5"
                style={{ color: "var(--dcp-mut)", fontFamily: "var(--mono)" }}
              >
                {label}
              </label>
              <input
                id={id}
                type="password"
                required
                autoComplete={ac}
                value={val}
                onChange={(e) => setter(e.target.value)}
                placeholder={ph}
                className="w-full rounded-md px-3 py-2.5 text-sm focus:outline-none"
                style={{
                  background: "var(--dcp-paper)",
                  border: "1px solid var(--dcp-line)",
                  color: "var(--dcp-ink)",
                }}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md px-4 py-3 text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-50"
            style={{ background: "var(--dcp-teal)", color: "var(--dcp-accent-ink, #0a0b1a)" }}
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}
