import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

const FROM = "AI Agent Systems <agents@dcp.sa>";

// ── Shared template pieces ───────────────────────────────────

const LOGO_SVG = `
<div style="margin-bottom:24px;">
  <div style="display:inline-block;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);text-align:center;line-height:48px;vertical-align:middle;">
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" fill="none" style="vertical-align:middle;">
      <path d="M14 3L24 14L14 25L4 14L14 3Z" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" fill="none"/>
      <path d="M14 7L20 14L14 21L8 14L14 7Z" stroke="rgba(255,255,255,0.6)" stroke-width="1.2" fill="none"/>
      <path d="M14 10.5L17 14L14 17.5L11 14L14 10.5Z" fill="rgba(255,255,255,0.8)"/>
    </svg>
  </div>
</div>`;

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#111113;border-radius:16px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;">
        <tr><td style="padding:40px 36px;">
          ${LOGO_SVG}
          ${body}
          <!-- Footer -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:36px;border-top:1px solid rgba(255,255,255,0.06);padding-top:24px;">
            <tr><td>
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);line-height:1.6;">
                AI Agent Systems &mdash; Intelligent automation for your business.<br/>
                &copy; ${new Date().getFullYear()} DCP SA. All rights reserved.
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr><td style="border-radius:8px;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);">
    <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
  </td></tr>
</table>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:12px 0;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.7;">${text}</p>`;
}

function statBlock(items: { label: string; value: string }[]): string {
  const cells = items
    .map(
      (s) => `<td style="padding:16px;background-color:rgba(255,255,255,0.03);border-radius:10px;text-align:center;border:1px solid rgba(255,255,255,0.04);">
        <div style="font-size:22px;font-weight:700;color:#22c55e;margin-bottom:4px;">${s.value}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em;">${s.label}</div>
      </td>`
    )
    .join('<td style="width:12px;"></td>');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr>${cells}</tr></table>`;
}

// ── Email functions ──────────────────────────────────────────

export async function sendWelcomeEmail(to: string, companyName: string) {
  const html = layout(`
    ${heading(`Welcome aboard, ${companyName}!`)}
    ${paragraph("Thank you for choosing AI Agent Systems. We're ready to deploy intelligent agents that will transform how your business operates.")}
    ${paragraph("Your account is being set up now. Here's what happens next:")}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td style="padding:8px 12px;vertical-align:top;color:#22c55e;font-size:14px;font-weight:600;">1.</td>
        <td style="padding:8px 0;color:rgba(255,255,255,0.55);font-size:14px;">Complete the onboarding questionnaire</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;vertical-align:top;color:#22c55e;font-size:14px;font-weight:600;">2.</td>
        <td style="padding:8px 0;color:rgba(255,255,255,0.55);font-size:14px;">We configure &amp; train your AI agents</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;vertical-align:top;color:#22c55e;font-size:14px;font-weight:600;">3.</td>
        <td style="padding:8px 0;color:rgba(255,255,255,0.55);font-size:14px;">Your agents go live and start working</td>
      </tr>
    </table>
    ${ctaButton("Go to Dashboard", "https://dashboard.dcp.sa")}
    ${paragraph("If you need anything, just reply to this email.")}
  `);

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Welcome to AI Agent Systems, ${companyName}!`,
    html,
  });
}

export async function sendOnboardingCompleteEmail(
  to: string,
  companyName: string,
  agentCount: number
) {
  const html = layout(`
    ${heading("Onboarding Complete")}
    ${paragraph(`Great news, ${companyName}! Your onboarding is done and we're now provisioning your AI agents.`)}
    ${statBlock([
      { label: "Agents", value: String(agentCount) },
      { label: "Status", value: "Provisioning" },
      { label: "ETA", value: "24h" },
    ])}
    ${paragraph("Our team is configuring your agents with the information you provided. You'll receive a notification when each agent goes live.")}
    ${ctaButton("View Progress", "https://dashboard.dcp.sa")}
  `);

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `${companyName} — Onboarding complete, provisioning started`,
    html,
  });
}

export async function sendWhatsAppSetupEmail(
  to: string,
  companyName: string,
  setupLink: string
) {
  const html = layout(`
    ${heading("WhatsApp Channel Ready")}
    ${paragraph(`${companyName}, your WhatsApp business channel is ready to be connected. Click below to complete the setup — it only takes a minute.`)}
    ${ctaButton("Connect WhatsApp", setupLink)}
    ${paragraph("Once connected, your AI agents will be able to respond to customer messages on WhatsApp automatically.")}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;padding:16px;background-color:rgba(34,197,94,0.06);border-radius:10px;border:1px solid rgba(34,197,94,0.12);">
      <tr><td>
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.45);line-height:1.6;">
          <strong style="color:rgba(255,255,255,0.6);">Need help?</strong> Reply to this email or contact your account manager. We'll walk you through the setup.
        </p>
      </td></tr>
    </table>
  `);

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `${companyName} — Connect your WhatsApp channel`,
    html,
  });
}

export async function sendAgentActiveEmail(
  to: string,
  companyName: string,
  agentType: string
) {
  const agentLabel = agentType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const html = layout(`
    ${heading("Agent Now Active")}
    ${paragraph(`Your <strong style="color:#22c55e;">${agentLabel}</strong> agent is live and working for ${companyName}.`)}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;padding:20px;background-color:rgba(34,197,94,0.06);border-radius:10px;border:1px solid rgba(34,197,94,0.12);">
      <tr>
        <td style="width:10px;vertical-align:top;padding-right:12px;">
          <div style="width:10px;height:10px;border-radius:50%;background:#22c55e;margin-top:3px;box-shadow:0 0 8px rgba(34,197,94,0.5);"></div>
        </td>
        <td>
          <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);line-height:1.5;">
            <strong style="color:#ffffff;">${agentLabel}</strong><br/>
            Status: <span style="color:#22c55e;font-weight:600;">Active</span>
          </p>
        </td>
      </tr>
    </table>
    ${paragraph("You can monitor performance, adjust settings, and view conversation logs from your dashboard.")}
    ${ctaButton("View Agent Dashboard", "https://dashboard.dcp.sa")}
  `);

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `${companyName} — ${agentLabel} agent is now live`,
    html,
  });
}

export interface WeeklySummaryStats {
  totalConversations: number;
  resolvedAutomatically: number;
  avgResponseTime: string;
  customerSatisfaction: string;
  topAgent: string;
}

export async function sendWeeklySummaryEmail(
  to: string,
  companyName: string,
  stats: WeeklySummaryStats
) {
  const html = layout(`
    ${heading("Weekly Summary")}
    ${paragraph(`Here's how your AI agents performed for ${companyName} this week.`)}
    ${statBlock([
      { label: "Conversations", value: String(stats.totalConversations) },
      { label: "Auto-Resolved", value: String(stats.resolvedAutomatically) },
      { label: "Avg Response", value: stats.avgResponseTime },
    ])}
    ${statBlock([
      { label: "Satisfaction", value: stats.customerSatisfaction },
      { label: "Top Agent", value: stats.topAgent },
    ])}
    ${paragraph("Visit your dashboard for detailed analytics and conversation logs.")}
    ${ctaButton("View Full Report", "https://dashboard.dcp.sa/dashboard/reports")}
  `);

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `${companyName} — Weekly agent performance summary`,
    html,
  });
}

export async function sendPaymentReceiptEmail(
  to: string,
  companyName: string,
  amount: number,
  currency: string,
  invoiceId: string
) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);

  const html = layout(`
    ${heading("Payment Received")}
    ${paragraph(`Thank you, ${companyName}. We've received your payment.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
      <tr>
        <td style="padding:16px 20px;background-color:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.04);">
          <span style="font-size:12px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em;">Amount</span>
        </td>
        <td style="padding:16px 20px;background-color:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.04);text-align:right;">
          <span style="font-size:16px;font-weight:700;color:#22c55e;">${formattedAmount}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;background-color:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.04);">
          <span style="font-size:12px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em;">Invoice</span>
        </td>
        <td style="padding:16px 20px;background-color:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.04);text-align:right;">
          <span style="font-size:14px;color:rgba(255,255,255,0.6);font-family:monospace;">${invoiceId}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;background-color:rgba(255,255,255,0.02);">
          <span style="font-size:12px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em;">Status</span>
        </td>
        <td style="padding:16px 20px;background-color:rgba(255,255,255,0.02);text-align:right;">
          <span style="display:inline-block;padding:3px 10px;font-size:12px;font-weight:600;color:#22c55e;background:rgba(34,197,94,0.1);border-radius:20px;">Paid</span>
        </td>
      </tr>
    </table>
    ${paragraph("This receipt has been saved to your account. You can access all invoices from your dashboard.")}
    ${ctaButton("View Invoices", "https://dashboard.dcp.sa/dashboard/reports")}
  `);

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Payment received — ${formattedAmount} (${invoiceId})`,
    html,
  });
}
