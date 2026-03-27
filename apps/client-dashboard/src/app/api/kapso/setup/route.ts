import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { apiKey, phoneNumberId } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    // Store Kapso config in business_knowledge.crawl_data
    const { data: existing } = await supabase
      .from("business_knowledge")
      .select("id, crawl_data")
      .single();

    const crawlData = (existing?.crawl_data || {}) as Record<string, unknown>;
    crawlData.kapso_api_key = apiKey;
    crawlData.kapso_phone_number_id = phoneNumberId || null;

    if (existing) {
      await supabase
        .from("business_knowledge")
        .update({ crawl_data: crawlData })
        .eq("id", existing.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}
