#!/bin/bash
# backup-client.sh — Backup a client's PostgreSQL data to S3-compatible storage
# Usage: ./backup-client.sh <client_slug>

set -euo pipefail

CLIENT_SLUG="${1:?Usage: backup-client.sh <client_slug>}"

DEPLOY_BASE="/deployments"
CLIENT_DIR="${DEPLOY_BASE}/${CLIENT_SLUG}"
BACKUP_DIR="/tmp/backups"
TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${CLIENT_SLUG}_${TIMESTAMP}.sql.gz"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [backup] $*"
}

# Load client env
if [ -f "${CLIENT_DIR}/.env" ]; then
  # shellcheck disable=SC1091
  source "${CLIENT_DIR}/.env"
fi

mkdir -p "${BACKUP_DIR}"

log "Starting backup for: ${CLIENT_SLUG}"

# Dump PostgreSQL
docker exec "postgres-${CLIENT_SLUG}" pg_dump \
  -U "${DB_USER:-n8n}" \
  -d "n8n_${CLIENT_SLUG//-/_}" \
  | gzip > "${BACKUP_FILE}"

log "Backup saved to: ${BACKUP_FILE}"

# Upload to S3 if configured
if [ -n "${S3_BUCKET:-}" ] && [ -n "${S3_ENDPOINT:-}" ]; then
  aws s3 cp "${BACKUP_FILE}" \
    "s3://${S3_BUCKET}/clients/${CLIENT_SLUG}/${CLIENT_SLUG}_${TIMESTAMP}.sql.gz" \
    --endpoint-url "${S3_ENDPOINT}" \
    2>/dev/null && log "Uploaded to S3" || log "WARNING: S3 upload failed"
fi

# Clean up local backup older than 7 days
find "${BACKUP_DIR}" -name "${CLIENT_SLUG}_*.sql.gz" -mtime +7 -delete 2>/dev/null

log "Backup complete for: ${CLIENT_SLUG}"
