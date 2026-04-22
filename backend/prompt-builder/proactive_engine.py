"""Proactive Engine — Phase 6
Automated follow-ups, re-engagement, and churn detection.

Two modes:
1. WITHIN 24H: Free-form messages via normal webhook pipeline
2. AFTER 24H: Pre-approved template messages via Kapso API

Templates must be pre-approved by Meta. This module manages:
- Scheduling follow-ups
- Detecting churn risk
- Sending template messages
- Tracking opt-ins
"""

import os
import json
import re
import httpx
from datetime import datetime, timezone, timedelta

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Ynpxa3RpcGltYm11anRvd296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwOTY5NCwiZXhwIjoyMDkwMDg1Njk0fQ.-DoNS5fZv3aUsFcugKg23yh9RqXXFIlgc5_9Hrk97bg")
_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}
_KAPSO_KEY = os.environ.get("KAPSO_PLATFORM_API_KEY", "f84bab4ef9feb3a1571f527d37a677beb15ff7bff21be35a1a232a8939445eda")


# ═══════════════════════════════════════════════════════
# TEMPLATE DEFINITIONS
# These must be submitted to Meta for approval via Kapso
# ═══════════════════════════════════════════════════════

TEMPLATES = {
    "reservation_reminder": {
        "category": "utility",
        "language": "en",
        "body": "Hi {{1}}, just a reminder — your table for {{2}} is confirmed for {{3}} at {{4}}. See you soon! 🍽️",
        "params": ["guest_name", "party_size", "date", "time"],
    },
    "reservation_reminder_ar": {
        "category": "utility",
        "language": "ar",
        "body": "هلا {{1}}! تذكير بحجزك — طاولة لـ {{2}} يوم {{3}} الساعة {{4}}. نتشرف بزيارتك! 🍽️",
        "params": ["guest_name", "party_size", "date", "time"],
    },
    "feedback_request": {
        "category": "utility",
        "language": "en",
        "body": "Hi {{1}}, thank you for dining with us! We'd love to hear about your experience. How was everything? Reply with your feedback 😊",
        "params": ["guest_name"],
    },
    "feedback_request_ar": {
        "category": "utility",
        "language": "ar",
        "body": "هلا {{1}}! شكراً لزيارتك 🤎 نبغى نعرف رأيك — كيف كانت تجربتك معنا؟ رد علينا بملاحظاتك 😊",
        "params": ["guest_name"],
    },
    "order_confirmation": {
        "category": "utility",
        "language": "en",
        "body": "Hi {{1}}, your order is confirmed! {{2}} — total {{3}}. We'll deliver to {{4}}. Thank you! ☕",
        "params": ["guest_name", "items", "total", "address"],
    },
    "order_confirmation_ar": {
        "category": "utility",
        "language": "ar",
        "body": "هلا {{1}}! طلبك مؤكد ✅ {{2}} — المجموع {{3}}. التوصيل على {{4}}. شكراً لك! ☕",
        "params": ["guest_name", "items", "total", "address"],
    },
    "welcome_back": {
        "category": "marketing",
        "language": "en",
        "body": "Hi {{1}}, it's been a while! We miss you at {{2}} 🤎 We have some amazing new items — would you like to book a table? Reply YES to get started!",
        "params": ["guest_name", "business_name"],
    },
    "welcome_back_ar": {
        "category": "marketing",
        "language": "ar",
        "body": "هلا {{1}}! وحشتنا 🤎 عندنا أشياء جديدة في {{2}} — تبغى تطلب أو تحجز؟ رد بـ نعم وبنساعدك!",
        "params": ["guest_name", "business_name"],
    },
}


# ═══════════════════════════════════════════════════════
# SCHEDULED ACTIONS
# ═══════════════════════════════════════════════════════

async def get_pending_followups() -> list:
    """Get all scheduled follow-ups that are due."""
    now = datetime.now(timezone.utc).isoformat()
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/scheduled_actions?status=eq.pending&scheduled_at=lte.{now}&select=*&order=scheduled_at.asc&limit=50",
                headers=_SUPA_HEADERS,
            )
            return r.json() if r.status_code == 200 else []
    except:
        return []


async def schedule_followup(
    client_id: str,
    customer_phone: str,
    action_type: str,
    template_name: str,
    template_params: dict,
    delay_hours: int = 24,
    phone_number_id: str = "",
):
    """Schedule a follow-up message."""
    scheduled_at = (datetime.now(timezone.utc) + timedelta(hours=delay_hours)).isoformat()
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            await http.post(
                f"{_SUPA_URL}/rest/v1/scheduled_actions",
                headers=_SUPA_HEADERS,
                json={
                    "client_id": client_id,
                    "customer_phone": customer_phone,
                    "action_type": action_type,
                    "status": "pending",
                    "scheduled_at": scheduled_at,
                    "payload": {
                        "template_name": template_name,
                        "template_params": template_params,
                        "phone_number_id": phone_number_id,
                    },
                },
            )
            print(f"[proactive] Scheduled {action_type} for {customer_phone} at {scheduled_at}")
    except Exception as e:
        print(f"[proactive] Failed to schedule: {e}")


async def send_template_message(
    phone_number_id: str,
    to_phone: str,
    template_name: str,
    language: str,
    params: list,
) -> bool:
    """Send a template message via Kapso/WhatsApp Business API."""
    try:
        # Build the template message payload
        components = []
        if params:
            components.append({
                "type": "body",
                "parameters": [{"type": "text", "text": p} for p in params],
            })

        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.post(
                f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages",
                headers={
                    "X-API-Key": _KAPSO_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": to_phone,
                    "type": "template",
                    "template": {
                        "name": template_name,
                        "language": {"code": language},
                        "components": components,
                    },
                },
            )
            success = r.status_code in (200, 201)
            if not success:
                print(f"[proactive] Template send failed: {r.status_code} {r.text[:200]}")
            return success
    except Exception as e:
        print(f"[proactive] Template send error: {e}")
        return False


# ═══════════════════════════════════════════════════════
# AUTO-SCHEDULING FROM BOOKINGS
# ═══════════════════════════════════════════════════════

async def auto_schedule_from_booking(client_id: str, booking: dict, phone_number_id: str = ""):
    """Automatically schedule follow-ups when a booking is created or completed."""
    phone = booking.get("customer_phone", "")
    name = booking.get("guest_name", "Customer")
    date = booking.get("booking_date", "")
    time_slot = booking.get("booking_time", "")
    party = booking.get("party_size", 2)

    if not phone:
        return

    # Detect language from client KB
    lang = "en"  # Default, should be determined per client

    # Schedule 1: Reminder 3 hours before booking
    if date and time_slot:
        await schedule_followup(
            client_id=client_id,
            customer_phone=phone,
            action_type="reservation_reminder",
            template_name=f"reservation_reminder{'_ar' if lang == 'ar' else ''}",
            template_params={"guest_name": name, "party_size": str(party), "date": date, "time": time_slot},
            delay_hours=0,  # Will be calculated based on booking time
            phone_number_id=phone_number_id,
        )

    # Schedule 2: Feedback request 2 hours after booking time
    await schedule_followup(
        client_id=client_id,
        customer_phone=phone,
        action_type="feedback_request",
        template_name=f"feedback_request{'_ar' if lang == 'ar' else ''}",
        template_params={"guest_name": name},
        delay_hours=26,  # Next day (after 24h window closes)
        phone_number_id=phone_number_id,
    )

    # Schedule 3: Re-engagement after 14 days
    await schedule_followup(
        client_id=client_id,
        customer_phone=phone,
        action_type="welcome_back",
        template_name=f"welcome_back{'_ar' if lang == 'ar' else ''}",
        template_params={"guest_name": name, "business_name": ""},
        delay_hours=336,  # 14 days
        phone_number_id=phone_number_id,
    )


# ═══════════════════════════════════════════════════════
# CHURN DETECTION
# ═══════════════════════════════════════════════════════

async def detect_churn_risk(client_id: str) -> list:
    """Find customers who haven't interacted in 14+ days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            # Get all customers who had conversations
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/conversation_messages?client_id=eq.{client_id}&direction=eq.inbound&select=customer_phone,created_at&order=created_at.desc",
                headers=_SUPA_HEADERS,
            )
            messages = r.json() if r.status_code == 200 else []

        # Find last message per customer
        last_contact = {}
        for m in messages:
            phone = m.get("customer_phone", "")
            if phone and phone not in last_contact:
                last_contact[phone] = m.get("created_at", "")

        # Filter for churn risk (no contact in 14+ days)
        at_risk = []
        for phone, last_date in last_contact.items():
            if last_date and last_date < cutoff:
                at_risk.append({"phone": phone, "last_contact": last_date})

        return at_risk
    except:
        return []


# ═══════════════════════════════════════════════════════
# WITHIN-24H FOLLOW-UPS (via webhook pipeline)
# ═══════════════════════════════════════════════════════

async def send_immediate_followup(
    phone_number_id: str,
    to_phone: str,
    message: str,
) -> bool:
    """Send a free-form follow-up within the 24h window."""
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.post(
                f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages",
                headers={
                    "X-API-Key": _KAPSO_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": to_phone,
                    "type": "text",
                    "text": {"body": message},
                },
            )
            return r.status_code in (200, 201)
    except:
        return False


# ═══════════════════════════════════════════════════════
# PROCESS PENDING ACTIONS (run periodically)
# ═══════════════════════════════════════════════════════

async def process_pending_actions() -> dict:
    """Process all pending scheduled actions that are due."""
    actions = await get_pending_followups()
    results = {"processed": 0, "sent": 0, "failed": 0}

    for action in actions:
        action_id = action.get("id")
        payload = action.get("payload", {})
        template_name = payload.get("template_name", "")
        template_params = payload.get("template_params", {})
        phone_number_id = payload.get("phone_number_id", "")
        customer_phone = action.get("customer_phone", "")

        results["processed"] += 1

        # Get template definition
        template = TEMPLATES.get(template_name, {})
        if not template:
            print(f"[proactive] Unknown template: {template_name}")
            results["failed"] += 1
            continue

        # Build params list in order
        params_list = [template_params.get(p, "") for p in template.get("params", [])]
        lang = template.get("language", "en")

        # Send
        success = await send_template_message(
            phone_number_id=phone_number_id,
            to_phone=customer_phone,
            template_name=template_name,
            language=lang,
            params=params_list,
        )

        if success:
            results["sent"] += 1
        else:
            results["failed"] += 1

        # Update status
        try:
            async with httpx.AsyncClient(timeout=5) as http:
                await http.patch(
                    f"{_SUPA_URL}/rest/v1/scheduled_actions?id=eq.{action_id}",
                    headers=_SUPA_HEADERS,
                    json={
                        "status": "sent" if success else "failed",
                        "executed_at": datetime.now(timezone.utc).isoformat(),
                    },
                )
        except:
            pass

    return results


# ═══════════════════════════════════════════════════════
# OPT-IN TRACKING
# ═══════════════════════════════════════════════════════

_opt_in_cache: dict[str, bool] = {}


def check_opt_in_from_message(message: str) -> bool:
    """Check if customer message contains opt-in consent."""
    opt_in_phrases = [
        "yes", "sure", "okay", "ok", "go ahead", "send me", "notify me",
        "remind me", "keep me updated", "follow up",
        "نعم", "أيوه", "تمام", "موافق", "ذكرني", "أبشر", "إيه",
    ]
    msg_lower = message.lower()
    return any(phrase in msg_lower for phrase in opt_in_phrases)


async def record_opt_in(client_id: str, customer_phone: str, opted_in: bool = True):
    """Record customer opt-in for proactive messages."""
    _opt_in_cache[f"{client_id}_{customer_phone}"] = opted_in
    # Also store in Supabase (in the booking or a dedicated table)
    try:
        async with httpx.AsyncClient(timeout=5) as http:
            await http.post(
                f"{_SUPA_URL}/rest/v1/activity_logs",
                headers=_SUPA_HEADERS,
                json={
                    "client_id": client_id,
                    "event_type": "opt_in" if opted_in else "opt_out",
                    "payload": {"customer_phone": customer_phone},
                },
            )
    except:
        pass


# ═══════════════════════════════════════════════════════
# TEMPLATE SUBMISSION TO META (via Kapso API)
# ═══════════════════════════════════════════════════════

async def submit_template_to_meta(
    template_name: str,
    category: str,  # "UTILITY" or "MARKETING"
    language: str,  # "en" or "ar"
    body_text: str,
    header_text: str = "",
    footer_text: str = "",
    buttons: list = None,
    phone_number_id: str = "",
) -> dict:
    """Submit a WhatsApp message template to Meta for approval via Kapso API.

    Templates must be approved before they can be used for messaging outside
    the 24-hour window.

    Returns: {template_id, status: 'PENDING'|'APPROVED'|'REJECTED', name}
    """
    # Build the template components
    components = []

    if header_text:
        components.append({
            "type": "HEADER",
            "format": "TEXT",
            "text": header_text,
        })

    components.append({
        "type": "BODY",
        "text": body_text,
    })

    if footer_text:
        components.append({
            "type": "FOOTER",
            "text": footer_text,
        })

    if buttons:
        button_components = []
        for btn in buttons:
            button_components.append({
                "type": btn.get("type", "QUICK_REPLY"),
                "text": btn.get("text", ""),
                **({"url": btn["url"]} if "url" in btn else {}),
                **({"phone_number": btn["phone_number"]} if "phone_number" in btn else {}),
            })
        components.append({
            "type": "BUTTONS",
            "buttons": button_components,
        })

    payload = {
        "name": template_name,
        "category": category.upper(),
        "language": language,
        "components": components,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.post(
                f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/message_templates",
                headers={
                    "X-API-Key": _KAPSO_KEY,
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            data = r.json() if r.status_code in (200, 201) else {}
            if r.status_code in (200, 201):
                print(f"[proactive] Template '{template_name}' submitted — status: PENDING")
                return {
                    "template_id": data.get("id", ""),
                    "status": data.get("status", "PENDING"),
                    "name": template_name,
                }
            else:
                print(f"[proactive] Template submission failed: {r.status_code} {r.text[:300]}")
                return {
                    "template_id": "",
                    "status": "FAILED",
                    "name": template_name,
                    "error": r.text[:300],
                }
    except Exception as e:
        print(f"[proactive] Template submission error: {e}")
        return {"template_id": "", "status": "FAILED", "name": template_name, "error": str(e)}


async def get_template_status(template_name: str, phone_number_id: str = "") -> dict:
    """Check the approval status of a submitted template."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/message_templates"
                f"?name={template_name}",
                headers={
                    "X-API-Key": _KAPSO_KEY,
                    "Content-Type": "application/json",
                },
            )
            data = r.json() if r.status_code == 200 else {}
            templates = data.get("data", [])
            if templates:
                t = templates[0]
                return {
                    "name": t.get("name", template_name),
                    "status": t.get("status", "UNKNOWN"),
                    "template_id": t.get("id", ""),
                    "category": t.get("category", ""),
                    "language": t.get("language", ""),
                }
            return {"name": template_name, "status": "NOT_FOUND"}
    except Exception as e:
        return {"name": template_name, "status": "ERROR", "error": str(e)}


async def submit_all_default_templates(phone_number_id: str) -> list:
    """Submit all default templates (from TEMPLATES dict) for Meta approval.
    Returns list of submission results."""
    results = []
    for name, tmpl in TEMPLATES.items():
        result = await submit_template_to_meta(
            template_name=name,
            category=tmpl.get("category", "utility").upper(),
            language=tmpl.get("language", "en"),
            body_text=tmpl.get("body", ""),
            phone_number_id=phone_number_id,
        )
        results.append(result)
    return results
