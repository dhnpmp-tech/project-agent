import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

/* ------------------------------------------------------------------ */
/*  GET /api/admin/clients                                             */
/*  Returns all clients with agent count and persona name.             */
/*  Auth is handled by middleware — no check needed here.              */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch all clients
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, company_name, status, plan, created_at, contact_email, contact_phone, country")
      .order("created_at", { ascending: false });

    if (clientsError) {
      console.error("[admin/clients] Supabase clients error:", clientsError);
      return NextResponse.json(
        { error: "Failed to fetch clients" },
        { status: 500 }
      );
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch agent deployment counts per client
    const clientIds = clients.map((c) => c.id);

    const { data: deployments, error: deploymentsError } = await supabase
      .from("agent_deployments")
      .select("client_id")
      .in("client_id", clientIds);

    if (deploymentsError) {
      console.error("[admin/clients] Supabase deployments error:", deploymentsError);
    }

    // Count agents per client
    const agentCounts: Record<string, number> = {};
    if (deployments) {
      for (const dep of deployments) {
        agentCounts[dep.client_id] = (agentCounts[dep.client_id] || 0) + 1;
      }
    }

    // Fetch business_knowledge for persona info (crawl_data contains persona)
    const { data: knowledge, error: knowledgeError } = await supabase
      .from("business_knowledge")
      .select("client_id, crawl_data")
      .in("client_id", clientIds);

    if (knowledgeError) {
      console.error("[admin/clients] Supabase knowledge error:", knowledgeError);
    }

    // Extract persona name per client from crawl_data
    const personaNames: Record<string, string | null> = {};
    if (knowledge) {
      for (const k of knowledge) {
        const crawlData = k.crawl_data as Record<string, unknown> | null;
        const personaName =
          (crawlData?.persona_name as string) ||
          (crawlData?.agent_name as string) ||
          null;
        personaNames[k.client_id] = personaName;
      }
    }

    // Combine everything
    const result = clients.map((client) => ({
      ...client,
      agent_count: agentCounts[client.id] || 0,
      persona_name: personaNames[client.id] || null,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin/clients] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
