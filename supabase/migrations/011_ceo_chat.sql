-- 011_ceo_chat.sql
-- Ask Rami chat widget — sessions, messages, sliding-window rate limits.

CREATE TABLE IF NOT EXISTS ceo_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_name TEXT,
    identity_company TEXT,
    identity_email TEXT UNIQUE,
    identity_whatsapp TEXT,
    identity_confidence TEXT CHECK (identity_confidence IN ('inferred','confirmed')),
    browser_lang TEXT CHECK (browser_lang IN ('ar','en')),
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    last_page TEXT,
    total_messages INT DEFAULT 0,
    summary TEXT,
    tags TEXT[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS ceo_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES ceo_chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
    content TEXT NOT NULL,
    language TEXT,
    page_url TEXT,
    llm_model TEXT,
    tokens INT,
    tool_call JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ceo_chat_rate_limit (
    ip TEXT NOT NULL,
    bucket_start_minute TIMESTAMPTZ NOT NULL,
    count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (ip, bucket_start_minute)
);

CREATE INDEX IF NOT EXISTS idx_ceo_chat_sessions_email
    ON ceo_chat_sessions(identity_email)
    WHERE identity_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ceo_chat_messages_session
    ON ceo_chat_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ceo_chat_rate_limit_bucket
    ON ceo_chat_rate_limit(bucket_start_minute);

ALTER TABLE ceo_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_chat_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON ceo_chat_sessions
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON ceo_chat_messages
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON ceo_chat_rate_limit
    FOR ALL USING (auth.role() = 'service_role');
