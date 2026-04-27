"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      window.location.href = "/";
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
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
            <span className="text-sm tracking-tight" style={{ fontFamily: "var(--mono, 'JetBrains Mono')" }}>
              DCP <span className="opacity-60">·sa</span>
            </span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1
            className="text-3xl tracking-tight"
            style={{ fontFamily: "Instrument Serif, serif", fontWeight: 400 }}
          >
            Welcome <em className="dcp-em">back</em>.
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--dcp-mut)" }}>
            Sign in to your agent dashboard.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="text-xs uppercase tracking-wider" style={{ color: "var(--dcp-mut)", fontFamily: "var(--mono)" }}>
                Password
              </label>
              <Link href="/password-reset" className="text-xs" style={{ color: "var(--dcp-teal)" }}>
                Forgot?
              </Link>
            </div>
            <Input id="password" type="password" autoComplete="current-password"
              value={password} onChange={setPassword} placeholder="Enter your password" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md px-4 py-3 text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-50"
            style={{
              background: "var(--dcp-teal)",
              color: "var(--dcp-accent-ink, #0a0b1a)",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm" style={{ color: "var(--dcp-mut)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: "var(--dcp-teal)" }} className="font-medium">
            Sign up
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
      <Input {...props} />
    </div>
  );
}

function Input(props: {
  id: string;
  type: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
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
  );
}
