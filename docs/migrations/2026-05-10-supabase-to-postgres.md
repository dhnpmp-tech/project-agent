# Supabase → Self-Hosted Postgres Migration

**Date:** 2026-05-10
**Author:** Claude Opus 4.7 (1M) + Peter
**Status:** DRAFT — pending Peter approval before Phase 1
**Severity:** P0 — production auth and WhatsApp pipeline both broken (Supabase project gone)

---

## Why

The Supabase project at `sybzqktipimbmujtowoz.supabase.co` returns NXDOMAIN across all public DNS resolvers (verified 2026-05-09). Every component that touched Supabase is now down or degraded:

- Dashboard login at `agents.dcp.sa/app/login` — Supabase Auth fails
- Saffron WhatsApp pipeline — FastAPI prompt-builder can't fetch `agent_deployments` to map phone → client_id
- Owner brain, knowledge base, booking state, customer memory — all depend on Supabase tables
- Vercel production env additionally has a literal `\n` typo appended to the URL

DC1-Platform team already migrated away from Supabase on 2026-05-08 to SQLite + Resend OTP for their compute-provider use case. We follow the same auth pattern but use Postgres on the VPS instead of SQLite, because Project Agent has multiple concurrent writers (FastAPI workers + n8n + Vercel functions) and needs pgvector for `vault_notes`.

## Decisions (locked)

| | Choice | Reason |
|---|---|---|
| Database | Self-hosted **Postgres 17 + pgvector** on Hostinger VPS (76.13.179.86) | Removes vendor-pause risk. Preserves all 13 migrations. pgvector preserves vault_notes semantic search. Same ops domain as prompt-builder/n8n/Mem0. |
| Auth | **Resend OTP magic-link**, ported from `dc1-platform/backend/src/services/auth-otp.js` | Already working in DC1 since May 8. `RESEND_API_KEY` already in env. No password storage. |
| Data | **Fresh start** — re-seed Saffron + Jareed from migrations + a seed script. Reuse existing UUIDs (Saffron `3bd50557-6680-43b9-bb8e-261c7f8a19d2`) so existing code/n8n references stay valid. | Zero real customers. Backup recovery is a coin-flip. Fresh is faster and cleaner. |
| Cutover | **Hard cutover** | Production is already at 100% downtime; dual-write protects nothing. |
| TS client | **`postgres` (porsager/postgres-js)** + **`jose`** for JWTs | Modern, lightweight, edge-ready. Drizzle as query builder if/when ergonomics demand it; not Phase 1. |
| Py client | **`asyncpg`** + plain SQL strings | Already production-tested in similar FastAPI deployments. No SQLAlchemy churn. |

## Out of scope

- Real-customer data migration (none exist)
- Multi-region / HA Postgres
- Kubernetes
- Vault re-encryption (Composio tokens already in their own service)
- Frontend redesign (PR #5 covers that separately)

## Architecture

```
                         agents.dcp.sa (Vercel)
                          │           │
                          │           └─→ /app/* (Next.js dashboard)
                          │                  │
                          ▼                  ▼
                   marketing-website   project-agent
                   (apps/website)      (apps/client-dashboard)
                          │                  │
                          │                  ├─→ db client (postgres-js)
                          │                  └─→ auth client (jose, fetch /auth/*)
                          │                         │
                          ▼                         ▼
                   (no DB needed)         api.dcp.sa/auth/*
                                          (Express on VPS port 8201)
                                                    │
                          ┌─────────────────────────┘
                          │
                          ▼
              VPS (76.13.179.86)
              ├── postgres:17-pgvector  (Docker, port 5432, internal-only)
              ├── auth-service          (Express, port 8201, behind Traefik)
              ├── prompt-builder        (FastAPI, port 8200, asyncpg → postgres)
              ├── n8n                   (queries postgres directly via n8n-postgres node OR via prompt-builder)
              ├── Mem0                  (unchanged)
              └── Resend                (already in use for transactional email)
```

JWT contract preserved:
- Access token (HS256, 1h): `{sub: <user_id>, user_metadata: {client_id: <uuid>, role: "owner"}}`
- Refresh token (30d) stored in HTTP-only cookie
- Backend code that reads `auth.jwt() -> 'user_metadata' ->> 'client_id'` becomes app-layer filter `WHERE client_id = $1` after extracting from JWT — RLS replaced with explicit predicate in every query (cleaner, more debuggable)

## Phases

### Phase 1: Postgres provisioning (1h)

**On VPS (`ssh dcp-vps`):**

1. Add to `infrastructure/docker-compose.master.yml`:
   ```yaml
   postgres:
     image: pgvector/pgvector:pg17
     restart: unless-stopped
     environment:
       POSTGRES_DB: agents
       POSTGRES_USER: agents_admin
       POSTGRES_PASSWORD_FILE: /run/secrets/pg_admin_password
     volumes:
       - postgres_data:/var/lib/postgresql/data
       - ./postgres/init:/docker-entrypoint-initdb.d:ro
     networks: [internal]
     # NO ports section — internal-only, accessed via Docker network
   ```
2. Create app role with limited privs:
   ```sql
   CREATE ROLE agents_app LOGIN PASSWORD '<secret>';
   GRANT CONNECT ON DATABASE agents TO agents_app;
   GRANT USAGE ON SCHEMA public TO agents_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO agents_app;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agents_app;
   CREATE EXTENSION vector;
   ```
3. Run all 13 migrations, in order, with these adaptations:
   - Replace `auth.users` references → our own `auth_users` table
   - Replace `auth.uid()` → drop (we filter in app)
   - Replace `auth.jwt() -> 'user_metadata' ->> 'client_id'` → drop the RLS policy (we filter in app)
   - Keep `pgvector` columns and indexes intact
   - File: `migrations/000_auth_users.sql` (new) — must run before 001
4. Seed script (`scripts/seed-fresh.ts`):
   - Saffron Kitchen: id `3bd50557-6680-43b9-bb8e-261c7f8a19d2`, plan `enterprise`, status `active`
   - Jareed Coffee: existing UUID from prior memory (look up before running)
   - Default `agent_deployments` for both
   - Seed `business_knowledge` from `agent-templates/whatsapp-intelligence-agent/sample-data/`
5. Daily backup cron: `pg_dump -Fc agents > /opt/backups/agents-$(date +%F).dump` retained 30 days.

**Verification:** `psql` smoke queries pass. `\dt` shows 22 tables (21 existing + `auth_users`). Vector index exists on `vault_notes.embedding`.

### Phase 2: Auth service (2-3h)

**New service at `services/auth/` on VPS:**

1. Port `dc1-platform/backend/src/services/auth-otp.js` and route handler
2. Endpoints (all under `https://api.dcp.sa/auth/`):
   - `POST /auth/otp/send` — `{email}` → 6-digit code stored hashed in `auth_otp_codes`, sent via Resend, 10min TTL, 5/hour rate limit per email + IP
   - `POST /auth/otp/verify` — `{email, code}` → issue access JWT (1h) + refresh cookie (30d)
   - `POST /auth/refresh` — rotate access JWT
   - `POST /auth/signout` — invalidate refresh
   - `GET /auth/me` — return user from JWT
3. JWT signing: `jose`, HS256, secret in env `JWT_SECRET` (32+ bytes)
4. Tables (in same Postgres):
   - `auth_users(id uuid pk, email text unique, client_id uuid, role text, created_at, last_login_at)`
   - `auth_otp_codes(email text, code_hash text, expires_at, attempts int)`
   - `auth_refresh_tokens(token_hash text pk, user_id uuid, expires_at)`
5. Traefik route: `api.dcp.sa/auth/*` → `auth-service:8201`

**Verification:** OTP email arrives at `peter@dc1st.com`. Verify endpoint returns JWT. `/auth/me` echoes user.

### Phase 3: Frontend swap (2-4h)

**In `apps/client-dashboard/`:**

1. New deps: `postgres`, `jose`. Remove: `@supabase/ssr`, `@supabase/supabase-js`.
2. Replace files:
   - `src/lib/supabase-server.ts` → `src/lib/db-server.ts` (postgres-js connection pool, reads JWT from cookie, exposes `query()` and `getClientId()`)
   - `src/lib/supabase-client.ts` → `src/lib/auth-client.ts` (browser-side fetch wrapper for `/auth/*`)
   - `src/lib/supabase-admin.ts` → `src/lib/db-admin.ts` (service-side direct connection for admin tasks)
3. Update every API route under `src/app/api/` (16 routes) to import from new modules.
4. Update `src/app/login/page.tsx` and `src/app/signup/page.tsx` to OTP flow:
   - Step 1: email input → `POST /auth/otp/send` → "check your inbox"
   - Step 2: 6-digit code input → `POST /auth/otp/verify` → set cookie → redirect `/dashboard`
5. Update `src/lib/dashboard-queries.ts` to use new DB client + filter by JWT-derived `client_id` in app code.
6. Search & replace remaining `from "@supabase/...` imports.

**Verification:** `pnpm typecheck` clean. `pnpm build` clean. Local dev login works against staging Postgres.

### Phase 4: Backend swap (2-3h)

**In `backend/prompt-builder/`:**

1. New module `database.py`:
   - asyncpg connection pool, lifespan-managed
   - `async def query(sql, *args, client_id=None)` — auto-injects `WHERE client_id = $N` if `client_id` passed
2. Replace every `_SUPA_URL` HTTP call (~20 locations across 18 .py files) with `await db.query(...)`.
3. Drop `_SUPA_KEY` and `_SUPA_URL` env vars; replace with `DATABASE_URL`.
4. Update conftest.py to spin up a test DB or use a fixture.
5. Run `pytest backend/prompt-builder/` — must pass 130+/130+ tests.

**Verification:** `/health` still 200. `/parse` round-trip with a real WhatsApp payload returns expected client_id resolution. Existing tests pass.

### Phase 5: Vercel + n8n env (30 min)

1. Vercel `project-agent`: add to `production` and `preview`:
   - `DATABASE_URL` (read-replica connection string for the dashboard)
   - `AUTH_API_URL=https://api.dcp.sa/auth`
   - `JWT_SECRET` (matches auth service)
2. Remove all `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` (and the broken `\n` URL)
3. n8n workflow `diBRXsn1iDFODqeC` (Saffron WhatsApp): the HTTP nodes that hit Supabase REST get redirected to either:
   - The FastAPI prompt-builder (preferred — already does the work in Phase 4)
   - n8n's native `n8n-nodes-base.postgres` node with `DATABASE_URL` credential
4. Update env reference in scripts (`scripts/n8n-workflow-payload.json`, `scripts/create-financial-intel-workflow.sh`, `scripts/generate-persona.sh`).

### Phase 6: Cutover smoke test (30 min)

Run in order:
1. `curl -I https://agents.dcp.sa/` → 200 ✅ (already works)
2. `curl -I https://agents.dcp.sa/app/login/` → 200 ✅
3. Open `/app/login` → enter `peter@dc1st.com` → "send code" → check email → enter code → land on `/app/dashboard` ✅
4. `/app/dashboard` renders with Saffron data + new shell ✅
5. `/app/dashboard/owner` renders 4 tiles ✅
6. Send WhatsApp "test" to +1 205-858-2516 → receive Nadia reply within 30s ✅
7. Open `/app/demo/saffron/owner` → ask "weekly P&L" → reply (not "System configuration error") ✅

If any step fails: see Rollback below.

### Phase 7: Cleanup + docs (30 min)

1. `pnpm remove @supabase/ssr @supabase/supabase-js` in client-dashboard
2. Delete unused files: any remaining `supabase-*` modules, `supabase/migrations/` (after copying contents into the new Postgres init dir), `packages/supabase/` README references
3. Update `CLAUDE.md` (drop "Supabase" from tech stack, replace with "Postgres 17 + pgvector"; remove `https://sybzqkti...` URL; update Deployments table)
4. Update `docs/architecture.md`, `docs/technical-documentation.md`, `docs/platform-operations-guide.md`
5. Update `README.md` Deployments + Database sections
6. Bump tech spec to v1.6 with new architecture section

## Rollback triggers + plan

If any of these happen, **stop and call** before continuing:
- Phase 1: migration fails or pgvector extension won't load
- Phase 2: Resend rejects emails or JWT verification fails repeatedly
- Phase 3: typecheck breaks something we can't fix in 30 min
- Phase 4: pytest drops below 130/130
- Phase 6: smoke test step 6 fails (WhatsApp regression)

Rollback for Phase 5+ (post-cutover): revert the Vercel `DATABASE_URL` env to point to the OLD Supabase URL (still broken, but at least we're back to known-broken state) and re-deploy main. Worst case is we sit at the same broken state we started at — never worse.

## Acceptance criteria

- [ ] `agents.dcp.sa/app/login` accepts an email, sends OTP, verifies, lands on dashboard
- [ ] Dashboard `/dashboard` renders with company name, plan, and Owner Hub link
- [ ] Owner Hub `/dashboard/owner` renders all 4 tiles
- [ ] Saffron WhatsApp number replies to a test message within 30 seconds
- [ ] Owner Brain demo agent at `/demo/saffron/owner` replies (no "System configuration error")
- [ ] All 130+ backend tests still pass
- [ ] `pnpm typecheck` clean across all 6 packages
- [ ] No references to `sybzqktipimbmujtowoz.supabase.co` in code (only in this migration doc + git history)

## Estimated total: ~10 hours

Spread across one focused day if no blockers, or 2 days if Phase 4 (backend swap, biggest surface) reveals surprises.

---

## Approval log

- [ ] Peter — initial plan review
- [ ] Peter — green light Phase 1
- [ ] Peter — green light Phase 2
- [ ] Peter — green light Phase 3
- [ ] Peter — green light Phase 4
- [ ] Peter — green light Phase 5
- [ ] Peter — green light Phase 6
- [ ] Peter — green light Phase 7 + final cleanup
