"use client";

import type { AgentDeployment } from "@project-agent/shared-types";
import { AGENT_DISPLAY_NAMES } from "@project-agent/shared-types";

interface AgentStatusCardProps {
  agent: AgentDeployment;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 border-green-200",
  paused: "bg-yellow-100 text-yellow-800 border-yellow-200",
  error: "bg-red-100 text-red-800 border-red-200",
  pending: "bg-gray-100 text-gray-800 border-gray-200",
  deploying: "bg-blue-100 text-blue-800 border-blue-200",
};

const statusDots: Record<string, string> = {
  active: "bg-green-500",
  paused: "bg-yellow-500",
  error: "bg-red-500",
  pending: "bg-gray-400",
  deploying: "bg-blue-500 animate-pulse",
};

export function AgentStatusCard({ agent }: AgentStatusCardProps) {
  const displayName =
    AGENT_DISPLAY_NAMES[agent.agent_type] || agent.agent_type;
  const colorClass = statusColors[agent.status] || statusColors.pending;
  const dotClass = statusDots[agent.status] || statusDots.pending;

  return (
    <div className={`rounded-lg border p-4 ${colorClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
          <h3 className="font-semibold text-sm">{displayName}</h3>
        </div>
        <span className="text-xs font-medium uppercase">{agent.status}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {agent.metrics.messages_handled !== undefined && (
          <div>
            <span className="opacity-60">Messages</span>
            <p className="font-semibold text-lg">
              {agent.metrics.messages_handled}
            </p>
          </div>
        )}
        {agent.metrics.leads_qualified !== undefined && (
          <div>
            <span className="opacity-60">Leads Qualified</span>
            <p className="font-semibold text-lg">
              {agent.metrics.leads_qualified}
            </p>
          </div>
        )}
        {agent.metrics.content_published !== undefined && (
          <div>
            <span className="opacity-60">Posts Published</span>
            <p className="font-semibold text-lg">
              {agent.metrics.content_published}
            </p>
          </div>
        )}
        {agent.metrics.cvs_screened !== undefined && (
          <div>
            <span className="opacity-60">CVs Screened</span>
            <p className="font-semibold text-lg">
              {agent.metrics.cvs_screened}
            </p>
          </div>
        )}
        {agent.metrics.reports_generated !== undefined && (
          <div>
            <span className="opacity-60">Reports</span>
            <p className="font-semibold text-lg">
              {agent.metrics.reports_generated}
            </p>
          </div>
        )}
      </div>

      {agent.metrics.last_active && (
        <p className="mt-2 text-xs opacity-50">
          Last active: {new Date(agent.metrics.last_active).toLocaleString()}
        </p>
      )}
    </div>
  );
}
