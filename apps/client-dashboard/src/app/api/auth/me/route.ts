// GET /api/auth/me — returns the current session for client components.
// Reads + verifies the agents_session JWT cookie server-side.

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    user: {
      id: session.userId,
      email: session.email,
      client_id: session.clientId,
      role: session.role,
    },
  });
}
