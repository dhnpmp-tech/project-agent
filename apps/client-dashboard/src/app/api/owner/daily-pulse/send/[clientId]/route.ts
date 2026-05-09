import { NextRequest, NextResponse } from "next/server";

const PROMPT_BUILDER_URL =
  process.env.PROMPT_BUILDER_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://76.13.179.86:8200";

/**
 * Server-side proxy for "Send Daily Pulse to WhatsApp now".
 * Backed by FastAPI POST /owner/daily-pulse/send/{client_id}.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params;
  if (!clientId) {
    return NextResponse.json({ error: "missing client_id" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${PROMPT_BUILDER_URL}/owner/daily-pulse/send/${clientId}`,
      { method: "POST" },
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(body, { status: res.status });
    }
    // Re-render the owner page with fresh data after delivery
    return NextResponse.redirect(
      new URL(`/dashboard/owner`, _req.url),
      { status: 303 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "proxy_failed", detail: String(err) },
      { status: 502 },
    );
  }
}
