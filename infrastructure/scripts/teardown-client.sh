#!/bin/bash
# teardown-client.sh — Safely stop and remove a client's Docker environment
# Usage: ./teardown-client.sh <client_slug> [--delete-data]

set -euo pipefail

CLIENT_SLUG="${1:?Usage: teardown-client.sh <client_slug> [--delete-data]}"
DELETE_DATA="${2:-}"

DEPLOY_BASE="/deployments"
CLIENT_DIR="${DEPLOY_BASE}/${CLIENT_SLUG}"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [teardown] $*"
}

if [ ! -d "${CLIENT_DIR}" ]; then
  log "ERROR: Client directory not found: ${CLIENT_DIR}"
  exit 1
fi

log "Stopping containers for: ${CLIENT_SLUG}"
cd "${CLIENT_DIR}"
docker compose down

if [ "${DELETE_DATA}" = "--delete-data" ]; then
  log "Removing Docker volumes..."
  docker compose down -v
  log "Removing client directory..."
  rm -rf "${CLIENT_DIR}"
  log "Client data deleted completely."
else
  log "Containers stopped. Data volumes preserved."
  log "To delete data, run: $0 ${CLIENT_SLUG} --delete-data"
fi

log "Teardown complete for: ${CLIENT_SLUG}"
