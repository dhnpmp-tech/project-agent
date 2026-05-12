import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/session";
import { setKapsoConfig } from "@/lib/server-queries";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { apiKey, phoneNumberId } = await request.json().catch(() => ({}));
  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }

  const ok = await setKapsoConfig(apiKey, phoneNumberId || null);
  if (!ok) {
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
