// Shared server-only query helpers. Each helper resolves the caller's
// client_id from the JWT session, runs a typed SQL query against
// agents-postgres, and returns a degraded default on error so a single
// DB hiccup doesn't crash the page.
//
// Use these from Server Components and route handlers instead of
// re-implementing the session+filter dance per file.

import "server-only";
import { db } from "./db";
import { getServerSession } from "./session";

// ---------- Tenant identity ------------------------------------------------

export async function getClient(): Promise<{
  id: string;
  company_name: string | null;
  company_name_ar: string | null;
  plan: string | null;
  status: string | null;
  country: string | null;
} | null> {
  const session = await getServerSession();
  if (!session?.clientId) return null;
  try {
    const rows = await db()<{
      id: string;
      company_name: string | null;
      company_name_ar: string | null;
      plan: string | null;
      status: string | null;
      country: string | null;
    }[]>`
      SELECT id, company_name, company_name_ar, plan, status, country
      FROM clients
      WHERE id = ${session.clientId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (e) {
    console.error("[server-queries] getClient", e);
    return null;
  }
}

// ---------- Agents --------------------------------------------------------

export interface AgentRow {
  id: string;
  client_id: string;
  agent_type: string;
  status: string;
  workflow_id: string | null;
  config: Record<string, unknown>;
  metrics: Record<string, unknown>;
  deployed_at: string | null;
  created_at: string;
}

export async function listAgents(): Promise<AgentRow[]> {
  const session = await getServerSession();
  if (!session?.clientId) return [];
  try {
    return await db()<AgentRow[]>`
      SELECT * FROM agent_deployments
      WHERE client_id = ${session.clientId}
      ORDER BY created_at DESC
    `;
  } catch (e) {
    console.error("[server-queries] listAgents", e);
    return [];
  }
}

export async function getAgent(id: string): Promise<AgentRow | null> {
  const session = await getServerSession();
  if (!session?.clientId) return null;
  try {
    const rows = await db()<AgentRow[]>`
      SELECT * FROM agent_deployments
      WHERE id = ${id} AND client_id = ${session.clientId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (e) {
    console.error("[server-queries] getAgent", e);
    return null;
  }
}

// ---------- Activity log --------------------------------------------------

export interface ActivityRow {
  id: string;
  client_id: string;
  agent_deployment_id: string | null;
  event_type: string;
  summary: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export async function listActivity(limit = 50): Promise<ActivityRow[]> {
  const session = await getServerSession();
  if (!session?.clientId) return [];
  try {
    return await db()<ActivityRow[]>`
      SELECT * FROM activity_logs
      WHERE client_id = ${session.clientId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  } catch (e) {
    console.error("[server-queries] listActivity", e);
    return [];
  }
}

// ---------- Business knowledge --------------------------------------------

export interface KnowledgeRow {
  id: string;
  client_id: string;
  website_url: string | null;
  business_description: string | null;
  brand_voice: string | null;
  business_hours: string | null;
  industry_keywords: string[];
  contact_info: Record<string, unknown>;
  services: string[];
  faq: { question: string; answer: string }[];
  team_members: { name: string; role: string }[];
  social_profiles: Record<string, unknown>;
  crawl_data: Record<string, unknown>;
}

export async function getKnowledge(): Promise<KnowledgeRow | null> {
  const session = await getServerSession();
  if (!session?.clientId) return null;
  try {
    const rows = await db()<KnowledgeRow[]>`
      SELECT * FROM business_knowledge
      WHERE client_id = ${session.clientId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (e) {
    console.error("[server-queries] getKnowledge", e);
    return null;
  }
}

// ---------- Conversations / messages --------------------------------------

export interface ConversationSummaryRow {
  id: string;
  client_id: string;
  customer_phone: string;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  sentiment: number | null;
  summary: string | null;
}

export async function listConversations(limit = 50): Promise<ConversationSummaryRow[]> {
  const session = await getServerSession();
  if (!session?.clientId) return [];
  try {
    return await db()<ConversationSummaryRow[]>`
      SELECT * FROM conversation_summaries
      WHERE client_id = ${session.clientId}
      ORDER BY started_at DESC
      LIMIT ${limit}
    `;
  } catch (e) {
    console.error("[server-queries] listConversations", e);
    return [];
  }
}

// ---------- Bookings ------------------------------------------------------

export interface BookingRow {
  id: string;
  client_id: string;
  customer_phone: string;
  status: string;
  party_size: number | null;
  booking_date: string | null;
  booking_time: string | null;
  notes: string | null;
  last_updated_at: string;
  created_at: string;
}

export async function listActiveBookings(): Promise<BookingRow[]> {
  const session = await getServerSession();
  if (!session?.clientId) return [];
  try {
    return await db()<BookingRow[]>`
      SELECT * FROM active_bookings
      WHERE client_id = ${session.clientId}
        AND status <> 'cancelled'
      ORDER BY booking_date NULLS LAST, booking_time NULLS LAST
      LIMIT 100
    `;
  } catch (e) {
    console.error("[server-queries] listActiveBookings", e);
    return [];
  }
}

// ---------- Owner hub aggregates ------------------------------------------

export interface OwnerHubData {
  noShowQueue: number;
  pendingDeposits: number;
  expensesThisWeek: number;
  expenseCount: number;
  briefDeliveredToday: boolean;
  rulesCount: number;
}

export async function getOwnerHubData(): Promise<OwnerHubData> {
  const session = await getServerSession();
  const empty: OwnerHubData = {
    noShowQueue: 0,
    pendingDeposits: 0,
    expensesThisWeek: 0,
    expenseCount: 0,
    briefDeliveredToday: false,
    rulesCount: 0,
  };
  if (!session?.clientId) return empty;
  const cid = session.clientId;
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const [
      noShow,
      deposits,
      expenseAgg,
      brief,
      rules,
    ] = await Promise.all([
      db()<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM no_show_log
        WHERE client_id = ${cid} AND action_taken IS NULL
      `,
      db()<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM deposit_requests
        WHERE client_id = ${cid} AND status = 'pending'
      `,
      db()<{ count: string; total: string | null }[]>`
        SELECT COUNT(*)::text AS count, COALESCE(SUM(amount), 0)::text AS total
        FROM expenses
        WHERE client_id = ${cid} AND created_at >= ${weekAgo}
      `,
      db()<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM activity_logs
        WHERE client_id = ${cid}
          AND event_type = 'daily_brief_sent'
          AND created_at::date = ${today}::date
      `,
      db()<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM prompt_versions
        WHERE client_id = ${cid} AND status = 'active'
      `,
    ]);
    return {
      noShowQueue: Number(noShow[0]?.count ?? 0),
      pendingDeposits: Number(deposits[0]?.count ?? 0),
      expensesThisWeek: Number(expenseAgg[0]?.total ?? 0),
      expenseCount: Number(expenseAgg[0]?.count ?? 0),
      briefDeliveredToday: Number(brief[0]?.count ?? 0) > 0,
      rulesCount: Number(rules[0]?.count ?? 0),
    };
  } catch (e) {
    console.error("[server-queries] getOwnerHubData", e);
    return empty;
  }
}
