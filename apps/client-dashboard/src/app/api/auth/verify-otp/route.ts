// Verifies the OTP with the auth service, captures the access token +
// refresh cookie, and sets BOTH as agents.dcp.sa-scoped cookies so the
// dashboard's middleware and Server Components can read the session.

import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_API_BASE,
  SESSION_COOKIE,
  REFRESH_COOKIE,
} from "@/lib/session";

export const runtime = "nodejs";

const SESSION_TTL_SECONDS = 60 * 60; // matches auth service access TTL
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60; // matches auth service refresh TTL

export async function POST(req: NextRequest) {
  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.email || !body.code) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const upstream = await fetch(`${AUTH_API_BASE}/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, code: body.code }),
  });

  const respBody = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return NextResponse.json(respBody, { status: upstream.status });
  }

  // Capture the upstream auth_refresh cookie so we can re-issue it
  // scoped to agents.dcp.sa. Upstream sets it on auth.agents.dcp.sa
  // by default; we want the dashboard to see it too.
  const upstreamSetCookie = upstream.headers.get("set-cookie");
  let refreshValue: string | null = null;
  if (upstreamSetCookie) {
    const match = upstreamSetCookie.match(/auth_refresh=([^;]+)/);
    if (match) refreshValue = match[1];
  }

  const res = NextResponse.json({ ok: true, user: respBody.user });

  res.cookies.set(SESSION_COOKIE, respBody.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  if (refreshValue) {
    res.cookies.set(REFRESH_COOKIE, refreshValue, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_TTL_SECONDS,
    });
  }

  return res;
}
