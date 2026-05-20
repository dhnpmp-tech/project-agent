// POST /api/integrations/gmail/initiate
//
// Dashboard-side proxy: forwards to the prompt-builder's Composio
// Gmail OAuth init endpoint. Adds session auth + tenant scoping so a
// signed-in owner can only initiate OAuth for their own client_id.

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";

const PROMPT_BUILDER_URL =
  process.env.PROMPT_BUILDER_URL || "http://76.13.179.86:8200";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.clientId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // The redirect URL the user lands on after Composio finishes the OAuth.
  // Goes back to the same page so the status pill auto-refreshes.
  const origin = req.headers.get("origin") || "https://agents.dcp.sa";
  const redirectUri = `${origin}/app/dashboard/integrations/gmail?connected=1`;

  try {
    const r = await fetch(
      `${PROMPT_BUILDER_URL}/connections/gmail/initiate/${session.clientId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirect_uri: redirectUri }),
      },
    );
    const data = (await r.json()) as Record<string, unknown>;
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { status: "error", message },
      { status: 502 },
    );
  }
}
