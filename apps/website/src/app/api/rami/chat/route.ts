import { NextRequest } from "next/server";

const BASE = process.env.RAMI_API_BASE ?? "http://76.13.179.86:8200";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const cookie = req.headers.get("cookie") ?? "";

  const upstream = await fetch(`${BASE}/ceo/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body,
    // Streaming: do NOT buffer
    cache: "no-store",
  });

  // Pass-through: rate-limit responses are JSON 429; chat replies are SSE 200.
  const headers = new Headers();
  const ct = upstream.headers.get("content-type") ?? "text/event-stream";
  headers.set("Content-Type", ct);
  headers.set("Cache-Control", "no-cache");
  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) headers.set("Set-Cookie", setCookie);
  const sessionId = upstream.headers.get("x-ceo-session-id");
  if (sessionId) headers.set("X-Ceo-Session-Id", sessionId);

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
