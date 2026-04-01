import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

/* ------------------------------------------------------------------ */
/*  POST /api/integrations/save                                        */
/*  Saves integration credentials (e.g. SevenRooms, Lightspeed) for    */
/*  a client, stored in clients.metadata.integrations.{integrationId}  */
/* ------------------------------------------------------------------ */

interface SaveIntegrationBody {
  integrationId?: string;
  credentials?: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ───────────────────────────────────────────────
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse body ───────────────────────────────────────────────
    let body: SaveIntegrationBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { integrationId, credentials } = body;

    if (!integrationId || typeof integrationId !== "string") {
      return NextResponse.json(
        { error: "Missing required field: integrationId" },
        { status: 400 }
      );
    }

    if (!credentials || typeof credentials !== "object") {
      return NextResponse.json(
        { error: "Missing required field: credentials" },
        { status: 400 }
      );
    }

    // ── Get client_id from the user's JWT metadata ───────────────
    const clientId =
      user.app_metadata?.client_id || user.user_metadata?.client_id;

    if (!clientId) {
      return NextResponse.json(
        { error: "No client_id associated with this user" },
        { status: 403 }
      );
    }

    // ── Fetch current client record ──────────────────────────────
    const supabaseAdmin = createAdminClient();

    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id, metadata")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // ── Merge integration credentials into metadata ──────────────
    const existingMetadata =
      (client.metadata as Record<string, unknown>) || {};
    const existingIntegrations =
      (existingMetadata.integrations as Record<string, unknown>) || {};

    const updatedMetadata = {
      ...existingMetadata,
      integrations: {
        ...existingIntegrations,
        [integrationId]: {
          ...credentials,
          connected_at: new Date().toISOString(),
          connected_by: user.id,
        },
      },
    };

    const { error: updateError } = await supabaseAdmin
      .from("clients")
      .update({ metadata: updatedMetadata })
      .eq("id", clientId);

    if (updateError) {
      console.error(
        "[integrations/save] Failed to save credentials:",
        updateError
      );
      return NextResponse.json(
        { error: "Failed to save integration credentials" },
        { status: 500 }
      );
    }

    // ── Log activity ─────────────────────────────────────────────
    await supabaseAdmin.from("activity_logs").insert({
      client_id: clientId,
      event_type: "integration_connected",
      payload: {
        integration_id: integrationId,
        connected_by: user.id,
      },
    });

    console.log(
      `[integrations/save] "${integrationId}" connected for client ${clientId}`
    );

    return NextResponse.json({
      success: true,
      integrationId,
    });
  } catch (err) {
    console.error("[integrations/save] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to save integration" },
      { status: 500 }
    );
  }
}
