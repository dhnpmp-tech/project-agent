from unittest.mock import AsyncMock, patch

import ceo_chat_sessions as sess


async def test_resolve_or_create_creates_when_no_cookie():
    with patch.object(sess, "_supabase_query", new=AsyncMock(return_value=[])), \
         patch.object(sess, "_supabase_insert", new=AsyncMock(return_value={"id": "new-id"})):
        sid = await sess.resolve_or_create(cookie_id=None, browser_lang="en", page="/")
    assert sid == "new-id"


async def test_resolve_or_create_returns_cookie_id_when_session_exists():
    # Cookie must be a syntactically valid uuid; otherwise resolve_or_create
    # treats it as missing and provisions a new session (covered separately).
    valid = "11111111-2222-3333-4444-555555555555"
    with patch.object(sess, "_supabase_query", new=AsyncMock(return_value=[{"id": valid}])):
        sid = await sess.resolve_or_create(cookie_id=valid, browser_lang="en", page="/")
    assert sid == valid


async def test_resolve_or_create_non_uuid_cookie_does_not_query_db():
    qry = AsyncMock(return_value=[])
    ins = AsyncMock(return_value={"id": "11111111-2222-3333-4444-555555555555"})
    with patch.object(sess, "_supabase_query", new=qry), \
         patch.object(sess, "_supabase_insert", new=ins):
        sid = await sess.resolve_or_create(cookie_id="smoke-3", browser_lang="en", page="/")
    qry.assert_not_awaited()  # guard short-circuits before any PostgREST call
    assert sid == "11111111-2222-3333-4444-555555555555"


async def test_resolve_or_create_invalid_cookie_creates_new():
    with patch.object(sess, "_supabase_query", new=AsyncMock(return_value=[])), \
         patch.object(sess, "_supabase_insert", new=AsyncMock(return_value={"id": "new-id"})):
        sid = await sess.resolve_or_create(cookie_id="stale", browser_lang="ar", page="/services")
    assert sid == "new-id"


async def test_bind_identity_no_email_just_updates():
    with patch.object(sess, "_supabase_update", new=AsyncMock()) as upd:
        sid = await sess.bind_identity(
            "sess-1", {"name": "Ahmad", "confidence": "confirmed"},
        )
    assert sid == "sess-1"
    upd.assert_awaited_once()


async def test_bind_identity_email_collision_triggers_merge():
    queries = [
        [{"id": "old-id", "first_seen": "2026-01-01T00:00:00Z",
          "identity_name": "Ahmad", "identity_company": "Riyadh RE",
          "identity_whatsapp": None, "tags": ["ksa"]}],
    ]
    with patch.object(sess, "_supabase_query", new=AsyncMock(side_effect=queries)), \
         patch.object(sess, "_supabase_update", new=AsyncMock()) as upd, \
         patch.object(sess, "_supabase_delete", new=AsyncMock()) as dele:
        merged_id = await sess.bind_identity(
            session_id="new-id",
            identity={"name": "Ahmad", "company": "Riyadh RE", "email": "ahmad@example.com",
                      "whatsapp": "+966500000000", "confidence": "confirmed"},
        )
    assert merged_id == "old-id"
    # New session must be deleted; updates: messages reassign + identity fill
    assert dele.await_count >= 1
    assert upd.await_count >= 1


async def test_bind_identity_email_no_existing_session_just_updates():
    with patch.object(sess, "_supabase_query", new=AsyncMock(return_value=[])), \
         patch.object(sess, "_supabase_update", new=AsyncMock()) as upd:
        sid = await sess.bind_identity(
            "sess-2",
            {"name": "Sarah", "email": "sarah@example.com", "confidence": "confirmed"},
        )
    assert sid == "sess-2"
    upd.assert_awaited_once()


async def test_forget_session_calls_delete():
    with patch.object(sess, "_supabase_delete", new=AsyncMock()) as dele:
        await sess.forget("abc-123")
    dele.assert_awaited_once()


async def test_history_queries_messages_ordered():
    fake_rows = [{"role": "user", "content": "hi", "language": "en", "created_at": "2026-04-22T00:00:00Z", "tool_call": None}]
    with patch.object(sess, "_supabase_query", new=AsyncMock(return_value=fake_rows)) as q:
        rows = await sess.history("sess-1", limit=20)
    assert rows == fake_rows
    q.assert_awaited_once()
