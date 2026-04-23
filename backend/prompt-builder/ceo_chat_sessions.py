"""Session CRUD + cross-device merge for the Ask Rami widget.

resolve_or_create — return an existing session id (if cookie valid) or create one.
bind_identity     — attach name/company/email/whatsapp; merge sessions on email collision.
forget            — DELETE the session (messages cascade via FK).
history           — return last N messages for a session.
"""

from __future__ import annotations

import re
from typing import Any, Optional

from ceo_persona import (
    _supabase_query as _raw_supabase_query,
    _supabase_insert as _raw_supabase_insert,
    _supabase_update as _raw_supabase_update,
    _supabase_delete,
)


# ── Local kwargs-friendly shims around the raw helpers ──────────────

async def _supabase_query(table: str, **filters) -> list:
    parts = []
    select = filters.pop("select", None)
    if select:
        parts.append(f"select={select}")
    for k, v in (filters.pop("eq", None) or {}).items():
        parts.append(f"{k}=eq.{v}")
    order = filters.pop("order", None)
    if order:
        parts.append(f"order={order}")
    limit = filters.pop("limit", None)
    if limit is not None:
        parts.append(f"limit={limit}")
    return await _raw_supabase_query(table, "&".join(parts))


async def _supabase_insert(table: str, data: dict) -> dict:
    return await _raw_supabase_insert(table, data)


async def _supabase_update(table: str, data: dict, eq: dict) -> dict:
    """Update by eq filter. Looks up the row id first, then patches by id."""
    eq_parts = "&".join(f"{k}=eq.{v}" for k, v in eq.items())
    rows = await _raw_supabase_query(table, f"select=id&{eq_parts}&limit=1")
    if not rows:
        return {}
    return await _raw_supabase_update(table, str(rows[0]["id"]), data)


# ── Session API ─────────────────────────────────────────────────────

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


async def resolve_or_create(cookie_id: Optional[str], browser_lang: str, page: str) -> str:
    # Only attempt to look up the cookie if it is a syntactically valid uuid.
    # Anything else (forged, truncated, legacy) silently provisions a new
    # session instead of crashing the endpoint with PostgREST's 22P02 error.
    if cookie_id and _UUID_RE.match(cookie_id):
        rows = await _supabase_query(
            "ceo_chat_sessions", select="id", eq={"id": cookie_id}, limit=1,
        )
        if rows:
            return cookie_id
    new = await _supabase_insert("ceo_chat_sessions", {
        "browser_lang": browser_lang if browser_lang in ("en", "ar") else "en",
        "last_page": page,
    })
    return new["id"]


def _identity_to_columns(identity: dict) -> dict:
    out: dict = {}
    for k_in, k_db in [
        ("name", "identity_name"),
        ("company", "identity_company"),
        ("email", "identity_email"),
        ("whatsapp", "identity_whatsapp"),
    ]:
        if identity.get(k_in):
            out[k_db] = identity[k_in]
    if identity.get("confidence") in ("confirmed", "inferred"):
        out["identity_confidence"] = identity["confidence"]
    return out


async def bind_identity(session_id: str, identity: dict) -> str:
    """Bind identity to session_id. If email matches an existing OLDER session,
    merge per spec Section 4.6 and return the older session id."""
    email = identity.get("email")
    if not email:
        cols = _identity_to_columns(identity)
        if cols:
            await _supabase_update("ceo_chat_sessions", cols, eq={"id": session_id})
        return session_id

    existing = await _supabase_query(
        "ceo_chat_sessions",
        select="id,first_seen,identity_name,identity_company,identity_whatsapp,tags",
        eq={"identity_email": email},
        limit=1,
    )
    if not existing or existing[0]["id"] == session_id:
        cols = _identity_to_columns(identity)
        if cols:
            await _supabase_update("ceo_chat_sessions", cols, eq={"id": session_id})
        return session_id

    older = existing[0]
    older_id = older["id"]
    # Reassign messages from new session to older session
    await _supabase_update(
        "ceo_chat_messages", {"session_id": older_id}, eq={"session_id": session_id},
    )
    # Older wins for name/company/whatsapp; newer fills gaps
    merged_cols: dict[str, Any] = {}
    for k_in, k_db in [
        ("name", "identity_name"),
        ("company", "identity_company"),
        ("whatsapp", "identity_whatsapp"),
    ]:
        if not older.get(k_db) and identity.get(k_in):
            merged_cols[k_db] = identity[k_in]
    merged_cols["identity_email"] = email
    if identity.get("confidence") == "confirmed":
        merged_cols["identity_confidence"] = "confirmed"
    if merged_cols:
        await _supabase_update("ceo_chat_sessions", merged_cols, eq={"id": older_id})
    # Tags union
    new_tags = identity.get("inferred_tags") or []
    if new_tags:
        existing_tags = set(older.get("tags") or [])
        merged_tags = sorted(existing_tags | set(new_tags))
        await _supabase_update("ceo_chat_sessions", {"tags": merged_tags}, eq={"id": older_id})
    # Drop the new session (cascades delete its messages — but we already moved them)
    await _supabase_delete("ceo_chat_sessions", eq={"id": session_id})
    return older_id


async def forget(session_id: str) -> None:
    """ON DELETE CASCADE on ceo_chat_messages.session_id handles message rows."""
    await _supabase_delete("ceo_chat_sessions", eq={"id": session_id})


async def history(session_id: str, limit: int = 50) -> list:
    return await _supabase_query(
        "ceo_chat_messages",
        select="role,content,language,created_at,tool_call",
        eq={"session_id": session_id},
        order="created_at.asc",
        limit=limit,
    )
