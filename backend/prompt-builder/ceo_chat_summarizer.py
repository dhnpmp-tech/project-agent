"""Conversation summarizer — every 10 turns, regenerate session.summary.

Called from a background task in B7 chat endpoint.
"""

from __future__ import annotations

from ceo_persona import (
    _supabase_query as _raw_supabase_query,
    _supabase_update as _raw_supabase_update,
    _llm_generate as _raw_llm,
)


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


async def _supabase_update(table: str, data: dict, eq: dict) -> dict:
    """Update by eq filter. Looks up the row id first, then patches by id."""
    eq_parts = "&".join(f"{k}=eq.{v}" for k, v in eq.items())
    rows = await _raw_supabase_query(table, f"select=id&{eq_parts}&limit=1")
    if not rows:
        return {}
    return await _raw_supabase_update(table, str(rows[0]["id"]), data)


async def _llm_generate(system: str, user: str, max_tokens: int = 200, prefer_cheap: bool = True) -> str:
    return await _raw_llm(prompt=user, system=system, max_tokens=max_tokens)


_SYSTEM = """Summarize this chat in 2-3 sentences. Capture:
- who the visitor is (if known)
- what they care about
- what's already been discussed
Output prose only, no headings."""


def should_refresh(total_messages: int) -> bool:
    return total_messages > 0 and total_messages % 10 == 0


async def refresh_summary(session_id: str) -> None:
    msgs = await _supabase_query(
        "ceo_chat_messages",
        select="role,content",
        eq={"session_id": session_id},
        order="created_at.asc",
        limit=200,
    )
    transcript = "\n".join(f"{m['role']}: {m['content']}" for m in msgs)
    summary = await _llm_generate(
        system=_SYSTEM, user=transcript, max_tokens=200, prefer_cheap=True,
    )
    await _supabase_update(
        "ceo_chat_sessions", {"summary": summary.strip()}, eq={"id": session_id},
    )
