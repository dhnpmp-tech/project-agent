"""Conversion Tracking — Server-side event tracking for WhatsApp conversions.

Tracks the full customer journey: ad click -> WhatsApp conversation -> booking/order.
Supports Meta Conversions API (CAPI), GA4 Measurement Protocol, and internal analytics.
"""

import os
import json
import re
import httpx
import hashlib
from datetime import datetime, timezone, timedelta

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Ynpxa3RpcGltYm11anRvd296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwOTY5NCwiZXhwIjoyMDkwMDg1Njk0fQ.-DoNS5fZv3aUsFcugKg23yh9RqXXFIlgc5_9Hrk97bg")
_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# GA4 Event Taxonomy for WhatsApp journey
GA4_EVENTS = {
    "whatsapp_opt_in": {"params": ["source", "campaign", "medium"]},
    "menu_view": {"params": ["menu_section", "item_count"]},
    "booking_start": {"params": ["party_size", "date", "time"]},
    "booking_complete": {"params": ["party_size", "value", "transaction_id"]},
    "order_submit": {"params": ["items", "value", "order_type"]},
    "review_prompt_sent": {"params": ["platform", "rating"]},
    "referral_sent": {"params": ["referral_code", "channel"]},
    "loyalty_milestone": {"params": ["milestone", "reward"]},
    "achievement_unlocked": {"params": ["achievement_id", "reward"]},
}


def _hash_phone(phone: str) -> str:
    """SHA-256 hash a phone number for privacy compliance (Meta CAPI requirement)."""
    normalized = re.sub(r'[^\d+]', '', phone.strip())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _hash_email(email: str) -> str:
    """SHA-256 hash an email for privacy compliance."""
    return hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()


def _generate_event_id(client_id: str, event_name: str, phone: str) -> str:
    """Generate a unique event_id for deduplication across pixel + server."""
    now = datetime.now(timezone.utc).isoformat()
    raw = f"{client_id}:{event_name}:{phone}:{now}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


async def _get_client_config(client_id: str) -> dict:
    """Fetch client config including Meta pixel and GA4 settings."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/clients?id=eq.{client_id}&select=meta_config,ga4_config,company_name",
                headers=_SUPA_HEADERS,
            )
            rows = r.json() if r.status_code == 200 else []
            return rows[0] if rows else {}
    except Exception as e:
        print(f"[tracking] Failed to get client config: {e}")
        return {}


async def track_event(
    client_id: str,
    customer_phone: str,
    event_name: str,
    event_data: dict = None,
    source: str = "whatsapp",
) -> dict:
    """Track a conversion event. Stores internally and optionally sends to Meta CAPI + GA4.

    Generates a unique event_id for deduplication across pixel + server.
    Hashes PII (phone number) for privacy compliance.

    Returns: {event_id, tracked: bool, destinations: [str]}"""
    event_data = event_data or {}
    event_id = _generate_event_id(client_id, event_name, customer_phone)
    now = datetime.now(timezone.utc)
    destinations = []

    # Build the internal event record
    event_record = {
        "client_id": client_id,
        "event_type": f"tracking_{event_name}",
        "payload": {
            "event_id": event_id,
            "event_name": event_name,
            "customer_phone_hash": _hash_phone(customer_phone),
            "source": source,
            "event_data": event_data,
            "timestamp": now.isoformat(),
        },
    }

    # Store in activity_logs
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.post(
                f"{_SUPA_URL}/rest/v1/activity_logs",
                headers=_SUPA_HEADERS,
                json=event_record,
            )
            if r.status_code in (200, 201):
                destinations.append("supabase")
            else:
                print(f"[tracking] Supabase insert failed: {r.status_code} {r.text[:200]}")
    except Exception as e:
        print(f"[tracking] Failed to store event: {e}")

    # Send to Meta CAPI if configured
    config = await _get_client_config(client_id)
    meta_config = config.get("meta_config") or {}

    if meta_config.get("pixel_id") and meta_config.get("access_token"):
        user_data = {"phone": customer_phone}
        sent = await send_meta_capi_event(client_id, event_name, {**event_data, "event_id": event_id}, user_data)
        if sent:
            destinations.append("meta_capi")

    return {"event_id": event_id, "tracked": bool(destinations), "destinations": destinations}


async def send_meta_capi_event(
    client_id: str,
    event_name: str,
    event_data: dict,
    user_data: dict,
) -> bool:
    """Send an event to Meta Conversions API.
    Requires pixel_id and access_token in client config.
    Hashes phone/email per Meta requirements (SHA-256).
    Includes deduplication event_id."""
    config = await _get_client_config(client_id)
    meta_config = config.get("meta_config") or {}
    pixel_id = meta_config.get("pixel_id")
    access_token = meta_config.get("access_token")

    if not pixel_id or not access_token:
        return False

    # Map internal event names to Meta standard events where possible
    meta_event_map = {
        "whatsapp_opt_in": "Lead",
        "menu_view": "ViewContent",
        "booking_start": "InitiateCheckout",
        "booking_complete": "Purchase",
        "order_submit": "Purchase",
        "review_prompt_sent": "CustomizeProduct",
        "referral_sent": "Contact",
        "loyalty_milestone": "Subscribe",
        "achievement_unlocked": "Subscribe",
    }
    meta_event_name = meta_event_map.get(event_name, event_name)

    # Build user_data with hashed PII
    hashed_user_data = {}
    if user_data.get("phone"):
        hashed_user_data["ph"] = [_hash_phone(user_data["phone"])]
    if user_data.get("email"):
        hashed_user_data["em"] = [_hash_email(user_data["email"])]
    if user_data.get("country"):
        hashed_user_data["country"] = [
            hashlib.sha256(user_data["country"].lower().encode()).hexdigest()
        ]

    now = int(datetime.now(timezone.utc).timestamp())

    payload = {
        "data": [
            {
                "event_name": meta_event_name,
                "event_time": now,
                "event_id": event_data.get("event_id", _generate_event_id(client_id, event_name, "")),
                "action_source": "system_generated",
                "user_data": hashed_user_data,
                "custom_data": {
                    k: v for k, v in event_data.items()
                    if k not in ("event_id", "phone", "email")
                },
            }
        ],
    }

    # Add value/currency for purchase events
    if event_name in ("booking_complete", "order_submit") and event_data.get("value"):
        payload["data"][0]["custom_data"]["value"] = event_data["value"]
        payload["data"][0]["custom_data"]["currency"] = event_data.get("currency", "AED")

    try:
        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.post(
                f"https://graph.facebook.com/v19.0/{pixel_id}/events",
                params={"access_token": access_token},
                json=payload,
            )
            if r.status_code == 200:
                print(f"[tracking] Meta CAPI sent: {meta_event_name} for {client_id}")
                return True
            else:
                print(f"[tracking] Meta CAPI failed: {r.status_code} {r.text[:200]}")
                return False
    except Exception as e:
        print(f"[tracking] Meta CAPI error: {e}")
        return False


async def get_conversion_funnel(client_id: str, days: int = 7) -> dict:
    """Get the full conversion funnel for a client.
    Returns: {
        funnel: {conversations_started, menu_viewed, booking_started, booking_completed, order_submitted},
        conversion_rates: {convo_to_menu, menu_to_booking, booking_start_to_complete},
        total_revenue: float,
        avg_order_value: float,
        attribution: {source: count for each source}
    }"""
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/activity_logs"
                f"?client_id=eq.{client_id}"
                f"&event_type=like.tracking_*"
                f"&created_at=gte.{start_date}"
                f"&select=event_type,payload,created_at"
                f"&order=created_at.asc",
                headers=_SUPA_HEADERS,
            )
            events = r.json() if r.status_code == 200 else []
    except Exception as e:
        print(f"[tracking] Failed to fetch funnel events: {e}")
        events = []

    # Count events by type
    event_counts = {}
    total_revenue = 0.0
    order_count = 0
    attribution = {}

    for evt in events:
        event_type = evt.get("event_type", "")
        event_name = event_type.replace("tracking_", "", 1)
        event_counts[event_name] = event_counts.get(event_name, 0) + 1

        payload = evt.get("payload") or {}
        event_data = payload.get("event_data") or {}

        # Track revenue
        if event_name in ("booking_complete", "order_submit"):
            value = event_data.get("value", 0)
            if isinstance(value, (int, float)):
                total_revenue += value
                order_count += 1

        # Track attribution
        source = payload.get("source") or event_data.get("source") or "direct"
        if event_name == "whatsapp_opt_in":
            attribution[source] = attribution.get(source, 0) + 1

    funnel = {
        "conversations_started": event_counts.get("whatsapp_opt_in", 0),
        "menu_viewed": event_counts.get("menu_view", 0),
        "booking_started": event_counts.get("booking_start", 0),
        "booking_completed": event_counts.get("booking_complete", 0),
        "order_submitted": event_counts.get("order_submit", 0),
    }

    # Calculate conversion rates (avoid division by zero)
    conversations = max(funnel["conversations_started"], 1)
    menu_views = max(funnel["menu_viewed"], 1)
    booking_starts = max(funnel["booking_started"], 1)

    conversion_rates = {
        "convo_to_menu": round(funnel["menu_viewed"] / conversations * 100, 1),
        "menu_to_booking": round(funnel["booking_started"] / menu_views * 100, 1),
        "booking_start_to_complete": round(funnel["booking_completed"] / booking_starts * 100, 1),
    }

    return {
        "funnel": funnel,
        "conversion_rates": conversion_rates,
        "total_revenue": round(total_revenue, 2),
        "avg_order_value": round(total_revenue / max(order_count, 1), 2),
        "attribution": attribution,
    }


async def get_event_timeline(client_id: str, customer_phone: str) -> list:
    """Get the full event timeline for a specific customer.
    Shows every touchpoint from first message to latest conversion."""
    phone_hash = _hash_phone(customer_phone)

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/activity_logs"
                f"?client_id=eq.{client_id}"
                f"&event_type=like.tracking_*"
                f"&select=event_type,payload,created_at"
                f"&order=created_at.asc",
                headers=_SUPA_HEADERS,
            )
            events = r.json() if r.status_code == 200 else []
    except Exception as e:
        print(f"[tracking] Failed to fetch timeline: {e}")
        return []

    # Filter events for this customer by phone hash
    timeline = []
    for evt in events:
        payload = evt.get("payload") or {}
        if payload.get("customer_phone_hash") == phone_hash:
            timeline.append({
                "event": evt.get("event_type", "").replace("tracking_", "", 1),
                "timestamp": payload.get("timestamp") or evt.get("created_at", ""),
                "source": payload.get("source", ""),
                "data": payload.get("event_data", {}),
            })

    return timeline


async def get_analytics_dashboard(client_id: str, days: int = 7) -> dict:
    """Comprehensive analytics dashboard combining all tracking data.
    Returns: {
        overview: {conversations, bookings, orders, revenue, conversion_rate},
        trends: {daily_data: [{date, conversations, bookings, revenue}]},
        top_sources: [{source, conversions, revenue}],
        peak_hours: {hour: activity_count},
        funnel: {stage: count},
    }"""
    start = datetime.now(timezone.utc) - timedelta(days=days)
    start_iso = start.isoformat()

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/activity_logs"
                f"?client_id=eq.{client_id}"
                f"&event_type=like.tracking_*"
                f"&created_at=gte.{start_iso}"
                f"&select=event_type,payload,created_at"
                f"&order=created_at.asc",
                headers=_SUPA_HEADERS,
            )
            events = r.json() if r.status_code == 200 else []
    except Exception as e:
        print(f"[tracking] Failed to fetch dashboard events: {e}")
        events = []

    # Overview counters
    conversations = 0
    bookings = 0
    orders = 0
    revenue = 0.0

    # Trends — daily breakdown
    daily = {}
    for i in range(days):
        d = (start + timedelta(days=i + 1)).strftime("%Y-%m-%d")
        daily[d] = {"date": d, "conversations": 0, "bookings": 0, "revenue": 0.0}

    # Sources
    source_stats = {}

    # Peak hours
    peak_hours = {}

    for evt in events:
        event_type = evt.get("event_type", "")
        event_name = event_type.replace("tracking_", "", 1)
        payload = evt.get("payload") or {}
        event_data = payload.get("event_data") or {}
        ts = payload.get("timestamp") or evt.get("created_at", "")
        date_str = ts[:10] if len(ts) >= 10 else ""
        hour_str = ts[11:13] if len(ts) >= 13 else "00"
        source = payload.get("source") or event_data.get("source") or "direct"

        # Overview
        if event_name == "whatsapp_opt_in":
            conversations += 1
        elif event_name == "booking_complete":
            bookings += 1
        elif event_name == "order_submit":
            orders += 1

        value = event_data.get("value", 0)
        if event_name in ("booking_complete", "order_submit") and isinstance(value, (int, float)):
            revenue += value

        # Daily trends
        if date_str in daily:
            if event_name == "whatsapp_opt_in":
                daily[date_str]["conversations"] += 1
            elif event_name in ("booking_complete", "order_submit"):
                daily[date_str]["bookings"] += 1
                if isinstance(value, (int, float)):
                    daily[date_str]["revenue"] += value

        # Source tracking
        if event_name in ("booking_complete", "order_submit"):
            if source not in source_stats:
                source_stats[source] = {"source": source, "conversions": 0, "revenue": 0.0}
            source_stats[source]["conversions"] += 1
            if isinstance(value, (int, float)):
                source_stats[source]["revenue"] += value

        # Peak hours
        peak_hours[hour_str] = peak_hours.get(hour_str, 0) + 1

    # Funnel (reuse get_conversion_funnel for consistency)
    funnel_data = await get_conversion_funnel(client_id, days)

    total_convos = max(conversations, 1)
    conversion_rate = round((bookings + orders) / total_convos * 100, 1)

    # Sort sources by conversions
    top_sources = sorted(source_stats.values(), key=lambda s: s["conversions"], reverse=True)

    return {
        "overview": {
            "conversations": conversations,
            "bookings": bookings,
            "orders": orders,
            "revenue": round(revenue, 2),
            "conversion_rate": conversion_rate,
        },
        "trends": {
            "daily_data": sorted(daily.values(), key=lambda d: d["date"]),
        },
        "top_sources": top_sources[:10],
        "peak_hours": peak_hours,
        "funnel": funnel_data.get("funnel", {}),
    }


async def get_analytics_brief(client_id: str, lang: str = "en") -> str:
    """WhatsApp-friendly analytics summary for Owner Brain."""
    dashboard = await get_analytics_dashboard(client_id, days=7)
    overview = dashboard.get("overview", {})
    funnel = dashboard.get("funnel", {})
    top_sources = dashboard.get("top_sources", [])
    peak = dashboard.get("peak_hours", {})

    if overview.get("conversations", 0) == 0:
        if lang == "ar":
            return "لا توجد بيانات تتبع بعد. ستظهر التحليلات بعد بدء المحادثات."
        return "No tracking data yet. Analytics will appear once conversations start."

    # Find peak hour
    peak_hour = ""
    if peak:
        top_h = max(peak.items(), key=lambda x: x[1])
        peak_hour = f"{top_h[0]}:00"

    if lang == "ar":
        lines = ["*تقرير الأداء الأسبوعي*\n"]
        lines.append(f"المحادثات: {overview['conversations']}")
        lines.append(f"الحجوزات: {overview['bookings']}")
        lines.append(f"الطلبات: {overview['orders']}")
        lines.append(f"الإيرادات: AED {overview['revenue']:,.0f}")
        lines.append(f"معدل التحويل: {overview['conversion_rate']}%")

        if peak_hour:
            lines.append(f"\n*ساعة الذروة:* {peak_hour}")

        if top_sources:
            lines.append("\n*أفضل المصادر:*")
            for s in top_sources[:3]:
                lines.append(f"- {s['source']}: {s['conversions']} تحويل (AED {s['revenue']:,.0f})")

        # Funnel
        if funnel:
            lines.append("\n*مسار التحويل:*")
            lines.append(f"محادثة -> قائمة: {funnel.get('menu_viewed', 0)}")
            lines.append(f"قائمة -> حجز: {funnel.get('booking_started', 0)}")
            lines.append(f"حجز -> مكتمل: {funnel.get('booking_completed', 0)}")
    else:
        lines = ["*Weekly Performance Report*\n"]
        lines.append(f"Conversations: {overview['conversations']}")
        lines.append(f"Bookings: {overview['bookings']}")
        lines.append(f"Orders: {overview['orders']}")
        lines.append(f"Revenue: AED {overview['revenue']:,.0f}")
        lines.append(f"Conversion rate: {overview['conversion_rate']}%")

        if peak_hour:
            lines.append(f"\n*Peak hour:* {peak_hour}")

        if top_sources:
            lines.append("\n*Top sources:*")
            for s in top_sources[:3]:
                lines.append(f"- {s['source']}: {s['conversions']} conversions (AED {s['revenue']:,.0f})")

        # Funnel
        if funnel:
            lines.append("\n*Conversion funnel:*")
            lines.append(f"Conversation -> Menu: {funnel.get('menu_viewed', 0)}")
            lines.append(f"Menu -> Booking start: {funnel.get('booking_started', 0)}")
            lines.append(f"Booking start -> Complete: {funnel.get('booking_completed', 0)}")

    return "\n".join(lines)
