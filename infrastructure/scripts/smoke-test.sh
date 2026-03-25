#!/bin/bash
# smoke-test.sh — Quick integration smoke test for the deployed stack
# Usage: ./smoke-test.sh <platform_domain>
#
# Tests:
#   1. Traefik is responding
#   2. Master n8n is healthy
#   3. All client n8n instances are healthy
#   4. Supabase connectivity
#   5. SSL certificates are valid

set -euo pipefail

DOMAIN="${1:?Usage: smoke-test.sh <platform_domain>}"
DEPLOY_BASE="${DEPLOY_BASE:-/deployments}"
PASSED=0
FAILED=0
WARNINGS=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}PASS${NC} $*"; PASSED=$((PASSED + 1)); }
fail() { echo -e "  ${RED}FAIL${NC} $*"; FAILED=$((FAILED + 1)); }
warn() { echo -e "  ${YELLOW}WARN${NC} $*"; WARNINGS=$((WARNINGS + 1)); }

echo ""
echo "=== Smoke Test: ${DOMAIN} ==="
echo "Started at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# --- 1. Docker containers ---
echo "--- Docker Containers ---"
for svc in traefik master-n8n master-postgres redis; do
  status=$(docker inspect -f '{{.State.Status}}' "$svc" 2>/dev/null || echo "not_found")
  if [ "$status" = "running" ]; then
    pass "$svc is running"
  else
    fail "$svc status: $status"
  fi
done

# --- 2. Traefik HTTP ---
echo ""
echo "--- Traefik Reverse Proxy ---"
if curl -sf -o /dev/null --max-time 10 "http://localhost:80"; then
  pass "Traefik HTTP (port 80) responding"
else
  fail "Traefik HTTP (port 80) not responding"
fi

# --- 3. Master n8n health ---
echo ""
echo "--- Master n8n ---"
MASTER_HOST="${MASTER_N8N_HOST:-master-n8n.${DOMAIN}}"
if curl -sf -o /dev/null --max-time 10 "https://${MASTER_HOST}/healthz" 2>/dev/null; then
  pass "Master n8n healthy at https://${MASTER_HOST}"
elif curl -sf -o /dev/null --max-time 10 "http://localhost:5678/healthz" 2>/dev/null; then
  pass "Master n8n healthy at localhost:5678"
  warn "HTTPS not yet configured for master n8n"
else
  fail "Master n8n not responding"
fi

# --- 4. Client instances ---
echo ""
echo "--- Client Instances ---"
CLIENT_COUNT=0
if [ -d "$DEPLOY_BASE" ]; then
  for client_dir in "$DEPLOY_BASE"/*/; do
    [ -d "$client_dir" ] || continue
    slug=$(basename "$client_dir")
    CLIENT_COUNT=$((CLIENT_COUNT + 1))

    n8n_status=$(docker inspect -f '{{.State.Status}}' "n8n-${slug}" 2>/dev/null || echo "not_found")
    pg_status=$(docker inspect -f '{{.State.Status}}' "postgres-${slug}" 2>/dev/null || echo "not_found")

    if [ "$n8n_status" = "running" ] && [ "$pg_status" = "running" ]; then
      pass "Client '${slug}': n8n=running, postgres=running"
    else
      fail "Client '${slug}': n8n=${n8n_status}, postgres=${pg_status}"
    fi
  done
fi

if [ $CLIENT_COUNT -eq 0 ]; then
  warn "No client deployments found in ${DEPLOY_BASE}"
fi

# --- 5. Supabase connectivity ---
echo ""
echo "--- Supabase ---"
if [ -n "${SUPABASE_URL:-}" ]; then
  if curl -sf -o /dev/null --max-time 10 "${SUPABASE_URL}/rest/v1/" \
    -H "apikey: ${SUPABASE_ANON_KEY:-}" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY:-}"; then
    pass "Supabase REST API reachable"
  else
    fail "Supabase REST API not reachable at ${SUPABASE_URL}"
  fi
else
  warn "SUPABASE_URL not set, skipping connectivity check"
fi

# --- 6. SSL certificate check ---
echo ""
echo "--- SSL Certificates ---"
if command -v openssl > /dev/null 2>&1; then
  CERT_EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -n "$CERT_EXPIRY" ]; then
    EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null || date -jf "%b %d %T %Y %Z" "$CERT_EXPIRY" +%s 2>/dev/null || echo 0)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

    if [ "$DAYS_LEFT" -gt 30 ]; then
      pass "SSL cert for ${DOMAIN} valid for ${DAYS_LEFT} days"
    elif [ "$DAYS_LEFT" -gt 0 ]; then
      warn "SSL cert for ${DOMAIN} expires in ${DAYS_LEFT} days"
    else
      fail "SSL cert for ${DOMAIN} has expired"
    fi
  else
    warn "Could not check SSL certificate for ${DOMAIN}"
  fi
else
  warn "openssl not found, skipping SSL check"
fi

# --- Summary ---
echo ""
echo "=== Results ==="
echo -e "  ${GREEN}Passed:${NC}   ${PASSED}"
echo -e "  ${RED}Failed:${NC}   ${FAILED}"
echo -e "  ${YELLOW}Warnings:${NC} ${WARNINGS}"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}Smoke test FAILED. Fix issues above before going live.${NC}"
  exit 1
else
  echo -e "${GREEN}Smoke test PASSED.${NC}"
  exit 0
fi
