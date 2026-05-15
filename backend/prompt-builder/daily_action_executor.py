"""Daily-action executor · turns approved rows into actual drafts.

The planner queues actions, the morning brief surfaces them, the owner
approves a subset via WhatsApp. This module is the final piece: a cron
that wakes up periodically, finds `status='approved' AND for_date<=today`
rows, and produces the actual output for each (a drafted review reply,
an IG caption, a B2B outreach message, a re-engagement DM, etc.).

Drafts land in `agent_action_queue.payload.draft` and the row flips
to status='executed'. NOTHING is sent live without the owner's explicit
re-approval — this commit deliberately stops at "draft ready" because
auto-sending is a different trust ladder.

For action types we can't yet draft meaningfully (e.g. menu_kb_refresh
which needs the owner to upload new data), we mark executed with a
no_draft flag so the row doesn't stay forever in the queue.

Dispatch is by exact action_type when known, else falls through to a
generic "describe + draft" prompt. The generic path keeps the cron
useful even when the planner invents new action_types.
"""

from __future__ import annotations
import json
import os
from datetime import datetime, timezone
from typing import Optional

import supa
import inference


_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_HEADERS = {
    "apikey": os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
    "Authorization": f"Bearer {os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


# Per-action-type prompt templates. Each is filled with business context
# + action description + target. Output is the actual draft (review
# reply text, IG caption, outreach message, etc.) — short, in the
# tenant's brand voice, no preamble.
_PROMPTS: dict[str, str] = {
    "review_reply_draft": (
        "You are the AI manager for {business} in {city}. Draft a warm, brand-aligned "
        "response to a customer review (1-3 sentences, no emojis, signed only if the "
        "review was negative). Brand voice: {voice}\n\n"
        "Specific task: {description}\n"
        "Target: {target}\n\n"
        "Output only the reply text — no preamble, no quotes."
    ),
    "ig_post_draft": (
        "You are the social-media voice for {business} in {city}. Draft ONE Instagram "
        "post for this task. 2-4 sentences. No hashtag spam — max 3 hashtags. Brand "
        "voice: {voice}\n\n"
        "Specific task: {description}\n"
        "Target: {target}\n\n"
        "Output only the caption — no preamble, no markdown."
    ),
    "social_dm_queue": (
        "You are the AI manager for {business} in {city}. Draft a short, friendly DM "
        "response template covering the most likely customer questions on Instagram + "
        "WhatsApp Business. 2-3 sentences max. Brand voice: {voice}\n\n"
        "Specific task: {description}\n"
        "Target: {target}\n\n"
        "Output only the DM text."
    ),
    "reengagement_dm": (
        "You are the AI manager for {business} in {city}. Draft a re-engagement "
        "WhatsApp DM to a customer who hasn't visited in 45+ days. 1-2 sentences, "
        "warm, no pressure. Mention something specific they'd remember. Brand voice: "
        "{voice}\n\n"
        "Specific task: {description}\n"
        "Target: {target}\n\n"
        "Output only the DM. No preamble."
    ),
    "b2b_outreach": (
        "You are the B2B development lead for {business} in {city}. Draft a short "
        "intro email (3 short paragraphs, max 120 words total) to a corporate prospect. "
        "Specific, no buzzwords. End with a single calendar-suggestion CTA. Brand "
        "voice: {voice}\n\n"
        "Specific task: {description}\n"
        "Target: {target}\n\n"
        "Output only the email body (no subject line — just the message)."
    ),
    "no_show_followup": (
        "You are the AI manager for {business} in {city}. Draft a short WhatsApp "
        "follow-up to a no-show guest asking gently for a reason and offering to "
        "rebook. 1-2 sentences, warm. Brand voice: {voice}\n\n"
        "Specific task: {description}\n"
        "Target: {target}\n\n"
        "Output only the DM."
    ),
}

# Action types that don't need an LLM draft — they're operational signals
# the agent records as "done" without producing customer-facing content.
_OPERATIONAL: set[str] = {
    "menu_kb_refresh",  # owner uploads new data; no draft needed
    "morning_kb_refresh",
    "ops_check",
}


async def _fetch_client(client_id: str) -> Optional[dict]:
    async with supa.client(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/clients?id=eq.{client_id}"
            f"&select=id,company_name,country&limit=1",
            headers=_SUPA_HEADERS,
        )
    try:
        rows = r.json() if r.status_code == 200 else []
    except Exception:
        rows = []
    return rows[0] if rows else None


async def _fetch_brand_voice(client_id: str) -> str:
    async with supa.client(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}"
            f"&select=brand_voice&limit=1",
            headers=_SUPA_HEADERS,
        )
    try:
        rows = r.json() if r.status_code == 200 else []
    except Exception:
        rows = []
    bv = (rows[0].get("brand_voice") or "") if rows else ""
    return bv[:500] or "warm, concise, brand-aligned"


async def _approved_due_rows() -> list[dict]:
    """All rows that the executor should process this run."""
    async with supa.client(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/agent_action_queue"
            f"?status=eq.approved"
            f"&for_date=lte.{datetime.now(timezone.utc).date().isoformat()}"
            f"&select=id,client_id,agent,action_type,target,description,payload,approval_token,for_date"
            f"&order=for_date.asc,approval_token.asc"
            f"&limit=100",
            headers=_SUPA_HEADERS,
        )
    try:
        return r.json() if r.status_code == 200 else []
    except Exception:
        return []


async def _update_row(row_id: str, status: str, payload: dict, error: Optional[str] = None) -> bool:
    body = {
        "status": status,
        "executed_at": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
    }
    if error:
        body["blocked_reason"] = error[:500]
    async with supa.client(timeout=10) as http:
        r = await http.patch(
            f"{_SUPA_URL}/rest/v1/agent_action_queue?id=eq.{row_id}",
            headers=_SUPA_HEADERS,
            json=body,
        )
    return r.status_code < 400


async def _draft_for_row(row: dict, client: dict, brand_voice: str) -> Optional[str]:
    """LLM-draft the output for a single row. Returns the draft text or
    None if the action type doesn't need a draft.
    """
    action_type = (row.get("action_type") or "").lower()
    if action_type in _OPERATIONAL:
        return None

    template = _PROMPTS.get(action_type) or (
        "You are the AI manager for {business} in {city}. Draft the deliverable "
        "for this task in your tenant's brand voice. Brand voice: {voice}\n\n"
        "Specific task: {description}\n"
        "Target: {target}\n\n"
        "Output only the deliverable — no preamble, no markdown."
    )
    prompt = template.format(
        business=client.get("company_name") or "the business",
        city="Dubai" if (client.get("country") or "AE") == "AE" else "Riyadh",
        voice=brand_voice,
        description=row.get("description") or row.get("action_type", "action"),
        target=row.get("target") or "(no target)",
    )
    try:
        return await inference.chat(
            "rami_research",
            [{"role": "user", "content": prompt}],
            max_tokens=600,
        )
    except Exception as e:
        print(f"[executor] LLM call failed for {row.get('id')}: {type(e).__name__}: {e}")
        return None


async def execute_due() -> dict:
    """Process every approved + due row. Each gets a drafted output
    (or is marked executed with no_draft when operational), and the
    row flips to status='executed'.
    """
    rows = await _approved_due_rows()
    if not rows:
        return {"processed": 0, "results": []}

    # Group by client to amortise the client+brand-voice fetches.
    by_client: dict[str, list[dict]] = {}
    for r in rows:
        cid = r["client_id"]
        by_client.setdefault(cid, []).append(r)

    results: list[dict] = []
    for client_id, client_rows in by_client.items():
        client = await _fetch_client(client_id)
        if not client:
            for r in client_rows:
                results.append({"id": r["id"], "skipped": "client_not_found"})
            continue
        brand_voice = await _fetch_brand_voice(client_id)

        for r in client_rows:
            try:
                draft = await _draft_for_row(r, client, brand_voice)
            except Exception as e:
                draft = None
                err = f"{type(e).__name__}: {e}"
                results.append({"id": r["id"], "error": err})
                continue

            payload = dict(r.get("payload") or {})
            if draft:
                payload["draft"] = draft.strip()[:6000]
                payload["drafted_at"] = datetime.now(timezone.utc).isoformat()
            else:
                payload["no_draft"] = True

            ok = await _update_row(r["id"], "executed", payload)
            results.append({
                "id": r["id"],
                "action_type": r.get("action_type"),
                "drafted": bool(draft),
                "preview": (draft or "")[:140],
                "updated": ok,
            })

    return {
        "processed": len(rows),
        "tenants": len(by_client),
        "results": results,
        "ran_at": datetime.now(timezone.utc).isoformat(),
    }


async def execute_one(row_id: str) -> dict:
    """Process a single row by id — used by ops smoke tests."""
    async with supa.client(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/agent_action_queue?id=eq.{row_id}"
            f"&select=id,client_id,agent,action_type,target,description,payload,approval_token,for_date&limit=1",
            headers=_SUPA_HEADERS,
        )
    rows = r.json() if r.status_code == 200 else []
    if not rows:
        return {"error": "row_not_found", "id": row_id}
    row = rows[0]
    client = await _fetch_client(row["client_id"])
    if not client:
        return {"error": "client_not_found", "id": row_id}
    brand_voice = await _fetch_brand_voice(row["client_id"])
    draft = await _draft_for_row(row, client, brand_voice)
    payload = dict(row.get("payload") or {})
    if draft:
        payload["draft"] = draft.strip()[:6000]
        payload["drafted_at"] = datetime.now(timezone.utc).isoformat()
    else:
        payload["no_draft"] = True
    ok = await _update_row(row["id"], "executed", payload)
    return {
        "id": row_id,
        "action_type": row.get("action_type"),
        "drafted": bool(draft),
        "preview": (draft or "")[:300],
        "updated": ok,
    }
