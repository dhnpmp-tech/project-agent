-- =============================================================================
-- 006: Calendar Provider Configuration (per-client)
-- =============================================================================
-- Stores which calendar/booking provider each client uses, with encrypted
-- credentials. A client can have multiple providers (e.g. Google Calendar for
-- meetings + SevenRooms for restaurant bookings).
-- =============================================================================

CREATE TYPE calendar_provider AS ENUM (
  'google',
  'outlook',
  'caldav',
  'ical',
  'sevenrooms'
);

CREATE TABLE calendar_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider        calendar_provider NOT NULL,
  label           TEXT NOT NULL DEFAULT 'Default Calendar',
  -- Credentials stored as AES-256 encrypted JSON blob.
  -- Decryption happens in the application layer, never in SQL.
  credentials_encrypted TEXT NOT NULL,
  -- If true, this is the default calendar for new bookings.
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by client
CREATE INDEX idx_calendar_configs_client ON calendar_configs(client_id);

-- Only one primary calendar per client
CREATE UNIQUE INDEX idx_calendar_configs_primary
  ON calendar_configs(client_id)
  WHERE is_primary = true;

-- RLS: clients can only see their own calendar configs
ALTER TABLE calendar_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_configs_select ON calendar_configs
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients WHERE id = auth.uid()
    )
  );

CREATE POLICY calendar_configs_insert ON calendar_configs
  FOR INSERT WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE id = auth.uid()
    )
  );

CREATE POLICY calendar_configs_update ON calendar_configs
  FOR UPDATE USING (
    client_id IN (
      SELECT id FROM clients WHERE id = auth.uid()
    )
  );

CREATE POLICY calendar_configs_delete ON calendar_configs
  FOR DELETE USING (
    client_id IN (
      SELECT id FROM clients WHERE id = auth.uid()
    )
  );

-- Service role bypass (for provisioning SDK and n8n workflows)
CREATE POLICY calendar_configs_service ON calendar_configs
  FOR ALL USING (auth.role() = 'service_role');

-- Add meeting_booked counter to agent metrics
COMMENT ON TABLE calendar_configs IS
  'Per-client calendar/booking provider configuration. Supports Google Calendar, Outlook, CalDAV (Proton/Apple), iCal feeds, and SevenRooms.';
