#!/bin/bash
# Postgres init script — runs once on first container start.
# Creates the agents_app DML-only role, installs required extensions,
# and emits a sanity report to docker logs.

set -euo pipefail

if [ -z "${PG_APP_PASSWORD:-}" ]; then
  echo "ERROR: PG_APP_PASSWORD must be set in the container env" >&2
  exit 1
fi

# SQL-escape any embedded single quotes in the password
ESCAPED_PW="${PG_APP_PASSWORD//\'/\'\'}"

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" <<EOSQL
  -- App user (DML only — no DDL, no DROP, no superuser).
  DO \$do\$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'agents_app') THEN
      EXECUTE 'CREATE ROLE agents_app LOGIN PASSWORD ''${ESCAPED_PW}''';
    ELSE
      EXECUTE 'ALTER ROLE agents_app WITH PASSWORD ''${ESCAPED_PW}''';
    END IF;
  END
  \$do\$;

  -- Privileges. We intentionally do NOT grant CREATE on schema public — only
  -- agents_admin (the container superuser) runs migrations.
  GRANT CONNECT ON DATABASE agents TO agents_app;
  GRANT USAGE ON SCHEMA public TO agents_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO agents_app;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO agents_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agents_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO agents_app;

  -- Extensions
  CREATE EXTENSION IF NOT EXISTS vector;       -- pgvector for embeddings
  CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid()
  CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- fuzzy text search

  -- Sanity report (goes to docker logs)
  SELECT version();
  SELECT extname, extversion FROM pg_extension ORDER BY extname;
EOSQL

echo "agents-postgres: init complete — agents_app role + extensions ready"
