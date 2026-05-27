#!/usr/bin/env bash
# Najim Brain — per-tenant provisioning.
#
# Executable version of docs/architecture/najim-brain.md §6.
# Read that doc before editing this script. Every step here mirrors
# a numbered sub-step in §6.
#
# Usage:
#   ./scripts/najim-brain/provision-tenant.sh <TENANT_ID> <SLUG> <NAME> <OWNER_EMAIL>
#
# Example:
#   ./scripts/najim-brain/provision-tenant.sh \
#     3bd50557-6680-43b9-bb8e-261c7f8a19d2 \
#     saffron-kitchen \
#     "Saffron Kitchen" \
#     "owner@saffron.ae"
#
# Idempotent: re-running on an already-provisioned tenant is safe —
# each step skips if state is already correct.

set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: $0 <TENANT_ID> <SLUG> <NAME> <OWNER_EMAIL>"
  echo
  echo "  TENANT_ID    UUID from agents.clients.id"
  echo "  SLUG         URL-safe identifier, e.g. saffron-kitchen"
  echo "  NAME         Display name, e.g. \"Saffron Kitchen\""
  echo "  OWNER_EMAIL  Owner's email for OAuth scope"
  exit 1
fi

TENANT_ID="$1"
TENANT_SLUG="$2"
TENANT_NAME="$3"
OWNER_EMAIL="$4"

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
VERSIONS_JSON="$REPO_ROOT/docs/architecture/najim-brain-versions.json"

read_json() {
  python3 -c "import json; d = json.load(open('$VERSIONS_JSON')); print($1)"
}

GBRAIN_HTTP_URL=$(read_json "f\"http://{d['gbrain']['http_bind']}:{d['gbrain']['http_port']}\"")
SECRETS_FILE=$(read_json "d['vps']['secrets_file']")
PG_CONTAINER="agents-postgres"

KEY=$(grep '^GBRAIN_ADMIN_KEY=' "$SECRETS_FILE" | cut -d= -f2)
if [ -z "$KEY" ]; then
  echo "[fatal] GBRAIN_ADMIN_KEY not set — bootstrap first"
  exit 1
fi

echo
echo "═══════════════════════════════════════════════════════════════"
echo "  Najim Brain · Provisioning tenant"
echo "  ─────────────────────────────────"
echo "  id:    $TENANT_ID"
echo "  slug:  $TENANT_SLUG"
echo "  name:  $TENANT_NAME"
echo "  owner: $OWNER_EMAIL"
echo "  spec:  docs/architecture/najim-brain.md §6"
echo "═══════════════════════════════════════════════════════════════"
echo

# ─── §6.1 Create gbrain source ──────────────────────────────────────
echo "── §6.1 Create gbrain source ──"

existing=$(curl -sS --max-time 6 "${GBRAIN_HTTP_URL}/sources/${TENANT_SLUG}" \
  -H "X-Admin-Key: $KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('slug','none'))" 2>/dev/null || true)

if [ "$existing" = "$TENANT_SLUG" ]; then
  echo "[skip] source ${TENANT_SLUG} already exists"
else
  curl --fail --silent --show-error --max-time 10 -X POST "${GBRAIN_HTTP_URL}/sources" \
    -H "X-Admin-Key: $KEY" \
    -H "Content-Type: application/json" \
    -d "{\"slug\":\"${TENANT_SLUG}\",\"name\":\"${TENANT_NAME}\",\"tenant_id\":\"${TENANT_ID}\",\"owner_email\":\"${OWNER_EMAIL}\"}" > /dev/null
  echo "[ok] source created"
fi

# ─── §6.2 Issue OAuth scope ─────────────────────────────────────────
echo
echo "── §6.2 Issue OAuth scope ──"

token_already=$(docker exec "$PG_CONTAINER" psql -U agents_admin -d agents -At -c \
  "SELECT COALESCE(gbrain_token, '') FROM clients WHERE id = '$TENANT_ID';" 2>/dev/null || echo "")

if [ -n "$token_already" ]; then
  echo "[skip] gbrain_token already stored for $TENANT_ID"
  TENANT_TOKEN="$token_already"
else
  TENANT_TOKEN=$(curl --fail --silent --show-error --max-time 10 -X POST "${GBRAIN_HTTP_URL}/oauth/tokens" \
    -H "X-Admin-Key: $KEY" \
    -H "Content-Type: application/json" \
    -d "{\"source\":\"${TENANT_SLUG}\",\"scopes\":[\"read\",\"write\"],\"ttl_days\":365}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

  docker exec "$PG_CONTAINER" psql -U agents_admin -d agents -c \
    "UPDATE clients SET gbrain_token = '$TENANT_TOKEN', gbrain_source_slug = '$TENANT_SLUG', gbrain_provisioned_at = NOW() WHERE id = '$TENANT_ID';" > /dev/null
  echo "[ok] token issued + stored on clients row"
fi

# ─── §6.3 Seed initial knowledge ───────────────────────────────────
echo
echo "── §6.3 Seed initial knowledge ──"

SEED_SCRIPT="$REPO_ROOT/backend/prompt-builder/scripts/seed_gbrain.py"
if [ ! -f "$SEED_SCRIPT" ]; then
  echo "[warn] $SEED_SCRIPT not yet implemented — skipping seed"
  echo "       this is the gap between architecture and engineering;"
  echo "       see docs/architecture/najim-brain.md §9.2"
else
  python3 "$SEED_SCRIPT" \
    --tenant "$TENANT_SLUG" \
    --token "$TENANT_TOKEN" \
    --client-id "$TENANT_ID"
  echo "[ok] knowledge seeded"
fi

# ─── §6.4 Backfill customer_memory ─────────────────────────────────
echo
echo "── §6.4 Backfill customer_memory ──"

BACKFILL_SCRIPT="$REPO_ROOT/backend/prompt-builder/scripts/backfill_gbrain.py"
if [ ! -f "$BACKFILL_SCRIPT" ]; then
  echo "[warn] $BACKFILL_SCRIPT not yet implemented — skipping backfill"
else
  python3 "$BACKFILL_SCRIPT" \
    --tenant "$TENANT_SLUG" \
    --token "$TENANT_TOKEN" \
    --client-id "$TENANT_ID" \
    --table customer_memory
  echo "[ok] customer_memory backfilled"
fi

# ─── §6.5 Backfill vault_notes ─────────────────────────────────────
echo
echo "── §6.5 Backfill vault_notes ──"

if [ -f "$BACKFILL_SCRIPT" ]; then
  python3 "$BACKFILL_SCRIPT" \
    --tenant "$TENANT_SLUG" \
    --token "$TENANT_TOKEN" \
    --client-id "$TENANT_ID" \
    --table vault_notes
  echo "[ok] vault_notes backfilled"
else
  echo "[warn] backfill_gbrain.py missing — see §9.2"
fi

# ─── §6.6 Enable Dream Cycle for this tenant ───────────────────────
echo
echo "── §6.6 Enable Dream Cycle ──"

curl --fail --silent --show-error --max-time 10 -X POST \
  "${GBRAIN_HTTP_URL}/sources/${TENANT_SLUG}/dream-cycle/enable" \
  -H "X-Admin-Key: $KEY" > /dev/null
echo "[ok] Dream Cycle enabled for ${TENANT_SLUG}"

curl --fail --silent --show-error --max-time 30 -X POST \
  "${GBRAIN_HTTP_URL}/sources/${TENANT_SLUG}/dream-cycle/run" \
  -H "X-Admin-Key: $KEY" > /dev/null
echo "[ok] first Dream Cycle ran"

# ─── §6.7 Verify retrieval ─────────────────────────────────────────
echo
echo "── §6.7 Verify retrieval ──"

stats=$(curl --fail --silent --max-time 8 "${GBRAIN_HTTP_URL}/sources/${TENANT_SLUG}/stats" \
  -H "Authorization: Bearer $TENANT_TOKEN")
pages=$(echo "$stats" | python3 -c "import sys,json; print(json.load(sys.stdin).get('pages', 0))")
embeddings=$(echo "$stats" | python3 -c "import sys,json; print(json.load(sys.stdin).get('embeddings', 0))")

THRESHOLD=$(read_json "d['operations']['smoke_test_pages_threshold']")

if [ "$pages" -lt "$THRESHOLD" ]; then
  echo "[warn] only $pages pages ingested — threshold is $THRESHOLD"
  echo "       acceptable for greenfield tenants; backfill once they have history"
else
  echo "[ok] $pages pages · $embeddings embeddings"
fi

echo
echo "═══════════════════════════════════════════════════════════════"
echo "  Tenant provisioned."
echo "  Next: restart prompt-builder so the new gbrain_token is read"
echo "    systemctl restart prompt-builder"
echo "  Then exercise the smoke tests:"
echo "    pytest backend/prompt-builder/tests/test_najim_brain.py"
echo "═══════════════════════════════════════════════════════════════"
