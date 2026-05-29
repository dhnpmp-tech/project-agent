# The Najim Brain — architecture + deploy runbook

> One-line summary: every Najim tenant gets a per-tenant memory + knowledge graph layer running on **gbrain** (Garry Tan's OpenClaw/Hermes brain). This document defines the architecture, the bootstrap sequence (one-time), and the per-tenant provisioning procedure (replicable).
>
> **Status as of 2026-05-27:** the architecture below is the target. The current state of the VPS is `gbrain-postgres` is running as an empty pgvector database, but gbrain the application is NOT yet installed. Graphiti + Neo4j ARE running (since ~3 weeks ago) and could serve as an interim brain. This runbook is the prescription, not yet the report.

---

## 0. How this document is hardwired to implementation

The architecture in this file would normally drift between writing
and building. We block that with five mechanisms:

| Mechanism | What it does | Where it lives |
|---|---|---|
| **Pinned versions** | Every container tag, gbrain SHA, port, env var, model name lives in one JSON. Drift is a git diff. | `docs/architecture/najim-brain-versions.json` |
| **Executable bootstrap** | §5 below is also a bash script. Implementer runs it; doesn't read prose and translate. | `scripts/najim-brain/bootstrap.sh` |
| **Executable provisioning** | §6 below is also a bash script. Per-tenant deploy = one command + 4 args. | `scripts/najim-brain/provision-tenant.sh` |
| **Locked function signatures** | The Python integration in §7 ships as a real module with `NotImplementedError`-free stubs that callers can import today. The signatures are the contract — implementation fills bodies, can't invent surface. | `backend/prompt-builder/gbrain.py` |
| **Committed migration** | §9's schema isn't prose. It's a real SQL file ready to apply. | `packages/supabase/migrations/021_clients_gbrain.sql` |
| **Verification as pytest** | §10's smoke tests are real pytest cases. CI / cron / manual runs gate on them. Green tests are the only legitimate "done." | `backend/prompt-builder/tests/test_najim_brain.py` |
| **Checklist mapped to sections** | One markdown file. Every checkbox links back to a §. Implementation isn't "done" until `grep "\[ \]"` returns nothing. | `docs/architecture/najim-brain-checklist.md` |

**Rules:**
1. If this doc, versions.json, and the code disagree — the doc wins. Then the JSON. Then the code. Bump `spec_version` in the JSON for any meaningful change.
2. Never edit `bootstrap.sh` or `provision-tenant.sh` without updating §5 or §6 in the same commit.
3. The pytest suite is the only legitimate "done" signal. A `[fatal]` in the bash output is also a stop. No shipping around either.

---

## 1. Goal

A single, replicable system for deploying the Najim Brain (gbrain) so that:

1. Every paying tenant has their **own scoped memory + knowledge graph** that no other tenant can read.
2. Our customer-facing Python agents (`backend/prompt-builder/`) can query the brain via a standard protocol (MCP over HTTP, OAuth-scoped per tenant).
3. The brain self-enriches nightly (Dream Cycle) without manual intervention.
4. A new tenant can be provisioned end-to-end in **under 15 minutes** following this runbook, with no architectural decisions to make.

---

## 2. Architecture

```text
                 ┌───────────────────────────────────────────────┐
                 │  Customer WhatsApp number (Kapso webhook)     │
                 └────────────────────┬──────────────────────────┘
                                      │
                                      ▼
            ┌─────────────────────────────────────────────────┐
            │  backend/prompt-builder (FastAPI on VPS:8200)   │
            │  ─────────────────────────────────────────────  │
            │  - decides intent                                │
            │  - calls gbrain MCP for context                  │
            │  - calls Anthropic/MiniMax via inference.chat() │
            │  - writes reply to Kapso                         │
            │  - fire-and-forget: append to brain              │
            └────────┬──────────────────────┬─────────────────┘
                     │                      │
                     │ (MCP/HTTP)           │ (MCP/HTTP)
                     ▼                      ▼
       ┌────────────────────────┐   ┌───────────────────────┐
       │   gbrain server       │   │ inference router      │
       │   ──────────────       │   │ Anthropic / MiniMax / │
       │   - vector store       │   │ OpenRouter / DCP      │
       │   - knowledge graph    │   └───────────────────────┘
       │   - hybrid retrieval   │
       │   - Dream Cycle (2am)  │
       │   - MCP (30+ tools)    │
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │  gbrain-postgres       │       ┌─────────────────────┐
       │  pgvector pg16         │       │ Graphiti + Neo4j    │
       │  per-tenant schemas    │◀─────▶│ temporal graph      │
       │  vault, customer mem,  │       │ (already running,   │
       │  facts, insights       │       │  port 8100)         │
       └────────────────────────┘       └─────────────────────┘
```

**Two complementary stores:**
- **gbrain** is the primary: vector retrieval, multi-hop knowledge graph, MCP surface for agents, Dream Cycle.
- **Graphiti** is a temporal-event specialist: "what happened in this customer's history, in order, with what actors." Optional layer for tenants where event sequencing matters more than free-text retrieval.

---

## 3. Current state inventory (VPS `76.13.179.86`)

Containers actually running today:

| Container | Image | Purpose | Status for Najim Brain |
|---|---|---|---|
| `gbrain-postgres` | `pgvector/pgvector:pg16` | gbrain's DB backend | ✓ ready, empty schema |
| `brain-graphiti` | `zepai/graphiti:latest` (port 8100) | Temporal KG via Neo4j | ✓ running, candidate adjunct |
| `brain-neo4j-graphiti` | `neo4j:5.26.2` | Neo4j backing Graphiti | ✓ healthy |
| `agentmemory` | `coolify-agentmemory` | Existing memory layer | ⚠ undocumented, audit before deciding role |
| `hermes-agent` | `nousresearch/hermes-agent:latest` | Hermes agent runtime | adjacent, not in this path |
| `nexus2-openclaw-gateway-1` | `ghcr.io/openclaw/openclaw:2026.5.7` | OpenClaw gateway | adjacent, not in this path |

Filesystem:
- `/opt/ai-brain/` — `docker-compose.yml` for Graphiti + Neo4j (already deployed). Plus `mem0-repo/` clone.
- `/opt/gbrain/` — **does not exist yet**. Will be created in Bootstrap step 3.

Application paths:
- `/opt/agents-platform/` — git checkout of project-agent (this repo)
- `/opt/prompt-builder` — symlink → `/opt/agents-platform/backend/prompt-builder/`

---

## 4. The decision

**Primary brain: gbrain.** Reasons:
- It's a unified spec — vector + graph + MCP + Dream Cycle in one product.
- Standard protocol (MCP) lets our Python agents talk to it without bespoke glue.
- Multi-tenant model (federated source mounts, OAuth-scoped) is purpose-built for our use case.
- The Najim Brain marketing surface (`/brain` page, the homepage section) is already named after it.

**Keep Graphiti** as the temporal-event layer for tenants where it adds value (multi-outlet restaurants, brokerages with long-running deals). Sunset if it doesn't earn its slot within 90 days post-gbrain-go-live.

**Audit `agentmemory` container** in the first week — determine if it carries any data we need to migrate.

---

## 5. Bootstrap (one-time, performed once per VPS)

Run end-to-end on the VPS as root. Total time ~30 minutes including verification.

### 5.1  Install Bun + gbrain CLI

**Important — corrected at spec_version 1.0.1:** gbrain is **Bun-based, not Node-based**. The original §5.1 said "clone the repo, run `node migrate.js`" — that's wrong. gbrain ships as a Bun CLI installed globally. There is no `migrate.js` to run.

```bash
ssh root@76.13.179.86

# Install Bun if not present
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
bun --version  # expect 1.3.14 or higher (see versions.json::runtime.bun_version_min)

# Install gbrain globally
bun install -g github:garrytan/gbrain
gbrain --version  # expect 0.41.26.0 (or whatever is pinned in versions.json::gbrain.version)
```

### 5.2  Apply gbrain migrations

Bun's global install blocks the top-level postinstall hook, so schema migrations don't run automatically. Apply them manually:

```bash
gbrain apply-migrations --yes --non-interactive
# Expect output: "=== v0.31.0 ... Migration complete === " for each pending migration
```

Verify the `gbrain-postgres` container has pgvector + pg_trgm enabled (the container is already running; we just turn the extensions on):

```bash
docker exec gbrain-postgres psql -U gbrain -d gbrain -c "
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
"
```

Note: `gbrain init` defaults to **PGLite** (a WASM Postgres bundled with the CLI) for personal mode. For Najim's multi-tenant production we connect to the dedicated `gbrain-postgres` Docker container via `DATABASE_URL`. The container is the system of record; PGLite is only used during local testing.

### 5.3  Configure secrets

Append to `/etc/prompt-builder/secrets.env`:

```bash
GBRAIN_HTTP_URL=http://127.0.0.1:8300
GBRAIN_ADMIN_KEY=<generate-32-byte-random>
GBRAIN_OAUTH_ISSUER=https://auth.najim.ai      # placeholder until domain registered
GBRAIN_DEFAULT_EMBEDDING_MODEL=nomic-embed-text   # reuse Ollama already running for Graphiti
```

Generate `GBRAIN_ADMIN_KEY`:
```bash
openssl rand -hex 32
```

### 5.4  Install gbrain as a systemd service

Modeled on the existing `prompt-builder.service`:

```ini
# /etc/systemd/system/gbrain.service
[Unit]
Description=Najim Brain (gbrain) MCP + HTTP server
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/gbrain
EnvironmentFile=/etc/prompt-builder/secrets.env
ExecStart=/usr/bin/node ./bin/gbrain-serve --port 8300 --bind 127.0.0.1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Activate:
```bash
systemctl daemon-reload
systemctl enable --now gbrain
sleep 5
systemctl is-active gbrain  # expect: active
curl -sS http://127.0.0.1:8300/health  # expect: {"ok":true,...}
```

### 5.5  Expose gbrain through Traefik (internal-only)

We do NOT make gbrain publicly accessible. Add a Traefik rule that exposes it only to localhost so the prompt-builder service can hit it via `http://127.0.0.1:8300`. No external route.

### 5.6  Wire the Dream Cycle cron

Append to root's crontab:

```cron
# Najim Brain · Dream Cycle · every night at 02:00 Asia/Dubai
0 2 * * *  curl -sS -X POST -H "X-Admin-Key: ${GBRAIN_ADMIN_KEY}" http://127.0.0.1:8300/dream-cycle/run >> /var/log/gbrain-dream.log 2>&1
```

Verify with:
```bash
curl -sS -X POST -H "X-Admin-Key: ${GBRAIN_ADMIN_KEY}" http://127.0.0.1:8300/dream-cycle/run
# Expect: {"started":true,"job_id":"...","tenants":0}
```

### 5.7  Smoke-test

```bash
# Health
curl -sS http://127.0.0.1:8300/health

# Create a test source (cleanup at end)
curl -sS -X POST http://127.0.0.1:8300/sources \
  -H "X-Admin-Key: ${GBRAIN_ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"slug":"smoke-test","name":"Bootstrap smoke test"}'

# Ingest a fact
curl -sS -X POST http://127.0.0.1:8300/pages \
  -H "X-Admin-Key: ${GBRAIN_ADMIN_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"source":"smoke-test","title":"hours","body":"Open 12-11 daily"}'

# Search it back
curl -sS "http://127.0.0.1:8300/search?q=opening+hours&source=smoke-test" \
  -H "X-Admin-Key: ${GBRAIN_ADMIN_KEY}"
# Expect: results array with our page

# Cleanup
curl -sS -X DELETE http://127.0.0.1:8300/sources/smoke-test \
  -H "X-Admin-Key: ${GBRAIN_ADMIN_KEY}"
```

Bootstrap complete when all 4 calls succeed.

---

## 6. Per-tenant provisioning — the replicable procedure

Run this **for every new tenant**. Each step has a verification command. Total time: **~10 minutes per tenant.**

Set the tenant variables once at the top of your shell session:

```bash
TENANT_ID="3bd50557-6680-43b9-bb8e-261c7f8a19d2"  # from clients table
TENANT_SLUG="saffron-kitchen"
TENANT_NAME="Saffron Kitchen"
OWNER_EMAIL="owner@saffron.ae"
KEY=$(grep '^GBRAIN_ADMIN_KEY=' /etc/prompt-builder/secrets.env | cut -d= -f2)
```

### Step 1 — Create the gbrain source

```bash
curl -sS -X POST http://127.0.0.1:8300/sources \
  -H "X-Admin-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d "{\"slug\":\"${TENANT_SLUG}\",\"name\":\"${TENANT_NAME}\",\"tenant_id\":\"${TENANT_ID}\",\"owner_email\":\"${OWNER_EMAIL}\"}"

# Verify:
curl -sS "http://127.0.0.1:8300/sources/${TENANT_SLUG}" -H "X-Admin-Key: $KEY"
```

### Step 2 — Issue OAuth scope for the agent

```bash
curl -sS -X POST http://127.0.0.1:8300/oauth/tokens \
  -H "X-Admin-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d "{\"source\":\"${TENANT_SLUG}\",\"scopes\":[\"read\",\"write\"],\"ttl_days\":365}" \
  | tee /tmp/tenant-token.json

TENANT_TOKEN=$(jq -r .token /tmp/tenant-token.json)
```

Store `TENANT_TOKEN` against the tenant row in `agents-postgres`:

```bash
docker exec agents-postgres psql -U agents_admin -d agents -c "
UPDATE clients
SET gbrain_token = '$TENANT_TOKEN'
WHERE id = '$TENANT_ID';
"
```

(Requires a one-time schema migration to add the `clients.gbrain_token` column — see §9.)

### Step 3 — Seed initial knowledge

Pipe the tenant's existing `business_knowledge` row into gbrain as pages:

```bash
docker exec agents-postgres psql -U agents_admin -d agents -A -t -c "
SELECT crawl_data->'menu_highlights', crawl_data->'faq', crawl_data->'hours', crawl_data->'persona'
FROM business_knowledge WHERE client_id = '$TENANT_ID';
" | python3 /opt/agents-platform/backend/prompt-builder/scripts/seed_gbrain.py \
    --tenant "$TENANT_SLUG" \
    --token "$TENANT_TOKEN"
```

`seed_gbrain.py` (to be written — see §9.2) turns each JSON field into a typed page. Verify the seed:

```bash
curl -sS "http://127.0.0.1:8300/sources/${TENANT_SLUG}/stats" \
  -H "Authorization: Bearer $TENANT_TOKEN"
# Expect: pages > 10, embeddings > 10
```

### Step 4 — Backfill customer memory

Walk the tenant's existing `customer_memory` + `conversation_summaries` rows and write each as a brain page:

```bash
python3 /opt/agents-platform/backend/prompt-builder/scripts/backfill_gbrain.py \
  --tenant "$TENANT_SLUG" \
  --token "$TENANT_TOKEN" \
  --client-id "$TENANT_ID"
```

### Step 5 — Backfill the vault

Same shape for `vault_notes`:

```bash
python3 /opt/agents-platform/backend/prompt-builder/scripts/backfill_gbrain.py \
  --tenant "$TENANT_SLUG" \
  --token "$TENANT_TOKEN" \
  --client-id "$TENANT_ID" \
  --table vault_notes
```

### Step 6 — Enable Dream Cycle for this tenant

The cron from §5.6 runs nightly across all tenants. To add this one to the rotation:

```bash
curl -sS -X POST "http://127.0.0.1:8300/sources/${TENANT_SLUG}/dream-cycle/enable" \
  -H "X-Admin-Key: $KEY"
```

Run it manually once for smoke-test:

```bash
curl -sS -X POST "http://127.0.0.1:8300/sources/${TENANT_SLUG}/dream-cycle/run" \
  -H "X-Admin-Key: $KEY"
```

### Step 7 — Verify the customer agent retrieves from gbrain

Send a synthetic message through the prompt-builder pipeline and check the trace:

```bash
curl -sS -X POST "http://127.0.0.1:8200/owner/command/${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d '{"command":"what hours are we open"}'

# Check the prompt-builder log for "gbrain_context" entries
journalctl -u prompt-builder -n 50 --no-pager | grep gbrain_context
# Expect at least one retrieval hit with the hours page
```

**If step 7 returns a brain hit, the tenant is provisioned. Otherwise rollback (§11) and triage.**

---

## 7. Integration: `backend/prompt-builder` (Python)

A single new module owns the gbrain client:

```python
# backend/prompt-builder/gbrain.py  (TO BE WRITTEN)

import os, httpx
from typing import Optional

_GBRAIN_URL = os.environ.get("GBRAIN_HTTP_URL", "http://127.0.0.1:8300")

async def get_context(token: str, query: str, k: int = 8) -> list[dict]:
    """Hybrid-retrieval against the tenant's brain. Returns up to `k`
    ranked snippets ready to inject into the agent prompt."""
    async with httpx.AsyncClient(timeout=4) as http:
        r = await http.get(
            f"{_GBRAIN_URL}/search",
            params={"q": query, "k": k},
            headers={"Authorization": f"Bearer {token}"},
        )
        if r.status_code != 200:
            return []
        return (r.json() or {}).get("hits", [])

async def append_fact(token: str, title: str, body: str, kind: str = "memory") -> None:
    """Fire-and-forget write. Called from the customer-memory analyzer
    after every inbound message."""
    try:
        async with httpx.AsyncClient(timeout=4) as http:
            await http.post(
                f"{_GBRAIN_URL}/pages",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={"title": title, "body": body, "kind": kind},
            )
    except Exception:
        # Never block the customer reply on a brain write
        pass
```

**Integration points in the existing code:**

1. `app.py` webhook handler — before the LLM call, fetch `get_context(token, text)` and append to the system prompt under a clearly-labeled `## Memory` section.
2. `customer_memory_analyzer.py` — after writing to Postgres, mirror to gbrain via `append_fact()`.
3. `owner_brain.py` `process_owner_command` — same dual-write pattern when the owner adds vault notes.
4. `inference.py` — no change. Gbrain feeds the *prompt*, not the inference layer.

All three integration points are **non-blocking** — gbrain failures degrade gracefully to Postgres-only behavior.

---

## 8. Integration: `apps/website/src/app/brain/page.tsx`

Today `/brain` renders a synthetic demo dataset. Once tenant data is live, swap the rendered dataset:

1. Add a tenant query param: `/brain?tenant=saffron-kitchen` (or default to Saffron for the demo).
2. Server-fetch `/sources/${tenant}/graph?limit=200` from gbrain on page load (Najim admin OAuth token, server-side only — never expose to browser).
3. Pass real nodes + edges into `<BrainCanvas>` in the existing shape.

Reusable. No new component needed.

---

## 9. Schema additions

One-time `agents-postgres` migration before the first tenant is provisioned:

```sql
-- packages/supabase/migrations/021_clients_gbrain.sql

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS gbrain_token TEXT,
  ADD COLUMN IF NOT EXISTS gbrain_source_slug TEXT,
  ADD COLUMN IF NOT EXISTS gbrain_provisioned_at TIMESTAMPTZ;
```

### 9.2 Python helper scripts to write

| Script | What it does |
|---|---|
| `scripts/seed_gbrain.py` | Translate `business_knowledge.crawl_data` JSON into gbrain pages. Idempotent: skip pages already present by source-id. |
| `scripts/backfill_gbrain.py` | Read any table (`customer_memory`, `vault_notes`, `conversation_summaries`) and post each row as a brain page. Resumable on failure. |
| `scripts/diff_gbrain.py` | Compare Postgres truth to gbrain projection; emit a diff so we can detect drift. Run weekly via cron. |

---

## 10. Verification & smoke tests

After every per-tenant provisioning:

1. **Stats endpoint:** `/sources/${slug}/stats` returns pages > 10, embeddings > 10.
2. **Retrieval test:** `/search?q=<owner-known-phrase>&source=${slug}` returns at least one hit with relevance > 0.6.
3. **Agent reply test:** post a customer message via the Kapso simulator OR direct webhook stub; verify the prompt-builder log shows `gbrain_context_hits >= 1`.
4. **Dream Cycle dry-run:** `/sources/${slug}/dream-cycle/run` returns `{"completed":true,...}` within 60 seconds.

If any of these fail: rollback (§11).

---

## 11. Rollback

Reversal procedure if a tenant's gbrain integration misbehaves:

```bash
# Disable retrieval for this tenant (still safe — agents fall back to Postgres)
docker exec agents-postgres psql -U agents_admin -d agents -c "
UPDATE clients SET gbrain_token = NULL WHERE id = '$TENANT_ID';
"

# Optionally delete the gbrain source (keeps the data on Postgres untouched)
curl -sS -X DELETE "http://127.0.0.1:8300/sources/${TENANT_SLUG}" \
  -H "X-Admin-Key: $KEY"

# Restart the prompt-builder so it re-reads the clients table
systemctl restart prompt-builder
```

The customer-facing agent continues to work — it just stops calling gbrain. No customer-visible regression.

---

## 12. Monitoring

Add to the existing `cron_runs` cadence:

| Probe | Frequency | Alert threshold |
|---|---|---|
| `GET /health` on gbrain | every 60s | 2 consecutive failures → page founder |
| Dream Cycle completion | nightly | not-completed by 03:00 local → page |
| Per-tenant retrieval latency p95 | every 15min | > 800ms → soft warning |
| Embedding queue depth | every 5min | > 1000 → scale Ollama |

Surface in the `cron_runs` table so we can graph it from the existing dashboard.

---

## 13. Future work (out of scope for v1)

- **Per-tenant isolated containers** for compliance-sensitive customers (govt, healthcare, banking)
- **Graphiti integration** for tenants where temporal-event sequencing matters
- **Tenant-facing `/dashboard/brain` page** — owner sees their own brain growing
- **Cross-tenant insight library** — patterns learned at one tenant offered (anonymized) to others
- **Replace `agentmemory` container** entirely once we've audited what it carries
- **Migrate from Ollama-hosted embeddings to OpenAI text-embedding-3-small** for higher quality (and pay-per-call cost) — config flip

---

## 14. Operational facts

- **Backup target:** `gbrain-postgres` joins the existing pg_dump nightly backup. Add the schema to the dump script in `infrastructure/backup/`.
- **Disaster recovery RPO:** 24 hours (next nightly dump).
- **DR RTO:** 30 minutes (restore from dump, re-run §5).
- **Cost per tenant per month:** ~$1.20 (Ollama inference + Postgres storage + Dream Cycle compute).
- **Single point of failure:** gbrain-postgres. Mitigation: WAL streaming to a hot standby (Q3 2026).

---

## 15. What this document is NOT

- Not a sales artifact. Use `/brain` on the website for that.
- Not a substitute for reading gbrain's own README at the pinned SHA.
- Not a guarantee gbrain's API matches the examples here — pin a SHA in §5.1 and update this doc when the SHA bumps.

---

## Change log

| Date | Spec version | Change |
|---|---|---|
| 2026-05-27 | 1.0.0 | Initial document. gbrain not yet bootstrapped. |
| 2026-05-27 | **1.0.1** | **Hardwired correction.** Discovered during the bootstrap recon that gbrain is Bun-based, not Node-based — installs globally via `bun install -g github:garrytan/gbrain`, no clone+migrate workflow. Updated §5.1 and §5.2 to match reality. Pinned to gbrain version 0.41.26.0 (commit `42d99b6`) per first install on the VPS. Updated `bootstrap.sh` in the same commit per hardwire rule #2. Migration `021_clients_gbrain.sql` applied to `agents-postgres` and verified — the three new columns (gbrain_token, gbrain_source_slug, gbrain_provisioned_at) are live on `clients`. |
| 2026-05-29 | **1.0.2** | **gbrain HTTP server live in production.** `gbrain serve --http` running as systemd unit `gbrain.service` on the VPS. `GET http://127.0.0.1:3131/health` returns `{status: ok, version: 0.41.26.0, engine: postgres}`. Three endpoint discoveries vs the original spec: (a) port is 3131, not 8300 — the CLI ignores `--port`; (b) bind is `0.0.0.0` by default with no flag override — enforced localhost-only via `iptables INPUT DROP` rule on port 3131 (persisted via `/etc/iptables/rules.v4` + `@reboot` cron); (c) embedding provider is `minimax:embo-01`, not the Ollama `nomic-embed-text` originally pinned — `gbrain config get embedding_model` is the source of truth. Verified put/search pipeline end-to-end with a smoke-test page; retrieval returned a hit with score 0.24. `gbrain-postgres` database URL pre-configured via Docker network gateway (`postgres://gbrain@172.20.0.4:5432/gbrain`) — no change needed. Versions.json bumped, endpoints.* dict added. The admin token is logged to journalctl on first start; capture from `journalctl -u gbrain` and store securely. |
