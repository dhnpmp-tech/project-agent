import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  // Forward to Master n8n webhook for processing
  const masterN8nWebhook = process.env.MASTER_N8N_WEBHOOK_URL;

  if (masterN8nWebhook) {
    await fetch(masterN8nWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "client_dashboard",
        ...body,
      }),
    }).catch((err) => {
      console.error("Failed to forward to Master n8n:", err);
    });
  }

  return NextResponse.json({ status: "received" });
}
