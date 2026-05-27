-- 021_clients_gbrain.sql
--
-- Najim Brain — add the three columns on clients that the per-tenant
-- provisioning script writes to.
--
-- Spec: docs/architecture/najim-brain.md §9
--
-- Idempotent: safe to apply repeatedly. All ADD COLUMN statements use
-- IF NOT EXISTS so re-running is a no-op.
--
-- Order of execution: apply this migration BEFORE running
-- scripts/najim-brain/provision-tenant.sh — the provisioning script
-- writes UPDATE clients SET gbrain_token = ... and will fail without
-- these columns.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS gbrain_token TEXT,
  ADD COLUMN IF NOT EXISTS gbrain_source_slug TEXT,
  ADD COLUMN IF NOT EXISTS gbrain_provisioned_at TIMESTAMPTZ;

-- The source_slug is what gbrain knows the tenant as.
-- Add a uniqueness constraint so two clients can't claim the same slug.
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_gbrain_source_slug
  ON clients (gbrain_source_slug)
  WHERE gbrain_source_slug IS NOT NULL;

-- The token is read on every owner message + customer message to fetch
-- brain context. Index it for the lookup hot path.
CREATE INDEX IF NOT EXISTS idx_clients_gbrain_token_set
  ON clients (id)
  WHERE gbrain_token IS NOT NULL;

COMMENT ON COLUMN clients.gbrain_token IS
  'Tenant-scoped OAuth bearer for gbrain. Null = brain not provisioned, agent runs Postgres-only.';
COMMENT ON COLUMN clients.gbrain_source_slug IS
  'URL-safe id this tenant has on gbrain. Stable across re-provisioning.';
COMMENT ON COLUMN clients.gbrain_provisioned_at IS
  'Timestamp of first successful provision-tenant.sh run. Null = never provisioned.';
