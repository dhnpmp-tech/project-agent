// Stubbed during Stream A.3. Phone-number-to-client routing now lives
// in agent_deployments.config.phoneNumberId (resolved by the FastAPI
// prompt-builder's resolve_client). No separate registration step
// needed.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "route_registration_disabled_during_migration" },
    { status: 503 },
  );
}
