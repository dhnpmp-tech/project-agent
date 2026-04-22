from unittest.mock import AsyncMock, patch
import pytest

import ceo_chat_ratelimit as rl


@pytest.fixture(autouse=True)
def _reset():
    rl._whitelist_cache = None


async def test_burst_limit_blocks_at_6th_message_in_60s():
    with patch.object(rl, "_count_window", new=AsyncMock(return_value=5)):
        result = await rl.check_and_record("1.2.3.4", penalty=1)
    assert result.allowed is False
    assert result.reason == "burst"


async def test_under_burst_limit_allowed():
    with patch.object(rl, "_count_window", new=AsyncMock(return_value=2)), \
         patch.object(rl, "_increment_bucket", new=AsyncMock()):
        result = await rl.check_and_record("1.2.3.4", penalty=1)
    assert result.allowed is True


async def test_whitelist_bypasses_all_checks(monkeypatch):
    monkeypatch.setenv("CEO_CHAT_RATE_LIMIT_WHITELIST", "9.9.9.9, 1.2.3.4 ")
    with patch.object(rl, "_count_window", new=AsyncMock(return_value=999)), \
         patch.object(rl, "_increment_bucket", new=AsyncMock()):
        result = await rl.check_and_record("1.2.3.4", penalty=1)
    assert result.allowed is True


async def test_injection_penalty_burns_three_slots_in_all_buckets():
    increments = []

    async def fake_increment(ip, penalty):
        increments.append(penalty)

    with patch.object(rl, "_count_window", new=AsyncMock(return_value=0)), \
         patch.object(rl, "_increment_bucket", new=fake_increment):
        result = await rl.check_and_record("1.2.3.4", penalty=3)
    assert result.allowed is True
    assert increments == [3]


async def test_daily_limit_blocks_at_101st_message():
    with patch.object(rl, "_count_window", new=AsyncMock(side_effect=[0, 0, 100])):
        result = await rl.check_and_record("1.2.3.4", penalty=1)
    assert result.allowed is False
    assert result.reason == "daily"
