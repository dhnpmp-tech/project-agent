"""Public-safe wrappers around ceo_persona internals.

The sanitizer is the SINGLE SOURCE OF TRUTH for what may leak from the
backend into a public chat reply. Every live-data tool funnels its
return value through `sanitize()` before the LLM sees it.

Rules:
  - Real client names get replaced with "[a real client]" UNLESS in `allowed`
    (which only contains "Saffron Demo Restaurant" in production).
  - Client IDs are always stripped.
  - Per-client metrics for non-Saffron clients are rounded/bucketed.
  - Revenue, MRR, churn, costs are never exposed.
  - Founder personal info is never exposed.
"""

from __future__ import annotations

import os
import re
from typing import Any, Iterable

# Founder identifiers that must never leak.
_FOUNDER_BLOCKLIST = [
    "Pranav Pandey",
    "Pranav",
    "+971 50 123 4567",
]

# Words/patterns that indicate revenue/financial data — redact the value.
_REVENUE_PATTERNS = [
    re.compile(r"\$\s?\d[\d,]*", re.IGNORECASE),
    re.compile(r"\b(MRR|ARR|churn|revenue|profit|margin|burn rate)\b[^.]*", re.IGNORECASE),
]


def _bucket(n: int, step: int = 100) -> int:
    """Round an integer to the nearest `step`."""
    return int(round(n / step)) * step


def sanitize_text(
    text: str,
    real_clients: Iterable[str],
    allowed: set[str],
) -> str:
    """Sanitize a free-text string. Used for LLM-generated content review and
    for any tool output that arrives as text rather than structured data."""
    out = text
    for client in real_clients:
        if client in allowed:
            continue
        out = out.replace(client, "[a real client]")
    for blocked in _FOUNDER_BLOCKLIST:
        out = out.replace(blocked, "[redacted]")
    for pattern in _REVENUE_PATTERNS:
        out = pattern.sub("[redacted]", out)
    return out


def sanitize(
    data: Any,
    real_clients: Iterable[str],
    allowed: set[str],
) -> Any:
    """Sanitize a structured tool-return value (dict/list/scalar)."""
    if isinstance(data, dict):
        result: dict[str, Any] = {}
        client_name = data.get("client_name")
        is_allowed = client_name in allowed if client_name else False
        for key, value in data.items():
            if key in ("client_id", "user_id", "phone", "email"):
                continue
            if key == "client_name":
                result[key] = value if is_allowed else "[a real client]"
                continue
            if isinstance(value, (dict, list)):
                result[key] = sanitize(value, real_clients, allowed)
            elif isinstance(value, int) and not is_allowed and key not in ("year", "month", "day"):
                result[key] = _bucket(value, step=100)
            elif isinstance(value, str):
                result[key] = sanitize_text(value, real_clients, allowed)
            else:
                result[key] = value
        return result
    if isinstance(data, list):
        return [sanitize(item, real_clients, allowed) for item in data]
    if isinstance(data, str):
        return sanitize_text(data, real_clients, allowed)
    return data


# ============================================================================
# Live-data tool wrappers + TTL cache + LLM tool schemas (appended in Task A5)
# ============================================================================

import json
import time
from pathlib import Path

try:
    from ceo_persona import _supabase_query as _raw_supabase_query
except Exception:
    # Fallback: no-op for environments where ceo_persona is unavailable
    async def _raw_supabase_query(table: str, params: str) -> list:  # type: ignore[misc]
        return []

try:
    from karpathy_loop import get_rule_status as _get_rule_status
except Exception:
    async def _get_rule_status(client_id: str) -> dict:  # type: ignore[misc]
        return {"rules": []}

_KB_PATH = Path(__file__).parent / "ceo_kb.json"
_KB = json.loads(_KB_PATH.read_text())

# Simple in-process TTL cache: { key: (expires_at_epoch, value) }
_CACHE: dict[str, tuple[float, Any]] = {}


# Wrap the existing _raw_supabase_query (which takes a query-string `params`)
# so tool functions and tests can call it kwarg-style. Tests monkeypatch this
# `_supabase_query` symbol directly.
async def _supabase_query(table: str, **kwargs) -> list:
    parts = []
    for key, value in kwargs.items():
        parts.append(f"{key}={value}")
    params = "&".join(parts)
    return await _raw_supabase_query(table, params)


def _cache_get(key: str) -> Any | None:
    entry = _CACHE.get(key)
    if not entry:
        return None
    expires, value = entry
    if time.time() > expires:
        _CACHE.pop(key, None)
        return None
    return value


def _cache_set(key: str, value: Any, ttl_seconds: int) -> None:
    _CACHE[key] = (time.time() + ttl_seconds, value)


def _real_clients() -> list[str]:
    """Read from env override (test) or default to a static list. Production
    swaps in a Supabase query at startup."""
    override = os.environ.get("CEO_CHAT_REAL_CLIENTS")
    if override:
        return [c.strip() for c in override.split(",") if c.strip()]
    return ["Desert Bloom Spa", "Riyadh Real Estate Co", "Gulf Shore Cafe"]


_ALLOWED_CLIENT_NAMES = {"Saffron Demo Restaurant"}


# ---------- Tool 1: live fleet metrics ----------

async def get_live_metrics() -> dict:
    """Fleet-wide public aggregates. Cached 5 minutes."""
    cached = _cache_get("live_metrics")
    if cached:
        return cached
    clients = await _supabase_query("clients", select="id,name", limit=1000)
    out = {
        "active_clients": _bucket(len(clients), step=5),
        "industries_live": 5,
        "languages_supported": 2,
    }
    out = sanitize(out, real_clients=_real_clients(), allowed=_ALLOWED_CLIENT_NAMES)
    _cache_set("live_metrics", out, ttl_seconds=300)
    return out


# ---------- Tool 2: Saffron demo snapshot ----------

async def get_saffron_demo_snapshot() -> dict:
    """Real today-numbers from the Saffron Demo Restaurant. Cached 5 minutes."""
    cached = _cache_get("saffron_snapshot")
    if cached:
        return cached
    rows = await _supabase_query(
        "saffron_demo_metrics",
        select="client_name,convos_24h,most_asked_question,avg_response_seconds,languages_handled,sample_resolved",
        limit=1,
    )
    if not rows:
        return {"error": "no_data"}
    raw = rows[0]
    out = sanitize(raw, real_clients=_real_clients(), allowed=_ALLOWED_CLIENT_NAMES)
    _cache_set("saffron_snapshot", out, ttl_seconds=300)
    return out


# ---------- Tool 3: latest karpathy insight ----------

async def get_latest_karpathy_insight() -> dict:
    """Most recent rule the system learned, anonymized. Cached 1 hour."""
    cached = _cache_get("karpathy_insight")
    if cached:
        return cached
    clients = await _supabase_query(
        "clients",
        select="id",
        order="updated_at.desc",
        limit=5,
    )
    latest_rule: dict | None = None
    for client in clients:
        status = await _get_rule_status(client["id"])
        for rule in status.get("rules", []):
            if latest_rule is None or rule.get("created_at", "") > latest_rule.get("created_at", ""):
                latest_rule = rule
    if not latest_rule:
        out = {"insight": None}
    else:
        out = {
            "insight": latest_rule.get("rule"),
            "learned_at": latest_rule.get("created_at"),
        }
    out = sanitize(out, real_clients=_real_clients(), allowed=_ALLOWED_CLIENT_NAMES)
    _cache_set("karpathy_insight", out, ttl_seconds=3600)
    return out


# ---------- Tool 4: product fact (KB lookup) ----------

async def get_product_fact(topic: str, lang: str = "en") -> str | None:
    """Look up a curated product fact by topic from the KB."""
    entry = _KB.get(topic)
    if not entry:
        return None
    return entry.get(lang) or entry.get("en")


# ---------- Tool 5: recent shipped features ----------

async def get_recent_shipped() -> list[dict]:
    """Last 3 features shipped. Cached 30 minutes."""
    cached = _cache_get("recent_shipped")
    if cached:
        return cached
    rows = await _supabase_query(
        "shipped_features",
        select="title,shipped_at,summary",
        order="shipped_at.desc",
        limit=3,
    )
    out = sanitize(rows[:3], real_clients=_real_clients(), allowed=_ALLOWED_CLIENT_NAMES)
    _cache_set("recent_shipped", out, ttl_seconds=1800)
    return out


# ---------- LLM tool schemas ----------

def get_tool_schemas() -> list[dict]:
    return [
        {
            "name": "get_live_metrics",
            "description": "Fleet-wide public aggregates: active client count, industries live, languages supported. Use when asked about scale or traction.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
        {
            "name": "get_saffron_demo_snapshot",
            "description": "Real today-numbers from the Saffron Demo Restaurant: conversations in last 24h, top question, response time, languages, sample resolved convo. Use to make the demo feel concrete.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
        {
            "name": "get_latest_karpathy_insight",
            "description": "Most recent rule the system learned across all clients (anonymized). Use when prospect asks how the system improves itself.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
        {
            "name": "get_product_fact",
            "description": "Look up a curated product fact by topic. Returns the bilingual fact in the requested language.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "enum": ["pricing", "stack", "timeline", "industries", "onboarding", "competitors"],
                    },
                    "lang": {"type": "string", "enum": ["en", "ar"], "default": "en"},
                },
                "required": ["topic"],
            },
        },
        {
            "name": "get_recent_shipped",
            "description": "Last 3 features shipped. Use when prospect asks 'what have you been working on lately?'",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    ]
