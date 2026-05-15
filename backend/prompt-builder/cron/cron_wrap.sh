#!/usr/bin/env bash
# cron_wrap.sh · wrap any command with heartbeat + finish posts.
#
# Usage:
#   cron_wrap.sh <cron_name> <command...>
#
# Posts to /cron/heartbeat/start before the command, captures duration +
# exit code + stdout tail, and posts to /cron/heartbeat/finish at the
# end. A separate watchdog (/cron/health, every 15 min) pages the
# founder on Kapso WhatsApp when a failed run shows up.
#
# Always exits with the underlying command's exit code so cron logs
# still reflect reality.

set -o pipefail

API="${API:-http://localhost:8200}"
NAME="${1:-unknown}"
shift || true

# heartbeat/start — record a 'running' row + capture id
START_MS=$(date +%s%3N 2>/dev/null || date +%s)000
START_RESP=$(curl -sS --max-time 10 -X POST "$API/cron/heartbeat/start" \
  -H 'Content-Type: application/json' \
  -d "{\"cron_name\":\"$NAME\"}" 2>/dev/null || echo "{}")
# Best-effort id extraction without jq dependency
RUN_ID=$(printf '%s' "$START_RESP" | sed -n 's/.*"run_id":\([0-9]*\).*/\1/p')

# Run the actual command, capture output + exit code
OUTPUT_FILE=$(mktemp -t cron_wrap.XXXXXX)
"$@" > "$OUTPUT_FILE" 2>&1
EXIT_CODE=$?

# Pipe stdout/stderr through so existing log redirection still works
cat "$OUTPUT_FILE"

# Tail of output for the notes column (last 1500 chars, JSON-escaped)
NOTES_TAIL=$(tail -c 1500 "$OUTPUT_FILE" \
  | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')

END_MS=$(date +%s%3N 2>/dev/null || date +%s)000
DURATION=$(( END_MS - START_MS ))

if [ "$EXIT_CODE" -eq 0 ]; then
  STATUS="success"
else
  STATUS="failed"
fi

# Pull any HTTP status codes the inner script may have echoed (we follow
# the convention "  HTTP NNN" used by existing cron scripts)
HTTP_CODES=$(grep -oE 'HTTP [0-9]+' "$OUTPUT_FILE" | awk '{print $2}' | paste -sd, -)

curl -sS --max-time 10 -X POST "$API/cron/heartbeat/finish" \
  -H 'Content-Type: application/json' \
  -d "{\"run_id\":${RUN_ID:-null},\"cron_name\":\"$NAME\",\"status\":\"$STATUS\",\"exit_code\":$EXIT_CODE,\"duration_ms\":$DURATION,\"http_codes\":\"$HTTP_CODES\",\"notes\":$NOTES_TAIL}" \
  > /dev/null 2>&1

rm -f "$OUTPUT_FILE"
exit "$EXIT_CODE"
