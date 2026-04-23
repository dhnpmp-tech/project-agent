# test_ceo.py
"""Tests for ceo_persona.py — run with: python3 -m pytest test_ceo.py -v"""
import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

def test_parse_founder_intent_approve():
    from ceo_persona import parse_founder_intent
    assert parse_founder_intent("yes")["intent"] == "approve"
    assert parse_founder_intent("go ahead")["intent"] == "approve"
    assert parse_founder_intent("post it")["intent"] == "approve"
    assert parse_founder_intent("\U0001f44d")["intent"] == "approve"

def test_parse_founder_intent_reject():
    from ceo_persona import parse_founder_intent
    assert parse_founder_intent("no")["intent"] == "reject"
    assert parse_founder_intent("don't post")["intent"] == "reject"
    assert parse_founder_intent("skip this")["intent"] == "reject"

def test_parse_founder_intent_conversation():
    from ceo_persona import parse_founder_intent
    assert parse_founder_intent("what's the VPS load right now?")["intent"] == "conversation"
    assert parse_founder_intent("tell me about Nadia's scores")["intent"] == "conversation"

def test_parse_founder_intent_arabic_approve():
    """Gulf Arabic approve words must classify as approve, not conversation.
    Covers the silent-bug case where Saudi/UAE founders typing 'ايوه' or 'تمام'
    were falling through to LLM conversation handling instead of approving drafts."""
    from ceo_persona import parse_founder_intent
    assert parse_founder_intent("ايوه")["intent"] == "approve"
    assert parse_founder_intent("نعم")["intent"] == "approve"
    assert parse_founder_intent("تمام")["intent"] == "approve"
    assert parse_founder_intent("يلا انشره")["intent"] == "approve"
    assert parse_founder_intent("ماشي")["intent"] == "approve"
    assert parse_founder_intent("زين")["intent"] == "approve"
    # Hamza variants must normalize to same bucket
    assert parse_founder_intent("أيوه")["intent"] == "approve"
    assert parse_founder_intent("إيوه")["intent"] == "approve"

def test_parse_founder_intent_arabic_reject():
    from ceo_persona import parse_founder_intent
    assert parse_founder_intent("لا")["intent"] == "reject"
    assert parse_founder_intent("لأ")["intent"] == "reject"
    assert parse_founder_intent("ما ابي")["intent"] == "reject"
    assert parse_founder_intent("مو الحين")["intent"] == "reject"
    assert parse_founder_intent("الغي")["intent"] == "reject"

def test_parse_founder_intent_arabic_edit():
    from ceo_persona import parse_founder_intent
    assert parse_founder_intent("غير الكلام شوي")["intent"] == "edit"
    assert parse_founder_intent("اقصر")["intent"] == "edit"
    assert parse_founder_intent("ضيف هاشتاق")["intent"] == "edit"

def test_parse_founder_intent_arabic_conversation():
    """Arabic questions/statements that aren't approve/reject/edit stay conversation."""
    from ceo_persona import parse_founder_intent
    assert parse_founder_intent("شو وضع الـ VPS؟")["intent"] == "conversation"
    assert parse_founder_intent("كم عميل عندنا اليوم")["intent"] == "conversation"

def test_normalize_arabic_collapses_variants():
    from ceo_persona import _normalize_arabic
    # All alef variants collapse
    assert _normalize_arabic("أ") == _normalize_arabic("ا")
    assert _normalize_arabic("إ") == _normalize_arabic("ا")
    assert _normalize_arabic("آ") == _normalize_arabic("ا")
    # Tatweel stripped
    assert _normalize_arabic("تــمام") == "تمام"
    # Diacritics stripped (fatha)
    assert _normalize_arabic("نَعَم") == "نعم"

def test_build_system_prompt():
    from ceo_persona import build_system_prompt
    prompt = build_system_prompt()
    assert "Rami Mansour" in prompt
    assert "Abu Sami" in prompt
    assert "Project Agent" in prompt
    assert len(prompt) > 500

@pytest.mark.asyncio
async def test_generate_morning_brief_structure():
    from ceo_persona import generate_company_brief
    with patch("ceo_persona._aggregate_data_feeds", new_callable=AsyncMock) as mock:
        mock.return_value = {
            "vps": {"status": "healthy", "load": 0.15},
            "karpathy": {"rules_added": 3, "rules_pruned": 1},
            "quality": {"avg_score": 0.94},
            "github": {"commits_24h": 5},
            "pipeline": {"active_clients": 2, "trials": 1},
            "intel": {"signals": 3},
            "proactive": {"sent": 12, "opened": 8},
            "traffic": {"visitors": 45, "widget_chats": 3},
        }
        with patch("ceo_persona._llm_generate", new_callable=AsyncMock) as llm:
            llm.return_value = "Good morning. Here's your brief..."
            result = await generate_company_brief()
            assert "brief" in result
            mock.assert_called_once()

@pytest.mark.asyncio
async def test_draft_tweet_saves_to_supabase():
    from ceo_persona import create_draft
    with patch("ceo_persona._supabase_query", new_callable=AsyncMock) as mock_query, \
         patch("ceo_persona._supabase_insert", new_callable=AsyncMock) as mock_insert, \
         patch("ceo_persona.send_to_founder", new_callable=AsyncMock) as mock_send:
        mock_query.return_value = []  # No pending drafts
        mock_insert.return_value = {"id": "test-uuid"}
        mock_send.return_value = {"sent": True}
        result = await create_draft(
            channel="x",
            content="Test tweet from Rami",
            reasoning="Testing the system",
            trigger_source="manual"
        )
        mock_insert.assert_called_once()
        assert result["id"] == "test-uuid"

def test_max_pending_drafts():
    from ceo_persona import MAX_PENDING_DRAFTS
    assert MAX_PENDING_DRAFTS <= 5  # Don't spam founder's WhatsApp
