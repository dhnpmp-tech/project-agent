import { NextRequest } from "next/server";

const BASE = process.env.RAMI_API_BASE ?? "http://76.13.179.86:8200";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sid: string }> },
) {
  const { sid } = await params;
  const cookie = req.headers.get("cookie") ?? "";

  const upstream = await fetch(`${BASE}/ceo/chat/history/${encodeURIComponent(sid)}`, {
    method: "GET",
    headers: { Cookie: cookie },
    cache: "no-store",
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
