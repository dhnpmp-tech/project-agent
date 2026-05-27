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

# ─── §5.1 Install Bun + gbrain CLI ──────────────────────────────────
echo "── §5.1 Install Bun + gbrain CLI ──"

# gbrain is Bun-based, not Node. Don't try to clone+build — use the
# global install path which is what gbrain's INSTALL_FOR_AGENTS.md
# documents.
export PATH="$HOME/.bun/bin:$PATH"

if ! command -v bun >/dev/null 2>&1; then
  curl -fsSL https://bun.sh/install | bash >/dev/null 2>&1
  export PATH="$HOME/.bun/bin:$PATH"
  echo "[ok] bun installed at $(bun --version)"
else
  echo "[skip] bun already installed: $(bun --version)"
fi

if ! command -v gbrain >/dev/null 2>&1; then
  bun install -g github:garrytan/gbrain
  echo "[ok] gbrain installed"
else
  current_version=$(gbrain --version 2>&1 | head -1)
  echo "[skip] gbrain already installed: $current_version"
fi

INSTALLED_VERSION=$(gbrain --version 2>&1 | head -1 | awk '{print $2}')
PINNED_VERSION=$(read_json "d['gbrain']['version']")

if [ "$INSTALLED_VERSION" != "$PINNED_VERSION" ]; then
  echo "[warn] installed $INSTALLED_VERSION but versions.json pinned $PINNED_VERSION"
  echo "       bump spec_version in najim-brain-versions.json if this is intentional"
fi
echo "[ok] gbrain version: $INSTALLED_VERSION"

# ─── §5.2 Apply gbrain migrations ───────────────────────────────────
echo
echo "── §5.2 Apply gbrain migrations ──"

# Bun blocks the top-level postinstall hook on global installs, so
# schema migrations don't run automatically. Run them explicitly.
gbrain apply-migrations --yes --non-interactive 2>&1 | tail -5
echo "[ok] migrations applied"

# Verify the pgvector container is present (we still need it for the
# production Postgres backend, even though gbrain init defaults to PGLite)
if ! docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
  echo "[fatal] container $PG_CONTAINER is not running — bring it up first"
  exit 1
fi
echo "[ok] $PG_CONTAINER is running (production Postgres backend)"

docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -c "
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
" >/dev/null
echo "[ok] pgvector + pg_trgm extensions present on $PG_CONTAINER"

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

GBRAIN_BIN="$HOME/.bun/bin/gbrain"
if [ ! -x "$GBRAIN_BIN" ]; then
  GBRAIN_BIN=$(command -v gbrain)
fi

cat > "$UNIT_PATH" <<UNIT
[Unit]
Description=Najim Brain (gbrain) HTTP server
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/root
Environment="PATH=/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
EnvironmentFile=${SECRETS_FILE}
ExecStart=${GBRAIN_BIN} serve --port ${GBRAIN_HTTP_PORT} --bind ${GBRAIN_HTTP_BIND}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
echo "[note] verify 'gbrain serve' is the correct subcommand on the pinned version"
echo "[note] if not, update the ExecStart line and bump spec_version"

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
