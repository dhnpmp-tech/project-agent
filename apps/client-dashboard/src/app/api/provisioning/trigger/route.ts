// Stubbed during Stream A.3. The onboarding flow now writes clients +
// agent_deployments rows directly from /api/onboarding/submit. Auto-
// provisioning of Kapso numbers + n8n workflows will be re-wired in a
// follow-up.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error: "provisioning_disabled_during_migration",
      note: "Use /api/onboarding/submit for the new tenant signup path.",
    },
    { status: 503 },
  );
}
