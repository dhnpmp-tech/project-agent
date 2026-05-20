-- migration 020 — scraped_listings
--
-- Normalized output table for the property-scraper service. Every
-- source platform (DLD open data, RERA registry, broker CSV imports,
-- future-authorized Bayut/PF feeds) writes into this same shape so
-- the matching agent doesn't care where a listing came from.

CREATE TABLE IF NOT EXISTS scraped_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source provenance — critical for legal + audit
  source          TEXT NOT NULL,         -- "dld_public" | "rera_registry" | "broker_csv" | "bayut_authorized" | ...
  source_url      TEXT,                  -- exact URL the row came from (when applicable)
  source_id       TEXT,                  -- platform's stable id (DLD transaction id, broker id, etc.)
  auth_basis   TEXT NOT NULL DEFAULT 'public', -- "public" | "broker_authorized" | "partner_api"

  -- Normalized listing facts
  title           TEXT,
  price_aed       NUMERIC(14,2),
  price_per_sqft  NUMERIC(10,2),
  area            TEXT,                  -- "Saadiyat Island" / "JBR" / "Riyadh, Diplomatic Quarter"
  city            TEXT,                  -- "Dubai" | "Abu Dhabi" | "Riyadh" | etc.
  emirate         TEXT,                  -- "Dubai" / "Abu Dhabi" / null for SA
  bedrooms        SMALLINT,
  bathrooms       SMALLINT,
  sqft            INTEGER,
  property_type   TEXT,                  -- "apartment" | "villa" | "townhouse" | "land" | "office"
  transaction_type TEXT,                 -- "sale" | "rent" | "off_plan" | "transaction_record"

  -- Geo
  latitude        NUMERIC(9,6),
  longitude       NUMERIC(9,6),

  -- Optional contacts (only present for sources that legitimately expose them)
  agent_name      TEXT,
  agent_company   TEXT,
  agent_phone     TEXT,
  agent_email     TEXT,

  -- Raw + structured extras
  amenities       TEXT[] DEFAULT '{}',
  images          TEXT[] DEFAULT '{}',
  raw             JSONB DEFAULT '{}'::jsonb,    -- whatever the source returned, preserved

  -- Time
  listed_at       TIMESTAMPTZ,                  -- when the platform listed it
  scraped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_scraped_listings_source
  ON scraped_listings(source, source_id) WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scraped_listings_city_area
  ON scraped_listings(city, area);

CREATE INDEX IF NOT EXISTS idx_scraped_listings_price_aed
  ON scraped_listings(price_aed) WHERE price_aed IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scraped_listings_scraped_at
  ON scraped_listings(scraped_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON scraped_listings TO agents_app;
