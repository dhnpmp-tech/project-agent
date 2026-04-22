"""Sliding-window rate limit backed by Supabase ceo_chat_rate_limit table.

Three buckets enforced per IP:
  - burst:  5 msgs / 60s
  - hour:   30 msgs / 60min
  - daily:  100 msgs / 24h

Whitelisted IPs bypass everything. Prompt-injection penalty multiplier
(applied by caller via `penalty` arg) burns extra slots in all 3 buckets.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from ceo_persona import _supabase_insert, _supabase_query as _raw_supabase_query, _supabase_update as _raw_supabase_update

_BURST_LIMIT = 5
_HOUR_LIMIT = 30
_DAY_LIMIT = 100

_whitelist_cache: Optional[set] = None


def _whitelist() -> set:
    global _whitelist_cache
    if _whitelist_cache is None:
        raw = os.environ.get("CEO_CHAT_RATE_LIMIT_WHITELIST", "")
        _whitelist_cache = {ip.strip() for ip in raw.split(",") if ip.strip()}
    return _whitelist_cache


@dataclass
class RateLimitResult:
    allowed: bool
    reason: str = ""  # "burst" | "hour" | "daily" | ""
    retry_after_seconds: int = 0


def _now_minute() -> datetime:
    n = datetime.now(timezone.utc)
    return n.replace(second=0, microsecond=0)


async def _count_window(ip: str, since: datetime) -> int:
    params = (
        f"select=count&ip=eq.{ip}"
        f"&bucket_start_minute=gte.{since.isoformat()}"
        "&limit=10000"
    )
    rows = await _raw_supabase_query("ceo_chat_rate_limit", params)
    return sum(r.get("count", 0) for r in rows)


async def _increment_bucket(ip: str, penalty: int) -> None:
    minute = _now_minute()
    # Try insert first; on conflict, read+update.
    try:
        await _supabase_insert("ceo_chat_rate_limit", {
            "ip": ip,
            "bucket_start_minute": minute.isoformat(),
            "count": penalty,
        })
    except Exception:
        # On primary-key conflict, fetch existing and increment in two steps.
        params = (
            f"select=count,id&ip=eq.{ip}"
            f"&bucket_start_minute=eq.{minute.isoformat()}"
            "&limit=1"
        )
        rows = await _raw_supabase_query("ceo_chat_rate_limit", params)
        if rows:
            current = rows[0].get("count", 0)
            row_id = rows[0].get("id")
            if row_id is not None:
                await _raw_supabase_update(
                    "ceo_chat_rate_limit",
                    str(row_id),
                    {"count": current + penalty},
                )


async def check_and_record(ip: str, penalty: int = 1) -> RateLimitResult:
    if ip in _whitelist():
        return RateLimitResult(allowed=True)

    now = datetime.now(timezone.utc)
    burst_since = now - timedelta(seconds=60)
    hour_since = now - timedelta(hours=1)
    day_since = now - timedelta(hours=24)

    burst = await _count_window(ip, burst_since)
    if burst + penalty > _BURST_LIMIT:
        return RateLimitResult(allowed=False, reason="burst", retry_after_seconds=60)

    hour = await _count_window(ip, hour_since)
    if hour + penalty > _HOUR_LIMIT:
        return RateLimitResult(allowed=False, reason="hour", retry_after_seconds=3600)

    day = await _count_window(ip, day_since)
    if day + penalty > _DAY_LIMIT:
        return RateLimitResult(allowed=False, reason="daily", retry_after_seconds=86400)

    await _increment_bucket(ip, penalty)
    return RateLimitResult(allowed=True)
