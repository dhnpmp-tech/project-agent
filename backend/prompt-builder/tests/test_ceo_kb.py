import json
from pathlib import Path

KB_PATH = Path(__file__).parent.parent / "ceo_kb.json"
REQUIRED_TOPICS = {"pricing", "stack", "timeline", "industries", "onboarding", "competitors"}

def test_kb_file_exists():
    assert KB_PATH.exists()

def test_kb_has_all_required_topics():
    kb = json.loads(KB_PATH.read_text())
    assert REQUIRED_TOPICS.issubset(set(kb.keys()))

def test_each_topic_has_en_and_ar():
    kb = json.loads(KB_PATH.read_text())
    for topic in REQUIRED_TOPICS:
        assert "en" in kb[topic], f"{topic} missing 'en'"
        assert "ar" in kb[topic], f"{topic} missing 'ar'"
        assert len(kb[topic]["en"]) > 50, f"{topic}.en too short"
        assert len(kb[topic]["ar"]) > 30, f"{topic}.ar too short"

def test_pricing_mentions_aed_and_real_numbers():
    kb = json.loads(KB_PATH.read_text())
    pricing_en = kb["pricing"]["en"]
    assert "AED" in pricing_en
    assert "3" in pricing_en  # 3K setup
