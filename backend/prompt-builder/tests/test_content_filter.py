from unittest.mock import AsyncMock, patch
import json

import ceo_chat_content_filter as cf


async def test_clean_message():
    fake = json.dumps({"category": "clean"})
    with patch.object(cf, "_llm_generate", new=AsyncMock(return_value=fake)):
        out = await cf.classify("how much does setup cost?")
    assert out.category == "clean"


async def test_hate_message_returns_hate_with_ip_block_action():
    fake = json.dumps({"category": "hate"})
    with patch.object(cf, "_llm_generate", new=AsyncMock(return_value=fake)):
        out = await cf.classify("...slur...")
    assert out.category == "hate"
    assert out.block_ip_24h is True


async def test_self_harm_returns_hotline_text_per_locale():
    fake = json.dumps({"category": "self_harm"})
    with patch.object(cf, "_llm_generate", new=AsyncMock(return_value=fake)):
        out_en = await cf.classify("I want to end it all", lang="en")
        out_ar = await cf.classify("أريد أن أنهي حياتي", lang="ar")
    assert "920033360" in out_en.response_text or "800 HOPE" in out_en.response_text
    assert "920033360" in out_ar.response_text or "800 HOPE" in out_ar.response_text
    assert out_en.end_session is True


async def test_spam_silent_drop():
    fake = json.dumps({"category": "spam"})
    with patch.object(cf, "_llm_generate", new=AsyncMock(return_value=fake)):
        out = await cf.classify("buy crypto now $$$$")
    assert out.category == "spam"
    assert out.silent_drop is True


async def test_malformed_response_treated_as_clean():
    with patch.object(cf, "_llm_generate", new=AsyncMock(return_value="not json")):
        out = await cf.classify("anything")
    assert out.category == "clean"
