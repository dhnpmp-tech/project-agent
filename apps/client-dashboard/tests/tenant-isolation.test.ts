// Tenant-isolation audit test.
//
// Walks every exported helper in `src/lib/server-queries.ts`, runs it
// under two distinct fake sessions (tenant A and tenant B), and asserts
// that no row belonging to the other tenant leaks through. Catches the
// class of bug where a developer forgets to add `WHERE client_id = $1`.
//
// Soft-skips when DATABASE_URL is unset so CI without a Postgres
// instance still runs `vitest run` cleanly.
//
// Notes:
// - We mock @/lib/session so getServerSession() returns the tenant we
//   want for each assertion. The real db() (postgres-js) still runs.
// - We mock "server-only" because Next ships a guard module that throws
//   the moment it's imported outside a Server Component context. The
//   helpers under test all import it at the top of their files.
// - Seed/cleanup uses a single random UUID pair so re-runs don't
//   collide if a prior run aborted before afterAll.

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";

vi.mock("server-only", () => ({}));

// Mutable mock state — flipped between A and B by setSession() below.
const mockSession: { value: { userId: string; email: string; clientId: string | null; role: string; expiresAt: number } | null } = {
  value: null,
};

vi.mock("@/lib/session", () => ({
  getServerSession: async () => mockSession.value,
  SESSION_COOKIE: "agents_session",
  REFRESH_COOKIE: "agents_refresh",
  AUTH_API_BASE: "https://auth.agents.dcp.sa",
}));

const DATABASE_URL = process.env.DATABASE_URL;
const SKIP = !DATABASE_URL;

// Top-level describe so the soft-skip message renders even with no DB.
describe.skipIf(SKIP)("tenant isolation (server-queries.ts)", () => {
  // Lazy imports — must be after vi.mock calls above so the mocks apply.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let queries: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dbMod: any;

  const tenantA = {
    clientId: crypto.randomUUID(),
    slug: `iso-a-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    name: "Tenant A (isolation test)",
    customerPhone: "+971500000001",
  };
  const tenantB = {
    clientId: crypto.randomUUID(),
    slug: `iso-b-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    name: "Tenant B (isolation test)",
    customerPhone: "+971500000002",
  };

  function setSession(t: { clientId: string }) {
    mockSession.value = {
      userId: crypto.randomUUID(),
      email: "test@example.com",
      clientId: t.clientId,
      role: "owner",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };
  }

  beforeAll(async () => {
    queries = await import("../src/lib/server-queries");
    dbMod = await import("../src/lib/db");
    const sql = dbMod.db();

    // Seed both tenants in parallel-safe order. Use ON CONFLICT DO NOTHING
    // for tables we share with prior runs of this test.
    for (const t of [tenantA, tenantB]) {
      await sql`
        INSERT INTO clients (id, slug, company_name, contact_name, contact_email, country, status, plan)
        VALUES (${t.clientId}, ${t.slug}, ${t.name}, 'Iso Test', 'iso@test.local', 'AE', 'active', 'starter')
        ON CONFLICT (id) DO NOTHING
      `;
      await sql`
        INSERT INTO business_knowledge (client_id, business_description, brand_voice, crawl_data, faq)
        VALUES (${t.clientId}, ${`desc ${t.slug}`}, ${`voice ${t.slug}`}, ${sql.json({
          kapso_api_key: `kapso_key_${t.slug}`,
          kapso_phone_number_id: `phone_${t.slug}`,
          day_one: { generated_at: new Date().toISOString(), insight: `insight ${t.slug}`, social_posts: [], sample_customer_reply: "", customer_welcome: "" },
        } as never)}, ${sql.json([{ question: `q ${t.slug}`, answer: `a ${t.slug}` }] as never)})
        ON CONFLICT (client_id) DO UPDATE SET crawl_data = EXCLUDED.crawl_data
      `;
      await sql`
        INSERT INTO agent_deployments (client_id, agent_type, status)
        VALUES (${t.clientId}, 'wia', 'active')
        ON CONFLICT (client_id, agent_type) DO NOTHING
      `;
      await sql`
        INSERT INTO activity_logs (client_id, event_type, summary)
        VALUES (${t.clientId}, 'iso_test', ${`act ${t.slug}`})
      `;
      await sql`
        INSERT INTO customer_memory (client_id, phone_number, name, total_messages)
        VALUES (${t.clientId}, ${t.customerPhone}, ${`cust ${t.slug}`}, 1)
        ON CONFLICT (client_id, phone_number) DO NOTHING
      `;
      const memRows = await sql<{ id: string }[]>`
        SELECT id FROM customer_memory WHERE client_id = ${t.clientId} AND phone_number = ${t.customerPhone}
      `;
      if (memRows[0]) {
        await sql`
          INSERT INTO conversation_summaries (client_id, customer_id, started_at, summary)
          VALUES (${t.clientId}, ${memRows[0].id}, NOW(), ${`convo ${t.slug}`})
        `;
      }
      await sql`
        INSERT INTO active_bookings (client_id, customer_phone, status, guest_name)
        VALUES (${t.clientId}, ${t.customerPhone}, 'confirmed', ${`guest ${t.slug}`})
      `;
      await sql`
        INSERT INTO no_show_log (client_id, booking_id, customer_phone, outcome)
        VALUES (${t.clientId}, ${crypto.randomUUID()}, ${t.customerPhone}, 'confirmed')
      `;
      await sql`
        INSERT INTO deposit_requests (client_id, booking_id, customer_phone, amount_minor, status)
        VALUES (${t.clientId}, ${crypto.randomUUID()}, ${t.customerPhone}, 5000, 'requested')
      `;
      await sql`
        INSERT INTO expenses (client_id, vendor, amount_minor, status)
        VALUES (${t.clientId}, ${`vendor ${t.slug}`}, 10000, 'pending_review')
      `;
      await sql`
        INSERT INTO prompt_versions (client_id, version, content, change_description)
        VALUES (${t.clientId}, 1, ${`prompt ${t.slug}`}, 'iso-test')
        ON CONFLICT (client_id, version) DO NOTHING
      `;
      await sql`
        INSERT INTO agent_action_queue (client_id, agent, action_type, target, payload, status)
        VALUES (${t.clientId}, 'wia', 'send_message', ${t.customerPhone}, '{}'::jsonb, 'pending')
      `;
    }
  }, 30_000);

  afterAll(async () => {
    if (!dbMod) return;
    const sql = dbMod.db();
    // Clean up in FK-safe order. clients ON DELETE CASCADE covers most
    // children; the orphan tables (active_bookings, expenses, etc.) use
    // client_id without an FK constraint, so we sweep those manually.
    for (const t of [tenantA, tenantB]) {
      await sql`DELETE FROM agent_action_queue WHERE client_id = ${t.clientId}`;
      await sql`DELETE FROM expenses WHERE client_id = ${t.clientId}`;
      await sql`DELETE FROM deposit_requests WHERE client_id = ${t.clientId}`;
      await sql`DELETE FROM no_show_log WHERE client_id = ${t.clientId}`;
      await sql`DELETE FROM active_bookings WHERE client_id = ${t.clientId}`;
      await sql`DELETE FROM clients WHERE id = ${t.clientId}`;
    }
  }, 30_000);

  // Run the same assertion block for both tenants — symmetry catches a
  // bug where one tenant's data is hard-coded as the "self".
  for (const self of [
    { tag: "A as self, B as other", me: () => tenantA, other: () => tenantB },
    { tag: "B as self, A as other", me: () => tenantB, other: () => tenantA },
  ]) {
    describe(self.tag, () => {
      it("getClient returns only self", async () => {
        setSession(self.me());
        const row = await queries.getClient();
        expect(row?.id).toBe(self.me().clientId);
      });

      it("listAgents returns only self rows", async () => {
        setSession(self.me());
        const rows = await queries.listAgents();
        expect(rows.length).toBeGreaterThan(0);
        for (const r of rows) {
          expect(r.client_id).toBe(self.me().clientId);
          expect(r.client_id).not.toBe(self.other().clientId);
        }
      });

      it("getAgent refuses to return another tenant's agent by id", async () => {
        // Discover the OTHER tenant's agent id under their session…
        setSession(self.other());
        const otherAgents = await queries.listAgents();
        expect(otherAgents.length).toBeGreaterThan(0);
        const otherAgentId = otherAgents[0].id;
        // …then flip to self and ask for it.
        setSession(self.me());
        const leaked = await queries.getAgent(otherAgentId);
        expect(leaked).toBeNull();
      });

      it("listActivity returns only self rows", async () => {
        setSession(self.me());
        const rows = await queries.listActivity();
        expect(rows.length).toBeGreaterThan(0);
        for (const r of rows) {
          expect(r.client_id).toBe(self.me().clientId);
        }
      });

      it("getKnowledge returns only self", async () => {
        setSession(self.me());
        const kb = await queries.getKnowledge();
        expect(kb?.client_id).toBe(self.me().clientId);
        // Cross-check: the brand_voice was seeded with the slug, so a leak
        // would surface as the OTHER tenant's slug appearing here.
        expect(kb?.brand_voice).not.toContain(self.other().slug);
      });

      it("listConversations returns only self rows", async () => {
        setSession(self.me());
        const rows = await queries.listConversations();
        for (const r of rows) {
          expect(r.client_id).toBe(self.me().clientId);
        }
      });

      it("listActiveBookings returns only self rows", async () => {
        setSession(self.me());
        const rows = await queries.listActiveBookings();
        for (const r of rows) {
          expect(r.client_id).toBe(self.me().clientId);
        }
      });

      it("getDayOnePackage returns only self's package", async () => {
        setSession(self.me());
        const pkg = await queries.getDayOnePackage();
        // We seeded `insight` containing the tenant's slug; assert no
        // cross-tenant content slips through.
        expect(pkg?.insight ?? "").not.toContain(self.other().slug);
      });

      it("getKapsoConfig returns only self's keys", async () => {
        setSession(self.me());
        const cfg = await queries.getKapsoConfig();
        expect(cfg.apiKey).toContain(self.me().slug);
        expect(cfg.apiKey ?? "").not.toContain(self.other().slug);
      });

      it("setKapsoConfig only touches self", async () => {
        const stamp = `marker_${crypto.randomUUID().slice(0, 8)}`;
        setSession(self.me());
        const ok = await queries.setKapsoConfig(`${stamp}_${self.me().slug}`, `phone_${self.me().slug}`);
        expect(ok).toBe(true);
        // Self can read back the new value.
        const mine = await queries.getKapsoConfig();
        expect(mine.apiKey).toContain(stamp);
        // Switch sessions — the OTHER tenant's row MUST be untouched.
        setSession(self.other());
        const theirs = await queries.getKapsoConfig();
        expect(theirs.apiKey ?? "").not.toContain(stamp);
      });

      it("getOwnerHubData returns only self's counts", async () => {
        setSession(self.me());
        const data = await queries.getOwnerHubData();
        // Both tenants seeded one row each. If a query forgot client_id,
        // counts here would be ≥ 2.
        expect(data.noShowQueue).toBeLessThanOrEqual(1);
        expect(data.pendingDeposits).toBeLessThanOrEqual(1);
        // expenseCount is bounded the same way.
        expect(data.expenseCount).toBeLessThanOrEqual(1);
      });
    });
  }
});

// Always-on soft-skip notice. Renders ONCE so the test report makes it
// obvious why the suite is empty rather than silently green.
describe("tenant isolation soft-skip notice", () => {
  it(SKIP ? "skipped: DATABASE_URL not set" : "DATABASE_URL set — running real suite", () => {
    if (SKIP) {
      console.warn("[tenant-isolation] DATABASE_URL not set — suite soft-skipped. Set DATABASE_URL to run against agents-postgres.");
    }
    expect(true).toBe(true);
  });
});
