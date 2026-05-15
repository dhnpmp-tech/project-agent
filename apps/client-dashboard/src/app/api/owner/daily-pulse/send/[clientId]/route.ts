import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";

const PROMPT_BUILDER_URL =
  process.env.PROMPT_BUILDER_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://76.13.179.86:8200";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "setup@dcp.sa,dhnpmp@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase());

/**
 * Server-side proxy for "Send Daily Pulse to WhatsApp now".
 * Backed by FastAPI POST /owner/daily-pulse/send/{client_id}.
 *
 * Tenant guard: the URL embeds clientId, but we must verify it matches
 * the caller's JWT session — otherwise any authenticated user could
 * trigger another tenant's owner WhatsApp pulse. Admins may target any
 * tenant (used by the support flow).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params;
  if (!clientId) {
    return NextResponse.json({ error: "missing client_id" }, { status: 400 });
  }
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const isAdmin =
    session.role === "admin" ||
    (session.email && ADMIN_EMAILS.includes(session.email.toLowerCase()));
  if (!isAdmin && session.clientId !== clientId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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
