-- Migration 012: No-Show Recovery
-- Deposit requests + no-show log for the recovery loop.
-- Triggered 24h before booking; if not confirmed, asks for deposit; if ghosted, releases slot.

CREATE TABLE IF NOT EXISTS deposit_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  booking_id UUID NOT NULL,                 -- references active_bookings.id
  customer_phone TEXT NOT NULL,
  amount_minor INT NOT NULL,                -- e.g. 5000 = AED 50.00
  currency TEXT NOT NULL DEFAULT 'AED',     -- AED | SAR
  provider TEXT NOT NULL DEFAULT 'tabby',   -- tabby | tamara | stripe | manual
  payment_link TEXT,
  status TEXT NOT NULL DEFAULT 'requested', -- requested | paid | declined | expired
  requested_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '12 hours')
);

CREATE INDEX IF NOT EXISTS idx_deposit_requests_lookup
  ON deposit_requests(client_id, booking_id, status);

CREATE INDEX IF NOT EXISTS idx_deposit_requests_expiry
  ON deposit_requests(expires_at) WHERE status = 'requested';

CREATE TABLE IF NOT EXISTS no_show_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  booking_id UUID NOT NULL,
  customer_phone TEXT NOT NULL,
  outcome TEXT NOT NULL,                    -- confirmed | deposit_paid | released | no_show
  reason TEXT,                              -- free-form note
  recovered_revenue_minor INT DEFAULT 0,    -- if waitlist filled
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_no_show_log_client
  ON no_show_log(client_id, created_at DESC);

-- RLS
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON deposit_requests FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE no_show_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON no_show_log FOR ALL USING (true) WITH CHECK (true);
