"""Tests for skill_exporter — pure serialize/parse roundtrips."""

import pytest

from skill_exporter import (
    _extract_rule_block,
    _extract_section,
    _slugify,
    parse_skill_md,
    serialize_rule,
)


def test_slugify_basic():
    assert _slugify("Always confirm party size before suggesting menu") == "always-confirm-party-size-before-suggesting-menu"


def test_slugify_strips_punctuation():
    assert _slugify("Don't ask twice!") == "dont-ask-twice"


def test_slugify_handles_empty():
    assert _slugify("") == "rule"


def test_serialize_minimal_rule():
    rule = {
        "rule": "Greet customers in their preferred language",
        "reason": "Higher booking conversion",
        "status": "verified",
        "added": "2026-04-20",
    }
    out = serialize_rule(rule)
    assert out is not None
    assert out["filename"].endswith(".md")
    assert "verified" in out["content"]
    assert "Higher booking conversion" in out["content"]
    assert "2026-04-20" in out["content"]
    assert "Greet customers in their preferred language" in out["content"]


def test_serialize_returns_none_for_empty_rule():
    assert serialize_rule({"rule": ""}) is None
    assert serialize_rule({}) is None


def test_serialize_includes_metrics_when_present():
    rule = {
        "rule": "Always upsell dessert to families with kids",
        "status": "verified",
        "added": "2026-04-20",
        "metrics_at_add": {"conversion": 0.12, "aov": 85},
        "metrics_after": {"conversion": 0.18, "aov": 110},
    }
    out = serialize_rule(rule)
    assert "Baseline metrics" in out["content"]
    assert "Verified-state metrics" in out["content"]
    assert "0.18" in out["content"]


def test_serialize_includes_parent_rules_when_merged():
    rule = {
        "rule": "Confirm allergies and dietary needs in first message",
        "status": "verified",
        "parent_rules": ["confirm-allergies", "ask-dietary"],
    }
    out = serialize_rule(rule)
    assert "Replaces" in out["content"]
    assert "confirm-allergies" in out["content"]


def test_parse_skill_md_recovers_rule_text():
    rule = {
        "rule": "Always confirm party size before suggesting menu",
        "reason": "Avoids over-ordering",
        "status": "verified",
        "added": "2026-04-20",
    }
    serialized = serialize_rule(rule)
    parsed = parse_skill_md(serialized["content"])
    assert parsed["rule"] == "Always confirm party size before suggesting menu"
    assert "over-ordering" in parsed["reason"]
    assert parsed["status"] == "verified"
    assert parsed["added"] == "2026-04-20"


def test_parse_skill_md_handles_bare_markdown():
    content = "# A simple rule\n\nSome description."
    parsed = parse_skill_md(content)
    assert parsed["rule"] == "A simple rule"
    assert parsed["status"] == "verified"


def test_parse_skill_md_returns_empty_on_blank():
    assert parse_skill_md("") == {}


def test_extract_rule_block_picks_blockquote():
    body = "**Rule:**\n> The actual rule text\n\n**Why:**\nReason"
    assert _extract_rule_block(body) == "The actual rule text"


def test_extract_section_pulls_why():
    body = "**Rule:**\n> X\n\n**Why:**\nBecause it works\n\n**Other:**\nNope"
    assert _extract_section(body, "Why") == "Because it works"


def test_serialize_filename_is_slug():
    rule = {"rule": "Always greet guests warmly", "status": "verified"}
    out = serialize_rule(rule)
    assert out["filename"] == "always-greet-guests-warmly.md"
