// LEGACY SHIM — returns a stub during the Postgres migration.
// See @/lib/_supabase-stub for the shape it returns.
// Browser-side callers should migrate to @/lib/auth-client + fetch.

import { createStubClient, type StubClient } from "./_supabase-stub";

export function createClient(): StubClient {
  return createStubClient();
}
