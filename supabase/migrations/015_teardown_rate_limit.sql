-- Migration 015 · Rate limit buckets for the public teardown endpoint.
--
-- POST /api/teardown is wide open and triggers ~12 LLM calls + Firecrawl
-- + Places + ScrapeCreators per submission. A naïve abuse loop can burn
-- AED 100-300 of provider quota in 10 minutes. This table backs a small
-- per-IP, per-host, and per-IP×host token-bucket check in route.ts
-- before the work runs.
--
-- Same shape as ceo_chat_rate_limit (which uses ip + minute-bucket
-- composite PK). The bucket_key column lets us reuse one table for
-- three distinct keyed buckets ("ip:1.2.3.4", "host:example.com",
-- "iphost:1.2.3.4:example.com") without three separate tables.

CREATE TABLE IF NOT EXISTS teardown_rate_limit (
  bucket_key TEXT NOT NULL,
  bucket_start_minute TIMESTAMP WITH TIME ZONE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, bucket_start_minute)
);

-- Sliding-window SUM(count) WHERE bucket_start_minute > NOW() - ...
-- uses this index to prune.
CREATE INDEX IF NOT EXISTS idx_teardown_rate_limit_minute
  ON teardown_rate_limit (bucket_start_minute);

-- Grant once for the self-hosted Postgres deployment (the _transform.py
-- step also rewrites authenticated/service_role for the out/ artifact).
GRANT SELECT, INSERT, UPDATE, DELETE ON teardown_rate_limit TO authenticated;
