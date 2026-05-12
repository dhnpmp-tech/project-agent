// Stubbed during Stream A.3. Persona generation will be re-wired
// against the inference router (inference.chat with a "persona_generate"
// role) in a follow-up so it benefits from the same cost-tracking +
// DCP routing as everything else.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "persona_generation_disabled_during_migration" },
    { status: 503 },
  );
}
