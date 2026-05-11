"""Daily Pulse — productized owner morning brief.

Wraps owner_brain.generate_morning_brief() with:
  • Structured payload for dashboard preview (not just a string)
  • Per-client send loop with timezone-aware delivery
  • Single cron entry the scheduler can call hourly

The "Daily Pulse" name is the marketing surface for what was previously
just an internal SCQA brief. Same brain, productized wrapper.
"""

from __future__ import annotations

import os
from datetime import datetime, time, timezone, timedelta
from typing import Any

import httpx
import supa  # post-Supabase shim (routes _SUPA_URL → asyncpg)

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
_KAPSO_KEY = os.environ.get("KAPSO_PLATFORM_API_KEY", "")

_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
}

# Default delivery window — 8:30am in the client's timezone.
DEFAULT_DELIVERY_HOUR = 8
DEFAULT_DELIVERY_MINUTE = 30


# ─── Public API ──────────────────────────────────────────────────────────

async def compose_pulse(client_id: str) -> dict[str, Any]:
    """Build the dashboard-shaped Daily Pulse payload for a single client.

    Returns:
        {
          "client_id": str,
          "headline": str,           # one-liner for the dashboard tile
          "metrics": {...},          # numeric snapshot for charts
          "highlights": [str, ...],  # 3–5 bullet points
          "owner_message": str,      # the WhatsApp-ready brief
          "generated_at": ISO,
        }
    """
    from owner_brain import generate_morning_brief

    owner_message = await generate_morning_brief(client_id)
    metrics = await _fetch_metrics(client_id)
    highlights = _extract_highlights(metrics)
    headline = _make_headline(metrics)

    return {
        "client_id": client_id,
        "headline": headline,
        "metrics": metrics,
        "highlights": highlights,
        "owner_message": owner_message,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


async def send_pulse(client_id: str) -> dict[str, Any]:
    """Compose and deliver to the owner WhatsApp. Returns delivery status."""
    pulse = await compose_pulse(client_id)
    owner_phone = await _owner_phone(client_id)
    delivered = False
    if owner_phone and pulse.get("owner_message"):
        delivered = await _send_whatsapp(owner_phone, pulse["owner_message"], client_id)
    return {
        "client_id": client_id,
        "delivered": delivered,
        "owner_phone": owner_phone,
        "headline": pulse["headline"],
    }


async def cron_daily_pulse_all_clients(now: datetime | None = None) -> dict[str, Any]:
    """Scheduler entrypoint — call hourly.

    For each active client, only send if local time is within the delivery window
    AND we haven't already sent today.
    """
    now = now or datetime.now(timezone.utc)
    clients = await _fetch_active_clients()
    sent = []
    skipped = []

    for client in clients:
        offset = _utc_offset_hours(client.get("timezone"))
        local = now + timedelta(hours=offset)
        local_t = local.time()
        already_sent_today = await _already_sent_today(client["id"], local.date().isoformat())

        if already_sent_today:
            skipped.append({"client_id": client["id"], "reason": "already_sent"})
            continue
        if not _in_delivery_window(local_t):
            skipped.append({"client_id": client["id"], "reason": "outside_window"})
            continue

        result = await send_pulse(client["id"])
        if result["delivered"]:
            await _mark_sent(client["id"], local.date().isoformat())
        sent.append(result)

    return {"sent": len(sent), "skipped": len(skipped), "details": {"sent": sent, "skipped": skipped}}


# ─── Pure formatting (testable) ──────────────────────────────────────────

def _make_headline(metrics: dict) -> str:
    """One-line tile headline for the dashboard. Pure function."""
    bookings_today = metrics.get("bookings_today", 0)
    pending_actions = metrics.get("pending_owner_actions", 0)
    revenue = metrics.get("projected_revenue_aed", 0)

    if bookings_today == 0 and pending_actions == 0:
        return "Quiet day ahead — no bookings yet."
    parts = []
    if bookings_today:
        parts.append(f"{bookings_today} booking{'s' if bookings_today != 1 else ''} today")
    if pending_actions:
        parts.append(f"{pending_actions} action{'s' if pending_actions != 1 else ''} need you")
    if revenue:
        parts.append(f"~AED {revenue:,} projected")
    return " · ".join(parts)


def _extract_highlights(metrics: dict) -> list[str]:
    """3–5 bullet points for the dashboard tile. Pure function."""
    highlights: list[str] = []
    yest_conv = metrics.get("yesterday_conversations", 0)
    yest_bookings = metrics.get("yesterday_bookings", 0)
    if yest_conv:
        highlights.append(f"Yesterday: {yest_conv} chats → {yest_bookings} bookings")

    high_value = metrics.get("high_value_today", 0)
    if high_value:
        highlights.append(f"{high_value} high-value guest{'s' if high_value != 1 else ''} today")

    complaints = metrics.get("open_complaints", 0)
    if complaints:
        highlights.append(f"{complaints} open complaint{'s' if complaints != 1 else ''} to resolve")

    streak = metrics.get("active_days_streak", 0)
    if streak >= 3:
        highlights.append(f"On a {streak}-day active streak")

    weather = metrics.get("weather_hint")
    if weather:
        highlights.append(weather)

    return highlights[:5]


def _in_delivery_window(local_t: time) -> bool:
    """We send within ±30min of the configured delivery time."""
    target = time(DEFAULT_DELIVERY_HOUR, DEFAULT_DELIVERY_MINUTE)
    target_minutes = target.hour * 60 + target.minute
    actual_minutes = local_t.hour * 60 + local_t.minute
    return abs(actual_minutes - target_minutes) <= 30


def _utc_offset_hours(tz: str | None) -> int:
    """Map a timezone hint to a UTC offset in hours.

    We deliberately don't use pytz here — the SMB set is GCC + a few EU.
    This keeps the dependency surface minimal.
    """
    if not tz:
        return 4  # UAE default
    return _TZ_HINTS.get(tz, 4)


_TZ_HINTS = {
    "Asia/Dubai": 4,
    "Asia/Riyadh": 3,
    "Asia/Kuwait": 3,
    "Asia/Qatar": 3,
    "Asia/Bahrain": 3,
    "Asia/Muscat": 4,
    "Europe/London": 0,
    "Europe/Paris": 1,
    "UTC": 0,
}


# ─── Supabase helpers ────────────────────────────────────────────────────

async def _fetch_active_clients() -> list[dict]:
    if not _SUPA_KEY:
        return []
    try:
        async with supa.client(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/clients?status=eq.active&select=id,timezone,contact_phone",
                headers=_SUPA_HEADERS,
            )
            return r.json() if r.status_code == 200 else []
    except httpx.HTTPError:
        return []


async def _fetch_metrics(client_id: str) -> dict[str, Any]:
    """Pull a tight set of numbers for the dashboard tile.

    Doesn't call MiniMax — just SQL counts. Keeps this fast.
    """
    if not _SUPA_KEY:
        return _empty_metrics()

    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    yesterday = (now - timedelta(days=1)).date().isoformat()

    metrics: dict[str, Any] = _empty_metrics()
    try:
        async with supa.client(timeout=10) as http:
            today_b = await http.get(
                f"{_SUPA_URL}/rest/v1/active_bookings"
                f"?client_id=eq.{client_id}&booking_date=eq.{today}&select=id,party_size",
                headers=_SUPA_HEADERS,
            )
            today_bookings = today_b.json() if today_b.status_code == 200 else []
            metrics["bookings_today"] = len(today_bookings)
            metrics["projected_revenue_aed"] = sum(
                int(b.get("party_size") or 0) * 150 for b in today_bookings
            )
            metrics["high_value_today"] = sum(
                1 for b in today_bookings if (b.get("party_size") or 0) >= 6
            )

            yest_b = await http.get(
                f"{_SUPA_URL}/rest/v1/active_bookings"
                f"?client_id=eq.{client_id}&created_at=gte.{yesterday}T00:00:00Z"
                f"&created_at=lt.{today}T00:00:00Z&select=id",
                headers=_SUPA_HEADERS,
            )
            metrics["yesterday_bookings"] = len(yest_b.json() if yest_b.status_code == 200 else [])

            yest_msg = await http.get(
                f"{_SUPA_URL}/rest/v1/conversation_messages"
                f"?client_id=eq.{client_id}&direction=eq.inbound"
                f"&created_at=gte.{yesterday}T00:00:00Z&created_at=lt.{today}T00:00:00Z"
                f"&select=customer_phone",
                headers=_SUPA_HEADERS,
            )
            yest_msgs = yest_msg.json() if yest_msg.status_code == 200 else []
            metrics["yesterday_conversations"] = len(set(m.get("customer_phone") for m in yest_msgs))

    except httpx.HTTPError:
        return metrics
    return metrics


def _empty_metrics() -> dict[str, Any]:
    return {
        "bookings_today": 0,
        "projected_revenue_aed": 0,
        "high_value_today": 0,
        "yesterday_bookings": 0,
        "yesterday_conversations": 0,
        "open_complaints": 0,
        "pending_owner_actions": 0,
        "active_days_streak": 0,
        "weather_hint": None,
    }


async def _owner_phone(client_id: str) -> str:
    if not _SUPA_KEY:
        return ""
    try:
        async with supa.client(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/clients?id=eq.{client_id}&select=contact_phone",
                headers=_SUPA_HEADERS,
            )
            rows = r.json() if r.status_code == 200 else []
            return (rows[0].get("contact_phone") or "") if rows else ""
    except httpx.HTTPError:
        return ""


async def _already_sent_today(client_id: str, local_date: str) -> bool:
    """Idempotency check — uses activity_logs as the marker store.

    Looks for a `daily_pulse_sent` event today.
    """
    if not _SUPA_KEY:
        return False
    try:
        async with supa.client(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/activity_logs"
                f"?client_id=eq.{client_id}&event_type=eq.daily_pulse_sent"
                f"&created_at=gte.{local_date}T00:00:00Z&select=id&limit=1",
                headers=_SUPA_HEADERS,
            )
            return bool(r.json()) if r.status_code == 200 else False
    except httpx.HTTPError:
        return False


async def _mark_sent(client_id: str, local_date: str) -> None:
    if not _SUPA_KEY:
        return
    try:
        async with supa.client(timeout=10) as http:
            await http.post(
                f"{_SUPA_URL}/rest/v1/activity_logs",
                headers={**_SUPA_HEADERS, "Prefer": "return=minimal"},
                json={
                    "client_id": client_id,
                    "event_type": "daily_pulse_sent",
                    "metadata": {"local_date": local_date},
                },
            )
    except httpx.HTTPError:
        pass


async def _send_whatsapp(phone: str, body: str, client_id: str) -> bool:
    if not _KAPSO_KEY:
        return False
    try:
        async with supa.client(timeout=10) as http:
            r = await http.post(
                "https://app.kapso.ai/api/v1/whatsapp/messages",
                headers={"X-API-Key": _KAPSO_KEY, "Content-Type": "application/json"},
                json={
                    "to": phone,
                    "type": "text",
                    "text": {"body": body},
                    "client_ref": client_id,
                },
            )
            return r.status_code in (200, 201)
    except httpx.HTTPError:
        return False
