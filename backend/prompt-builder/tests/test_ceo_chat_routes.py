import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch

from app import app


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def test_greeting_returns_text_and_chips(client):
    r = await client.get("/ceo/chat/greeting", params={"path": "/pricing", "lang": "en"})
    assert r.status_code == 200
    body = r.json()
    assert "greeting" in body
    assert "chips" in body
    assert isinstance(body["chips"], list)
    assert 2 <= len(body["chips"]) <= 3


async def test_greeting_arabic(client):
    r = await client.get("/ceo/chat/greeting", params={"path": "/services", "lang": "ar"})
    body = r.json()
    assert any(ord(c) > 0x0600 for c in body["greeting"])


async def test_greeting_returning_visitor_uses_summary(client):
    fake_session = [{"identity_name": "Ahmad", "identity_company": "Riyadh RE",
                     "summary": "lead routing for Riyadh Real Estate"}]
    with patch("ceo_chat._supabase_query", new=AsyncMock(return_value=fake_session)):
        r = await client.get("/ceo/chat/greeting", params={"path": "/", "lang": "en"},
                             cookies={"ceo_session_id": "fake-id"})
    assert "Ahmad" in r.json()["greeting"]
    assert "lead routing" in r.json()["greeting"]
