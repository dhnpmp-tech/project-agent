"use client";

// Two-step OTP login. Replaces the old password-based Supabase flow.
// Step 1: enter email → /api/auth/send-otp delivers a 6-digit code via Resend
// Step 2: enter code → /api/auth/verify-otp sets agents_session cookie,
//         redirects to / (which routes to /dashboard or /onboarding)

import { useState } from "react";
import Link from "next/link";
import { sendOtp, verifyOtp } from "@/lib/auth-client";

type Step = "email" | "code";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await sendOtp(email);
      if (!result.ok) {
        setError(messageFor(result.error));
        return;
      }
      setStep("code");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await verifyOtp(email, code);
      if (!result.ok) {
        setError(messageFor(result.error));
        return;
      }
      window.location.href = "/";
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
            <span
              className="text-sm tracking-tight"
              style={{ fontFamily: "var(--mono, 'JetBrains Mono')" }}
            >
              DCP <span className="opacity-60">·sa</span>
            </span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1
            className="text-3xl tracking-tight"
            style={{ fontFamily: "Instrument Serif, serif", fontWeight: 400 }}
          >
            {step === "email" ? (
              <>Welcome <em className="dcp-em">back</em>.</>
            ) : (
              <>Check your <em className="dcp-em">inbox</em>.</>
            )}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--dcp-mut)" }}>
            {step === "email"
              ? "We'll send a one-time code to your email."
              : `Enter the 6-digit code we sent to ${email}.`}
          </p>
        </div>

        {error && (
          <div
            className="rounded-md px-4 py-3 text-sm mb-4"
            style={{
              background: "color-mix(in oklab, var(--dcp-err) 12%, transparent)",
              color: "var(--dcp-err)",
              border: "1px solid color-mix(in oklab, var(--dcp-err) 30%, transparent)",
            }}
          >
            {error}
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              placeholder="you@company.com"
              autoFocus
            />
            <SubmitButton loading={loading} idle="Send code" active="Sending…" />
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <Field
              id="code"
              label="6-digit code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
              value={code}
              onChange={setCode}
              placeholder="123456"
              autoFocus
            />
            <SubmitButton loading={loading} idle="Verify and sign in" active="Verifying…" />
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="w-full text-center text-xs"
              style={{ color: "var(--dcp-mut)", fontFamily: "var(--mono)" }}
            >
              ← Use a different email
            </button>
          </form>
        )}

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

function messageFor(err: string): string {
  switch (err) {
    case "invalid_or_expired":
      return "That code is invalid or expired. Send a new one.";
    case "rate_limited":
      return "Too many attempts. Wait a few minutes and try again.";
    case "email_send_failed":
      return "We couldn't deliver the email. Try again in a moment.";
    case "invalid_email":
    case "invalid_input":
      return "Check the email address and try again.";
    default:
      return err;
  }
}

function SubmitButton({
  loading,
  idle,
  active,
}: {
  loading: boolean;
  idle: string;
  active: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-md px-4 py-3 text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-50"
      style={{
        background: "var(--dcp-teal)",
        color: "var(--dcp-accent-ink, #0a0b1a)",
      }}
    >
      {loading ? active : idle}
    </button>
  );
}

function Field(props: {
  id: string;
  label: string;
  type: string;
  autoComplete?: string;
  inputMode?: "numeric" | "text";
  pattern?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
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
        inputMode={props.inputMode}
        pattern={props.pattern}
        autoFocus={props.autoFocus}
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
