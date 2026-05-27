#!/usr/bin/env bash
# Najim Brain — bootstrap (one-time per VPS).
#
# Executable version of docs/architecture/najim-brain.md §5.
# Read that doc before editing this script. Every step here mirrors
# a numbered sub-step in §5; if the doc changes, this script changes,
# never the other way around.
#
# Idempotency: safe to re-run. Each step checks current state before
# acting and prints "[skip]" if already done.
#
# Verification: every step ends with a check that prints "[ok]" or
# halts the script with exit code 1.
#
# Usage:
#   ./scripts/najim-brain/bootstrap.sh
#
# Run as root on the VPS (76.13.179.86) or locally if VPS env is mocked.

set -euo pipefail

# ─── Config from versions.json ─────────────────────────────────────
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
VERSIONS_JSON="$REPO_ROOT/docs/architecture/najim-brain-versions.json"

if [ ! -f "$VERSIONS_JSON" ]; then
  echo "[fatal] versions.json missing at $VERSIONS_JSON"
  echo "[fatal] this script must run from the project-agent repo"
  exit 1
fi

read_json() {
  python3 -c "import json, sys; d = json.load(open('$VERSIONS_JSON')); print($1)"
}

GBRAIN_REPO=$(read_json "d['gbrain']['repo']")
GBRAIN_SHA=$(read_json "d['gbrain']['sha']")
GBRAIN_INSTALL_PATH=$(read_json "d['gbrain']['install_path']")
GBRAIN_HTTP_PORT=$(read_json "d['gbrain']['http_port']")
GBRAIN_HTTP_BIND=$(read_json "d['gbrain']['http_bind']")
GBRAIN_SYSTEMD_UNIT=$(read_json "d['gbrain']['systemd_unit']")

PG_CONTAINER=$(read_json "d['postgres']['container_name']")
PG_USER=$(read_json "d['postgres']['db_user']")
PG_DB=$(read_json "d['postgres']['db_name']")

EMBED_MODEL=$(read_json "d['models']['embedding']")
DREAM_SCHEDULE=$(read_json "d['cron']['dream_cycle_schedule']")
DREAM_LOG=$(read_json "d['cron']['dream_cycle_log']")
SECRETS_FILE=$(read_json "d['vps']['secrets_file']")

GBRAIN_HTTP_URL="http://${GBRAIN_HTTP_BIND}:${GBRAIN_HTTP_PORT}"

echo
echo "═══════════════════════════════════════════════════════════════"
echo "  Najim Brain · Bootstrap"
echo "  spec: docs/architecture/najim-brain.md §5"
echo "  versions: $VERSIONS_JSON"
echo "═══════════════════════════════════════════════════════════════"
echo

# ─── §5.1 Clone gbrain ──────────────────────────────────────────────
echo "── §5.1 Clone gbrain ──"

if [ -d "$GBRAIN_INSTALL_PATH/.git" ]; then
  echo "[skip] $GBRAIN_INSTALL_PATH already a git repo"
else
  git clone "$GBRAIN_REPO" "$GBRAIN_INSTALL_PATH"
  echo "[ok] cloned $GBRAIN_REPO → $GBRAIN_INSTALL_PATH"
fi

if [ "$GBRAIN_SHA" = "TO_BE_PINNED_AT_BOOTSTRAP" ]; then
  # First bootstrap — pin whatever main is right now and write it back to versions.json
  pinned=$(git -C "$GBRAIN_INSTALL_PATH" rev-parse HEAD)
  python3 - <<EOF
import json
p = "$VERSIONS_JSON"
d = json.load(open(p))
d["gbrain"]["sha"] = "$pinned"
open(p, "w").write(json.dumps(d, indent=2))
EOF
  echo "[ok] pinned gbrain SHA $pinned in versions.json — COMMIT THIS"
else
  git -C "$GBRAIN_INSTALL_PATH" fetch --quiet
  git -C "$GBRAIN_INSTALL_PATH" checkout --quiet "$GBRAIN_SHA"
  echo "[ok] gbrain checked out at pinned SHA $GBRAIN_SHA"
fi

# ─── §5.2 Provision Postgres role + database ───────────────────────
echo
echo "── §5.2 Provision Postgres role + database ──"

if ! docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
  echo "[fatal] container $PG_CONTAINER is not running — bring it up first"
  exit 1
fi
echo "[ok] $PG_CONTAINER is running"

docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -c "
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE SCHEMA IF NOT EXISTS gbrain;
GRANT ALL ON SCHEMA gbrain TO ${PG_USER};
" >/dev/null
echo "[ok] extensions + schema present"

# Run gbrain's migrations against this DB.
# The exact command depends on what the pinned SHA ships; we expect
# either a migrate.js or migrate.sh entrypoint. Adapt here if the SHA
# bump changes that.
if [ -f "$GBRAIN_INSTALL_PATH/scripts/migrate.js" ]; then
  node "$GBRAIN_INSTALL_PATH/scripts/migrate.js" \
    --url "postgres://${PG_USER}:${POSTGRES_PASSWORD:-}@127.0.0.1:5432/${PG_DB}"
  echo "[ok] gbrain migrations applied"
elif [ -f "$GBRAIN_INSTALL_PATH/Makefile" ]; then
  ( cd "$GBRAIN_INSTALL_PATH" && make migrate )
  echo "[ok] gbrain migrations applied via Makefile"
else
  echo "[warn] no migrate.js or Makefile found in gbrain — read $GBRAIN_INSTALL_PATH/README"
  echo "[warn] and update this script's §5.2 block to match"
  exit 1
fi

# Verify
count=$(docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -At -c \
  "SELECT count(*) FROM pg_tables WHERE schemaname = 'gbrain';")
if [ "$count" -lt 3 ]; then
  echo "[fatal] gbrain schema has only $count tables — expected ≥3"
  exit 1
fi
echo "[ok] gbrain schema has $count tables"

# ─── §5.3 Configure secrets ─────────────────────────────────────────
echo
echo "── §5.3 Configure secrets ──"

if [ ! -w "$SECRETS_FILE" ]; then
  echo "[fatal] cannot write $SECRETS_FILE — run as root on the VPS"
  exit 1
fi

ensure_secret() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$SECRETS_FILE"; then
    echo "[skip] $key already set"
  else
    echo "${key}=${val}" >> "$SECRETS_FILE"
    echo "[ok] added $key"
  fi
}

ensure_secret "GBRAIN_HTTP_URL" "$GBRAIN_HTTP_URL"
ensure_secret "GBRAIN_OAUTH_ISSUER" "https://auth.najim.ai"
ensure_secret "GBRAIN_DEFAULT_EMBEDDING_MODEL" "$EMBED_MODEL"

if ! grep -q "^GBRAIN_ADMIN_KEY=" "$SECRETS_FILE"; then
  admin_key=$(openssl rand -hex 32)
  echo "GBRAIN_ADMIN_KEY=${admin_key}" >> "$SECRETS_FILE"
  echo "[ok] generated GBRAIN_ADMIN_KEY (32 bytes random)"
else
  echo "[skip] GBRAIN_ADMIN_KEY already present"
fi

# ─── §5.4 Install systemd unit ──────────────────────────────────────
echo
echo "── §5.4 Install systemd unit ──"

UNIT_PATH="/etc/systemd/system/${GBRAIN_SYSTEMD_UNIT}"

cat > "$UNIT_PATH" <<UNIT
[Unit]
Description=Najim Brain (gbrain) MCP + HTTP server
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=${GBRAIN_INSTALL_PATH}
EnvironmentFile=${SECRETS_FILE}
ExecStart=/usr/bin/node ./bin/gbrain-serve --port ${GBRAIN_HTTP_PORT} --bind ${GBRAIN_HTTP_BIND}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now "$GBRAIN_SYSTEMD_UNIT"
sleep 5

if ! systemctl is-active --quiet "$GBRAIN_SYSTEMD_UNIT"; then
  echo "[fatal] $GBRAIN_SYSTEMD_UNIT did not come up — check journalctl -u $GBRAIN_SYSTEMD_UNIT"
  exit 1
fi
echo "[ok] $GBRAIN_SYSTEMD_UNIT is active"

# ─── §5.5 (manual: Traefik) ─────────────────────────────────────────
# We deliberately do NOT expose gbrain through Traefik publicly.
# Port ${GBRAIN_HTTP_PORT} is bound to ${GBRAIN_HTTP_BIND} only —
# the prompt-builder talks to it via localhost. No external route.

# ─── §5.6 Dream Cycle cron ──────────────────────────────────────────
echo
echo "── §5.6 Dream Cycle cron ──"

CRON_LINE="${DREAM_SCHEDULE}  curl -sS -X POST -H \"X-Admin-Key: \$(grep ^GBRAIN_ADMIN_KEY= ${SECRETS_FILE} | cut -d= -f2)\" ${GBRAIN_HTTP_URL}/dream-cycle/run >> ${DREAM_LOG} 2>&1"

current_cron=$(crontab -l 2>/dev/null || true)
if echo "$current_cron" | grep -q "dream-cycle/run"; then
  echo "[skip] Dream Cycle cron already present"
else
  ( echo "$current_cron"; echo "$CRON_LINE" ) | crontab -
  echo "[ok] Dream Cycle cron installed ($DREAM_SCHEDULE)"
fi

# ─── §5.7 Smoke test ────────────────────────────────────────────────
echo
echo "── §5.7 Smoke test ──"

KEY=$(grep '^GBRAIN_ADMIN_KEY=' "$SECRETS_FILE" | cut -d= -f2)

curl --fail --silent --show-error --max-time 8 "${GBRAIN_HTTP_URL}/health" > /dev/null
echo "[ok] /health responds"

curl --fail --silent --show-error --max-time 8 -X POST "${GBRAIN_HTTP_URL}/sources" \
  -H "X-Admin-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"slug":"smoke-test","name":"Bootstrap smoke test"}' > /dev/null
echo "[ok] source create"

curl --fail --silent --show-error --max-time 8 -X POST "${GBRAIN_HTTP_URL}/pages" \
  -H "X-Admin-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"source":"smoke-test","title":"hours","body":"Open 12-11 daily"}' > /dev/null
echo "[ok] page ingest"

hits=$(curl --fail --silent --max-time 8 "${GBRAIN_HTTP_URL}/search?q=opening+hours&source=smoke-test" \
  -H "X-Admin-Key: $KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('hits', [])))")
if [ "$hits" -lt 1 ]; then
  echo "[fatal] smoke test retrieval returned 0 hits"
  exit 1
fi
echo "[ok] retrieval returned $hits hits"

curl --fail --silent --show-error --max-time 8 -X DELETE "${GBRAIN_HTTP_URL}/sources/smoke-test" \
  -H "X-Admin-Key: $KEY" > /dev/null
echo "[ok] smoke-test source cleaned up"

echo
echo "═══════════════════════════════════════════════════════════════"
echo "  Bootstrap complete."
echo "  Next: provision your first tenant with"
echo "    ./scripts/najim-brain/provision-tenant.sh <tenant_id> <slug> <name> <owner_email>"
echo "═══════════════════════════════════════════════════════════════"
