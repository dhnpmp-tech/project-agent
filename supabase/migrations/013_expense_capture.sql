-- Migration 013: Expense Capture
-- Owner snaps a receipt photo on WhatsApp → vision LLM extracts → row lands here.
-- Backs the Receipt → Expense feature.

CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'whatsapp_receipt',  -- whatsapp_receipt | manual | csv_import
  vendor TEXT,
  category TEXT,                    -- inventory | utilities | salaries | marketing | misc
  amount_minor INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AED',
  vat_minor INT DEFAULT 0,          -- detected VAT amount in minor units
  receipt_date DATE,
  receipt_url TEXT,                 -- Kapso media URL (raw receipt image)
  raw_text TEXT,                    -- OCR fallback / line-items dump
  extracted_meta JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending_review',  -- pending_review | confirmed | rejected
  created_by_phone TEXT,            -- the owner phone that submitted
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_expenses_client_recent
  ON expenses(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_review_queue
  ON expenses(client_id, status) WHERE status = 'pending_review';

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON expenses FOR ALL USING (true) WITH CHECK (true);
