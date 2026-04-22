import { NextRequest } from "next/server";

const BASE = process.env.RAMI_API_BASE ?? "http://76.13.179.86:8200";

export const dynamic = "force-dynamic";

/**
 * Bootstrap a new session by sending an empty no-op chat to the upstream.
 * The upstream will issue a `Set-Cookie: ceo_session_id=...` and return
 * `X-Ceo-Session-Id` in headers.
 *
 * Body shape: `{ "lang": "en" | "ar", "page_url": "/" }`
 * Returns: `{ "session_id": "..." }`
 */
export async function POST(req: NextRequest) {
  let lang = "en";
  let page = "/";
  try {
    const body = await req.json();
    if (body.lang === "ar" || body.lang === "en") lang = body.lang;
    if (typeof body.page_url === "string") page = body.page_url;
  } catch {
    // Empty / invalid body — accept defaults.
  }

  // Hit greeting endpoint with no cookie — Server creates a session lazily on first chat.
  // For now we just hit the chat endpoint with a benign primer that triggers session
  // creation. The chat endpoint returns SSE; we read just enough to grab the cookie.
  const upstream = await fetch(`${BASE}/ceo/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "__bootstrap__", page_url: page, lang }),
    cache: "no-store",
  });

  // Drain the body so the connection closes cleanly.
  try {
    await upstream.text();
  } catch {
    // ignore
  }

  const sessionId = upstream.headers.get("x-ceo-session-id") ?? "";
  const setCookie = upstream.headers.get("set-cookie") ?? "";

  const headers = new Headers({ "Content-Type": "application/json" });
  if (setCookie) headers.set("Set-Cookie", setCookie);

  return new Response(JSON.stringify({ session_id: sessionId }), {
    status: sessionId ? 200 : 502,
    headers,
  });
}
