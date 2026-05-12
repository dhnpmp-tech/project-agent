// GET /api/admin/clients — admin-only listing of every tenant with
// agent counts and persona name. Auth is enforced by middleware
// (requires role=admin or email in ADMIN_EMAILS), so the handler trusts
// the request reached it.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await db()<{
      id: string;
      company_name: string;
      status: string;
      plan: string;
      created_at: string;
      contact_email: string;
      contact_phone: string | null;
      country: string;
      agent_count: number;
      persona_name: string | null;
    }[]>`
      SELECT
        c.id,
        c.company_name,
        c.status,
        c.plan,
        c.created_at,
        c.contact_email,
        c.contact_phone,
        c.country,
        COALESCE(ad.count, 0)::int AS agent_count,
        COALESCE(bk.crawl_data->>'persona_name', bk.crawl_data->>'agent_name') AS persona_name
      FROM clients c
      LEFT JOIN (
        SELECT client_id, COUNT(*)::int AS count
        FROM agent_deployments
        GROUP BY client_id
      ) ad ON ad.client_id = c.id
      LEFT JOIN business_knowledge bk ON bk.client_id = c.id
      ORDER BY c.created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error("[admin/clients] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
