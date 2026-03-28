import { createServerSupabase } from "@/lib/supabase-server";
import { AgentStatusCard } from "@/components/agent-status-card";
import { ActivityFeed } from "@/components/activity-feed";
import { SessionRefresh } from "@/components/session-refresh";
import type { AgentDeployment, ActivityLog } from "@project-agent/shared-types";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();

  // In production, these queries are filtered by client_id via RLS
  const { data: agents } = await supabase
    .from("agent_deployments")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: activities } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: client } = await supabase
    .from("clients")
    .select("company_name, plan, status")
    .single();

  // If no client data found, the JWT may be stale — trigger a client-side refresh
  const hasData = !!client;

  return (
    <div className="min-h-screen bg-gray-50">
      <SessionRefresh hasData={hasData} />
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {client?.company_name || "Dashboard"}
            </h1>
            <p className="text-sm text-gray-500">
              Plan: {client?.plan || "—"} | Status: {client?.status || "—"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/dashboard/whatsapp"
              className="rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
            >
              WhatsApp
            </a>
            <a
              href="/dashboard/reports"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reports
            </a>
            <a
              href="/dashboard/integrations"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Integrations
            </a>
            <a
              href="/dashboard/support"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Request a Change
            </a>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Agent Status Cards */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Your Agents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(agents as AgentDeployment[] | null)?.map((agent) => (
              <AgentStatusCard key={agent.id} agent={agent} />
            )) || (
              <p className="text-gray-400 col-span-full text-center py-8">
                No agents deployed yet
              </p>
            )}
          </div>
        </section>

        {/* Activity Feed */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h2>
            <a
              href="/dashboard/activity"
              className="text-sm text-brand-600 hover:underline"
            >
              View all
            </a>
          </div>
          <ActivityFeed activities={(activities as ActivityLog[]) || []} />
        </section>
      </main>
    </div>
  );
}
