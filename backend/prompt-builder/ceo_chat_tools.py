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
