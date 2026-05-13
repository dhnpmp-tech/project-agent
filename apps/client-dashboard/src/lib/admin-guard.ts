// Admin gate helper for /api/admin/* routes.
//
// Background: Next.js middleware in this project matches /dashboard, /admin,
// /onboarding, and the auth pages — NOT /api/*. That means /api/admin/*
// routes that say "Auth enforced by middleware" in their headers are
// actually unauthenticated and rely on obscurity. This helper is the
// explicit per-route check that closes that gap.
//
// Use:
//   const guard = await requireAdmin();
//   if (!guard.ok) return guard.response;
//   // …authenticated admin code here…

import { NextResponse } from "next/server";
import { getServerSession } from "./session";

type Guard =
  | { ok: true; email: string; userId: string }
  | { ok: false; response: NextResponse };

const ADMIN_EMAILS_ENV = process.env.ADMIN_EMAILS || "setup@dcp.sa,dhnpmp@gmail.com";

function isAdmin(email: string, role: string): boolean {
  if (role === "admin") return true;
  const allow = ADMIN_EMAILS_ENV.split(",").map((s) => s.trim().toLowerCase());
  return allow.includes(email.toLowerCase());
}

export async function requireAdmin(): Promise<Guard> {
  const session = await getServerSession();
  if (!session?.email) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  if (!isAdmin(session.email, session.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, email: session.email, userId: session.userId };
}
