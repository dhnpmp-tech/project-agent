#!/bin/bash
# health-check.sh — Check health of all client containers
# Usage: ./health-check.sh [--json]

set -euo pipefail

OUTPUT_JSON="${1:-}"
DEPLOY_BASE="/deployments"
RESULTS=()

log() {
  if [ "${OUTPUT_JSON}" != "--json" ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [health] $*"
  fi
}

for CLIENT_DIR in "${DEPLOY_BASE}"/*/; do
  [ -d "${CLIENT_DIR}" ] || continue
  CLIENT_SLUG=$(basename "${CLIENT_DIR}")

  # Check n8n container
  N8N_STATUS=$(docker inspect -f '{{.State.Status}}' "n8n-${CLIENT_SLUG}" 2>/dev/null || echo "not_found")

  # Check postgres container
  PG_STATUS=$(docker inspect -f '{{.State.Status}}' "postgres-${CLIENT_SLUG}" 2>/dev/null || echo "not_found")

  if [ "${OUTPUT_JSON}" = "--json" ]; then
    RESULTS+=("{\"slug\":\"${CLIENT_SLUG}\",\"n8n\":\"${N8N_STATUS}\",\"postgres\":\"${PG_STATUS}\"}")
  else
    log "${CLIENT_SLUG}: n8n=${N8N_STATUS} postgres=${PG_STATUS}"
  fi
done

if [ "${OUTPUT_JSON}" = "--json" ]; then
  IFS=','
  echo "[${RESULTS[*]:-}]"
fi
