import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

async function getKapsoConfig(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
  const { data } = await supabase
    .from("business_knowledge")
    .select("crawl_data")
    .single();

  const crawlData = data?.crawl_data as Record<string, unknown> | null;
  return {
    apiKey: crawlData?.kapso_api_key as string | undefined,
    phoneNumberId: crawlData?.kapso_phone_number_id as string | undefined,
  };
}

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const config = await getKapsoConfig(supabase);
    if (!config.apiKey) {
      return NextResponse.json({ conversations: [] });
    }

    const res = await fetch("https://api.kapso.ai/meta/whatsapp/conversations", {
      headers: {
        "X-Kapso-Api-Key": config.apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ conversations: [], error: "Kapso API error" });
    }

    const data = await res.json();
    return NextResponse.json({ conversations: data.data || [] });
  } catch {
    return NextResponse.json({ conversations: [] });
  }
}
