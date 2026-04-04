-- Migration 010: Active booking state for in-flight reservations
-- Replaces in-memory booking tracking. SQL UPDATE = overwrite, never duplicate.

CREATE TABLE IF NOT EXISTS active_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  customer_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'collecting',

  -- Booking fields (nullable until collected)
  guest_name TEXT,
  party_size INT,
  booking_date TEXT,
  booking_time TEXT,
  seating_preference TEXT,
  dietary_notes TEXT,
  occasion TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,

  -- Tracking
  last_updated_field TEXT,
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);

-- Fast lookup during conversation
CREATE INDEX IF NOT EXISTS idx_active_bookings_lookup
  ON active_bookings(client_id, customer_phone, status);

-- Auto-expire old bookings (cleanup)
CREATE INDEX IF NOT EXISTS idx_active_bookings_expires
  ON active_bookings(expires_at) WHERE status IN ('collecting', 'confirming');

-- RLS: service_role bypasses, authenticated users see own client's bookings
ALTER TABLE active_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON active_bookings
  FOR ALL USING (true) WITH CHECK (true);
