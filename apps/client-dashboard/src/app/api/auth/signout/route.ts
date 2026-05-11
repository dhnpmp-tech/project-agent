// Clears the dashboard's session cookies and tells the auth service to
// invalidate the refresh token chain. Replaces the old Supabase signout.

import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_API_BASE,
  SESSION_COOKIE,
  REFRESH_COOKIE,
} from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  // Best-effort upstream signout — don't block the response if it fails
  if (refresh) {
    try {
      await fetch(`${AUTH_API_BASE}/auth/signout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `auth_refresh=${refresh}`,
        },
      });
    } catch {
      // ignore — local cookies will be cleared regardless
    }
  }

  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  return res;
}
