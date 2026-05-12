// Stubbed during Stream A.3. Integration token storage will re-wire
// to write to business_knowledge.crawl_data (same jsonb-merge pattern
// as /api/kapso/setup) in a follow-up.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error: "integrations_save_disabled_during_migration",
      note: "Kapso setup works via /api/kapso/setup.",
    },
    { status: 503 },
  );
}
