"""Tests for daily_pulse — pure formatting + window logic, no network."""

from datetime import time

import pytest

from daily_pulse import (
    _empty_metrics,
    _extract_highlights,
    _in_delivery_window,
    _make_headline,
    _utc_offset_hours,
)


def test_headline_quiet_day():
    m = _empty_metrics()
    assert "Quiet day" in _make_headline(m)


def test_headline_with_bookings_only():
    m = _empty_metrics()
    m["bookings_today"] = 12
    out = _make_headline(m)
    assert "12 bookings today" in out
    assert "AED" not in out


def test_headline_with_singular_booking():
    m = _empty_metrics()
    m["bookings_today"] = 1
    assert "1 booking today" in _make_headline(m)


def test_headline_combines_bookings_actions_revenue():
    m = _empty_metrics()
    m["bookings_today"] = 5
    m["pending_owner_actions"] = 2
    m["projected_revenue_aed"] = 4200
    out = _make_headline(m)
    assert "5 bookings today" in out
    assert "2 actions need you" in out
    assert "AED 4,200 projected" in out


def test_highlights_yesterday_summary():
    m = _empty_metrics()
    m["yesterday_conversations"] = 30
    m["yesterday_bookings"] = 8
    out = _extract_highlights(m)
    assert any("30 chats → 8 bookings" in h for h in out)


def test_highlights_high_value_singular():
    m = _empty_metrics()
    m["high_value_today"] = 1
    assert any("1 high-value guest today" in h for h in _extract_highlights(m))


def test_highlights_streak_only_when_3plus():
    m = _empty_metrics()
    m["active_days_streak"] = 2
    assert not any("streak" in h for h in _extract_highlights(m))
    m["active_days_streak"] = 4
    assert any("4-day active streak" in h for h in _extract_highlights(m))


def test_highlights_capped_at_5():
    m = _empty_metrics()
    m["yesterday_conversations"] = 10
    m["yesterday_bookings"] = 1
    m["high_value_today"] = 2
    m["open_complaints"] = 1
    m["active_days_streak"] = 5
    m["weather_hint"] = "Hot afternoon expected"
    assert len(_extract_highlights(m)) <= 5


def test_in_delivery_window_at_target():
    assert _in_delivery_window(time(8, 30)) is True


def test_in_delivery_window_within_30_min():
    assert _in_delivery_window(time(8, 0)) is True
    assert _in_delivery_window(time(9, 0)) is True


def test_in_delivery_window_outside():
    assert _in_delivery_window(time(7, 0)) is False
    assert _in_delivery_window(time(10, 0)) is False
    assert _in_delivery_window(time(20, 30)) is False


def test_utc_offset_uae_default():
    assert _utc_offset_hours(None) == 4
    assert _utc_offset_hours("Asia/Dubai") == 4


def test_utc_offset_known_gcc():
    assert _utc_offset_hours("Asia/Riyadh") == 3
    assert _utc_offset_hours("Asia/Bahrain") == 3


def test_utc_offset_unknown_falls_back_to_uae():
    assert _utc_offset_hours("Antarctica/Penguin") == 4
