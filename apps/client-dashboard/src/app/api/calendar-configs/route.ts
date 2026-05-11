// Disabled during the Supabase → Postgres migration. Phase 3b.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json([], { status: 503 });
}

export async function POST() {
  return NextResponse.json(
    { error: "calendar_configs_disabled_during_migration" },
    { status: 503 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "calendar_configs_disabled_during_migration" },
    { status: 503 }
  );
}
