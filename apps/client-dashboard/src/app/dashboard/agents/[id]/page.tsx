import { createServerSupabase } from "@/lib/supabase-server";
import { AGENT_DISPLAY_NAMES, type AgentDeployment, type ActivityLog } from "@project-agent/shared-types";
import { notFound } from "next/navigation";
import { AgentConfigEditor } from "@/components/agent-config-editor";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  pending: "bg-gray-100 text-gray-800",
  deploying: "bg-blue-100 text-blue-800",
};

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data: agent } = await supabase
    .from("agent_deployments")
    .select("*")
    .eq("id", id)
    .single();

  if (!agent) notFound();

  const typedAgent = agent as AgentDeployment;
  const displayName = AGENT_DISPLAY_NAMES[typedAgent.agent_type] || typedAgent.agent_type;
  const colorClass = statusColors[typedAgent.status] || statusColors.pending;

  // Fetch recent activity for this agent
  const { data: activities } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("agent_deployment_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <a href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
              Dashboard
            </a>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600">Agent</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
              <span className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
                {typedAgent.status}
              </span>
            </div>
            <AgentConfigEditor agentId={id} currentStatus={typedAgent.status} />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Metrics */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard label="Messages" value={typedAgent.metrics.messages_handled} />
          <MetricCard label="Leads Qualified" value={typedAgent.metrics.leads_qualified} />
          <MetricCard label="Meetings Booked" value={typedAgent.metrics.meetings_booked} />
          <MetricCard label="Content Published" value={typedAgent.metrics.content_published} />
          <MetricCard label="CVs Screened" value={typedAgent.metrics.cvs_screened} />
          <MetricCard label="Reports Generated" value={typedAgent.metrics.reports_generated} />
        </section>

        {/* Config */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Configuration</h2>
          <div className="bg-gray-50 rounded-md p-4 overflow-x-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(typedAgent.config, null, 2)}
            </pre>
          </div>
        </section>

        {/* Deployment info */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Deployment</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Agent ID</dt>
            <dd className="text-gray-900 font-mono text-xs">{typedAgent.id}</dd>
            <dt className="text-gray-500">Type</dt>
            <dd className="text-gray-900">{typedAgent.agent_type}</dd>
            {typedAgent.workflow_id && (
              <>
                <dt className="text-gray-500">Workflow ID</dt>
                <dd className="text-gray-900 font-mono text-xs">{typedAgent.workflow_id}</dd>
              </>
            )}
            <dt className="text-gray-500">Created</dt>
            <dd className="text-gray-900">{new Date(typedAgent.created_at).toLocaleString()}</dd>
            {typedAgent.deployed_at && (
              <>
                <dt className="text-gray-500">Deployed</dt>
                <dd className="text-gray-900">{new Date(typedAgent.deployed_at).toLocaleString()}</dd>
              </>
            )}
            {typedAgent.metrics.last_active && (
              <>
                <dt className="text-gray-500">Last Active</dt>
                <dd className="text-gray-900">{new Date(typedAgent.metrics.last_active).toLocaleString()}</dd>
              </>
            )}
          </dl>
        </section>

        {/* Recent activity */}
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Recent Activity ({(activities as ActivityLog[] | null)?.length || 0})
          </h2>
          {(activities as ActivityLog[] | null)?.length ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(activities as ActivityLog[]).map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-md bg-gray-50 p-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">
                      {a.summary || a.event_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No activity recorded yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value?: number }) {
  if (value === undefined) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
