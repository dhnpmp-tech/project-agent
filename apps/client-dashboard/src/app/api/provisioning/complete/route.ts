// Stubbed during Stream A.3 — see /api/provisioning/trigger.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "provisioning_disabled_during_migration" },
    { status: 503 },
  );
}
