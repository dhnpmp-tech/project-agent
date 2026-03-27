import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { to, text } = await request.json();
    if (!to || !text) {
      return NextResponse.json({ error: "to and text required" }, { status: 400 });
    }

    const { data } = await supabase
      .from("business_knowledge")
      .select("crawl_data")
      .single();

    const crawlData = data?.crawl_data as Record<string, unknown> | null;
    const apiKey = crawlData?.kapso_api_key as string | undefined;
    const phoneNumberId = crawlData?.kapso_phone_number_id as string | undefined;

    if (!apiKey) {
      return NextResponse.json({ error: "Kapso not configured" }, { status: 400 });
    }

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
      }
    );

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error }, { status: res.status });
    }

    const result = await res.json();
    return NextResponse.json({ success: true, messageId: result.messages?.[0]?.id });
  } catch {
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
