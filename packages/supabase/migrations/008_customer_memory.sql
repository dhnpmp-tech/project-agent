-- =============================================================================
-- 008: Customer Memory (per-client, per-contact, long-term)
-- =============================================================================
-- Persistent memory for every person who interacts with the business.
-- When a customer texts in January and comes back in December, the agent
-- remembers their name, preferences, history, and past issues.
--
-- This is the long-term memory layer. Redis handles short-term conversation
-- context (current session). This table handles everything across sessions.
-- =============================================================================

-- One row per unique contact per client
CREATE TABLE customer_memory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Contact identity
  phone_number    TEXT NOT NULL,
  name            TEXT,
  email           TEXT,
  company         TEXT,
  language        TEXT DEFAULT 'en',

  -- Relationship
  first_contact   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_contact    TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_conversations INTEGER DEFAULT 1,
  total_messages  INTEGER DEFAULT 1,

  -- Customer profile (AI-generated, updated after each conversation)
  profile_summary TEXT,
  -- e.g. "Ahmed is a regular customer who prefers outdoor seating.
  -- Allergic to nuts. Usually books for 4 people on weekends.
  -- Prefers Arabic communication. VIP — has spent AED 12K+ this year."

  -- Preferences (structured)
  preferences     JSONB DEFAULT '{}',
  -- { "seating": "outdoor", "dietary": ["nut-free", "halal"],
  --   "preferred_time": "evening", "party_size_usual": 4,
  --   "communication_language": "ar" }

  -- History (key events, not full transcripts)
  key_events      JSONB DEFAULT '[]',
  -- [{ "date": "2026-01-15", "type": "booking", "summary": "Booked table for 4, outdoor" },
  --  { "date": "2026-02-10", "type": "complaint", "summary": "Cold food, resolved with comp dessert" },
  --  { "date": "2026-03-20", "type": "purchase", "summary": "Bought 3BR villa in Marina, AED 2.8M" }]

  -- Lead/sales data
  lead_score      INTEGER,
  lead_status     TEXT CHECK (lead_status IN ('new', 'qualified', 'nurturing', 'converted', 'lost')),
  lifetime_value  DECIMAL(12,2) DEFAULT 0,

  -- Tags (for segmentation)
  tags            TEXT[] DEFAULT '{}',
  -- ["vip", "repeat-customer", "referred-by-ahmed", "nut-allergy"]

  -- Sentiment tracking
  avg_sentiment   DECIMAL(3,2),
  -- Running average 0.0 (very negative) to 1.0 (very positive)

  -- Notes (agent or owner can add)
  notes           TEXT,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One memory per phone number per client
CREATE UNIQUE INDEX idx_customer_memory_phone
  ON customer_memory(client_id, phone_number);

-- Fast lookup by name, email
CREATE INDEX idx_customer_memory_name ON customer_memory(client_id, name);
CREATE INDEX idx_customer_memory_email ON customer_memory(client_id, email);

-- Find VIPs and high-value customers
CREATE INDEX idx_customer_memory_value ON customer_memory(client_id, lifetime_value DESC);
CREATE INDEX idx_customer_memory_tags ON customer_memory USING GIN(tags);

-- Auto-update timestamp
CREATE TRIGGER customer_memory_updated_at
  BEFORE UPDATE ON customer_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS: clients can only see their own customers
ALTER TABLE customer_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_memory_select ON customer_memory
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE id = auth.uid())
  );

CREATE POLICY customer_memory_insert ON customer_memory
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE id = auth.uid())
  );

CREATE POLICY customer_memory_update ON customer_memory
  FOR UPDATE USING (
    client_id IN (SELECT id FROM clients WHERE id = auth.uid())
  );

-- Service role bypass (for agents and provisioning)
CREATE POLICY customer_memory_service ON customer_memory
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- Conversation transcripts (optional, for context retrieval)
-- =============================================================================
-- Stores conversation summaries (not full transcripts) for retrieval.
-- Full message history lives in Kapso. We store AI-generated summaries
-- so agents can quickly recall past conversations.

CREATE TABLE conversation_summaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customer_memory(id) ON DELETE CASCADE,

  -- Conversation metadata
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ,
  message_count   INTEGER DEFAULT 0,
  channel         TEXT DEFAULT 'whatsapp',

  -- AI-generated summary of the conversation
  summary         TEXT NOT NULL,
  -- e.g. "Customer asked about vegan options and booked a table for 2
  -- on Friday at 8pm, outdoor seating. Mentioned a nut allergy."

  -- Key outcomes
  outcomes        TEXT[] DEFAULT '{}',
  -- ["booking_created", "faq_answered", "complaint_resolved"]

  -- Sentiment of this conversation
  sentiment       DECIMAL(3,2),

  -- Topics discussed
  topics          TEXT[] DEFAULT '{}',
  -- ["vegan-options", "booking", "allergens"]

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_convo_summaries_customer
  ON conversation_summaries(customer_id, started_at DESC);

CREATE INDEX idx_convo_summaries_client
  ON conversation_summaries(client_id, started_at DESC);

ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY convo_summaries_select ON conversation_summaries
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE id = auth.uid())
  );

CREATE POLICY convo_summaries_service ON conversation_summaries
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE customer_memory IS
  'Long-term memory for every customer contact. Persists across conversations over months/years. AI updates profile_summary, preferences, and key_events after each conversation.';

COMMENT ON TABLE conversation_summaries IS
  'AI-generated summaries of past conversations. Full transcripts live in Kapso/Redis. These summaries enable fast context retrieval without loading full message history.';
