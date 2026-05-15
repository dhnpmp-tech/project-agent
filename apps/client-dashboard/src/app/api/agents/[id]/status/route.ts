// PATCH /api/agents/[id]/status · toggle an agent_deployment between
// active and paused.
//
// Replaces the old Supabase client-side `.update({status})` call from
// agent-config-editor.tsx. Tenant-scoped via session.clientId — the JWT
// guarantees we only touch the caller's own agents.

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/session";

export const runtime = "nodejs";

const ALLOWED_STATUS = new Set(["active", "paused"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session?.clientId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const status = body.status;
  if (!status || !ALLOWED_STATUS.has(status)) {
    return NextResponse.json(
      { error: "invalid_status", allowed: Array.from(ALLOWED_STATUS) },
      { status: 400 },
    );
  }

  try {
    // agent_deployments has no updated_at column today — status flip alone.
    const rows = await db()<{ id: string }[]>`
      UPDATE agent_deployments
      SET status = ${status}
      WHERE id = ${id}
        AND client_id = ${session.clientId}
        AND status IN ('active', 'paused')
      RETURNING id
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "not_found_or_locked" }, { status: 404 });
    }
  } catch (e) {
    console.error(`[agents/${id}/status]`, e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status });
}
