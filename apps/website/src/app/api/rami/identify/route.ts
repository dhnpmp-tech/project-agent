import { NextRequest } from "next/server";

const BASE = process.env.RAMI_API_BASE ?? "http://76.13.179.86:8200";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const cookie = req.headers.get("cookie") ?? "";

  const upstream = await fetch(`${BASE}/ceo/chat/identify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body,
    cache: "no-store",
  });

  const text = await upstream.text();
  const headers = new Headers({ "Content-Type": "application/json" });
  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) headers.set("Set-Cookie", setCookie);

  return new Response(text, { status: upstream.status, headers });
}
