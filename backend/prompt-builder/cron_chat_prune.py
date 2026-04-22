"""Daily prune for ceo_chat_rate_limit bucket rows.

Run via cron once per day. Drops bucket rows older than 25 hours, since the
day-window check only ever needs the last 24h.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from ceo_persona import _supabase_delete


async def prune() -> None:
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat()
    await _supabase_delete("ceo_chat_rate_limit", lt={"bucket_start_minute": cutoff})


if __name__ == "__main__":
    asyncio.run(prune())
