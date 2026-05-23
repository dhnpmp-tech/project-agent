#!/bin/bash
# cron_ceo.sh — CEO Persona (Rami Mansour) scheduled tasks
ACTION=$1
BASE="http://localhost:8200"

case "$ACTION" in
  morning-brief)
    echo "[$(date)] CEO Morning Brief"
    curl -s -X POST "$BASE/ceo/cron/morning-brief"
    ;;
  post-karpathy)
    echo "[$(date)] CEO Post-Karpathy Analysis"
    curl -s -X POST "$BASE/ceo/cron/post-karpathy"
    ;;
  github-digest)
    echo "[$(date)] CEO GitHub Digest"
    curl -s -X POST "$BASE/ceo/cron/github-digest"
    ;;
  market-intel)
    echo "[$(date)] CEO Market Intel Scan"
    curl -s -X POST "$BASE/ceo/cron/market-intel"
    ;;
  *)
    echo "Usage: $0 {morning-brief|post-karpathy|github-digest|market-intel}"
    exit 1
    ;;
esac
