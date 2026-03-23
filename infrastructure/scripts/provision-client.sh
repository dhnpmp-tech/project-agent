#!/bin/bash
# provision-client.sh — Called by Master n8n to spin up a new client environment
# Usage: ./provision-client.sh <client_slug> <config_json_path>
#
# The config JSON file should contain all client-specific values:
# {
#   "client_id": "uuid",
#   "slug": "client-name",
#   "platform_domain": "yoursystem.com",
#   "anthropic_api_key": "sk-...",
#   "whatsapp_api_token": "...",
#   ...
# }

set -euo pipefail

CLIENT_SLUG="${1:?Usage: provision-client.sh <client_slug> <config_json_path>}"
CONFIG_PATH="${2:?Usage: provision-client.sh <client_slug> <config_json_path>}"

DEPLOY_BASE="/deployments"
CLIENT_DIR="${DEPLOY_BASE}/${CLIENT_SLUG}"
TEMPLATE_PATH="/scripts/../docker-compose.client.template.yml"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [provision] $*"
}

log "Starting provisioning for client: ${CLIENT_SLUG}"

# --- 1. Validate config ---
if [ ! -f "${CONFIG_PATH}" ]; then
  log "ERROR: Config file not found: ${CONFIG_PATH}"
  exit 1
fi

# --- 2. Create client directory ---
if [ -d "${CLIENT_DIR}" ]; then
  log "WARNING: Client directory already exists: ${CLIENT_DIR}"
else
  mkdir -p "${CLIENT_DIR}"
  log "Created directory: ${CLIENT_DIR}"
fi

# --- 3. Generate secrets ---
DB_USER="n8n_${CLIENT_SLUG//-/_}"
DB_PASSWORD=$(openssl rand -hex 24)
N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
N8N_AUTH_USER="admin"
N8N_AUTH_PASSWORD=$(openssl rand -hex 16)
CLIENT_SLUG_UNDERSCORE="${CLIENT_SLUG//-/_}"

# --- 4. Read config values ---
PLATFORM_DOMAIN=$(jq -r '.platform_domain' "${CONFIG_PATH}")
CLIENT_ID=$(jq -r '.client_id' "${CONFIG_PATH}")
ANTHROPIC_API_KEY=$(jq -r '.anthropic_api_key // ""' "${CONFIG_PATH}")
WHATSAPP_API_TOKEN=$(jq -r '.whatsapp_api_token // ""' "${CONFIG_PATH}")
WHATSAPP_PHONE_NUMBER_ID=$(jq -r '.whatsapp_phone_number_id // ""' "${CONFIG_PATH}")
SENDGRID_API_KEY=$(jq -r '.sendgrid_api_key // ""' "${CONFIG_PATH}")
CALENDLY_API_KEY=$(jq -r '.calendly_api_key // ""' "${CONFIG_PATH}")
CRM_API_KEY=$(jq -r '.crm_api_key // ""' "${CONFIG_PATH}")
SUPABASE_URL=$(jq -r '.supabase_url // ""' "${CONFIG_PATH}")
SUPABASE_SERVICE_ROLE_KEY=$(jq -r '.supabase_service_role_key // ""' "${CONFIG_PATH}")
REDIS_PASSWORD=$(jq -r '.redis_password // ""' "${CONFIG_PATH}")

# --- 5. Generate docker-compose.yml from template ---
TEMPLATE_FILE="/scripts/docker-compose.client.template.yml"
if [ ! -f "${TEMPLATE_FILE}" ]; then
  # Fallback path
  TEMPLATE_FILE="$(dirname "$0")/../docker-compose.client.template.yml"
fi

sed \
  -e "s|{{CLIENT_SLUG}}|${CLIENT_SLUG}|g" \
  -e "s|{{CLIENT_SLUG_UNDERSCORE}}|${CLIENT_SLUG_UNDERSCORE}|g" \
  -e "s|{{PLATFORM_DOMAIN}}|${PLATFORM_DOMAIN}|g" \
  -e "s|{{CLIENT_ID}}|${CLIENT_ID}|g" \
  -e "s|{{DB_USER}}|${DB_USER}|g" \
  -e "s|{{DB_PASSWORD}}|${DB_PASSWORD}|g" \
  -e "s|{{N8N_ENCRYPTION_KEY}}|${N8N_ENCRYPTION_KEY}|g" \
  -e "s|{{N8N_AUTH_USER}}|${N8N_AUTH_USER}|g" \
  -e "s|{{N8N_AUTH_PASSWORD}}|${N8N_AUTH_PASSWORD}|g" \
  -e "s|{{ANTHROPIC_API_KEY}}|${ANTHROPIC_API_KEY}|g" \
  -e "s|{{WHATSAPP_API_TOKEN}}|${WHATSAPP_API_TOKEN}|g" \
  -e "s|{{WHATSAPP_PHONE_NUMBER_ID}}|${WHATSAPP_PHONE_NUMBER_ID}|g" \
  -e "s|{{SENDGRID_API_KEY}}|${SENDGRID_API_KEY}|g" \
  -e "s|{{CALENDLY_API_KEY}}|${CALENDLY_API_KEY}|g" \
  -e "s|{{CRM_API_KEY}}|${CRM_API_KEY}|g" \
  -e "s|{{SUPABASE_URL}}|${SUPABASE_URL}|g" \
  -e "s|{{SUPABASE_SERVICE_ROLE_KEY}}|${SUPABASE_SERVICE_ROLE_KEY}|g" \
  -e "s|{{REDIS_PASSWORD}}|${REDIS_PASSWORD}|g" \
  "${TEMPLATE_FILE}" > "${CLIENT_DIR}/docker-compose.yml"

log "Generated docker-compose.yml"

# --- 6. Store credentials in .env (for reference, not used by compose) ---
cat > "${CLIENT_DIR}/.env" <<EOF
CLIENT_SLUG=${CLIENT_SLUG}
CLIENT_ID=${CLIENT_ID}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
N8N_AUTH_USER=${N8N_AUTH_USER}
N8N_AUTH_PASSWORD=${N8N_AUTH_PASSWORD}
N8N_URL=https://${CLIENT_SLUG}.${PLATFORM_DOMAIN}
EOF

log "Stored credentials in .env"

# --- 7. Start the client stack ---
cd "${CLIENT_DIR}"
docker compose up -d

log "Docker containers started"

# --- 8. Wait for n8n to be healthy ---
N8N_URL="https://${CLIENT_SLUG}.${PLATFORM_DOMAIN}"
MAX_WAIT=120
WAITED=0

log "Waiting for n8n to become healthy at ${N8N_URL}..."
while [ ${WAITED} -lt ${MAX_WAIT} ]; do
  if curl -sf "${N8N_URL}/healthz" > /dev/null 2>&1; then
    log "n8n is healthy!"
    break
  fi
  sleep 5
  WAITED=$((WAITED + 5))
done

if [ ${WAITED} -ge ${MAX_WAIT} ]; then
  log "WARNING: n8n did not become healthy within ${MAX_WAIT}s"
fi

# --- 9. Output result as JSON for n8n to consume ---
cat <<EOF
{
  "status": "success",
  "client_slug": "${CLIENT_SLUG}",
  "n8n_url": "${N8N_URL}",
  "n8n_auth_user": "${N8N_AUTH_USER}",
  "n8n_auth_password": "${N8N_AUTH_PASSWORD}",
  "db_user": "${DB_USER}",
  "db_password": "${DB_PASSWORD}"
}
EOF
