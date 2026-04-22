from unittest.mock import AsyncMock, patch
import json

import ceo_chat_identity as ident


async def test_explicit_name_and_company_confirmed():
    fake_llm_json = json.dumps({
        "name": "Ahmad",
        "company": "Riyadh Real Estate",
        "email": None,
        "whatsapp": "+966501234567",
        "confidence": "confirmed",
    })
    with patch.object(ident, "_llm_generate", new=AsyncMock(return_value=fake_llm_json)):
        out = await ident.extract("btw I'm Ahmad from Riyadh Real Estate, my whatsapp is +966501234567")
    assert out["name"] == "Ahmad"
    assert out["company"] == "Riyadh Real Estate"
    assert out["whatsapp"] == "+966501234567"
    assert out["confidence"] == "confirmed"


async def test_inferred_company_no_pii_bound():
    fake = json.dumps({
        "name": None, "company": None, "email": None, "whatsapp": None,
        "confidence": "inferred", "inferred_tags": ["salon_owner", "jeddah"],
    })
    with patch.object(ident, "_llm_generate", new=AsyncMock(return_value=fake)):
        out = await ident.extract("we run a salon in Jeddah")
    assert out["name"] is None
    assert out["confidence"] == "inferred"
    assert "salon_owner" in out.get("inferred_tags", [])


async def test_no_identity_in_message():
    fake = json.dumps({
        "name": None, "company": None, "email": None, "whatsapp": None,
        "confidence": "inferred",
    })
    with patch.object(ident, "_llm_generate", new=AsyncMock(return_value=fake)):
        out = await ident.extract("how much does it cost?")
    assert out["name"] is None
    assert out["email"] is None


async def test_malformed_llm_response_returns_empty():
    with patch.object(ident, "_llm_generate", new=AsyncMock(return_value="not json {{{")):
        out = await ident.extract("anything")
    assert out["confidence"] == "inferred"
    assert out["name"] is None
