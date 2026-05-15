#!/usr/bin/env bash
# Nightly self-improvement - 2 AM UAE (10 PM UTC)
#
# Wrap this with cron_wrap.sh in the crontab so /cron/health can detect
# silent failures. This script itself now also tracks HTTP codes and
# exits non-zero if ANY step returns >= 400 — which the wrapper turns
# into status='failed' in cron_runs + a Kapso page within 15 min.

set -uo pipefail

LOG_PREFIX="[NIGHTLY $(date "+%Y-%m-%d %H:%M:%S")]"
API="${API:-http://localhost:8200}"
FAIL=0

# Wrap a curl call so we trip FAIL on >= 400 OR network error.
hit() {
  local label="$1"; shift
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 90 "$@")
  echo "$LOG_PREFIX $label  HTTP ${code:-network_err}"
  if [ -z "$code" ] || [ "$code" -ge 400 ]; then
    FAIL=$(( FAIL + 1 ))
  fi
}

echo "$LOG_PREFIX Starting nightly tasks"
hit "Karpathy Loop" "${API}/karpathy"

CLIENT_IDS=$(curl -s --max-time 30 "${API}/clients/active" | jq -r ".clients[].id" 2>/dev/null || echo "")
if [ -z "$CLIENT_IDS" ]; then
  echo "$LOG_PREFIX WARN: /clients/active returned no clients"
  FAIL=$(( FAIL + 1 ))
fi

echo "$CLIENT_IDS" | while IFS= read -r cid; do
  [ -z "$cid" ] && continue
  hit "Patterns for $cid" "${API}/karpathy/${cid}/conversation-patterns?days=1"
  hit "Apply learnings for $cid" -X POST "${API}/karpathy/${cid}/apply-learnings"
done

echo "$LOG_PREFIX Done · failures=$FAIL"
exit "$FAIL"
