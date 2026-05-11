// Disabled during the Supabase → Postgres migration. Google OAuth will
// be re-wired in Phase 3b. For now use OTP at /login.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    { error: "oauth_disabled_during_migration", use: "/login" },
    { status: 503 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "oauth_disabled_during_migration", use: "/login" },
    { status: 503 }
  );
}
