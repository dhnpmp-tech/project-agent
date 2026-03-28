#!/bin/bash
# validate-env.sh — Validate that all required environment variables are set
# Usage: ./validate-env.sh [--production]
#
# Checks required env vars for the platform stack. Use --production for
# stricter checks (SSL, domain, external APIs).

set -euo pipefail

MODE="${1:-development}"
ERRORS=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_var() {
  local var_name="$1"
  local required="$2"
  local description="$3"

  local value="${!var_name:-}"

  if [ -z "$value" ]; then
    if [ "$required" = "required" ]; then
      echo -e "  ${RED}MISSING${NC}  ${var_name} — ${description}"
      ERRORS=$((ERRORS + 1))
    else
      echo -e "  ${YELLOW}OPTIONAL${NC} ${var_name} — ${description}"
    fi
  else
    # Mask sensitive values
    local display
    if [[ "$var_name" == *KEY* || "$var_name" == *PASSWORD* || "$var_name" == *TOKEN* || "$var_name" == *SECRET* ]]; then
      display="${value:0:8}..."
    else
      display="$value"
    fi
    echo -e "  ${GREEN}SET${NC}      ${var_name} = ${display}"
  fi
}

echo ""
echo "=== Environment Validation (${MODE}) ==="
echo ""

echo "--- Core Platform ---"
check_var PLATFORM_DOMAIN required "Root domain for the platform"
check_var ACME_EMAIL required "Email for Let's Encrypt SSL certificates"

echo ""
echo "--- Supabase ---"
check_var SUPABASE_URL required "Supabase project URL"
check_var SUPABASE_ANON_KEY required "Supabase anonymous/public key"
check_var SUPABASE_SERVICE_ROLE_KEY required "Supabase service role key (server-side only)"

echo ""
echo "--- Master n8n Stack ---"
check_var MASTER_N8N_HOST required "Master n8n subdomain"
check_var N8N_ENCRYPTION_KEY required "n8n encryption key"
check_var MASTER_DB_USER required "Master PostgreSQL username"
check_var MASTER_DB_PASSWORD required "Master PostgreSQL password"
check_var REDIS_PASSWORD required "Redis password"

echo ""
echo "--- AI / LLM ---"
check_var ANTHROPIC_API_KEY required "Anthropic Claude API key"

echo ""
echo "--- DNS (Cloudflare) ---"
check_var CLOUDFLARE_API_TOKEN required "Cloudflare API token for DNS management"
check_var CLOUDFLARE_ZONE_ID required "Cloudflare zone ID for your domain"

echo ""
echo "--- Integrations ---"
check_var SENDGRID_API_KEY optional "SendGrid API key for email notifications"
check_var WHATSAPP_API_TOKEN optional "WhatsApp Business API token"
check_var WHATSAPP_PHONE_NUMBER_ID optional "WhatsApp phone number ID"

if [ "$MODE" = "--production" ]; then
  echo ""
  echo "--- Production Checks ---"

  # Check domain resolves
  if command -v dig > /dev/null 2>&1 && [ -n "${PLATFORM_DOMAIN:-}" ]; then
    if dig +short "${PLATFORM_DOMAIN}" | grep -q .; then
      echo -e "  ${GREEN}OK${NC}       DNS resolves for ${PLATFORM_DOMAIN}"
    else
      echo -e "  ${RED}FAIL${NC}     DNS does not resolve for ${PLATFORM_DOMAIN}"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  # Check Docker is running
  if docker info > /dev/null 2>&1; then
    echo -e "  ${GREEN}OK${NC}       Docker daemon is running"
  else
    echo -e "  ${RED}FAIL${NC}     Docker daemon is not running"
    ERRORS=$((ERRORS + 1))
  fi

  # Check Docker Compose
  if docker compose version > /dev/null 2>&1; then
    echo -e "  ${GREEN}OK${NC}       Docker Compose v2 available"
  else
    echo -e "  ${RED}FAIL${NC}     Docker Compose v2 not found"
    ERRORS=$((ERRORS + 1))
  fi
fi

echo ""
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}Validation failed with ${ERRORS} error(s).${NC}"
  echo "Fix the issues above before deploying."
  exit 1
else
  echo -e "${GREEN}All required environment variables are set.${NC}"
  exit 0
fi
