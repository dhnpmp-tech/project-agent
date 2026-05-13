// POST /api/admin/day-one/[clientId]
//
// Admin-only: re-runs the entire day-one deliverables generator for the
// given tenant. Used to backfill the new 5 hooks (gbp audit, faq gaps,
// demo transcript, owner brief, icp leads) on tenants whose original
// day-one was generated before those fields existed (e.g. Saffron).
//
// Internally this just calls the same code path as the new-tenant
// onboarding flow — duplicating the route would let it drift, so we
// forward via fetch to /api/onboarding/day-one with the target clientId
// in the body. The day-one endpoint already accepts an explicit
// clientId from the body when present.
//
// Returns the new package alongside ok:true so the admin sees what was
// generated without a second round-trip.

import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
// Must be ≥ day-one's maxDuration since this route awaits day-one through
// a self-fetch.
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ clientId: string }>;
}

export async function POST(req: NextRequest, ctx: RouteParams) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { clientId } = await ctx.params;
  if (!clientId || clientId.length < 8) {
    return NextResponse.json({ error: "invalid_client_id" }, { status: 400 });
  }

  // Forward to /api/onboarding/day-one with the admin's cookie so the
  // downstream session check passes. We override `clientId` in the body
  // so the day-one writer targets the requested tenant rather than the
  // admin's own client.
  const hdrs = await headers();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const proto = hdrs.get("x-forwarded-proto") || "https";
  const host = hdrs.get("host") || "agents.dcp.sa";
  // basePath /app applies — but the API routes mount under /app/api/* too.
  const baseUrl = `${proto}://${host}/app`;

  const forwardRes = await fetch(`${baseUrl}/api/onboarding/day-one`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ clientId }),
  });

  const body = await forwardRes.json().catch(() => ({}));
  return NextResponse.json(
    { ok: forwardRes.ok, regenerated_for: clientId, ...body },
    { status: forwardRes.status },
  );
}
