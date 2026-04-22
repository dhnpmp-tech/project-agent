"""Daily cost ceiling for the Ask Rami widget.

Modes:
  normal — full Claude+stream
  frugal — MiniMax only, no streaming, one-shot
  idle   — widget shows "back in a few hours"
"""

from __future__ import annotations

import os
from datetime import date

from ceo_persona import _supabase_insert, _supabase_query as _raw_supabase_query


async def _supabase_query(table: str, **filters) -> list:
    """Local shim — translate kwargs filters to query string."""
    parts = []
    select = filters.pop("select", None)
    if select:
        parts.append(f"select={select}")
    for k, v in (filters.pop("eq", None) or {}).items():
        parts.append(f"{k}=eq.{v}")
    for k, v in (filters.pop("gte", None) or {}).items():
        parts.append(f"{k}=gte.{v}")
    limit = filters.pop("limit", None)
    if limit is not None:
        parts.append(f"limit={limit}")
    return await _raw_supabase_query(table, "&".join(parts))


def _ceiling() -> float:
    return float(os.environ.get("CEO_CHAT_DAILY_USD_CEILING", "5.00"))


async def _today_spend_usd() -> float:
    today = date.today().isoformat()
    rows = await _supabase_query(
        "ceo_chat_messages",
        select="tokens,llm_model",
        gte={"created_at": f"{today}T00:00:00Z"},
        limit=10000,
    )
    # Rough cost model: MiniMax $0.0008/1k toks, Claude $0.003/1k toks.
    total = 0.0
    for r in rows:
        toks = r.get("tokens") or 0
        model = (r.get("llm_model") or "").lower()
        rate = 0.003 if "claude" in model else 0.0008
        total += (toks / 1000) * rate
    return total


async def _already_pinged(threshold: str) -> bool:
    rows = await _supabase_query(
        "ceo_activity_log",
        select="id",
        eq={"event_type": f"chat_cost_alert_{threshold}"},
        gte={"created_at": f"{date.today().isoformat()}T00:00:00Z"},
        limit=1,
    )
    return len(rows) > 0


async def _mark_pinged(threshold: str) -> None:
    await _supabase_insert("ceo_activity_log", {
        "source": "vps",
        "event_type": f"chat_cost_alert_{threshold}",
        "summary": f"Ask Rami widget hit {threshold} of daily cost ceiling",
    })


async def _ping_founder(text: str) -> None:
    try:
        from ceo_persona import send_to_founder
        await send_to_founder(text)
    except Exception:
        pass


async def get_mode() -> str:
    spend = await _today_spend_usd()
    ceiling = _ceiling()
    if spend >= ceiling:
        if not await _already_pinged("100"):
            await _ping_founder("⚠️ Ask Rami chat hit 100% of daily ceiling. Widget is idled.")
            await _mark_pinged("100")
        return "idle"
    if spend >= ceiling * 0.80:
        if not await _already_pinged("80"):
            await _ping_founder(f"Ask Rami chat at 80% of daily ceiling (${spend:.2f}/${ceiling:.2f}). Switching to MiniMax only.")
            await _mark_pinged("80")
        return "frugal"
    if spend >= ceiling * 0.50:
        if not await _already_pinged("50"):
            await _ping_founder(f"Ask Rami chat at 50% of daily ceiling (${spend:.2f}/${ceiling:.2f}).")
            await _mark_pinged("50")
        return "normal"
    return "normal"
