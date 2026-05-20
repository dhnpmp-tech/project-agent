"""Gmail inbox triage for the tenant's existing personal/business Gmail.

Reads the owner's inbox via Composio (OAuth already wired in
google_business.py — same `execute_composio_action` helper, just
different Composio actions). Classifies each message into a small
fixed bucket, drafts replies only for the urgent/hot-lead category,
and returns a summary the daily-brief module can fold in.

This solves the "too many emails" pain Nick names in the Greg
Isenberg playbook, scoped to Gmail (the inbox UAE/KSA SMBs actually
use). It is NOT AgentMail — AgentMail spins up NEW inboxes for the
agent. This module reads the OWNER's EXISTING inbox.

Pre-req per tenant: a connected Composio Gmail account. The owner
runs the OAuth flow once at /app/integrations/gmail (front-end work
queued separately). Without that connection this module no-ops with
{"status": "no_connection"} — no crashes, no surprises.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from database import db
from inference import chat as inference_chat

logger = logging.getLogger("gmail_triage")

_COMPOSIO_KEY = os.environ.get("COMPOSIO_API_KEY", "")
_COMPOSIO_BASE = "https://backend.composio.dev/api/v1"

# How many recent threads to pull per triage run. Composio paginates
# Gmail results; this caps the LLM cost per tenant per day. At ~30
# threads/day and ~$0.0002 per Haiku classification = ~$0.18/mo/tenant.
MAX_THREADS_PER_RUN = 30

# Triage buckets the LLM must pick from. Tight controlled vocabulary
# (no free-form labels) so downstream code can branch deterministically.
TRIAGE_BUCKETS = (
    "urgent",          # owner action required today (booking, complaint, legal, money)
    "hot_lead",        # new inbound prospect — sales or enquiry
    "supplier",        # vendor invoice, PO, delivery confirmation
    "receipt",         # transactional / payment receipt — file it, don't reply
    "newsletter",      # subscriptions / marketing — read-only digest
    "internal",        # team / colleague / accountant
    "spam",            # discard
    "other",           # default if none of the above
)


# ---------------------------------------------------------------------
# Composio Gmail action surface (read-only for triage, write for drafts)
# ---------------------------------------------------------------------


async def _composio_gmail_available(client_id: str) -> bool:
    """Check whether this tenant has an active Composio Gmail connection."""
    if not _COMPOSIO_KEY:
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_COMPOSIO_BASE}/connectedAccounts",
                headers={"x-api-key": _COMPOSIO_KEY},
                params={
                    "integration_id": "gmail",
                    "status": "active",
                    # Composio scopes connections by entityId — we pass the
                    # client_id so the right tenant's account surfaces.
                    "entityId": str(client_id),
                },
            )
            if r.status_code != 200:
                return False
            items = (r.json() or {}).get("items", [])
            return len(items) > 0
    except Exception as e:
        logger.warning("composio gmail availability check failed: %s", e)
        return False


async def _composio_action(action: str, params: dict[str, Any], client_id: str) -> dict[str, Any]:
    """Generic Composio action wrapper, scoped to a tenant's entityId."""
    if not _COMPOSIO_KEY:
        return {"error": "COMPOSIO_API_KEY not set"}
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            r = await http.post(
                f"{_COMPOSIO_BASE}/actions/{action}/execute",
                headers={"x-api-key": _COMPOSIO_KEY, "Content-Type": "application/json"},
                json={"entityId": str(client_id), "input": params},
            )
            if r.status_code >= 400:
                return {"error": f"composio {r.status_code}", "detail": r.text[:200]}
            return r.json() or {}
    except Exception as e:
        return {"error": f"composio_exc: {type(e).__name__}", "detail": str(e)[:200]}


async def _list_recent_threads(client_id: str, since: datetime) -> list[dict[str, Any]]:
    """List Gmail threads received since `since`. Returns lightweight metadata.

    The Composio GMAIL_LIST_MESSAGES action returns message snippets +
    from/subject/date. We avoid fetching full bodies here — that's a
    second pass on the threads the triage promotes to "urgent" or
    "hot_lead".
    """
    after_query = since.strftime("%Y/%m/%d")
    result = await _composio_action(
        "GMAIL_LIST_MESSAGES",
        {
            "query": f"after:{after_query} -category:promotions -category:social",
            "max_results": MAX_THREADS_PER_RUN,
        },
        client_id,
    )
    if "error" in result:
        return []
    return result.get("messages", []) or result.get("threads", []) or []


# ---------------------------------------------------------------------
# Triage logic
# ---------------------------------------------------------------------


TRIAGE_SYSTEM = """You are a Gmail triage assistant for a UAE/Saudi SMB owner. For each email metadata block, return STRICT JSON only:

{
  "bucket": one of [urgent, hot_lead, supplier, receipt, newsletter, internal, spam, other],
  "reason": one short clause (<= 80 chars) explaining the bucket,
  "needs_reply": true | false,
  "deadline_hours": number | null   // when needs_reply=true: how urgent in hours
}

Calibration:
- urgent = something the owner must personally handle today (complaint, legal notice, dispute, payment issue, VIP customer)
- hot_lead = new inbound prospect — sales enquiry, intro from referral, partnership request
- supplier = vendor invoice, PO confirmation, delivery notice, restock request
- receipt = pure transactional confirmation, no action needed
- newsletter = bulk marketing / subscription
- internal = team member, accountant, lawyer, employee
- spam = phishing / unsolicited junk

Be conservative — when in doubt between urgent/hot_lead and the rest, pick the more important bucket but set needs_reply only when there is a clear ask."""


async def _classify_thread(meta: dict[str, Any]) -> dict[str, Any]:
    sender = meta.get("from", "")
    subject = meta.get("subject", "")
    snippet = meta.get("snippet", "")[:600]
    date = meta.get("date", "")
    user_msg = (
        f"FROM: {sender}\n"
        f"SUBJECT: {subject}\n"
        f"DATE: {date}\n"
        f"SNIPPET: {snippet}"
    )
    try:
        raw = await inference_chat(
            "quality_eval",  # Haiku via OpenRouter — cheap structured extraction
            [
                {"role": "system", "content": TRIAGE_SYSTEM},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=200,
            json_mode=True,
        )
    except Exception as e:
        logger.warning("triage classify failed: %s", e)
        return {"bucket": "other", "reason": "classifier_error", "needs_reply": False, "deadline_hours": None}
    # Defensive parse
    s = (raw or "").strip()
    first = s.find("{")
    last = s.rfind("}")
    if first < 0 or last < 0:
        return {"bucket": "other", "reason": "unparseable", "needs_reply": False, "deadline_hours": None}
    try:
        parsed = json.loads(s[first : last + 1])
    except json.JSONDecodeError:
        return {"bucket": "other", "reason": "json_parse_failed", "needs_reply": False, "deadline_hours": None}
    bucket = parsed.get("bucket") if parsed.get("bucket") in TRIAGE_BUCKETS else "other"
    return {
        "bucket": bucket,
        "reason": (parsed.get("reason") or "")[:120],
        "needs_reply": bool(parsed.get("needs_reply")),
        "deadline_hours": parsed.get("deadline_hours"),
    }


# ---------------------------------------------------------------------
# Public entry points
# ---------------------------------------------------------------------


async def triage_for_client(client_id: str, hours_back: int = 24) -> dict[str, Any]:
    """Triage one tenant's recent Gmail. Returns summary the daily brief uses."""
    if not await _composio_gmail_available(client_id):
        return {"status": "no_connection", "client_id": client_id}

    since = datetime.now(timezone.utc) - timedelta(hours=hours_back)
    threads = await _list_recent_threads(client_id, since)
    if not threads:
        return {"status": "ok", "client_id": client_id, "total": 0, "buckets": {}, "items": []}

    # Classify in parallel — Haiku via OpenRouter handles ~30 concurrent
    # comfortably, and the prompt-builder runs the inference pool elsewhere.
    classifications = await asyncio.gather(
        *(_classify_thread(t) for t in threads), return_exceptions=True
    )

    items: list[dict[str, Any]] = []
    bucket_counts: dict[str, int] = {b: 0 for b in TRIAGE_BUCKETS}
    for thread, cls in zip(threads, classifications):
        if isinstance(cls, Exception):
            continue
        bucket_counts[cls["bucket"]] += 1
        items.append({
            "thread_id": thread.get("id") or thread.get("threadId") or "",
            "from": thread.get("from", ""),
            "subject": thread.get("subject", "")[:200],
            "snippet": thread.get("snippet", "")[:300],
            "date": thread.get("date", ""),
            "bucket": cls["bucket"],
            "reason": cls["reason"],
            "needs_reply": cls["needs_reply"],
            "deadline_hours": cls["deadline_hours"],
        })

    # Persist the triage snapshot so the brief can render it without
    # re-running the classifier. Idempotent on (client_id, snapshot_date).
    today = datetime.now(timezone.utc).date().isoformat()
    try:
        await db.query(
            """
            INSERT INTO gmail_triage_snapshots
              (client_id, snapshot_date, total_threads, bucket_counts, items)
            VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
            ON CONFLICT (client_id, snapshot_date) DO UPDATE SET
              total_threads = EXCLUDED.total_threads,
              bucket_counts = EXCLUDED.bucket_counts,
              items = EXCLUDED.items,
              updated_at = NOW()
            """,
            client_id,
            today,
            len(items),
            json.dumps(bucket_counts),
            json.dumps(items),
        )
    except Exception as e:
        logger.warning("gmail_triage_snapshots write failed: %s", e)

    return {
        "status": "ok",
        "client_id": client_id,
        "total": len(items),
        "buckets": bucket_counts,
        "items": items,
        "urgent_count": bucket_counts["urgent"],
        "hot_lead_count": bucket_counts["hot_lead"],
    }


async def run_for_active_tenants() -> dict[str, Any]:
    """Cron entry point. Walks active tenants with Gmail connections."""
    rows = await db.query(
        "SELECT id FROM clients WHERE status IN ('active', 'provisioning')"
    )
    out: list[dict[str, Any]] = []
    for r in rows:
        cid = str(r["id"])
        try:
            res = await triage_for_client(cid)
            out.append(res)
        except Exception as e:
            logger.exception("triage_for_client failed for %s", cid)
            out.append({"client_id": cid, "status": "error", "detail": str(e)[:200]})
    return {"tenants": len(rows), "results": out}


if __name__ == "__main__":
    import sys

    async def _main() -> None:
        if len(sys.argv) >= 2:
            r = await triage_for_client(sys.argv[1])
        else:
            r = await run_for_active_tenants()
        print(json.dumps(r, indent=2, default=str))

    asyncio.run(_main())
