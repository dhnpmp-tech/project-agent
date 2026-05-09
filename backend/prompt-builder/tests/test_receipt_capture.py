"""Tests for receipt_capture — focuses on pure extraction → record mapping."""

import pytest

from receipt_capture import (
    _build_expense_record,
    _format_confirm,
    _guess_media_type,
    _parse_json_response,
    _to_minor,
)


def test_to_minor_handles_decimals():
    assert _to_minor(12.50) == 1250
    assert _to_minor(0) == 0
    assert _to_minor(None) == 0
    assert _to_minor("garbage") == 0
    assert _to_minor("99.99") == 9999


def test_parse_json_response_strips_prose():
    text = 'Sure! Here you go:\n{"vendor":"X","amount_total":10}\nLet me know.'
    result = _parse_json_response(text)
    assert result == {"vendor": "X", "amount_total": 10}


def test_parse_json_response_returns_empty_on_garbage():
    assert _parse_json_response("not json") == {}
    assert _parse_json_response("") == {}


def test_guess_media_type_jpeg():
    assert _guess_media_type(b"\xff\xd8\xff\xe0...") == "image/jpeg"


def test_guess_media_type_png():
    assert _guess_media_type(b"\x89PNG\r\n\x1a\nrest") == "image/png"


def test_guess_media_type_default():
    assert _guess_media_type(b"\x00\x00\x00") == "image/jpeg"


def test_build_expense_record_basic_aed():
    extracted = {
        "vendor": "Carrefour Mall of Emirates",
        "currency": "AED",
        "amount_total": 105.00,
        "vat_amount": 5.00,
        "receipt_date": "2026-04-26",
        "category": "inventory",
        "confidence": 0.92,
    }
    rec = _build_expense_record(
        extracted=extracted,
        client_id="c-1",
        owner_phone="+971500000000",
        media_url="https://media/x.jpg",
        default_currency="AED",
    )
    assert rec["currency"] == "AED"
    assert rec["amount_minor"] == 10500
    assert rec["vat_minor"] == 500
    assert rec["category"] == "inventory"
    assert rec["status"] == "pending_review"
    assert rec["receipt_url"] == "https://media/x.jpg"


def test_build_expense_record_infers_vat_when_missing_aed():
    # 100 AED with 5% VAT inclusive → VAT ≈ 4.76 → 476 minor
    extracted = {
        "vendor": "Lulu",
        "currency": "AED",
        "amount_total": 100.00,
        "vat_amount": 0,
        "category": "inventory",
    }
    rec = _build_expense_record(extracted, "c-1", "+971", "u", "AED")
    assert rec["vat_minor"] == 476


def test_build_expense_record_infers_vat_when_missing_sar():
    # 115 SAR with 15% VAT inclusive → VAT = 15.00 → 1500 minor
    extracted = {
        "vendor": "Hyper Panda",
        "currency": "SAR",
        "amount_total": 115.00,
        "vat_amount": 0,
        "category": "inventory",
    }
    rec = _build_expense_record(extracted, "c-1", "+966", "u", "SAR")
    assert rec["vat_minor"] == 1500


def test_build_expense_record_falls_back_to_default_currency():
    extracted = {"vendor": "X", "amount_total": 10, "currency": "ZZZ"}
    rec = _build_expense_record(extracted, "c-1", "+971", "u", "AED")
    assert rec["currency"] == "AED"


def test_build_expense_record_clamps_unknown_category():
    extracted = {
        "vendor": "X",
        "amount_total": 10,
        "currency": "AED",
        "category": "alien_thing",
    }
    rec = _build_expense_record(extracted, "c-1", "+971", "u", "AED")
    assert rec["category"] == "misc"


def test_build_expense_record_truncates_long_vendor():
    long = "A" * 200
    rec = _build_expense_record(
        {"vendor": long, "amount_total": 10, "currency": "AED"},
        "c-1",
        "+971",
        "u",
        "AED",
    )
    assert rec["vendor"] is not None
    assert len(rec["vendor"]) <= 80


def test_format_confirm_includes_amount_and_currency():
    msg = _format_confirm(
        {
            "vendor": "Spinneys",
            "amount_minor": 12550,
            "currency": "AED",
            "category": "inventory",
        }
    )
    assert "Spinneys" in msg
    assert "125.50" in msg
    assert "AED" in msg
    assert "inventory" in msg
