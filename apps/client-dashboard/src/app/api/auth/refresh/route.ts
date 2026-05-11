// Refreshes the dashboard's session by trading the refresh cookie for a
// new access token. Called by middleware when the session is near expiry,
// or by the browser-side auth-client.

import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_API_BASE,
  SESSION_COOKIE,
  REFRESH_COOKIE,
} from "@/lib/session";

export const runtime = "nodejs";

const SESSION_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

export async function POST(req: NextRequest) {
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) {
    return NextResponse.json({ error: "no_refresh_token" }, { status: 401 });
  }

  const upstream = await fetch(`${AUTH_API_BASE}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `auth_refresh=${refresh}`,
    },
  });

  const respBody = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const res = NextResponse.json(respBody, { status: upstream.status });
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
    return res;
  }

  // Re-issue cookies with rotated refresh
  const upstreamSetCookie = upstream.headers.get("set-cookie");
  let newRefresh: string | null = null;
  if (upstreamSetCookie) {
    const match = upstreamSetCookie.match(/auth_refresh=([^;]+)/);
    if (match) newRefresh = match[1];
  }

  const res = NextResponse.json({ ok: true, user: respBody.user });
  res.cookies.set(SESSION_COOKIE, respBody.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  if (newRefresh) {
    res.cookies.set(REFRESH_COOKIE, newRefresh, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_TTL_SECONDS,
    });
  }
  return res;
}
