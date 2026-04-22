from unittest.mock import AsyncMock, patch

import ceo_chat_summarizer as summ


async def test_summarize_calls_llm_with_full_history():
    fake_msgs = [
        {"role": "user", "content": "how much does it cost?"},
        {"role": "assistant", "content": "AED 3K setup..."},
    ] * 6  # 12 messages
    with patch.object(summ, "_supabase_query", new=AsyncMock(return_value=fake_msgs)), \
         patch.object(summ, "_llm_generate", new=AsyncMock(return_value="Talked pricing, restaurant.")) as llm, \
         patch.object(summ, "_supabase_update", new=AsyncMock()) as upd:
        await summ.refresh_summary("sess-1")
    assert llm.await_count == 1
    upd.assert_awaited_once()


async def test_should_run_at_multiples_of_ten():
    assert summ.should_refresh(total_messages=10) is True
    assert summ.should_refresh(total_messages=20) is True
    assert summ.should_refresh(total_messages=11) is False
    assert summ.should_refresh(total_messages=0) is False
