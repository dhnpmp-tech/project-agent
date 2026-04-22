import pytest
from ceo_chat_tools import sanitize, sanitize_text

REAL_CLIENTS = [
    "Desert Bloom Spa",
    "Riyadh Real Estate Co",
    "Gulf Shore Cafe",
]
ALLOWED = {"Saffron Demo Restaurant"}

def test_real_client_name_redacted():
    text = "Desert Bloom Spa just hit 200 conversations this week."
    out = sanitize_text(text, real_clients=REAL_CLIENTS, allowed=ALLOWED)
    assert "Desert Bloom Spa" not in out
    assert "[a real client]" in out

def test_saffron_passes_through():
    text = "Saffron Demo Restaurant handled 47 messages today."
    out = sanitize_text(text, real_clients=REAL_CLIENTS, allowed=ALLOWED)
    assert "Saffron Demo Restaurant" in out

def test_revenue_words_redacted():
    text = "Our MRR is $12,000 and churn is 3%."
    out = sanitize_text(text, real_clients=REAL_CLIENTS, allowed=ALLOWED)
    assert "$12,000" not in out
    assert "3%" not in out or "MRR" not in out

def test_aggregate_dict_buckets_non_saffron_metrics():
    raw = {
        "client_id": "abc-123",
        "client_name": "Desert Bloom Spa",
        "convos_30d": 1234,
    }
    out = sanitize(raw, real_clients=REAL_CLIENTS, allowed=ALLOWED)
    assert "client_id" not in out
    assert out.get("client_name") in (None, "[a real client]")
    assert out["convos_30d"] in (1200, 1300)

def test_saffron_dict_passes_through():
    raw = {
        "client_name": "Saffron Demo Restaurant",
        "convos_24h": 47,
    }
    out = sanitize(raw, real_clients=REAL_CLIENTS, allowed=ALLOWED)
    assert out["client_name"] == "Saffron Demo Restaurant"
    assert out["convos_24h"] == 47

def test_founder_personal_info_redacted():
    text = "The founder's phone is +971 50 123 4567 and his name is Pranav Pandey."
    out = sanitize_text(text, real_clients=REAL_CLIENTS, allowed=ALLOWED)
    assert "+971 50 123 4567" not in out
    assert "Pranav" not in out
