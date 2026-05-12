import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/session";
import { getKapsoConfig } from "@/lib/server-queries";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { to, text } = await request.json().catch(() => ({}));
  if (!to || !text) {
    return NextResponse.json({ error: "to and text required" }, { status: 400 });
  }

  const { apiKey, phoneNumberId } = await getKapsoConfig();
  if (!apiKey) {
    return NextResponse.json({ error: "Kapso not configured" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.kapso.ai/meta/whatsapp/${phoneNumberId || "me"}/messages`,
      {
        method: "POST",
        headers: {
          "X-Kapso-Api-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text },
        }),
      },
    );
    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error }, { status: res.status });
    }
    const result = await res.json();
    return NextResponse.json({
      success: true,
      messageId: result.messages?.[0]?.id,
    });
  } catch {
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
