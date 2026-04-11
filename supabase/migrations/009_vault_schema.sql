-- Phase 0: AI Brain Vault Schema
-- Run this in Supabase SQL Editor (https://sybzqktipimbmujtowoz.supabase.co)

-- 1. Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Vault Notes — the AI's brain (Obsidian-style markdown notes)
CREATE TABLE IF NOT EXISTS vault_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  path TEXT NOT NULL,                          -- "products/ethiopian.md"
  title TEXT NOT NULL,                         -- "Ethiopian Yirgacheffe"
  content TEXT NOT NULL DEFAULT '',            -- full markdown with [[links]]
  tags TEXT[] DEFAULT '{}',                    -- ["product", "coffee", "bestseller"]
  links_to UUID[] DEFAULT '{}',               -- IDs of linked vault notes
  embedding vector(1536),                     -- pgvector for semantic search
  updated_by TEXT DEFAULT 'system',           -- "agent" | "owner" | "system" | "self_improvement"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, path)
);

-- 3. Conversation Messages — full thread storage (before Zep takes over)
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',           -- "text" | "image" | "voice" | "document"
  metadata JSONB DEFAULT '{}',                -- kapso message ID, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Outcome Tracking — tag every conversation with what happened
CREATE TABLE IF NOT EXISTS outcome_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  conversation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  outcome TEXT NOT NULL CHECK (outcome IN (
    'ordered', 'booked', 'qualified', 'ghosted',
    'complained', 'escalated', 'info_only', 'returning'
  )),
  revenue_aed DECIMAL(10,2),                  -- if order/booking, how much
  notes TEXT,                                  -- AI's analysis of what happened
  messages_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Scheduled Actions — follow-ups, reminders, proactive outreach
CREATE TABLE IF NOT EXISTS scheduled_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  customer_phone TEXT,                         -- NULL for business-level actions
  agent TEXT NOT NULL,                         -- "whatsapp_agent" | "sales_agent" | etc.
  action_type TEXT NOT NULL,                   -- "reorder_reminder" | "follow_up" | "review_response"
  payload JSONB NOT NULL DEFAULT '{}',         -- action details
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'cancelled', 'failed')),
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Research Queue — pending research tasks for the AI
CREATE TABLE IF NOT EXISTS research_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  research_type TEXT NOT NULL,                 -- "competitor" | "review" | "demand_signal" | "owner_question"
  query TEXT NOT NULL,                         -- what to research
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  result JSONB,                                -- research findings
  vault_note_id UUID REFERENCES vault_notes(id), -- where the result was stored
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 7. Prompt Versions — git-style history of system prompts per business
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  version INT NOT NULL,
  content TEXT NOT NULL,                        -- the full system prompt
  eval_pass_rate DECIMAL(5,2),                 -- % pass rate on eval suite
  change_description TEXT,                     -- what changed and why
  created_by TEXT DEFAULT 'system',            -- "karpathy_loop" | "manual" | "onboarding"
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, version)
);

-- 8. Eval Suites — test cases for the Karpathy Loop
CREATE TABLE IF NOT EXISTS eval_suites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  test_cases JSONB NOT NULL DEFAULT '[]',      -- array of {input, expected_outcome, criteria}
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Customer Locks — prevents agent message collisions
CREATE TABLE IF NOT EXISTS customer_locks (
  customer_phone TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  locked_by TEXT NOT NULL,                     -- "whatsapp_agent" | "sales_agent" | etc.
  locked_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  conversation_id TEXT,                        -- Zep session ID if active
  PRIMARY KEY (client_id, customer_phone)
);

-- 10. Agent Action Queue — coordination between agents
CREATE TABLE IF NOT EXISTS agent_action_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target TEXT NOT NULL,                        -- customer phone, "instagram", vault note path
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'blocked', 'executed')),
  blocked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  executed_at TIMESTAMPTZ
);

-- === INDEXES ===

-- Vault: semantic search
CREATE INDEX IF NOT EXISTS vault_notes_embedding_idx
  ON vault_notes USING hnsw (embedding vector_cosine_ops);

-- Vault: lookup by client + path
CREATE INDEX IF NOT EXISTS vault_notes_client_path_idx
  ON vault_notes(client_id, path);

-- Vault: tag search
CREATE INDEX IF NOT EXISTS vault_notes_tags_idx
  ON vault_notes USING gin(tags);

-- Messages: lookup by customer
CREATE INDEX IF NOT EXISTS conv_messages_customer_idx
  ON conversation_messages(client_id, customer_phone, created_at DESC);

-- Outcomes: analysis queries
CREATE INDEX IF NOT EXISTS outcome_tracking_client_date_idx
  ON outcome_tracking(client_id, conversation_date DESC);

-- Scheduled actions: find due actions
CREATE INDEX IF NOT EXISTS scheduled_actions_due_idx
  ON scheduled_actions(status, scheduled_for)
  WHERE status = 'pending';

-- Customer locks: auto-expire check
CREATE INDEX IF NOT EXISTS customer_locks_expires_idx
  ON customer_locks(expires_at);

-- === RLS POLICIES ===

ALTER TABLE vault_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_action_queue ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for n8n and agent operations)
CREATE POLICY "service_role_all" ON vault_notes FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON conversation_messages FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON outcome_tracking FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON scheduled_actions FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON research_queue FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON prompt_versions FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON eval_suites FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON customer_locks FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON agent_action_queue FOR ALL
  USING (auth.role() = 'service_role');

-- Tenant isolation (for dashboard users)
CREATE POLICY "tenant_isolation" ON vault_notes FOR ALL
  USING (client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid);
CREATE POLICY "tenant_isolation" ON conversation_messages FOR ALL
  USING (client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid);
CREATE POLICY "tenant_isolation" ON outcome_tracking FOR ALL
  USING (client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid);
CREATE POLICY "tenant_isolation" ON scheduled_actions FOR ALL
  USING (client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid);
CREATE POLICY "tenant_isolation" ON research_queue FOR ALL
  USING (client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid);
CREATE POLICY "tenant_isolation" ON prompt_versions FOR ALL
  USING (client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid);
CREATE POLICY "tenant_isolation" ON eval_suites FOR ALL
  USING (client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid);
CREATE POLICY "tenant_isolation" ON customer_locks FOR ALL
  USING (client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid);
CREATE POLICY "tenant_isolation" ON agent_action_queue FOR ALL
  USING (client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid);

-- === HELPER FUNCTIONS ===

-- Semantic search across vault notes
CREATE OR REPLACE FUNCTION search_vault(
  p_client_id UUID,
  p_query_embedding vector(1536),
  p_limit INT DEFAULT 5,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  path TEXT,
  title TEXT,
  content TEXT,
  tags TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    vn.id, vn.path, vn.title, vn.content, vn.tags,
    1 - (vn.embedding <=> p_query_embedding) as similarity
  FROM vault_notes vn
  WHERE vn.client_id = p_client_id
    AND vn.embedding IS NOT NULL
    AND (p_tags IS NULL OR vn.tags && p_tags)
  ORDER BY vn.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

-- Auto-expire customer locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM customer_locks WHERE expires_at < now();
END;
$$;
