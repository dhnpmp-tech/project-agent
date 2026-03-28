"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";

interface Props {
  agentId: string;
  currentStatus: string;
}

export function AgentConfigEditor({ agentId, currentStatus }: Props) {
  const [loading, setLoading] = useState(false);

  async function toggleStatus() {
    setLoading(true);
    const supabase = createClient();
    const newStatus = currentStatus === "active" ? "paused" : "active";

    await supabase
      .from("agent_deployments")
      .update({ status: newStatus })
      .eq("id", agentId);

    window.location.reload();
  }

  const isActive = currentStatus === "active";

  return (
    <div className="flex gap-2">
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
    </div>
  );
}
