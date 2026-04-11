import { createServerSupabase } from "@/lib/supabase-server";
import { AgentStatusCard } from "@/components/agent-status-card";
import { ActivityFeed } from "@/components/activity-feed";
import { SessionRefresh } from "@/components/session-refresh";
import { NeuralBrain } from "@/components/neural-brain";
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
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/dashboard/whatsapp"
              className="rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100"
            >
              WhatsApp
            </a>
            <a
              href="/dashboard/reports"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reports
            </a>
            <a
              href="/dashboard/sales"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sales
            </a>
            <a
              href="/dashboard/content"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Content
            </a>
            <a
              href="/dashboard/google-business"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Google Business
            </a>
            <a
              href="/dashboard/channels"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Channels
            </a>
            <a
              href="/dashboard/widget"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Widget
            </a>
            <a
              href="/dashboard/booking-settings"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Booking Settings
            </a>
            <a
              href="/dashboard/support"
              className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Request a Change
            </a>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
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

        {/* AI Brain */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Your AI Brain
          </h2>
          <NeuralBrain
            totalCustomers={12}
            totalFacts={42}
            isLoading={false}
          />
        </section>

        {/* Sales, Content & Tools */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Sales, Content & Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a
              href="/dashboard/reports"
              className="group rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Reports</h3>
              </div>
              <p className="text-sm text-gray-500">
                Analytics, conversion funnels, AI performance, and channel insights.
              </p>
            </a>
            <a
              href="/dashboard/sales"
              className="group rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-100">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Sales Rep</h3>
              </div>
              <p className="text-sm text-gray-500">
                Manage your AI sales pipeline, leads, and outreach campaigns.
              </p>
            </a>
            <a
              href="/dashboard/content"
              className="group rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-100">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Content Engine</h3>
              </div>
              <p className="text-sm text-gray-500">
                Generate and schedule social media posts, blogs, and newsletters.
              </p>
            </a>
            <a
              href="/dashboard/google-business"
              className="group rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-100">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Google Business</h3>
              </div>
              <p className="text-sm text-gray-500">
                Optimize your Google profile, manage reviews, and boost local SEO.
              </p>
            </a>
            <a
              href="/dashboard/channels"
              className="group rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 group-hover:bg-violet-100">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Channels</h3>
              </div>
              <p className="text-sm text-gray-500">
                Manage WhatsApp, Widget, Telegram, and Instagram connections.
              </p>
            </a>
            <a
              href="/dashboard/widget"
              className="group rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-100">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Widget</h3>
              </div>
              <p className="text-sm text-gray-500">
                Customize and embed your chat widget on any website.
              </p>
            </a>
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
