// Real-data fetcher for the /dashboard page.
// All queries hit Supabase server-side and are filtered by RLS to the
// signed-in client's own data. Each count is wrapped in safeCount so a
// missing table or transient error degrades the stat to 0 instead of
// crashing the page.

import { createServerSupabase } from "./supabase-server";

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
}

type CountResult = { count: number | null; error: unknown };

async function safeCount(p: PromiseLike<CountResult>): Promise<number> {
  try {
    const { count, error } = await p;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const supabase = await createServerSupabase();

  const today = new Date().toISOString().slice(0, 10);
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Run all reads in parallel. RLS filters each one to the caller's client_id.
  const [
    clientRes,
    openConversations,
    todayBookings,
    ownerQueue,
    sentimentRes,
    totalCustomers,
    totalFacts,
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("company_name, plan, status")
      .maybeSingle(),
    safeCount(
      supabase
        .from("conversation_summaries")
        .select("id", { count: "exact", head: true })
        .gte("started_at", last24h)
        .is("ended_at", null),
    ),
    safeCount(
      supabase
        .from("active_bookings")
        .select("id", { count: "exact", head: true })
        .eq("booking_date", today)
        .neq("status", "cancelled"),
    ),
    safeCount(
      supabase
        .from("scheduled_actions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ),
    supabase
      .from("customer_memory")
      .select("avg_sentiment")
      .not("avg_sentiment", "is", null),
    safeCount(
      supabase
        .from("customer_memory")
        .select("id", { count: "exact", head: true }),
    ),
    safeCount(
      supabase
        .from("vault_notes")
        .select("id", { count: "exact", head: true }),
    ),
  ]);

  // Average the per-customer avg_sentiment values into a single dashboard stat.
  let avgSentiment: number | null = null;
  if (!sentimentRes.error) {
    const rows = (sentimentRes.data as { avg_sentiment: number | null }[] | null) ?? [];
    const valid = rows
      .map((r) => r.avg_sentiment)
      .filter((v): v is number => typeof v === "number");
    if (valid.length > 0) {
      avgSentiment = valid.reduce((a, b) => a + b, 0) / valid.length;
    }
  }

  return {
    client: clientRes.data ?? null,
    stats: {
      openConversations,
      todayBookings,
      ownerQueue,
      avgSentiment,
    },
    brain: {
      totalCustomers,
      totalFacts,
    },
  };
}
