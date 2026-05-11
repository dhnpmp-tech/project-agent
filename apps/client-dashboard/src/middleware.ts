// JWT-cookie middleware. Replaces the Supabase Auth middleware.
// Checks the agents_session cookie set by /api/auth/verify-otp, validates
// the JWT signature + expiry, and routes accordingly.

import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET
  ? new TextEncoder().encode(process.env.JWT_SECRET)
  : null;

const ISSUER = "auth.agents.dcp.sa";
const AUDIENCE = "agents.dcp.sa";

const SESSION_COOKIE = "agents_session";

const AUTH_PAGES = new Set(["/login", "/signup", "/password-reset"]);

async function readSession(req: NextRequest): Promise<{
  userId: string;
  email: string;
  clientId: string | null;
  role: string;
} | null> {
  if (!JWT_SECRET) return null;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const meta = (payload.user_metadata ?? {}) as {
      client_id?: string;
      role?: string;
    };
    return {
      userId: String(payload.sub),
      email: String(payload.email ?? ""),
      clientId: meta.client_id ?? null,
      role: meta.role ?? "owner",
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const user = await readSession(request);

  // Protected paths require auth
  if (
    !user &&
    (pathname.startsWith("/dashboard") ||
      pathname === "/onboarding" ||
      pathname.startsWith("/admin"))
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  // Admin gate
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "setup@dcp.sa,dhnpmp@gmail.com")
    .split(",")
    .map((e) => e.trim());
  if (
    pathname.startsWith("/admin") &&
    user &&
    !ADMIN_EMAILS.includes(user.email) &&
    user.role !== "admin"
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  // Signed-in users on auth pages → dashboard
  if (user && AUTH_PAGES.has(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/onboarding",
    "/login",
    "/signup",
    "/password-reset",
  ],
};
