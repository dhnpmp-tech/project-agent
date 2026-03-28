import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conversationId = request.nextUrl.searchParams.get("conversation_id");
    if (!conversationId) {
      return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
    }

    const { data } = await supabase
      .from("business_knowledge")
      .select("crawl_data")
      .single();

    const crawlData = data?.crawl_data as Record<string, unknown> | null;
    const apiKey = crawlData?.kapso_api_key as string | undefined;
    if (!apiKey) {
      return NextResponse.json({ messages: [] });
    }

    const res = await fetch(
      `https://api.kapso.ai/meta/whatsapp/messages?conversation_id=${conversationId}`,
      {
        headers: {
          "X-Kapso-Api-Key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ messages: [] });
    }

    const result = await res.json();
    return NextResponse.json({ messages: result.data || [] });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}
