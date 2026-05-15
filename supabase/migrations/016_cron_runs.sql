-- Migration 016 · Cron health log + alert state.
--
-- The Karpathy loop was silently dead for 5 days post-cutover because
-- no one was watching the cron exit codes. This table holds one row per
-- cron run with status + exit code + summary, plus an alert_sent_at
-- column so the watchdog only pages once per failure event.
--
-- /cron/heartbeat writes here at start + end of every wrapped run.
-- /cron/health scans for failures in the last hour and pages the
-- founder via Kapso (send_to_founder helper) on first detection.

CREATE TABLE IF NOT EXISTS cron_runs (
  id BIGSERIAL PRIMARY KEY,
  cron_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  exit_code INTEGER,
  -- Comma-separated HTTP codes for multi-step crons (e.g. "200,200,500")
  http_codes TEXT,
  -- 'running' | 'success' | 'failed' | 'timeout'
  status TEXT NOT NULL DEFAULT 'running',
  notes TEXT,
  -- Set when the watchdog pages the founder for this row. NULL = still
  -- pending alert if status='failed'.
  alert_sent_at TIMESTAMPTZ,
  alert_channel TEXT
);

-- Hot query: "any failed runs in last hour that haven't been alerted?"
CREATE INDEX IF NOT EXISTS idx_cron_runs_alert_scan
  ON cron_runs (status, alert_sent_at, started_at DESC);

-- "When did <cron_name> last succeed?"
CREATE INDEX IF NOT EXISTS idx_cron_runs_name_status
  ON cron_runs (cron_name, status, started_at DESC);

GRANT SELECT, INSERT, UPDATE ON cron_runs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE cron_runs_id_seq TO authenticated;
