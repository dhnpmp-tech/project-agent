// Server-only Postgres connection for the dashboard. Uses postgres-js
// over SSL to the self-hosted agents-postgres at db.agents.dcp.sa.
//
// DATABASE_URL example:
//   postgresql://agents_app:<pw>@db.agents.dcp.sa:5433/agents?sslmode=require
//
// NEVER import this from a Client Component — the connection holds
// secrets and runs only on the server.

import "server-only";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

declare global {
  // eslint-disable-next-line no-var
  var __agentsDb: ReturnType<typeof postgres> | undefined;
}

function makeClient() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL not configured");
  }
  return postgres(DATABASE_URL, {
    // Self-signed cert on the VPS — verify=false is intentional for now.
    // Phase 7 swaps in a Let's Encrypt cert + verify=true.
    ssl: { rejectUnauthorized: false },
    // Serverless-friendly: keep connections short-lived per invocation.
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

// Reuse a single connection pool across hot-reloaded dev modules and
// Vercel Lambda warm starts. Per-invocation in cold starts gets a fresh
// one — that's fine because we cap max:1.
export const sql = globalThis.__agentsDb ?? makeClient();
if (process.env.NODE_ENV !== "production") {
  globalThis.__agentsDb = sql;
}
