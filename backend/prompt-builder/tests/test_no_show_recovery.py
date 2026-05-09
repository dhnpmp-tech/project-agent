"""Unit tests for no_show_recovery — pure decision logic, no network."""

from datetime import datetime, timedelta, timezone

import pytest

from no_show_recovery import (
    _build_payment_link,
    _currency_for,
    _deposit_message,
    _estimate_revenue,
    _next_action_for,
    _parse_booking_dt,
)


def _booking(**overrides):
    base = {
        "id": "b-1",
        "client_id": "c-1",
        "customer_phone": "+971500000000",
        "status": "confirming",
        "guest_name": "Sara",
        "party_size": 4,
        "booking_date": "2026-05-01",
        "booking_time": "20:00",
        "custom_fields": {},
    }
    base.update(overrides)
    return base


def test_remind_window_24h_out():
    booking_dt = datetime(2026, 5, 1, 20, 0, tzinfo=timezone.utc)
    now = booking_dt - timedelta(hours=24)
    assert _next_action_for(_booking(), now) == "remind"


def test_no_action_when_well_outside_window():
    booking_dt = datetime(2026, 5, 1, 20, 0, tzinfo=timezone.utc)
    now = booking_dt - timedelta(days=5)
    assert _next_action_for(_booking(), now) is None


def test_request_deposit_when_reminded_but_not_confirmed():
    booking_dt = datetime(2026, 5, 1, 20, 0, tzinfo=timezone.utc)
    now = booking_dt - timedelta(hours=15)
    booking = _booking(_reminded_at="2026-04-30T20:00:00+00:00")
    assert _next_action_for(booking, now) == "request_deposit"


def test_no_deposit_when_already_confirmed():
    booking_dt = datetime(2026, 5, 1, 20, 0, tzinfo=timezone.utc)
    now = booking_dt - timedelta(hours=15)
    booking = _booking(status="confirmed", _reminded_at="2026-04-30T20:00:00+00:00")
    assert _next_action_for(booking, now) is None


def test_release_when_deposit_window_expired():
    booking_dt = datetime(2026, 5, 1, 20, 0, tzinfo=timezone.utc)
    now = booking_dt - timedelta(hours=10)
    booking = _booking(
        _deposit_state="requested",
        _deposit_age_hours=13,
    )
    assert _next_action_for(booking, now) == "release"


def test_no_action_for_released_booking():
    booking_dt = datetime(2026, 5, 1, 20, 0, tzinfo=timezone.utc)
    now = booking_dt - timedelta(hours=24)
    assert _next_action_for(_booking(status="released"), now) is None


def test_currency_defaults_to_aed():
    assert _currency_for(_booking()) == "AED"


def test_currency_respects_custom_field():
    assert _currency_for(_booking(custom_fields={"currency": "SAR"})) == "SAR"


def test_payment_link_includes_booking_amount_currency():
    link = _build_payment_link(_booking(), 50, "AED")
    assert "booking=b-1" in link
    assert "amt=50" in link
    assert "ccy=AED" in link


def test_deposit_message_uses_guest_name_and_link():
    msg = _deposit_message(_booking(), 50, "AED", "https://pay/x")
    assert "Sara" in msg
    assert "50 AED" in msg
    assert "https://pay/x" in msg
    assert "cancel" in msg.lower()


def test_estimate_revenue_uses_party_size():
    # 4 covers × AED 150 × 100 (minor) = 60_000
    assert _estimate_revenue(_booking(party_size=4)) == 60_000


def test_parse_booking_dt_handles_iso_date_time():
    dt = _parse_booking_dt(_booking())
    assert dt is not None
    assert dt.year == 2026 and dt.month == 5 and dt.day == 1


def test_parse_booking_dt_returns_none_on_garbage():
    assert _parse_booking_dt(_booking(booking_date="not-a-date")) is None
