"use client";

import { useState } from "react";

interface Props {
  agentId: string;
  currentStatus: string;
}

/**
 * Pause/resume an agent_deployment from the agent detail page.
 *
 * Calls PATCH /api/agents/[id]/status, which scopes to the caller's
 * client_id via the JWT cookie. Replaces the old Supabase client-side
 * `.update({ status })` call.
 */
export function AgentConfigEditor({ agentId, currentStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleStatus() {
    setLoading(true);
    setError(null);
    const newStatus = currentStatus === "active" ? "paused" : "active";

    try {
      const res = await fetch(`/api/agents/${agentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `Failed (${res.status})`);
        setLoading(false);
        return;
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "network_error");
      setLoading(false);
    }
  }

  const isActive = currentStatus === "active";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggleStatus}
        disabled={loading || currentStatus === "pending" || currentStatus === "deploying"}
        className={`rounded-md px-4 py-2 text-sm font-medium ${
          isActive
            ? "border border-yellow-300 text-yellow-700 hover:bg-yellow-50"
            : "border border-green-300 text-green-700 hover:bg-green-50"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? "..." : isActive ? "Pause" : "Resume"}
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
