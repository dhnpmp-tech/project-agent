// Disabled during the Supabase → Postgres migration.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ error: "disabled" }, { status: 503 });
}

export async function PATCH() {
  return NextResponse.json({ error: "disabled" }, { status: 503 });
}

export async function DELETE() {
  return NextResponse.json({ error: "disabled" }, { status: 503 });
}
