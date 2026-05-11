// Disabled during the Supabase → Postgres migration. New auth flow uses
// /api/auth/verify-otp. OAuth callback will be re-wired in Phase 3b.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return NextResponse.redirect(new URL("/login", req.url));
}
