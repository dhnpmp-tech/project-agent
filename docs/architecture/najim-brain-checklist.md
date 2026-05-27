# Najim Brain — implementation checklist

> Single-page progress tracker for the deploy. Every box maps to a
> specific section of `docs/architecture/najim-brain.md`. Check the
> box only after the verification command succeeds — green tests
> are the gate, not vibes.
>
> When all boxes are checked, the Najim Brain is live for at least
> one tenant. Grep the file: `grep "\[ \]" najim-brain-checklist.md`
> returns nothing on a complete deploy.

## Phase 0 — Pre-flight

- [ ] Read `docs/architecture/najim-brain.md` end-to-end (~15 min)
- [ ] Confirm `docs/architecture/najim-brain-versions.json` is current
- [ ] SSH access to `root@76.13.179.86` works
- [ ] `gbrain-postgres` container is running (`docker ps | grep gbrain-postgres`)

## Phase 1 — Bootstrap (one-time, ~30 min)

Execute via `./scripts/najim-brain/bootstrap.sh` from the repo root on the VPS. The script's `[ok]` / `[skip]` / `[fatal]` markers map 1:1 to these checkboxes.

- [ ] §5.1 gbrain repo cloned at `/opt/gbrain` and pinned to a real SHA in versions.json
- [ ] §5.2 gbrain Postgres schema migrated — `\dt gbrain.*` shows ≥3 tables
- [ ] §5.3 secrets added to `/etc/prompt-builder/secrets.env`: `GBRAIN_HTTP_URL` · `GBRAIN_ADMIN_KEY` · `GBRAIN_OAUTH_ISSUER` · `GBRAIN_DEFAULT_EMBEDDING_MODEL`
- [ ] §5.4 systemd unit `gbrain.service` enabled + active
- [ ] §5.5 gbrain bound to `127.0.0.1:8300` only — `curl http://76.13.179.86:8300/health` from a laptop returns "connection refused"
- [ ] §5.6 Dream Cycle cron line installed (`crontab -l | grep dream-cycle`)
- [ ] §5.7 smoke test all 4 calls return `[ok]` in bootstrap.sh output

## Phase 2 — Engineering scaffolding (one-time)

Files to commit before per-tenant work:

- [ ] `packages/supabase/migrations/021_clients_gbrain.sql` applied to `agents-postgres`
- [ ] `backend/prompt-builder/gbrain.py` module imported successfully (`python3 -c "from gbrain import get_context"`)
- [ ] `backend/prompt-builder/scripts/seed_gbrain.py` written (§9.2 spec)
- [ ] `backend/prompt-builder/scripts/backfill_gbrain.py` written (§9.2 spec)
- [ ] `backend/prompt-builder/scripts/diff_gbrain.py` written (§9.2 spec)
- [ ] Three call sites wired in existing code:
  - [ ] `app.py` webhook → `gbrain.get_context()` before LLM call
  - [ ] `customer_memory_analyzer.py` → `gbrain.append_fact()` after every inbound message
  - [ ] `owner_brain.process_owner_command` → `gbrain.append_fact()` on vault updates

## Phase 3 — Provision tenant #1 (Saffron Kitchen, ~10 min)

Execute via `./scripts/najim-brain/provision-tenant.sh 3bd50557-6680-43b9-bb8e-261c7f8a19d2 saffron-kitchen "Saffron Kitchen" owner@saffron.ae`

- [ ] §6.1 source `saffron-kitchen` created in gbrain
- [ ] §6.2 OAuth token issued and stored in `clients.gbrain_token`
- [ ] §6.3 initial knowledge seeded — `stats` endpoint reports ≥ 10 pages
- [ ] §6.4 `customer_memory` rows backfilled into gbrain
- [ ] §6.5 `vault_notes` rows backfilled into gbrain
- [ ] §6.6 Dream Cycle enabled for `saffron-kitchen` + first run completed
- [ ] §6.7 prompt-builder log shows `gbrain_context` hits on a synthetic test query
- [ ] `pytest backend/prompt-builder/tests/test_najim_brain.py -v` is green

## Phase 4 — Cutover to live brain

- [ ] `/brain` page on the website renders the real `saffron-kitchen` graph (not the synthetic dataset)
- [ ] Three real customer voice notes to Saffron's number produce visible new nodes in the brain within 10 minutes
- [ ] Nightly Dream Cycle log shows successful runs for 3 consecutive nights
- [ ] Founder smoke-tests the agent's recall: text "what does Ahmad usually order" and confirm the reply pulls from `customer_memory`

## Phase 5 — Hand-off and monitoring

- [ ] Health probe added to monitoring (`GET /health` every 60s)
- [ ] Dream Cycle alert wired (no completion by 03:00 local → page)
- [ ] Retrieval latency p95 dashboard built (threshold from versions.json)
- [ ] Weekly `diff_gbrain.py` cron runs and emails the diff
- [ ] Runbook §11 (rollback) tested at least once on a staging tenant

## Notes for the implementer

- **Hardwiring rule #1:** if `najim-brain.md`, `najim-brain-versions.json`, and the code disagree — the doc wins. Then the JSON. Then the code. Bump `spec_version` if you change any of them.
- **Hardwiring rule #2:** never edit `bootstrap.sh` or `provision-tenant.sh` without updating §5 or §6 of the doc in the same commit.
- **Hardwiring rule #3:** the pytest suite in §10 is the only legitimate "done." A `[fatal]` in the bash output is also a stop. Don't ship around it.
