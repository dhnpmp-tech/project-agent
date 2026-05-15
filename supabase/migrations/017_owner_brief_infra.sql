-- Migration 017 · Owner-channel columns on clients + owner_briefings log.
--
-- The teardown promises "Your 9am morning brief" for every tenant —
-- but until now there was no per-tenant cron firing those briefs.
-- Saffron + Jareed only got Rami's CEO-level briefs (a separate
-- channel). This wires the actual per-tenant Owner Brief that the
-- platform claims.
--
-- Cron design:
--   */60 * * * * /opt/prompt-builder/cron_wrap.sh owner_brief_fanout \
--     curl http://localhost:8200/owner-brief/run
--   At each UTC hour, the endpoint walks active clients, computes each
--   tenant's local hour from owner_timezone, and sends a brief to any
--   tenant whose local_hour == owner_brief_hour AND who hasn't received
--   a brief today (idempotency via owner_briefings unique constraint).

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS owner_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS owner_timezone TEXT DEFAULT 'Asia/Dubai',
  ADD COLUMN IF NOT EXISTS owner_brief_hour SMALLINT DEFAULT 9;

-- One row per delivered (or attempted) brief. local_date is the
-- tenant-local calendar day, NOT a UTC day — prevents the same tenant
-- getting two briefs in one of their days when DST or our cron
-- accidentally fires twice.
CREATE TABLE IF NOT EXISTS owner_briefings (
  id BIGSERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  local_date DATE NOT NULL,
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  kapso_status_code INTEGER,
  kapso_message_id TEXT,
  error TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_owner_briefings_client_date
  ON owner_briefings (client_id, local_date);

CREATE INDEX IF NOT EXISTS idx_owner_briefings_sent_at
  ON owner_briefings (sent_at DESC);

GRANT SELECT, INSERT, UPDATE ON owner_briefings TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE owner_briefings_id_seq TO authenticated;
