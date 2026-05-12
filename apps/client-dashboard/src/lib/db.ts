// Server-only Postgres connection for the dashboard. Uses postgres-js
// over SSL to the self-hosted agents-postgres at db.agents.dcp.sa.
//
// DATABASE_URL example:
//   postgresql://agents_app:<pw>@db.agents.dcp.sa:5433/agents?sslmode=require
//
// Lazy init: the connection isn't opened at module-import time. Next.js
// collects page metadata during `next build` BEFORE production env vars
// are guaranteed to be available, so eager construction would throw and
// abort the build.
//
// NEVER import this from a Client Component — the connection holds
// secrets and runs only on the server.

import "server-only";
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

declare global {
  // eslint-disable-next-line no-var
  var __agentsDb: Sql | undefined;
}

function makeClient(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL not configured");
  }
  return postgres(url, {
    // Self-signed cert on the VPS — verify=false is intentional for now.
    // Phase 7 swaps in a Let's Encrypt cert + verify=true.
    ssl: { rejectUnauthorized: false },
    // Serverless-friendly: keep connections short-lived per invocation.
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

/**
 * Returns the singleton postgres-js client.
 *
 * Use as a tag template just like the original `sql\`SELECT ...\``:
 *
 *   import { db } from "@/lib/db";
 *   const rows = await db()\`SELECT * FROM clients WHERE id = ${id}\`;
 *
 * The function returns the underlying `sql` tag, so call it once per
 * query and chain as usual.
 */
export function db(): Sql {
  if (globalThis.__agentsDb) return globalThis.__agentsDb;
  const client = makeClient();
  if (process.env.NODE_ENV !== "production") {
    globalThis.__agentsDb = client;
  }
  return client;
}
