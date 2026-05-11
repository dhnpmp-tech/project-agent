// Browser-side fetch helpers for the OTP login flow.
// All requests go to the dashboard's OWN /app/api/auth/* routes, which
// proxy to the auth service and manage the session cookie on the
// agents.dcp.sa domain. The browser never sees the upstream auth service.

import { apiUrl } from "./api-url";

export interface OtpUser {
  id: string;
  email: string;
  client_id: string | null;
  role: string;
}

export async function sendOtp(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const resp = await fetch(apiUrl("/api/auth/send-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    return { ok: false, error: body.error || `HTTP ${resp.status}` };
  }
  return { ok: true };
}

export async function verifyOtp(
  email: string,
  code: string
): Promise<{ ok: true; user: OtpUser } | { ok: false; error: string }> {
  const resp = await fetch(apiUrl("/api/auth/verify-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return { ok: false, error: body.error || `HTTP ${resp.status}` };
  }
  return { ok: true, user: body.user };
}

export async function signout(): Promise<void> {
  await fetch(apiUrl("/api/auth/signout"), { method: "POST" });
  window.location.href = apiUrl("/login");
}
