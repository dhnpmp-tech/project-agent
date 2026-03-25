-- =============================================================================
-- 007: Business Knowledge Base (per-client, shared across agents)
-- =============================================================================
-- Centralized business intelligence store. All agents read from this to get
-- context about the business. Data is populated via website crawling, manual
-- entry, browser research, and social media discovery.
--
-- Inspired by OpenAI memory / SuperMemory — a persistent, structured knowledge
-- layer that improves agent quality over time.
-- =============================================================================

-- Core knowledge base — one row per client, JSONB for flexibility
CREATE TABLE business_knowledge (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Company fundamentals
  website_url     TEXT,
  business_description TEXT,
  brand_voice     TEXT,
  business_hours  TEXT,
  industry_keywords TEXT[] DEFAULT '{}',

  -- Contact & locations
  contact_info    JSONB DEFAULT '{}',
  -- { "phone": "+971...", "email": "...", "address": "...", "locations": [...] }

  -- Products & services
  services        TEXT[] DEFAULT '{}',

  -- Knowledge base (FAQ, policies, product info)
  faq             JSONB DEFAULT '[]',
  -- [{ "question": "...", "answer": "..." }, ...]

  -- People
  team_members    JSONB DEFAULT '[]',
  -- [{ "name": "...", "role": "...", "bio": "..." }, ...]

  -- Online presence
  social_profiles JSONB DEFAULT '{}',
  -- { "instagram": "https://...", "linkedin": "https://...", ... }

  review_sources  JSONB DEFAULT '[]',
  -- [{ "platform": "Google", "url": "...", "rating": 4.8, "count": 120 }, ...]

  -- Sales intelligence (for SDR agent)
  icp_criteria    JSONB DEFAULT '{}',
  -- { "geography": [...], "company_size": "...", "titles": [...], ... }

  value_propositions TEXT[] DEFAULT '{}',
  competitor_info JSONB DEFAULT '[]',
  -- [{ "name": "...", "url": "...", "differentiator": "..." }, ...]

  -- HR intelligence (for HR agent)
  job_listings    JSONB DEFAULT '[]',
  -- [{ "title": "...", "description": "...", "requirements": [...] }, ...]
  scoring_criteria JSONB DEFAULT '{}',
  company_culture TEXT,

  -- Financial intelligence (for FIA agent)
  transaction_categories TEXT[] DEFAULT '{}',
  currency        TEXT DEFAULT 'AED',
  fiscal_year_start TEXT DEFAULT 'january',

  -- Content intelligence (for Content Engine)
  content_pillars TEXT[] DEFAULT '{}',
  posting_schedule JSONB DEFAULT '{}',
  -- { "linkedin": "3x/week", "instagram": "daily", ... }

  -- Raw crawl data (for re-processing)
  crawl_data      JSONB DEFAULT '{}',
  -- { "pages_scanned": [...], "last_crawled_at": "...", "raw_meta": {...} }

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One knowledge base per client
CREATE UNIQUE INDEX idx_business_knowledge_client
  ON business_knowledge(client_id);

-- Auto-update timestamp
CREATE TRIGGER business_knowledge_updated_at
  BEFORE UPDATE ON business_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS: clients can only see their own knowledge base
ALTER TABLE business_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY business_knowledge_select ON business_knowledge
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE id = auth.uid())
  );

CREATE POLICY business_knowledge_insert ON business_knowledge
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE id = auth.uid())
  );

CREATE POLICY business_knowledge_update ON business_knowledge
  FOR UPDATE USING (
    client_id IN (SELECT id FROM clients WHERE id = auth.uid())
  );

-- Service role bypass (for agents, provisioning, and crawl jobs)
CREATE POLICY business_knowledge_service ON business_knowledge
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE business_knowledge IS
  'Centralized business intelligence store. All agents read from this table to get context about the client business. Populated via website crawling, browser research, manual entry, and social media discovery.';
