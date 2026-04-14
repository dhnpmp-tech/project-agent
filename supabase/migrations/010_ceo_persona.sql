-- 010_ceo_persona.sql
-- CEO Persona tables for Rami Mansour

-- Drafts: tweets, posts, content awaiting founder approval
CREATE TABLE IF NOT EXISTS ceo_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT NOT NULL CHECK (channel IN ('x', 'linkedin', 'website')),
    content TEXT NOT NULL,
    reasoning TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'published')),
    founder_feedback TEXT,
    pushback_response TEXT,
    trigger_source TEXT,
    trigger_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    x_post_id TEXT
);

-- Activity log: everything Rami observes across all 8 data feeds
CREATE TABLE IF NOT EXISTS ceo_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL CHECK (source IN ('vps', 'karpathy', 'quality', 'github', 'pipeline', 'intel', 'proactive', 'traffic')),
    event_type TEXT NOT NULL,
    summary TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    acted_on BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations: WhatsApp thread between Rami and the founder
CREATE TABLE IF NOT EXISTS ceo_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'document')),
    context TEXT CHECK (context IN ('brief', 'approval', 'alert', 'pushback', 'command', 'conversation')),
    draft_id UUID REFERENCES ceo_drafts(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ceo_drafts_status ON ceo_drafts(status);
CREATE INDEX idx_ceo_drafts_channel ON ceo_drafts(channel);
CREATE INDEX idx_ceo_activity_source ON ceo_activity_log(source);
CREATE INDEX idx_ceo_activity_created ON ceo_activity_log(created_at DESC);
CREATE INDEX idx_ceo_conversations_created ON ceo_conversations(created_at DESC);
CREATE INDEX idx_ceo_conversations_context ON ceo_conversations(context);

-- RLS: service role bypass (agents access via service key)
ALTER TABLE ceo_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON ceo_drafts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON ceo_activity_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON ceo_conversations FOR ALL USING (auth.role() = 'service_role');

-- Auto-update updated_at on ceo_drafts
CREATE OR REPLACE FUNCTION update_ceo_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ceo_drafts_updated_at
    BEFORE UPDATE ON ceo_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_ceo_drafts_updated_at();
