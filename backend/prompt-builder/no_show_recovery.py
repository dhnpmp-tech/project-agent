"""No-Show Recovery Loop.

24h before booking → reminder.
If not confirmed within 6h → deposit request (Tabby/Tamara/Stripe).
If deposit not paid within 12h → mark released, push to waitlist.

Each step writes to deposit_requests / no_show_log for the dashboard.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta
from typing import Any

import httpx
import supa  # post-Supabase shim (routes _SUPA_URL → asyncpg)

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
_KAPSO_KEY = os.environ.get("KAPSO_PLATFORM_API_KEY", "")
_DEPOSIT_LINK_BASE = os.environ.get("DEPOSIT_LINK_BASE", "https://pay.agents.dcp.sa/deposit")
_DEFAULT_PROVIDER = os.environ.get("DEPOSIT_PROVIDER", "tabby")
_DEFAULT_DEPOSIT_AED = int(os.environ.get("DEFAULT_DEPOSIT_AED", "50"))

_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


# ─── Public API ──────────────────────────────────────────────────────────

async def nightly_sweep(now: datetime | None = None) -> dict[str, int]:
    """Cron entrypoint. Walks all confirmed-but-unpaid bookings in the next 24h
    and progresses each through reminder → deposit → release.

    Returns counters for ops dashboard.
    """
    now = now or datetime.now(timezone.utc)
    counters = {"reminded": 0, "deposit_requested": 0, "released": 0, "scanned": 0}

    cutoff = (now + timedelta(hours=24)).isoformat()
    bookings = await _fetch_upcoming_bookings(cutoff)
    counters["scanned"] = len(bookings)

    for booking in bookings:
        action = _next_action_for(booking, now)
        if action == "remind":
            await _send_reminder(booking)
            counters["reminded"] += 1
        elif action == "request_deposit":
            await request_deposit(booking)
            counters["deposit_requested"] += 1
        elif action == "release":
            await release_to_waitlist(booking, reason="deposit_window_expired")
            counters["released"] += 1

    return counters


async def request_deposit(booking: dict, amount_aed: int | None = None) -> dict:
    """Send a deposit request for a single booking.

    Generates a payment link and a WhatsApp message with quick-reply buttons.
    Persists to deposit_requests so the dashboard can track status.
    """
    amount = amount_aed or _DEFAULT_DEPOSIT_AED
    currency = _currency_for(booking)
    payment_link = _build_payment_link(booking, amount, currency)

    record = {
        "client_id": booking["client_id"],
        "booking_id": booking["id"],
        "customer_phone": booking["customer_phone"],
        "amount_minor": amount * 100,
        "currency": currency,
        "provider": _DEFAULT_PROVIDER,
        "payment_link": payment_link,
        "status": "requested",
    }
    saved = await _insert("deposit_requests", record)

    msg = _deposit_message(booking, amount, currency, payment_link)
    await _send_whatsapp(booking["customer_phone"], msg, client_id=booking["client_id"])
    return saved


async def handle_deposit_response(booking_id: str, paid: bool) -> dict:
    """Webhook callback from payment provider OR from a quick-reply button.

    Updates deposit_requests + writes to no_show_log.
    """
    status = "paid" if paid else "declined"
    updated = await _patch(
        "deposit_requests",
        f"booking_id=eq.{booking_id}&status=eq.requested",
        {"status": status, "responded_at": datetime.now(timezone.utc).isoformat()},
    )
    if updated:
        booking = await _fetch_booking(booking_id)
        if booking:
            await _log_outcome(
                booking,
                outcome="deposit_paid" if paid else "no_show",
                reason="customer_response",
            )
    return {"status": status, "booking_id": booking_id}


async def release_to_waitlist(booking: dict, reason: str = "manual") -> dict:
    """Mark a booking as released and try to fill from waitlist.

    Waitlist matching is intentionally simple — first customer on waitlist
    for the same client, date, and party_size <= original.
    """
    await _patch(
        "active_bookings",
        f"id=eq.{booking['id']}",
        {"status": "released", "last_updated_at": datetime.now(timezone.utc).isoformat()},
    )

    waitlisted = await _find_waitlist_match(booking)
    if waitlisted:
        await _send_whatsapp(
            waitlisted["customer_phone"],
            _waitlist_offer_message(booking, waitlisted),
            client_id=booking["client_id"],
        )
        recovered = _estimate_revenue(booking)
        await _log_outcome(booking, outcome="released", reason=reason, recovered=recovered)
        return {"released": True, "filled_from_waitlist": True, "recovered_minor": recovered}

    await _log_outcome(booking, outcome="released", reason=reason)
    return {"released": True, "filled_from_waitlist": False}


# ─── Step decision ───────────────────────────────────────────────────────

def _next_action_for(booking: dict, now: datetime) -> str | None:
    """Decide which step (if any) this booking is due for."""
    booking_dt = _parse_booking_dt(booking)
    if not booking_dt:
        return None

    hours_to_booking = (booking_dt - now).total_seconds() / 3600
    status = booking.get("status", "")
    deposit_state = booking.get("_deposit_state")  # injected by _fetch_upcoming_bookings

    if status == "released":
        return None

    # 24h out, not yet reminded
    if 18 <= hours_to_booking <= 26 and not booking.get("_reminded_at"):
        return "remind"

    # 18h out, reminded but not confirmed → deposit
    if 12 <= hours_to_booking < 18 and status != "confirmed" and not deposit_state:
        return "request_deposit"

    # Deposit requested >12h ago and still not paid → release
    if deposit_state == "requested" and booking.get("_deposit_age_hours", 0) > 12:
        return "release"

    return None


# ─── Messaging ───────────────────────────────────────────────────────────

def _deposit_message(booking: dict, amount: int, currency: str, link: str) -> str:
    name = booking.get("guest_name") or "there"
    party = booking.get("party_size") or "your"
    date = booking.get("booking_date") or "your booked date"
    time = booking.get("booking_time") or ""
    return (
        f"Hi {name}, just confirming your booking for {party} on {date} at {time}. "
        f"To hold the table we need a {amount} {currency} refundable deposit — "
        f"goes straight onto your bill. Tap to pay: {link}\n\n"
        f"Reply *cancel* if you'd like to release the slot."
    )


def _waitlist_offer_message(released: dict, candidate: dict) -> str:
    return (
        f"Good news — a table just opened up on {released.get('booking_date')} "
        f"at {released.get('booking_time')} for {released.get('party_size')} guests. "
        f"Reply *yes* to grab it (first come, first served)."
    )


# ─── Supabase helpers (thin) ─────────────────────────────────────────────

async def _fetch_upcoming_bookings(cutoff_iso: str) -> list[dict]:
    """Return active_bookings due within the cutoff, joined with deposit state."""
    if not _SUPA_KEY:
        return []
    url = (
        f"{_SUPA_URL}/rest/v1/active_bookings"
        f"?status=in.(collecting,confirming,confirmed)"
        f"&booking_date=lte.{cutoff_iso}"
        f"&select=*"
    )
    async with supa.client(timeout=10) as http:
        r = await http.get(url, headers=_SUPA_HEADERS)
        rows = r.json() if r.status_code == 200 else []

    # Lazy enrich with deposit state (one fetch per booking is fine at this scale).
    enriched = []
    for row in rows:
        deposit = await _latest_deposit(row["id"])
        if deposit:
            row["_deposit_state"] = deposit["status"]
            requested_at = _parse_iso(deposit.get("requested_at"))
            if requested_at:
                age = (datetime.now(timezone.utc) - requested_at).total_seconds() / 3600
                row["_deposit_age_hours"] = age
        enriched.append(row)
    return enriched


async def _fetch_booking(booking_id: str) -> dict | None:
    if not _SUPA_KEY:
        return None
    async with supa.client(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/active_bookings?id=eq.{booking_id}&select=*",
            headers=_SUPA_HEADERS,
        )
        rows = r.json() if r.status_code == 200 else []
        return rows[0] if rows else None


async def _latest_deposit(booking_id: str) -> dict | None:
    if not _SUPA_KEY:
        return None
    async with supa.client(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/deposit_requests"
            f"?booking_id=eq.{booking_id}&order=requested_at.desc&limit=1",
            headers=_SUPA_HEADERS,
        )
        rows = r.json() if r.status_code == 200 else []
        return rows[0] if rows else None


async def _insert(table: str, payload: dict) -> dict:
    if not _SUPA_KEY:
        return payload
    async with supa.client(timeout=10) as http:
        r = await http.post(f"{_SUPA_URL}/rest/v1/{table}", headers=_SUPA_HEADERS, json=payload)
        if r.status_code in (200, 201):
            data = r.json()
            return data[0] if isinstance(data, list) and data else payload
        return payload


async def _patch(table: str, query: str, payload: dict) -> bool:
    if not _SUPA_KEY:
        return False
    async with supa.client(timeout=10) as http:
        r = await http.patch(
            f"{_SUPA_URL}/rest/v1/{table}?{query}", headers=_SUPA_HEADERS, json=payload
        )
        return r.status_code in (200, 204)


async def _find_waitlist_match(released: dict) -> dict | None:
    """Naive matcher: first waitlist row for same client+date with party_size <=."""
    if not _SUPA_KEY:
        return None
    party = released.get("party_size") or 99
    async with supa.client(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/active_bookings"
            f"?client_id=eq.{released['client_id']}"
            f"&status=eq.waitlisted"
            f"&booking_date=eq.{released.get('booking_date')}"
            f"&party_size=lte.{party}"
            f"&order=created_at.asc&limit=1",
            headers=_SUPA_HEADERS,
        )
        rows = r.json() if r.status_code == 200 else []
        return rows[0] if rows else None


async def _log_outcome(booking: dict, outcome: str, reason: str = "", recovered: int = 0) -> None:
    await _insert(
        "no_show_log",
        {
            "client_id": booking["client_id"],
            "booking_id": booking["id"],
            "customer_phone": booking["customer_phone"],
            "outcome": outcome,
            "reason": reason,
            "recovered_revenue_minor": recovered,
        },
    )


# ─── Kapso send ──────────────────────────────────────────────────────────

async def _send_whatsapp(phone: str, body: str, client_id: str) -> bool:
    if not _KAPSO_KEY:
        return False
    async with supa.client(timeout=10) as http:
        r = await http.post(
            "https://app.kapso.ai/api/v1/whatsapp/messages",
            headers={"X-API-Key": _KAPSO_KEY, "Content-Type": "application/json"},
            json={"to": phone, "type": "text", "text": {"body": body}, "client_ref": client_id},
        )
        return r.status_code in (200, 201)


async def _send_reminder(booking: dict) -> bool:
    name = booking.get("guest_name") or "there"
    body = (
        f"Hi {name}, reminder: your booking for {booking.get('party_size') or ''} on "
        f"{booking.get('booking_date')} at {booking.get('booking_time')}. "
        f"Reply *yes* to confirm or *change* to update."
    )
    ok = await _send_whatsapp(booking["customer_phone"], body, booking["client_id"])
    if ok:
        await _patch(
            "active_bookings",
            f"id=eq.{booking['id']}",
            {"last_updated_field": "reminder_sent", "last_updated_at": datetime.now(timezone.utc).isoformat()},
        )
    return ok


# ─── Misc helpers ────────────────────────────────────────────────────────

def _currency_for(booking: dict) -> str:
    """Pick currency from booking's custom_fields or default to AED."""
    custom = booking.get("custom_fields") or {}
    return custom.get("currency", "AED")


def _build_payment_link(booking: dict, amount: int, currency: str) -> str:
    """Build a deposit URL. Real provider integration lives behind this."""
    return (
        f"{_DEPOSIT_LINK_BASE}?booking={booking['id']}"
        f"&amt={amount}&ccy={currency}&prov={_DEFAULT_PROVIDER}"
    )


def _estimate_revenue(booking: dict) -> int:
    """Rough revenue estimate — party_size × 150 AED average per cover."""
    party = booking.get("party_size") or 0
    return int(party) * 150 * 100  # minor units


def _parse_booking_dt(booking: dict) -> datetime | None:
    date = booking.get("booking_date")
    time = booking.get("booking_time")
    if not date:
        return None
    try:
        if time:
            return datetime.fromisoformat(f"{date}T{time}").replace(tzinfo=timezone.utc)
        return datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


def _parse_iso(value: Any) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
