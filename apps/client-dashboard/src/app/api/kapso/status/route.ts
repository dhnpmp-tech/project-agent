import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getKapsoConfig } from "@/lib/server-queries";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ configured: false });
  const { apiKey } = await getKapsoConfig();
  return NextResponse.json({ configured: !!apiKey });
}
