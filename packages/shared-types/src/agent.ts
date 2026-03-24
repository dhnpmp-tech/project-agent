export type AgentType = "wia" | "ai_sdr" | "cea" | "hrsa" | "fia";

export type AgentDeploymentStatus =
  | "pending"
  | "deploying"
  | "active"
  | "paused"
  | "error";

export interface AgentDeployment {
  id: string;
  client_id: string;
  agent_type: AgentType;
  workflow_id?: string;
  status: AgentDeploymentStatus;
  config: Record<string, unknown>;
  metrics: AgentMetrics;
  deployed_at?: string;
  created_at: string;
}

export interface AgentMetrics {
  messages_handled?: number;
  leads_qualified?: number;
  meetings_booked?: number;
  content_published?: number;
  cvs_screened?: number;
  reports_generated?: number;
  last_active?: string;
}

export interface AgentConfigSchema {
  required: string[];
  optional: string[];
}

export const AGENT_DISPLAY_NAMES: Record<AgentType, string> = {
  wia: "WhatsApp Intelligence Agent",
  ai_sdr: "AI Sales Development Representative",
  cea: "Content Engine Agent",
  hrsa: "HR Screening & Scheduling Agent",
  fia: "Financial Intelligence Agent",
};
