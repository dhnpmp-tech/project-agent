// Server-only session helper for the post-Supabase auth flow.
//
// JWT lives in an HttpOnly cookie set by /app/api/auth/verify-otp after a
// successful OTP login. Pages and route handlers call getServerSession() to
// read it. Returns null if no cookie, expired, or signature invalid.

import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = (() => {
  const s = process.env.JWT_SECRET;
  if (!s) {
    // Soft-fail in dev/preview if not set; pages will see "logged out"
    return null;
  }
  return new TextEncoder().encode(s);
})();

const ISSUER = "auth.agents.dcp.sa";
const AUDIENCE = "agents.dcp.sa";

export const SESSION_COOKIE = "agents_session";
export const REFRESH_COOKIE = "agents_refresh";

export interface ServerSession {
  userId: string;
  email: string;
  clientId: string | null;
  role: string;
  expiresAt: number; // unix seconds
}

export async function getServerSession(): Promise<ServerSession | null> {
  if (!JWT_SECRET) return null;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const userMeta = (payload.user_metadata ?? {}) as {
      client_id?: string;
      role?: string;
    };
    return {
      userId: String(payload.sub),
      email: String(payload.email ?? ""),
      clientId: userMeta.client_id ?? null,
      role: userMeta.role ?? "owner",
      expiresAt: Number(payload.exp),
    };
  } catch {
    return null;
  }
}

/**
 * Server-side fetch wrapper for the auth API.
 * Use in route handlers to proxy /auth/* calls server-to-server.
 */
export const AUTH_API_BASE =
  process.env.AUTH_API_URL || "https://auth.agents.dcp.sa";
