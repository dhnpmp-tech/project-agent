"use client";

import type { ActivityLog } from "@project-agent/shared-types";

interface ActivityFeedProps {
  activities: ActivityLog[];
}

const eventIcons: Record<string, string> = {
  message_received: "💬",
  message_sent: "📤",
  lead_scored: "🎯",
  lead_qualified: "✅",
  meeting_booked: "📅",
  content_published: "📝",
  cv_screened: "📄",
  candidate_advanced: "👤",
  report_generated: "📊",
  anomaly_detected: "⚠️",
  escalation_triggered: "🔔",
  agent_error: "❌",
  agent_started: "▶️",
  agent_stopped: "⏹️",
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-3"
        >
          <span className="text-lg">
            {eventIcons[activity.event_type] || "📌"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {activity.summary || activity.event_type.replace(/_/g, " ")}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(activity.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
