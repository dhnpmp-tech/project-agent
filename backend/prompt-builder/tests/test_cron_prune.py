from unittest.mock import AsyncMock, patch

import cron_chat_prune


async def test_prune_drops_buckets_older_than_25h():
    with patch.object(cron_chat_prune, "_supabase_delete", new=AsyncMock()) as dele:
        await cron_chat_prune.prune()
    dele.assert_awaited_once()
    args = dele.await_args
    lt = args.kwargs.get("lt") or {}
    assert "bucket_start_minute" in lt
