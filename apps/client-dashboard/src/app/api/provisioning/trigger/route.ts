import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientId } = await request.json();

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for cross-table updates
    const supabaseAdmin = createAdminClient();

    // Fetch the client record
    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Update client status to 'provisioning'
    await supabaseAdmin
      .from("clients")
      .update({ status: "provisioning" })
      .eq("id", clientId);

    // Update agent_deployments status to 'deploying'
    await supabaseAdmin
      .from("agent_deployments")
      .update({ status: "deploying" })
      .eq("client_id", clientId);

    // Log activity
    await supabaseAdmin.from("activity_logs").insert({
      client_id: clientId,
      event_type: "provisioning_started",
      payload: {
        company_name: client.company_name,
        triggered_by: user.id,
      },
    });

    console.log(
      `[provisioning] Started for "${client.company_name}" (${clientId})`
    );

    // Generate AI persona (non-blocking — runs in background)
    if (process.env.MINIMAX_API_KEY) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agents.dcp.sa";
      fetch(`${appUrl}/api/provisioning/generate-persona`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: request.headers.get("cookie") || "" },
        body: JSON.stringify({ clientId }),
      }).then(() => {
        console.log(`[provisioning] Persona generation triggered for "${client.company_name}"`);
      }).catch((err) => {
        console.error(`[provisioning] Persona generation failed:`, err);
      });
    }

    // Send onboarding complete email via Resend (if configured)
    if (process.env.RESEND_API_KEY && client.contact_email) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from:
              process.env.RESEND_FROM_EMAIL ||
              "AI Agent Systems <agents@dcp.sa>",
            to: client.contact_email,
            subject: `Welcome to Project Agent — ${client.company_name} is live!`,
            html: `
              <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #111;">Your workspace is being set up</h2>
                <p>Hi ${client.contact_name || "there"},</p>
                <p>
                  Great news — <strong>${client.company_name}</strong> has been onboarded
                  and your AI agents are being provisioned now.
                </p>
                <p>You'll receive another email once everything is ready. In the meantime, you can visit your dashboard:</p>
                <p>
                  <a
                    href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.projectagent.ai"}/dashboard"
                    style="display: inline-block; padding: 10px 20px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px;"
                  >
                    Open Dashboard
                  </a>
                </p>
                <p style="color: #666; font-size: 13px; margin-top: 32px;">
                  If you have any questions, reply to this email and our team will help.
                </p>
              </div>
            `,
          }),
        });
        console.log(
          `[provisioning] Onboarding email sent to ${client.contact_email}`
        );
      } catch (emailErr) {
        console.error("[provisioning] Failed to send onboarding email:", emailErr);
      }
    }

    // Kapso WhatsApp provisioning (if configured)
    if (process.env.KAPSO_PLATFORM_API_KEY) {
      try {
        const kapsoApiKey = process.env.KAPSO_PLATFORM_API_KEY;
        const kapsoBaseUrl = process.env.KAPSO_API_URL || "https://api.kapso.ai/v1";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://project-agent-chi.vercel.app";
        const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || "https://n8n.dcp.sa";

        // Create Kapso customer
        const customerRes = await fetch(`${kapsoBaseUrl}/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${kapsoApiKey}` },
          body: JSON.stringify({ name: client.company_name, external_id: clientId }),
        });
        const customer = await customerRes.json();

        // Create setup link
        const setupRes = await fetch(`${kapsoBaseUrl}/customers/${customer.id}/setup-links`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${kapsoApiKey}` },
          body: JSON.stringify({
            redirect_url: `${appUrl}/dashboard?connected=true`,
            webhook_url: `${webhookBaseUrl}/webhook/whatsapp-webhook`,
          }),
        });
        const setupLink = await setupRes.json();

        // Store Kapso IDs in client metadata
        const existingMetadata = (client.metadata as Record<string, unknown>) || {};
        await supabaseAdmin.from("clients").update({
          metadata: { ...existingMetadata, kapso_customer_id: customer.id, kapso_setup_link: setupLink.url },
        }).eq("id", clientId);

        // Send WhatsApp setup email
        if (process.env.RESEND_API_KEY && client.contact_email) {
          try {
            const { sendWhatsAppSetupEmail } = await import("@/lib/email");
            await sendWhatsAppSetupEmail(client.contact_email, client.company_name, setupLink.url);
          } catch { console.error("[provisioning] Failed to send WhatsApp setup email"); }
        }

        await supabaseAdmin.from("activity_logs").insert({
          client_id: clientId, event_type: "whatsapp_provisioning_started",
          payload: { kapso_customer_id: customer.id, setup_link_url: setupLink.url },
        });
        console.log(`[provisioning] Kapso provisioned for "${client.company_name}"`);
      } catch (kapsoErr) {
        console.error("[provisioning] Kapso provisioning failed:", kapsoErr);
        await supabaseAdmin.from("activity_logs").insert({
          client_id: clientId, event_type: "whatsapp_provisioning_failed",
          payload: { error: kapsoErr instanceof Error ? kapsoErr.message : "Unknown error" },
        });
      }
    } else {
      console.log(`[provisioning] KAPSO_PLATFORM_API_KEY not set — manual provisioning needed for "${client.company_name}"`);
      await supabaseAdmin.from("activity_logs").insert({
        client_id: clientId, event_type: "manual_provisioning_needed",
        payload: { reason: "KAPSO_PLATFORM_API_KEY not configured", company_name: client.company_name },
      });
    }

    return NextResponse.json({ success: true, status: "provisioning" });
  } catch (err) {
    console.error("[provisioning] Trigger error:", err);
    return NextResponse.json(
      { error: "Provisioning trigger failed" },
      { status: 500 }
    );
  }
}
