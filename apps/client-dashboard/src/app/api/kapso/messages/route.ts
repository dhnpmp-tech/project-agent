import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/session";
import { getKapsoConfig } from "@/lib/server-queries";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversationId = request.nextUrl.searchParams.get("conversation_id");
  if (!conversationId) {
    return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
  }

  const { apiKey } = await getKapsoConfig();
  if (!apiKey) {
    return NextResponse.json({ messages: [] });
  }

  try {
    const res = await fetch(
      `https://api.kapso.ai/meta/whatsapp/messages?conversation_id=${conversationId}`,
      {
        headers: {
          "X-Kapso-Api-Key": apiKey,
          "Content-Type": "application/json",
        },
      },
    );
    if (!res.ok) return NextResponse.json({ messages: [] });
    const result = await res.json();
    return NextResponse.json({ messages: result.data || [] });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}
