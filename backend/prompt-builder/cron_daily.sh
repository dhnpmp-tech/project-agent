#!/bin/bash
# Daily morning tasks - 9 AM UAE (5 AM UTC)
LOG_PREFIX="[DAILY $(date "+%Y-%m-%d %H:%M:%S")]"
API="http://localhost:8200"

echo "$LOG_PREFIX Starting daily tasks"

CLIENT_IDS=$(curl -s "${API}/clients/active" | jq -r ".clients[].id")

if [ -z "$CLIENT_IDS" ]; then
  echo "$LOG_PREFIX WARNING: No active clients"
else
  echo "$CLIENT_IDS" | while read cid; do
    [ -z "$cid" ] && continue
    echo "$LOG_PREFIX Morning brief for $cid"
    curl -s "${API}/owner/brief/${cid}" -o /dev/null -w "  HTTP %{http_code}\n"
  done
fi

echo "$LOG_PREFIX Done"
