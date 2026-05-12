// Stubbed during Stream A.3. Manual memory edits will re-wire against
// the vault_notes table in a follow-up. The Karpathy nightly loop
// continues to write rules autonomously.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "memory_edit_disabled_during_migration" },
    { status: 503 },
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "memory_edit_disabled_during_migration" },
    { status: 503 },
  );
}
