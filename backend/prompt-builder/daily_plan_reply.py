"""Daily-plan reply parser · closes the approval loop.

When an owner replies to the morning brief on their owner-channel
WhatsApp, the webhook routes the message here. We parse the text
against the day's pending_approval queue and flip rows to
'approved' / 'rejected'. Then we compose a one-line confirmation
the webhook sends back via Kapso.

Reply grammar (case-insensitive, whitespace-tolerant):
  "yes" | "y" | "approve all" | "go" | "✓"      → approve EVERY pending action
  "no" | "n" | "skip" | "skip all" | "✗"        → reject EVERY pending action
  "A C E" | "a,c,e" | "approve A C E"           → approve those, reject rest
  Anything else                                 → return None (caller
                                                  falls through to normal
                                                  owner-command processing)
"""

from __future__ import annotations
import os
import re
from datetime import datetime, timezone
from typing import Optional
from zoneinfo import ZoneInfo

import supa


_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_HEADERS = {
    "apikey": os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
    "Authorization": f"Bearer {os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


_YES_TOKENS = {"yes", "y", "go", "approve", "approve all", "ok", "okay", "✓", "👍", "✅"}
_NO_TOKENS = {"no", "n", "skip", "skip all", "cancel", "stop", "✗", "❌"}
_LETTER_RE = re.compile(r"\b([A-H])\b", re.IGNORECASE)


def parse_approval_reply(
    text: str, available_tokens: list[str]
) -> Optional[dict]:
    """Return a decision dict if the text matches an approval grammar.

    Returns None when the text doesn't look like an approval reply at
    all — the webhook then falls through to the normal owner-command
    handler (which already understands 'sales', 'guest report' etc).

    Decision shape:
      {"mode": "approve_all"} |
      {"mode": "reject_all"} |
      {"mode": "subset", "approve": ["A", "C"]}
    """
    t = (text or "").strip().lower()
    if not t:
        return None
    # Strip surrounding punctuation
    t = re.sub(r"^[^\w]+|[^\w\s,]+$", "", t)

    if t in _YES_TOKENS:
        return {"mode": "approve_all"}
    if t in _NO_TOKENS:
        return {"mode": "reject_all"}

    # Look for letter tokens that match the available approval letters
    found_letters = [m.upper() for m in _LETTER_RE.findall(text or "")]
    valid_letters = [L for L in found_letters if L in available_tokens]
    if valid_letters:
        # Only treat as a letter-list reply if MORE than half the message
        # body is letter-tokens + whitespace + commas. Otherwise a casual
        # message like "All good, talk later" wouldn't trip the parser
        # because "All" → none of A-H match.
        stripped = re.sub(r"[A-H,.\s]", "", text, flags=re.IGNORECASE)
        if len(stripped) <= 6:  # tiny stray words tolerated
            return {"mode": "subset", "approve": valid_letters}
        # "approve A C E" — explicit verb followed by letters
        if "approve" in t or "yes" in t or "go" in t:
            return {"mode": "subset", "approve": valid_letters}

    return None


async def pending_approval_today(client_id: str, local_date: str) -> list[dict]:
    async with supa.client(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/agent_action_queue"
            f"?client_id=eq.{client_id}"
            f"&for_date=eq.{local_date}"
            f"&status=eq.pending_approval"
            f"&select=id,approval_token,description"
            f"&order=approval_token.asc",
            headers=_SUPA_HEADERS,
        )
    try:
        return r.json() if r.status_code == 200 else []
    except Exception:
        return []


async def _update_action(action_id: str, new_status: str, approved_by: str) -> bool:
    payload = {
        "status": new_status,
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "approved_by": approved_by,
    }
    async with supa.client(timeout=10) as http:
        r = await http.patch(
            f"{_SUPA_URL}/rest/v1/agent_action_queue?id=eq.{action_id}",
            headers=_SUPA_HEADERS,
            json=payload,
        )
    return r.status_code < 400


def _local_today(tz_name: str) -> str:
    try:
        return datetime.now(ZoneInfo(tz_name)).date().isoformat()
    except Exception:
        return datetime.now(ZoneInfo("Asia/Dubai")).date().isoformat()


async def try_handle_approval(
    client_id: str, owner_timezone: str, text: str
) -> Optional[str]:
    """Returns a confirmation message string if the text was handled as
    an approval reply, OR None if the text wasn't an approval reply
    (caller falls through to process_owner_command).

    Designed to be safe to call on every owner message — the parser
    returns None unless the text genuinely looks like approval.
    """
    local_date = _local_today(owner_timezone or "Asia/Dubai")
    pending = await pending_approval_today(client_id, local_date)
    if not pending:
        return None

    available_tokens = [p["approval_token"] for p in pending if p.get("approval_token")]
    decision = parse_approval_reply(text, available_tokens)
    if decision is None:
        return None

    approved_count = 0
    rejected_count = 0
    summary_lines: list[str] = []

    if decision["mode"] == "approve_all":
        for p in pending:
            ok = await _update_action(p["id"], "approved", "owner_wa")
            if ok:
                approved_count += 1
        summary_lines.append(f"✅ Approved all {approved_count} actions for today.")

    elif decision["mode"] == "reject_all":
        for p in pending:
            ok = await _update_action(p["id"], "rejected", "owner_wa")
            if ok:
                rejected_count += 1
        summary_lines.append(f"⏭ Skipped all {rejected_count} actions for today.")

    elif decision["mode"] == "subset":
        approve_set = set(decision["approve"])
        for p in pending:
            tok = p.get("approval_token") or ""
            if tok in approve_set:
                if await _update_action(p["id"], "approved", "owner_wa"):
                    approved_count += 1
                    summary_lines.append(f"  ✅ {tok}. {p.get('description','')[:80]}")
            else:
                if await _update_action(p["id"], "rejected", "owner_wa"):
                    rejected_count += 1
        head = f"✅ Approved {approved_count} · ⏭ Skipped {rejected_count}"
        summary_lines.insert(0, head)

    if not summary_lines:
        return None
    return "\n".join(summary_lines)
