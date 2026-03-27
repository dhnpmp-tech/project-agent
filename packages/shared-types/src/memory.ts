export interface CustomerMemory {
  id: string;
  client_id: string;
  phone_number: string;
  name?: string;
  email?: string;
  company?: string;
  language: string;
  first_contact: string;
  last_contact: string;
  total_conversations: number;
  total_messages: number;
  profile_summary?: string;
  preferences: Record<string, unknown>;
  key_events: {
    date: string;
    type: string;
    summary: string;
  }[];
  lead_score?: number;
  lead_status?: "new" | "qualified" | "nurturing" | "converted" | "lost";
  lifetime_value: number;
  tags: string[];
  avg_sentiment?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationSummary {
  id: string;
  client_id: string;
  customer_id: string;
  started_at: string;
  ended_at?: string;
  message_count: number;
  channel: string;
  summary: string;
  outcomes: string[];
  sentiment?: number;
  topics: string[];
  created_at: string;
}
