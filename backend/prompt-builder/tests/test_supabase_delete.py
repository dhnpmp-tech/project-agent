from unittest.mock import patch
import ceo_persona


async def test_supabase_delete_builds_correct_url():
    captured = {}

    class FakeResp:
        status_code = 204

        def raise_for_status(self):
            pass

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            pass

        async def request(self, method, url, **kw):
            captured["method"] = method
            captured["url"] = url
            captured["params"] = kw.get("params")
            return FakeResp()

    with patch("ceo_persona.httpx.AsyncClient", new=lambda **kw: FakeClient()):
        await ceo_persona._supabase_delete("ceo_chat_sessions", eq={"id": "abc"})
    assert captured["method"] == "DELETE"
    assert "ceo_chat_sessions" in captured["url"]
    assert captured["params"] == {"id": "eq.abc"}
