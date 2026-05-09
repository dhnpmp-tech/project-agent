import { NextResponse, type NextRequest } from "next/server";

// --- POST: test a calendar connection without saving ---
export async function POST(request: NextRequest) {
  try {
    const { provider, credentials } = await request.json();

    if (!provider || !credentials) {
      return NextResponse.json(
        { ok: false, error: "provider and credentials are required" },
        { status: 400 }
      );
    }

    // Dynamically import the adapter to avoid bundling all providers in the client
    const { createCalendarAdapter } = await import(
      "@project-agent/calendar-adapter"
    );

    const adapter = createCalendarAdapter({ provider, ...credentials });
    const result = await adapter.testConnection();

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
