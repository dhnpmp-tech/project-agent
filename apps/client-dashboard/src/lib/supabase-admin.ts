// LEGACY SHIM — returns a stub during the Postgres migration.
// Admin-side data writes should be done server-to-server via the
// prompt-builder API or direct postgres-js (Phase 3b).

import { createStubClient, type StubClient } from "./_supabase-stub";

export function createAdminClient(): StubClient {
  return createStubClient();
}
