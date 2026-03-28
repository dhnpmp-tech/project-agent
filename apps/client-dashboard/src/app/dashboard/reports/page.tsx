import { createServerSupabase } from "@/lib/supabase-server";
import type { AgentDeployment, ActivityLog } from "@project-agent/shared-types";
import { AGENT_DISPLAY_NAMES } from "@project-agent/shared-types";

export default async function ReportsPage() {
  const supabase = await createServerSupabase();

  const { data: agents } = await supabase
    .from("agent_deployments")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: recentActivity } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const typedAgents = (agents as AgentDeployment[]) || [];
  const typedActivity = (recentActivity as ActivityLog[]) || [];

  // Compute stats
  const totalMessages = typedAgents.reduce(
    (sum, a) => sum + (a.metrics.messages_handled || 0),
    0
  );
  const totalLeads = typedAgents.reduce(
    (sum, a) => sum + (a.metrics.leads_qualified || 0),
    0
  );
  const totalMeetings = typedAgents.reduce(
    (sum, a) => sum + (a.metrics.meetings_booked || 0),
    0
  );
  const totalContent = typedAgents.reduce(
    (sum, a) => sum + (a.metrics.content_published || 0),
    0
  );
  const totalCVs = typedAgents.reduce(
    (sum, a) => sum + (a.metrics.cvs_screened || 0),
    0
  );
  const totalReports = typedAgents.reduce(
    (sum, a) => sum + (a.metrics.reports_generated || 0),
    0
  );

  const activeAgents = typedAgents.filter((a) => a.status === "active").length;

  // Activity by event type
  const eventCounts: Record<string, number> = {};
  typedActivity.forEach((a) => {
    eventCounts[a.event_type] = (eventCounts[a.event_type] || 0) + 1;
  });

  // Activity by day (last 7 days)
  const last7Days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const count = typedActivity.filter(
      (a) => a.created_at.split("T")[0] === dateStr
    ).length;
    last7Days.push({
      date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      count,
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <a href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
              Dashboard
            </a>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600">Reports</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Overview stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Active Agents" value={activeAgents} total={typedAgents.length} suffix={`/ ${typedAgents.length}`} />
          <StatCard label="Messages Handled" value={totalMessages} />
          <StatCard label="Leads Qualified" value={totalLeads} />
          <StatCard label="Meetings Booked" value={totalMeetings} />
          <StatCard label="Content Published" value={totalContent} />
          <StatCard label="CVs Screened" value={totalCVs} />
          <StatCard label="Reports Generated" value={totalReports} />
          <StatCard label="Events (Last 50)" value={typedActivity.length} />
        </section>

        {/* Activity chart (simple bar) */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Activity — Last 7 Days</h2>
          <div className="flex items-end gap-2 h-32">
            {last7Days.map((day) => {
              const maxCount = Math.max(...last7Days.map((d) => d.count), 1);
              const height = Math.max((day.count / maxCount) * 100, 4);
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500 font-medium">{day.count}</span>
                  <div
                    className="w-full bg-brand-500 rounded-t-sm"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-gray-400 truncate w-full text-center">
                    {day.date.split(",")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Per-agent breakdown */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Agent Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">Agent</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Status</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Messages</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Leads</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Meetings</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {typedAgents.map((agent) => (
                  <tr key={agent.id} className="border-b border-gray-50">
                    <td className="py-2">
                      <a href={`/dashboard/agents/${agent.id}`} className="text-brand-600 hover:underline font-medium">
                        {AGENT_DISPLAY_NAMES[agent.agent_type]}
                      </a>
                    </td>
                    <td className="py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        agent.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {agent.status}
                      </span>
                    </td>
                    <td className="py-2 text-right text-gray-700">{agent.metrics.messages_handled || "—"}</td>
                    <td className="py-2 text-right text-gray-700">{agent.metrics.leads_qualified || "—"}</td>
                    <td className="py-2 text-right text-gray-700">{agent.metrics.meetings_booked || "—"}</td>
                    <td className="py-2 text-right text-gray-400 text-xs">
                      {agent.metrics.last_active
                        ? new Date(agent.metrics.last_active).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Event type breakdown */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Events by Type</h2>
          {Object.keys(eventCounts).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(eventCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const maxCount = Math.max(...Object.values(eventCounts));
                  const width = (count / maxCount) * 100;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-40 truncate">
                        {type.replace(/_/g, " ")}
                      </span>
                      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-medium w-8 text-right">{count}</span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No events recorded yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  total,
  suffix,
}: {
  label: string;
  value: number;
  total?: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-2xl font-bold text-gray-900">
        {value.toLocaleString()}
        {suffix && <span className="text-sm text-gray-400 font-normal ml-1">{suffix}</span>}
      </p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
