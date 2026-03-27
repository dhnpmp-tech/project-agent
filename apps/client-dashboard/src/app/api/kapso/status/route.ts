import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ configured: false });

    const { data: knowledge } = await supabase
      .from("business_knowledge")
      .select("crawl_data")
      .single();

    const kapsoKey = (knowledge?.crawl_data as Record<string, unknown>)?.kapso_api_key;
    return NextResponse.json({ configured: !!kapsoKey });
  } catch {
    return NextResponse.json({ configured: false });
  }
}
