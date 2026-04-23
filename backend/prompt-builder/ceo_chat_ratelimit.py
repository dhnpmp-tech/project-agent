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

from ceo_persona import (
    _supabase_insert,
    _supabase_query as _raw_supabase_query,
    _supabase_update_where as _raw_supabase_update_where,
)

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


def _ts(dt: datetime) -> str:
    """UTC ISO timestamp safe for query strings.

    `datetime.isoformat()` emits a `+00:00` suffix; the unencoded `+` is
    interpreted as a space when PostgREST parses the URL, producing
    `invalid input syntax for type timestamp with time zone`. Using `Z`
    sidesteps it without needing per-call URL encoding.
    """
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


async def _count_window(ip: str, since: datetime) -> int:
    # NOTE: `count` is a PostgREST aggregate keyword, so a bare `select=count`
    # collides with the count() function and returns HTTP 400. Aliasing the
    # column read as `cnt:count` keeps the row-level fetch intact.
    params = (
        f"select=cnt:count&ip=eq.{ip}"
        f"&bucket_start_minute=gte.{_ts(since)}"
        "&limit=10000"
    )
    rows = await _raw_supabase_query("ceo_chat_rate_limit", params)
    return sum(r.get("cnt", 0) for r in rows)


async def _increment_bucket(ip: str, penalty: int) -> None:
    minute = _now_minute()
    minute_iso = _ts(minute)
    # Try insert first; on composite-PK conflict, fall back to read+patch.
    # NOTE: ceo_chat_rate_limit has no `id` column — primary key is
    # (ip, bucket_start_minute) — so updates must filter by composite key.
    try:
        await _supabase_insert("ceo_chat_rate_limit", {
            "ip": ip,
            "bucket_start_minute": minute_iso,
            "count": penalty,
        })
    except Exception:
        params = (
            f"select=cnt:count&ip=eq.{ip}"
            f"&bucket_start_minute=eq.{minute_iso}"
            "&limit=1"
        )
        rows = await _raw_supabase_query("ceo_chat_rate_limit", params)
        if rows:
            current = rows[0].get("cnt", 0)
            await _raw_supabase_update_where(
                "ceo_chat_rate_limit",
                {"ip": ip, "bucket_start_minute": minute_iso},
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
