import { NextRequest } from "next/server";

const BASE = process.env.RAMI_API_BASE ?? "http://76.13.179.86:8200";

// Cache greetings for 5 minutes — they're keyed only by (path, lang) for
// new visitors. For returning visitors the upstream branch reads cookies
// and returns personalized text; that response sets `Cache-Control: private`
// upstream — but to be safe we never cache responses that vary by cookie.
export const revalidate = 300;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.searchParams.get("path") ?? "/";
  const lang = url.searchParams.get("lang") ?? "en";
  const cookie = req.headers.get("cookie") ?? "";

  const upstreamUrl =
    `${BASE}/ceo/chat/greeting?path=${encodeURIComponent(path)}` +
    `&lang=${encodeURIComponent(lang)}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Cookie: cookie },
      // Disable Next fetch cache when cookies are involved (returning visitor)
      cache: cookie ? "no-store" : "force-cache",
      next: cookie ? undefined : { revalidate: 300 },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": cookie
          ? "private, no-store"
          : "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    return Response.json(
      { greeting: "Hey, I'm Rami. Ask me anything.", chips: [] },
      { status: 200 },
    );
  }
}
