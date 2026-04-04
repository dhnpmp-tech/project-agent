import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

/* ------------------------------------------------------------------ */
/*  POST /api/provisioning/register-routing                            */
/*                                                                     */
/*  Registers a phone_number_id -> client_id mapping with the          */
/*  prompt-builder service on the VPS. This tells the prompt-builder   */
/*  which client's knowledge base and persona to use when a message    */
/*  arrives on a given WhatsApp number.                                */
/*                                                                     */
/*  Body: { phoneNumberId: string, clientId: string }                  */
/* ------------------------------------------------------------------ */

interface RegisterRoutingBody {
  phoneNumberId?: string;
  clientId?: string;
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ─────────────────────────────────────────────────
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse & validate body ──────────────────────────────────────
    let body: RegisterRoutingBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { phoneNumberId, clientId } = body;

    if (!phoneNumberId || !clientId) {
      return NextResponse.json(
        { error: "Missing required fields: phoneNumberId, clientId" },
        { status: 400 }
      );
    }

    // ── Verify client exists ───────────────────────────────────────
    const supabaseAdmin = createAdminClient();

    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id, company_name")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Client not found", detail: clientError?.message },
        { status: 404 }
      );
    }

    // ── Call prompt-builder to register routing ────────────────────
    const promptBuilderUrl =
      process.env.PROMPT_BUILDER_URL || "http://76.13.179.86:8200";

    const res = await fetch(`${promptBuilderUrl}/register-route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumberId,
        clientId,
        companyName: client.company_name,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      console.error(
        `[register-routing] Prompt-builder returned ${res.status}: ${errText}`
      );
      return NextResponse.json(
        {
          error: "Prompt-builder routing registration failed",
          status: res.status,
          detail: errText,
        },
        { status: 502 }
      );
    }

    const result = await res.json().catch(() => ({}));

    // ── Log activity ───────────────────────────────────────────────
    await supabaseAdmin.from("activity_logs").insert({
      client_id: clientId,
      event_type: "routing_registered",
      payload: {
        phone_number_id: phoneNumberId,
        company_name: client.company_name,
        registered_by: user.id,
      },
    });

    console.log(
      `[register-routing] Registered: ${phoneNumberId} -> ${clientId} ("${client.company_name}")`
    );

    return NextResponse.json({
      success: true,
      phoneNumberId,
      clientId,
      promptBuilderResponse: result,
    });
  } catch (err) {
    console.error("[register-routing] Unexpected error:", err);
    return NextResponse.json(
      { error: "Routing registration failed", detail: String(err) },
      { status: 500 }
    );
  }
}
