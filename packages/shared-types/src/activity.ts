export type ActivityEventType =
  | "message_received"
  | "message_sent"
  | "lead_scored"
  | "lead_qualified"
  | "meeting_booked"
  | "content_published"
  | "cv_screened"
  | "candidate_advanced"
  | "candidate_rejected"
  | "report_generated"
  | "anomaly_detected"
  | "escalation_triggered"
  | "agent_error"
  | "agent_started"
  | "agent_stopped";

export interface ActivityLog {
  id: number;
  client_id: string;
  agent_deployment_id?: string;
  event_type: ActivityEventType;
  summary?: string;
  payload: Record<string, unknown>;
  created_at: string;
}
