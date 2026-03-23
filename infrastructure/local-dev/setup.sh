#!/bin/bash
# setup.sh — Start the local agent dev environment and import the test workflow
#
# Prerequisites:
#   - Docker Desktop running
#   - .env file with ANTHROPIC_API_KEY set
#
# Usage: ./setup.sh

set -euo pipefail
cd "$(dirname "$0")"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[setup]${NC} $*"; }
warn() { echo -e "${YELLOW}[setup]${NC} $*"; }
err()  { echo -e "${RED}[setup]${NC} $*"; }

# --- 1. Check .env ---
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    warn ".env created from .env.example — please edit it and add your ANTHROPIC_API_KEY"
    warn "Then re-run this script."
    exit 1
  else
    err "No .env file found. Create one with ANTHROPIC_API_KEY=sk-ant-..."
    exit 1
  fi
fi

# Check that ANTHROPIC_API_KEY is set
source .env
if [ -z "${ANTHROPIC_API_KEY:-}" ] || [ "${ANTHROPIC_API_KEY}" = "sk-ant-..." ]; then
  err "ANTHROPIC_API_KEY is not set in .env — please add your API key"
  exit 1
fi

log "ANTHROPIC_API_KEY is configured"

# --- 2. Start Docker containers ---
log "Starting n8n + Postgres..."
docker compose up -d

# --- 3. Wait for n8n to be ready ---
log "Waiting for n8n to start..."
MAX_WAIT=90
WAITED=0
while [ ${WAITED} -lt ${MAX_WAIT} ]; do
  if curl -sf http://localhost:5678/healthz > /dev/null 2>&1; then
    log "n8n is ready!"
    break
  fi
  sleep 3
  WAITED=$((WAITED + 3))
  echo -n "."
done
echo ""

if [ ${WAITED} -ge ${MAX_WAIT} ]; then
  err "n8n did not start within ${MAX_WAIT}s. Check: docker compose logs n8n"
  exit 1
fi

# --- 4. Import the test workflow ---
log "Importing test workflow..."

# n8n REST API — import workflow
IMPORT_RESULT=$(curl -sf -X POST "http://localhost:5678/api/v1/workflows" \
  -H "Content-Type: application/json" \
  -d @workflow-local-test.json 2>&1) || true

if echo "$IMPORT_RESULT" | grep -q '"id"'; then
  WORKFLOW_ID=$(echo "$IMPORT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "unknown")
  log "Workflow imported (ID: ${WORKFLOW_ID})"

  # Activate the workflow
  curl -sf -X PATCH "http://localhost:5678/api/v1/workflows/${WORKFLOW_ID}" \
    -H "Content-Type: application/json" \
    -d '{"active": true}' > /dev/null 2>&1 || true
  log "Workflow activated"
else
  warn "Could not auto-import workflow. You may need to import it manually:"
  warn "  1. Open http://localhost:5678"
  warn "  2. Create a new workflow"
  warn "  3. Import from file: workflow-local-test.json"
  warn ""
  warn "API response: ${IMPORT_RESULT}"
fi

# --- 5. Done ---
echo ""
echo "=============================================="
echo ""
log "Local agent environment is ready!"
echo ""
echo "  n8n UI:     http://localhost:5678"
echo "  Webhook:    http://localhost:5678/webhook/chat"
echo ""
echo "  Test with curl:"
echo ""
echo '  curl -X POST http://localhost:5678/webhook/chat \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{"message": "Hi, I want to learn about your AI agents"}'"'"''
echo ""
echo '  # Arabic test:'
echo '  curl -X POST http://localhost:5678/webhook/chat \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{"message": "السلام عليكم، هل تقدمون خدمات الذكاء الاصطناعي؟"}'"'"''
echo ""
echo "=============================================="
