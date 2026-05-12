// Real-data fetcher for the /dashboard page.
// All queries go directly to Postgres via postgres-js over SSL.
// Filtered explicitly by client_id from the signed-in user's JWT.
// Each query is wrapped so a transient DB error degrades to a safe
// default instead of crashing the page.

import { db } from "./db";
import { getServerSession } from "./session";
import type { AgentDeployment, ActivityLog } from "@project-agent/shared-types";

export interface DashboardClient {
  company_name: string | null;
  plan: string | null;
  status: string | null;
}

export interface DashboardStats {
  openConversations: number;
  todayBookings: number;
  ownerQueue: number;
  avgSentiment: number | null;
}

export interface DashboardBrain {
  totalCustomers: number;
  totalFacts: number;
}

export interface DashboardData {
  client: DashboardClient | null;
  stats: DashboardStats;
  brain: DashboardBrain;
  agents: AgentDeployment[];
  activities: ActivityLog[];
}

const EMPTY_DATA: DashboardData = {
  client: null,
  stats: {
    openConversations: 0,
    todayBookings: 0,
    ownerQueue: 0,
    avgSentiment: null,
  },
  brain: { totalCustomers: 0, totalFacts: 0 },
  agents: [],
  activities: [],
};

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.error("[dashboard-queries]", e);
    return fallback;
  }
}

async function countQuery(query: Promise<{ count: string }[]>): Promise<number> {
  const fallback = [{ count: "0" }];
  const rows = await safe(query, fallback);
  return Number(rows[0]?.count ?? 0);
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const session = await getServerSession();
  if (!session?.clientId) {
    return EMPTY_DATA;
  }
  const cid = session.clientId;

  const today = new Date().toISOString().slice(0, 10);
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    clientRows,
    openConversations,
    todayBookings,
    ownerQueue,
    sentimentRows,
    totalCustomers,
    totalFacts,
    agents,
    activities,
  ] = await Promise.all([
    safe(
      db()<DashboardClient[]>`
        SELECT company_name, plan, status
        FROM clients
        WHERE id = ${cid}
        LIMIT 1
      `,
      [] as DashboardClient[]
    ),
    countQuery(db()<{ count: string }[]>`
      SELECT COUNT(*)::text AS count
      FROM conversation_summaries
      WHERE client_id = ${cid}
        AND started_at >= ${last24h}
        AND ended_at IS NULL
    `),
    countQuery(db()<{ count: string }[]>`
      SELECT COUNT(*)::text AS count
      FROM active_bookings
      WHERE client_id = ${cid}
        AND booking_date = ${today}
        AND status <> 'cancelled'
    `),
    countQuery(db()<{ count: string }[]>`
      SELECT COUNT(*)::text AS count
      FROM scheduled_actions
      WHERE client_id = ${cid}
        AND status = 'pending'
    `),
    safe(
      db()<{ avg_sentiment: number | null }[]>`
        SELECT avg_sentiment
        FROM customer_memory
        WHERE client_id = ${cid}
          AND avg_sentiment IS NOT NULL
      `,
      [] as { avg_sentiment: number | null }[]
    ),
    countQuery(db()<{ count: string }[]>`
      SELECT COUNT(*)::text AS count
      FROM customer_memory
      WHERE client_id = ${cid}
    `),
    countQuery(db()<{ count: string }[]>`
      SELECT COUNT(*)::text AS count
      FROM vault_notes
      WHERE client_id = ${cid}
    `),
    safe(
      db()<AgentDeployment[]>`
        SELECT * FROM agent_deployments
        WHERE client_id = ${cid}
        ORDER BY created_at DESC
      `,
      [] as AgentDeployment[]
    ),
    safe(
      db()<ActivityLog[]>`
        SELECT * FROM activity_logs
        WHERE client_id = ${cid}
        ORDER BY created_at DESC
        LIMIT 10
      `,
      [] as ActivityLog[]
    ),
  ]);

  const valid = sentimentRows
    .map((r) => r.avg_sentiment)
    .filter((v): v is number => typeof v === "number");
  const avgSentiment =
    valid.length > 0
      ? valid.reduce((a, b) => a + b, 0) / valid.length
      : null;

  return {
    client: clientRows[0] ?? null,
    stats: { openConversations, todayBookings, ownerQueue, avgSentiment },
    brain: { totalCustomers, totalFacts },
    agents,
    activities,
  };
}
