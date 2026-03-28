import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendOnboardingCompleteEmail } from "@/lib/email";

/**
 * POST /api/provisioning/complete
 *
 * Called when a client's onboarding is complete.
 * - Fetches client data from Supabase (using service role)
 * - Sends the onboarding-complete email
 * - Updates client status from 'pending' to 'provisioning'
 *
 * Body: { clientId: string }
 *
 * Requires the service role key in the Authorization header.
 */
export async function POST(request: NextRequest) {
  // ── Auth check ───────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Server misconfigured: missing Supabase environment variables" },
      { status: 500 }
    );
  }

  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token || token !== serviceRoleKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ───────────────────────────────────────────────
  let body: { clientId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { clientId } = body;
  if (!clientId) {
    return NextResponse.json(
      { error: "Missing required field: clientId" },
      { status: 400 }
    );
  }

  // ── Supabase admin client ────────────────────────────────────
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Fetch client profile
    const { data: client, error: fetchError } = await supabase
      .from("clients")
      .select("id, email, company_name, status")
      .eq("id", clientId)
      .single();

    if (fetchError || !client) {
      return NextResponse.json(
        { error: "Client not found", detail: fetchError?.message },
        { status: 404 }
      );
    }

    if (client.status !== "pending") {
      return NextResponse.json(
        {
          error: `Client status is '${client.status}', expected 'pending'`,
        },
        { status: 409 }
      );
    }

    // Count agents assigned to this client
    const { count: agentCount } = await supabase
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId);

    // Send email
    const emailResult = await sendOnboardingCompleteEmail(
      client.email,
      client.company_name || "Your Company",
      agentCount ?? 0
    );

    // Update status to provisioning
    const { error: updateError } = await supabase
      .from("clients")
      .update({ status: "provisioning" })
      .eq("id", clientId);

    if (updateError) {
      console.error(
        "[provisioning/complete] Failed to update status:",
        updateError
      );
      return NextResponse.json(
        {
          error: "Email sent but failed to update client status",
          detail: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      clientId,
      emailSent: true,
      emailId: emailResult?.data?.id,
      newStatus: "provisioning",
      agentCount: agentCount ?? 0,
    });
  } catch (err) {
    console.error("[provisioning/complete] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: String(err) },
      { status: 500 }
    );
  }
}
