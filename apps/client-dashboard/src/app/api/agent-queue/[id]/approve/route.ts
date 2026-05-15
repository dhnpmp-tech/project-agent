// POST /api/agent-queue/[id]/approve · approve one queued action.
//
// The Agent Queue page posts here when the owner clicks the Approve
// button on a pending_approval row. Tenant-scoped via session.clientId
// so a user can't approve another tenant's actions even with the URL.
// On success we 303-redirect back to the queue page so the form-post
// stays a no-JS interaction.

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/session";

export async function POST(
  _req: NextRequest,
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
  try {
    await db()`
      UPDATE agent_action_queue
      SET status = 'approved',
          approved_at = NOW(),
          approved_by = 'dashboard'
      WHERE id = ${id}
        AND client_id = ${session.clientId}
        AND status = 'pending_approval'
    `;
  } catch (e) {
    console.error(`[agent-queue/${id}/approve]`, e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.redirect(new URL("/app/dashboard/agent-queue", _req.url), 303);
}
