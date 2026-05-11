// Proxies an OTP send request to auth.agents.dcp.sa.
// We don't expose the upstream URL to the browser so we can swap auth
// providers without touching frontend code.

import { NextRequest, NextResponse } from "next/server";
import { AUTH_API_BASE } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.email || typeof body.email !== "string") {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }

  const upstream = await fetch(`${AUTH_API_BASE}/auth/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email }),
  });

  const respBody = await upstream.json().catch(() => ({}));
  return NextResponse.json(respBody, { status: upstream.status });
}
