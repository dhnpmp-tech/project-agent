"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        window.location.href = "/";
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
          <div
            className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              background: "color-mix(in oklab, var(--dcp-teal) 14%, transparent)",
              border: "1px solid color-mix(in oklab, var(--dcp-teal) 30%, transparent)",
            }}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="var(--dcp-teal)">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-3xl" style={{ fontFamily: "Instrument Serif, serif" }}>
            Check your <em className="dcp-em">email</em>.
          </h1>
          <p className="mt-3 text-sm" style={{ color: "var(--dcp-mut)" }}>
            We sent a confirmation link to{" "}
            <strong style={{ color: "var(--dcp-ink)" }}>{email}</strong>. Click it to activate your
            account.
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
        <div className="flex justify-center mb-10">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dcp-logo-square.jpeg" alt="DCP" className="w-9 h-9 rounded-md" />
            <span className="text-sm tracking-tight" style={{ fontFamily: "var(--mono)" }}>
              DCP <span className="opacity-60">·sa</span>
            </span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl tracking-tight" style={{ fontFamily: "Instrument Serif, serif" }}>
            Hire your AI <em className="dcp-em">team</em>.
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--dcp-mut)" }}>
            Create your account and go live in 10 minutes.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
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
          <Field id="email" label="Email" type="email" autoComplete="email"
            value={email} onChange={setEmail} placeholder="you@company.com" />
          <Field id="password" label="Password" type="password" autoComplete="new-password"
            value={password} onChange={setPassword} placeholder="At least 8 characters" />
          <Field id="confirm-password" label="Confirm password" type="password" autoComplete="new-password"
            value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat your password" />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md px-4 py-3 text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-50"
            style={{ background: "var(--dcp-teal)", color: "var(--dcp-accent-ink, #0a0b1a)" }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm" style={{ color: "var(--dcp-mut)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--dcp-teal)" }} className="font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field(props: {
  id: string;
  label: string;
  type: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={props.id}
        className="block text-xs uppercase tracking-wider mb-1.5"
        style={{ color: "var(--dcp-mut)", fontFamily: "var(--mono)" }}
      >
        {props.label}
      </label>
      <input
        id={props.id}
        type={props.type}
        required
        autoComplete={props.autoComplete}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="w-full rounded-md px-3 py-2.5 text-sm focus:outline-none transition-colors"
        style={{
          background: "var(--dcp-paper)",
          border: "1px solid var(--dcp-line)",
          color: "var(--dcp-ink)",
        }}
      />
    </div>
  );
}
