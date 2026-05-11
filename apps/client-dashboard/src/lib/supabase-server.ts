// LEGACY SHIM — returns a stub during the Postgres migration.
//
// Pages and route handlers still import { createServerSupabase } and call
// `.from(...).select(...)` etc. The stub keeps those compiling and rendering
// while real data queries get rewired in a follow-up Phase 3b. New code
// should use @/lib/session for auth and a postgres-js client for data.
//
// The stub bridges to @/lib/session so .auth.getUser() returns a user
// matching the JWT cookie, letting authenticated UIs keep working.

import { createStubClient, type StubClient } from "./_supabase-stub";
import { getServerSession } from "./session";

export async function createServerSupabase(): Promise<StubClient> {
  const stub = createStubClient();
  const session = await getServerSession();
  if (session) {
    // Override the stub's null user with our real session
    stub.auth.getUser = async () => ({
      data: {
        user: {
          id: session.userId,
          email: session.email,
          user_metadata: {
            client_id: session.clientId,
            role: session.role,
          },
          app_metadata: {},
          aud: "authenticated",
          created_at: "",
        },
      },
      error: null,
    });
    stub.auth.getSession = async () => ({
      data: {
        session: {
          user: {
            id: session.userId,
            email: session.email,
          },
          expires_at: session.expiresAt,
        },
      },
      error: null,
    });
  }
  return stub;
}
