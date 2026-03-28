import { NextResponse, type NextRequest } from "next/server";
import {
  sendWelcomeEmail,
  sendOnboardingCompleteEmail,
  sendWhatsAppSetupEmail,
  sendAgentActiveEmail,
  sendWeeklySummaryEmail,
  sendPaymentReceiptEmail,
  type WeeklySummaryStats,
} from "@/lib/email";

/**
 * POST /api/email/send
 *
 * Generic email-sending endpoint for n8n workflows and internal services.
 * Requires the service role key in the Authorization header.
 *
 * Body: { type: string, to: string, data: Record<string, unknown> }
 */
export async function POST(request: NextRequest) {
  // ── Auth check ───────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Server misconfigured: missing service role key" },
      { status: 500 }
    );
  }

  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token || token !== serviceRoleKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ───────────────────────────────────────────────
  let body: { type?: string; to?: string; data?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { type, to, data } = body;

  if (!type || !to) {
    return NextResponse.json(
      { error: "Missing required fields: type, to" },
      { status: 400 }
    );
  }

  // ── Dispatch to correct email function ───────────────────────
  try {
    let result;

    switch (type) {
      case "welcome":
        result = await sendWelcomeEmail(
          to,
          (data?.companyName as string) || "Your Company"
        );
        break;

      case "onboarding_complete":
        result = await sendOnboardingCompleteEmail(
          to,
          (data?.companyName as string) || "Your Company",
          (data?.agentCount as number) || 0
        );
        break;

      case "whatsapp_setup":
        if (!data?.setupLink) {
          return NextResponse.json(
            { error: "Missing data.setupLink for whatsapp_setup email" },
            { status: 400 }
          );
        }
        result = await sendWhatsAppSetupEmail(
          to,
          (data?.companyName as string) || "Your Company",
          data.setupLink as string
        );
        break;

      case "agent_active":
        result = await sendAgentActiveEmail(
          to,
          (data?.companyName as string) || "Your Company",
          (data?.agentType as string) || "general"
        );
        break;

      case "weekly_summary":
        if (!data?.stats) {
          return NextResponse.json(
            { error: "Missing data.stats for weekly_summary email" },
            { status: 400 }
          );
        }
        result = await sendWeeklySummaryEmail(
          to,
          (data?.companyName as string) || "Your Company",
          data.stats as WeeklySummaryStats
        );
        break;

      case "payment_receipt":
        if (!data?.amount || !data?.currency || !data?.invoiceId) {
          return NextResponse.json(
            {
              error:
                "Missing data.amount, data.currency, or data.invoiceId for payment_receipt email",
            },
            { status: 400 }
          );
        }
        result = await sendPaymentReceiptEmail(
          to,
          (data?.companyName as string) || "Your Company",
          data.amount as number,
          data.currency as string,
          data.invoiceId as string
        );
        break;

      default:
        return NextResponse.json(
          {
            error: `Unknown email type: ${type}`,
            validTypes: [
              "welcome",
              "onboarding_complete",
              "whatsapp_setup",
              "agent_active",
              "weekly_summary",
              "payment_receipt",
            ],
          },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error(`[email/send] Failed to send ${type} email:`, err);
    return NextResponse.json(
      { error: "Failed to send email", detail: String(err) },
      { status: 500 }
    );
  }
}
