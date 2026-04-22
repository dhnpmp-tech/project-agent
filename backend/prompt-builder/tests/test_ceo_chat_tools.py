import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

import ceo_chat_tools as tools


@pytest.fixture(autouse=True)
def _reset_cache():
    tools._CACHE.clear()
    yield
    tools._CACHE.clear()


async def test_get_product_fact_known_topic_returns_en_by_default():
    out = await tools.get_product_fact("pricing")
    assert "AED" in out


async def test_get_product_fact_arabic_when_lang_ar():
    out = await tools.get_product_fact("pricing", lang="ar")
    assert "درهم" in out


async def test_get_product_fact_unknown_topic_returns_none():
    out = await tools.get_product_fact("nonexistent_topic")
    assert out is None


async def test_get_live_metrics_caches_for_5min():
    fake_clients = [{"id": "1"}, {"id": "2"}, {"id": "3"}]
    with patch.object(tools, "_supabase_query", new=AsyncMock(return_value=fake_clients)) as m:
        a = await tools.get_live_metrics()
        b = await tools.get_live_metrics()
    assert a == b
    assert m.call_count == 1


async def test_get_live_metrics_redacts_revenue():
    fake_clients = [{"id": "1", "name": "Foo", "mrr_aed": 9000}]
    with patch.object(tools, "_supabase_query", new=AsyncMock(return_value=fake_clients)):
        out = await tools.get_live_metrics()
    assert "active_clients" in out
    assert "mrr_aed" not in str(out)
    assert "revenue" not in str(out).lower() or "[redacted]" in str(out)


async def test_get_saffron_demo_snapshot_passes_real_numbers():
    fake = [{"client_name": "Saffron Demo Restaurant", "convos_24h": 47}]
    with patch.object(tools, "_supabase_query", new=AsyncMock(return_value=fake)):
        out = await tools.get_saffron_demo_snapshot()
    assert out["convos_24h"] == 47


async def test_get_latest_karpathy_insight_iterates_top_5_clients():
    fake_clients = [{"id": f"client-{i}"} for i in range(5)]
    fake_rules = {
        "rules": [
            {"created_at": "2026-04-22T10:00:00Z", "rule": "Always greet by name first", "client_id": "client-0"}
        ]
    }
    with patch.object(tools, "_supabase_query", new=AsyncMock(return_value=fake_clients)), \
         patch.object(tools, "_get_rule_status", new=AsyncMock(return_value=fake_rules)):
        out = await tools.get_latest_karpathy_insight()
    assert "rule" in out or "insight" in out
    assert "client-0" not in str(out)


async def test_get_recent_shipped_returns_at_most_3():
    fake = [
        {"title": "shipped 1", "shipped_at": "2026-04-22"},
        {"title": "shipped 2", "shipped_at": "2026-04-21"},
        {"title": "shipped 3", "shipped_at": "2026-04-20"},
        {"title": "shipped 4", "shipped_at": "2026-04-19"},
    ]
    with patch.object(tools, "_supabase_query", new=AsyncMock(return_value=fake)):
        out = await tools.get_recent_shipped()
    assert len(out) <= 3


def test_tool_schemas_exist_for_all_five():
    schemas = tools.get_tool_schemas()
    names = {s["name"] for s in schemas}
    assert names == {
        "get_live_metrics",
        "get_saffron_demo_snapshot",
        "get_latest_karpathy_insight",
        "get_product_fact",
        "get_recent_shipped",
    }
    for s in schemas:
        assert "description" in s
        assert "parameters" in s
