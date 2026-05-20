-- migration 019 — gmail_triage_snapshots
--
-- One snapshot per tenant per day. The triage cron runs once at
-- 8am local and writes a row; the daily 9am owner brief reads from
-- it. Idempotent on (client_id, snapshot_date) so re-runs upsert.

CREATE TABLE IF NOT EXISTS gmail_triage_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  total_threads   INTEGER NOT NULL DEFAULT 0,
  bucket_counts   JSONB NOT NULL DEFAULT '{}'::jsonb,
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_gmail_triage_client_date
  ON gmail_triage_snapshots(client_id, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_gmail_triage_snapshot_date
  ON gmail_triage_snapshots(snapshot_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON gmail_triage_snapshots TO agents_app;
