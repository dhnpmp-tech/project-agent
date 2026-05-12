import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getKapsoConfig } from "@/lib/server-queries";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { apiKey } = await getKapsoConfig();
  if (!apiKey) {
    return NextResponse.json({ conversations: [] });
  }

  try {
    const res = await fetch("https://api.kapso.ai/meta/whatsapp/conversations", {
      headers: {
        "X-Kapso-Api-Key": apiKey,
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
