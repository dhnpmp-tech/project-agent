import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export const maxDuration = 60;

/* ------------------------------------------------------------------ */
/*  POST /api/provisioning/complete                                    */
/*                                                                     */
/*  Called after a client completes WhatsApp setup via Kapso.          */
/*  Receives the phone_number_id, activates the deployment,           */
/*  registers routing, generates persona if needed, and sends         */
/*  a "You're live!" email.                                           */
/*                                                                     */
/*  Body: { clientId: string, phoneNumberId: string,                  */
/*          whatsappNumber: string }                                   */
/* ------------------------------------------------------------------ */

interface CompleteBody {
  clientId?: string;
  phoneNumberId?: string;
  whatsappNumber?: string;
}

export async function POST(request: NextRequest) {
  try {
    // ── 1. Auth check ──────────────────────────────────────────────
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Parse & validate body ───────────────────────────────────
    let body: CompleteBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { clientId, phoneNumberId, whatsappNumber } = body;

    if (!clientId || !phoneNumberId || !whatsappNumber) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: clientId, phoneNumberId, whatsappNumber",
        },
        { status: 400 }
      );
    }

    // ── 3. Admin client for cross-table updates ────────────────────
    const supabaseAdmin = createAdminClient();

    // Fetch client record
    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Client not found", detail: clientError?.message },
        { status: 404 }
      );
    }

    // ── 4. Update agent_deployments ────────────────────────────────
    // Set phone_number_id in config, status = "active", deployed_at = now
    const { data: deployments, error: deployFetchError } = await supabaseAdmin
      .from("agent_deployments")
      .select("*")
      .eq("client_id", clientId);

    if (deployFetchError) {
      console.error(
        "[provisioning/complete] Failed to fetch deployments:",
        deployFetchError
      );
      return NextResponse.json(
        {
          error: "Failed to fetch agent deployments",
          detail: deployFetchError.message,
        },
        { status: 500 }
      );
    }

    // Update each deployment with phone_number_id and activate
    for (const deployment of deployments || []) {
      const existingConfig =
        (deployment.config as Record<string, unknown>) || {};

      const { error: deployUpdateError } = await supabaseAdmin
        .from("agent_deployments")
        .update({
          config: {
            ...existingConfig,
            phone_number_id: phoneNumberId,
            whatsapp_number: whatsappNumber,
          },
          status: "active",
          deployed_at: new Date().toISOString(),
        })
        .eq("id", deployment.id);

      if (deployUpdateError) {
        console.error(
          `[provisioning/complete] Failed to update deployment ${deployment.id}:`,
          deployUpdateError
        );
      }
    }

    // ── 5. Update clients: status = "active" ───────────────────────
    const { error: clientUpdateError } = await supabaseAdmin
      .from("clients")
      .update({ status: "active" })
      .eq("id", clientId);

    if (clientUpdateError) {
      console.error(
        "[provisioning/complete] Failed to update client status:",
        clientUpdateError
      );
      return NextResponse.json(
        {
          error: "Failed to update client status",
          detail: clientUpdateError.message,
        },
        { status: 500 }
      );
    }

    // ── 6. Register routing with prompt-builder ────────────────────
    const promptBuilderUrl =
      process.env.PROMPT_BUILDER_URL || "http://76.13.179.86:8200";

    try {
      const routingRes = await fetch(`${promptBuilderUrl}/register-route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId,
          clientId,
          whatsappNumber,
          companyName: client.company_name,
        }),
      });

      if (!routingRes.ok) {
        const errText = await routingRes.text().catch(() => "Unknown");
        console.error(
          `[provisioning/complete] Prompt-builder routing registration failed: ${routingRes.status} ${errText}`
        );
        // Non-blocking: log but don't fail the whole request
      } else {
        console.log(
          `[provisioning/complete] Routing registered: ${phoneNumberId} -> ${clientId}`
        );
      }
    } catch (routingErr) {
      console.error(
        "[provisioning/complete] Failed to reach prompt-builder for routing:",
        routingErr
      );
      // Non-blocking: the VPS might be temporarily unreachable
    }

    // ── 7. Generate persona if not already done ────────────────────
    let personaGenerated = false;

    const { data: knowledge } = await supabaseAdmin
      .from("business_knowledge")
      .select("crawl_data")
      .eq("client_id", clientId)
      .single();

    const crawlData = (knowledge?.crawl_data as Record<string, unknown>) || {};
    const persona = crawlData.persona as
      | { voice_prompt?: string }
      | undefined;
    const hasPersona = Boolean(persona?.voice_prompt);

    if (!hasPersona && process.env.MINIMAX_API_KEY) {
      try {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://agents.dcp.sa";
        const personaRes = await fetch(
          `${appUrl}/api/provisioning/generate-persona`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              cookie: request.headers.get("cookie") || "",
            },
            body: JSON.stringify({ clientId }),
          }
        );

        if (personaRes.ok) {
          personaGenerated = true;
          console.log(
            `[provisioning/complete] Persona generated for "${client.company_name}"`
          );
        } else {
          const errText = await personaRes.text().catch(() => "Unknown");
          console.error(
            `[provisioning/complete] Persona generation failed: ${personaRes.status} ${errText}`
          );
        }
      } catch (personaErr) {
        console.error(
          "[provisioning/complete] Persona generation request failed:",
          personaErr
        );
      }
    } else if (hasPersona) {
      console.log(
        `[provisioning/complete] Persona already exists for "${client.company_name}", skipping`
      );
    }

    // ── 8. Log activity: "agent_deployed" ──────────────────────────
    await supabaseAdmin.from("activity_logs").insert({
      client_id: clientId,
      event_type: "agent_deployed",
      payload: {
        phone_number_id: phoneNumberId,
        whatsapp_number: whatsappNumber,
        company_name: client.company_name,
        deployments_updated: deployments?.length || 0,
        persona_generated: personaGenerated,
        persona_existed: hasPersona,
        completed_by: user.id,
      },
    });

    // ── 9. Send "You're live!" email via Resend ────────────────────
    let emailSent = false;

    if (process.env.RESEND_API_KEY && client.contact_email) {
      try {
        const { sendAgentActiveEmail } = await import("@/lib/email");
        await sendAgentActiveEmail(
          client.contact_email,
          client.company_name || "Your Company",
          "whatsapp_intelligence"
        );
        emailSent = true;
        console.log(
          `[provisioning/complete] "You're live!" email sent to ${client.contact_email}`
        );
      } catch (emailErr) {
        console.error(
          "[provisioning/complete] Failed to send live email:",
          emailErr
        );
      }
    }

    console.log(
      `[provisioning/complete] Client "${client.company_name}" (${clientId}) is now ACTIVE`
    );

    // ── 10. Return success ─────────────────────────────────────────
    return NextResponse.json({
      success: true,
      status: "active",
      clientId,
      phoneNumberId,
      whatsappNumber,
      deploymentsUpdated: deployments?.length || 0,
      personaGenerated,
      personaExisted: hasPersona,
      emailSent,
    });
  } catch (err) {
    console.error("[provisioning/complete] Unexpected error:", err);
    return NextResponse.json(
      { error: "Provisioning completion failed", detail: String(err) },
      { status: 500 }
    );
  }
}
