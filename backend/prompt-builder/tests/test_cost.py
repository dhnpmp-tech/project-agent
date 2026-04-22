from unittest.mock import AsyncMock, patch
import pytest

import ceo_chat_cost as cost


@pytest.fixture(autouse=True)
def _set_ceiling(monkeypatch):
    monkeypatch.setenv("CEO_CHAT_DAILY_USD_CEILING", "5.00")


async def test_below_50_percent_normal_mode():
    with patch.object(cost, "_today_spend_usd", new=AsyncMock(return_value=1.00)):
        m = await cost.get_mode()
    assert m == "normal"


async def test_at_50_pings_founder_once():
    pings = []

    async def fake_ping(text):
        pings.append(text)

    with patch.object(cost, "_today_spend_usd", new=AsyncMock(return_value=2.50)), \
         patch.object(cost, "_ping_founder", new=fake_ping), \
         patch.object(cost, "_already_pinged", new=AsyncMock(return_value=False)), \
         patch.object(cost, "_mark_pinged", new=AsyncMock()):
        m = await cost.get_mode()
    assert m == "normal"
    assert len(pings) == 1


async def test_at_80_minimax_only_no_streaming():
    with patch.object(cost, "_today_spend_usd", new=AsyncMock(return_value=4.00)), \
         patch.object(cost, "_already_pinged", new=AsyncMock(return_value=True)):
        m = await cost.get_mode()
    assert m == "frugal"


async def test_at_100_idle_widget():
    with patch.object(cost, "_today_spend_usd", new=AsyncMock(return_value=5.00)), \
         patch.object(cost, "_already_pinged", new=AsyncMock(return_value=True)):
        m = await cost.get_mode()
    assert m == "idle"
