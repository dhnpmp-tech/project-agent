"""Billing & Subscription Management — Tap Payments, free trials, access gating.

Handles the complete billing lifecycle for the Project Agent platform:
  1. Free trials — 7-day trial with automatic reminders and trial summaries
  2. Tap Payments integration — checkout links, recurring subscriptions, webhooks
  3. Subscription management — plan upgrades, downgrades, cancellations, dunning
  4. Access gating — the gatekeeper called before every WhatsApp message is processed

Plans: trial → starter (1500) → growth (3000) → pro (5000) → enterprise (8000)
Setup fee: AED/SAR 3000 one-time.
Bilingual: English + Gulf Arabic.
"""

from __future__ import annotations

import os
import json
import re
import uuid
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional

# ═══════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Ynpxa3RpcGltYm11anRvd296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwOTY5NCwiZXhwIjoyMDkwMDg1Njk0fQ.-DoNS5fZv3aUsFcugKg23yh9RqXXFIlgc5_9Hrk97bg")
_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}
_TAP_SECRET_KEY = os.environ.get("TAP_SECRET_KEY", "")   # Tap Payments secret key
_TAP_PUBLIC_KEY = os.environ.get("TAP_PUBLIC_KEY", "")    # Tap Payments publishable key
_TAP_BASE_URL = "https://api.tap.company/v2"
_WHATSAPP_API_URL = os.environ.get("WHATSAPP_API_URL", "")
_WHATSAPP_TOKEN = os.environ.get("WHATSAPP_TOKEN", "")
_REDIRECT_URL = os.environ.get("BILLING_REDIRECT_URL", "https://kapso.ai/billing/success")
_WEBHOOK_URL = os.environ.get("BILLING_WEBHOOK_URL", "https://api.kapso.ai/billing/webhook")


# ═══════════════════════════════════════════════════════
# PLAN DEFINITIONS
# ═══════════════════════════════════════════════════════

PLANS = {
    "starter": {
        "name_en": "Starter",
        "name_ar": "البداية",
        "price_aed": 1500,
        "price_sar": 1500,
        "billing_cycle": "monthly",
        "features": ["whatsapp_agent", "owner_brain", "sales_rep", "basic_reports", "loyalty_basic"],
        "limits": {"messages_per_day": 200, "bookings_per_day": 50},
    },
    "growth": {
        "name_en": "Growth",
        "name_ar": "النمو",
        "price_aed": 3000,
        "price_sar": 3000,
        "billing_cycle": "monthly",
        "features": ["whatsapp_agent", "owner_brain", "sales_rep", "content_engine", "loyalty_full", "google_business", "advanced_reports"],
        "limits": {"messages_per_day": 500, "bookings_per_day": 200},
    },
    "pro": {
        "name_en": "Pro",
        "name_ar": "احترافي",
        "price_aed": 5000,
        "price_sar": 5000,
        "billing_cycle": "monthly",
        "features": ["whatsapp_agent", "owner_brain", "sales_rep", "content_engine", "loyalty_full", "google_business", "advanced_reports", "image_prompts", "conversion_tracking", "priority_support"],
        "limits": {"messages_per_day": 2000, "bookings_per_day": 500},
    },
    "enterprise": {
        "name_en": "Enterprise",
        "name_ar": "المؤسسات",
        "price_aed": 8000,
        "price_sar": 8000,
        "billing_cycle": "monthly",
        "features": ["all"],
        "limits": {"messages_per_day": -1, "bookings_per_day": -1},  # unlimited
    },
}

# Setup fee (one-time)
SETUP_FEE = {"aed": 3000, "sar": 3000}

# Plan ordering for upgrade suggestions
_PLAN_ORDER = ["starter", "growth", "pro", "enterprise"]


# ═══════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _detect_language(text: str) -> str:
    """Detect if message is Arabic or English."""
    arabic = len(re.findall(r'[\u0600-\u06FF]', text))
    total = len(text.replace(" ", ""))
    return "ar" if total > 0 and arabic / total > 0.3 else "en"


def _plan_price(plan: str, currency: str = "AED") -> int:
    """Get the price for a plan in the specified currency."""
    p = PLANS.get(plan, {})
    key = f"price_{currency.lower()}"
    return p.get(key, 0)


def _next_plan(current: str) -> Optional[str]:
    """Get the next plan up for upgrade suggestions."""
    try:
        idx = _PLAN_ORDER.index(current)
        if idx < len(_PLAN_ORDER) - 1:
            return _PLAN_ORDER[idx + 1]
    except ValueError:
        pass
    return None


def _has_feature(plan: str, feature: str) -> bool:
    """Check if a plan includes a feature."""
    p = PLANS.get(plan, {})
    features = p.get("features", [])
    return "all" in features or feature in features


def _plan_limits(plan: str) -> dict:
    """Get limits for a plan."""
    p = PLANS.get(plan, {})
    return p.get("limits", {"messages_per_day": 0, "bookings_per_day": 0})


async def _get_client(client_id: str) -> dict:
    """Fetch client record from Supabase. Billing fields live in metadata JSONB."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/clients?id=eq.{client_id}"
                "&select=id,company_name,contact_phone,plan,status,metadata,created_at",
                headers=_SUPA_HEADERS,
            )
            rows = r.json() if r.status_code == 200 else []
            if not rows:
                return {}
            client = rows[0]
            # Merge billing fields from metadata into top-level for convenience
            meta = client.get("metadata") or {}
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except:
                    meta = {}
            client["subscription_status"] = meta.get("subscription_status", "")
            client["trial_ends_at"] = meta.get("trial_ends_at", "")
            client["next_billing_date"] = meta.get("next_billing_date", "")
            client["billing_currency"] = meta.get("billing_currency", "AED")
            client["current_period_end"] = meta.get("current_period_end", "")
            client["tap_customer_id"] = meta.get("tap_customer_id", "")
            client["tap_subscription_id"] = meta.get("tap_subscription_id", "")
            client["setup_fee_paid"] = meta.get("setup_fee_paid", False)
            client["owner_phone"] = client.get("contact_phone", "")
            return client
    except Exception as e:
        print(f"[billing] Failed to get client: {e}")
        return {}


async def _update_client(client_id: str, data: dict) -> dict:
    """Update client record in Supabase. Billing fields go into metadata JSONB."""
    try:
        # Separate top-level fields from billing fields
        top_level_fields = {"plan", "status", "company_name", "contact_phone", "contact_name", "contact_email"}
        billing_fields = {
            "subscription_status", "trial_ends_at", "next_billing_date",
            "billing_currency", "current_period_end", "tap_customer_id",
            "tap_subscription_id", "setup_fee_paid",
        }

        patch_data = {}
        meta_updates = {}

        for k, v in data.items():
            if k in top_level_fields:
                patch_data[k] = v
            elif k in billing_fields:
                meta_updates[k] = v
            elif k == "updated_at":
                patch_data[k] = v

        # If we have metadata updates, merge with existing
        if meta_updates:
            client = await _get_client(client_id)
            existing_meta = client.get("metadata") or {}
            if isinstance(existing_meta, str):
                try:
                    existing_meta = json.loads(existing_meta)
                except:
                    existing_meta = {}
            existing_meta.update(meta_updates)
            patch_data["metadata"] = existing_meta

        patch_data["updated_at"] = _now().isoformat()

        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.patch(
                f"{_SUPA_URL}/rest/v1/clients?id=eq.{client_id}",
                headers=_SUPA_HEADERS,
                json=patch_data,
            )
            rows = r.json() if r.status_code == 200 else []
            return rows[0] if rows else {}
    except Exception as e:
        print(f"[billing] Failed to update client: {e}")
        return {}


async def _log_billing_event(client_id: str, event_type: str, data: dict = None) -> None:
    """Log a billing event to activity_logs."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            await http.post(
                f"{_SUPA_URL}/rest/v1/activity_logs",
                headers=_SUPA_HEADERS,
                json={
                    "id": str(uuid.uuid4()),
                    "client_id": client_id,
                    "action": f"billing:{event_type}",
                    "details": json.dumps(data or {}),
                    "created_at": _now().isoformat(),
                },
            )
    except Exception as e:
        print(f"[billing] Failed to log event: {e}")


async def _get_today_usage(client_id: str) -> dict:
    """Get today's message and booking counts from activity_logs."""
    today_start = _now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    messages_used = 0
    bookings_used = 0
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            # Count messages
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/activity_logs"
                f"?client_id=eq.{client_id}"
                f"&action=eq.message_received"
                f"&created_at=gte.{today_start}"
                "&select=id",
                headers={**_SUPA_HEADERS, "Prefer": "count=exact"},
            )
            if r.status_code == 200:
                count_header = r.headers.get("content-range", "")
                # content-range: 0-X/TOTAL or */TOTAL
                if "/" in count_header:
                    messages_used = int(count_header.split("/")[-1])

            # Count bookings
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/activity_logs"
                f"?client_id=eq.{client_id}"
                f"&action=eq.booking_created"
                f"&created_at=gte.{today_start}"
                "&select=id",
                headers={**_SUPA_HEADERS, "Prefer": "count=exact"},
            )
            if r.status_code == 200:
                count_header = r.headers.get("content-range", "")
                if "/" in count_header:
                    bookings_used = int(count_header.split("/")[-1])
    except Exception as e:
        print(f"[billing] Failed to get usage: {e}")

    return {"messages_used": messages_used, "bookings_used": bookings_used}


async def _send_whatsapp(phone: str, message: str) -> bool:
    """Send a WhatsApp message to a phone number."""
    if not _WHATSAPP_API_URL or not _WHATSAPP_TOKEN:
        print(f"[billing] WhatsApp not configured, would send to {phone}: {message[:80]}...")
        return False
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.post(
                _WHATSAPP_API_URL,
                headers={
                    "Authorization": f"Bearer {_WHATSAPP_TOKEN}",
                    "Content-Type": "application/json",
                },
                json={
                    "messaging_product": "whatsapp",
                    "to": phone,
                    "type": "text",
                    "text": {"body": message},
                },
            )
            return r.status_code == 200
    except Exception as e:
        print(f"[billing] Failed to send WhatsApp: {e}")
        return False


# ═══════════════════════════════════════════════════════
# SUBSCRIPTION MANAGEMENT
# ═══════════════════════════════════════════════════════

async def create_subscription(client_id: str, plan: str = "trial", currency: str = "AED") -> dict:
    """Create a subscription for a client. Called after onboarding.

    For trial: sets trial_ends_at = now + 7 days, status = 'trialing'
    For paid: generates Tap Payments checkout link, status = 'pending_payment'
    """
    if plan not in PLANS:
        return {"ok": False, "error": f"Unknown plan: {plan}"}

    client = await _get_client(client_id)
    if not client:
        return {"ok": False, "error": "Client not found"}

    now = _now()

    if plan == "trial":
        result = await start_trial(client_id)
        return result

    # Paid plan — generate checkout
    price = _plan_price(plan, currency)
    include_setup = not client.get("setup_fee_paid", False)

    checkout = await create_tap_checkout(
        client_id=client_id,
        plan=plan,
        currency=currency,
        include_setup=include_setup,
    )
    if not checkout.get("ok"):
        return checkout

    # Update client status to pending
    await _update_client(client_id, {
        "plan": plan,
        "subscription_status": "pending_payment",
        "billing_currency": currency.upper(),
    })

    await _log_billing_event(client_id, "subscription_created", {
        "plan": plan,
        "currency": currency,
        "checkout_url": checkout.get("checkout_url"),
    })

    return {
        "ok": True,
        "plan": plan,
        "status": "pending_payment",
        "checkout_url": checkout.get("checkout_url"),
        "charge_id": checkout.get("charge_id"),
        "amount": checkout.get("amount"),
        "currency": currency.upper(),
    }


async def get_subscription(client_id: str) -> dict:
    """Get current subscription status."""
    client = await _get_client(client_id)
    if not client:
        return {"ok": False, "error": "Client not found"}

    plan = client.get("plan", "trial")
    status = client.get("subscription_status", "trialing")
    trial_ends_at = client.get("trial_ends_at")
    next_billing = client.get("next_billing_date")
    period_end = client.get("current_period_end")

    # Check if trial has expired but status not updated
    if status == "trialing" and trial_ends_at:
        try:
            trial_dt = datetime.fromisoformat(trial_ends_at.replace("Z", "+00:00"))
            if _now() > trial_dt:
                status = "expired"
                await _update_client(client_id, {"subscription_status": "expired"})
        except (ValueError, TypeError):
            pass

    plan_info = PLANS.get(plan, {})

    return {
        "ok": True,
        "plan": plan,
        "plan_name_en": plan_info.get("name_en", plan),
        "plan_name_ar": plan_info.get("name_ar", plan),
        "status": status,
        "trial_ends_at": trial_ends_at,
        "next_billing_date": next_billing,
        "current_period_end": period_end,
        "features": plan_info.get("features", []),
        "limits": plan_info.get("limits", {}),
        "billing_currency": client.get("billing_currency", "AED"),
    }


async def check_access(client_id: str, feature: str = "") -> dict:
    """Check if a client has access to the platform / a specific feature.

    Gates:
    - Trial expired + no payment -> blocked
    - Plan doesn't include feature -> suggest upgrade
    - Message/booking limit reached -> suggest upgrade
    """
    sub = await get_subscription(client_id)
    if not sub.get("ok"):
        return {"allowed": False, "reason": "client_not_found", "plan": "", "upgrade_needed": "starter"}

    plan = sub["plan"]
    status = sub["status"]

    # Blocked statuses
    if status in ("expired", "suspended"):
        next_up = _next_plan("trial") or "starter"
        return {
            "allowed": False,
            "reason": "subscription_expired",
            "plan": plan,
            "upgrade_needed": next_up,
        }

    if status == "cancelled":
        # Check if current period is still valid
        period_end = sub.get("current_period_end")
        if period_end:
            try:
                end_dt = datetime.fromisoformat(period_end.replace("Z", "+00:00"))
                if _now() > end_dt:
                    return {
                        "allowed": False,
                        "reason": "subscription_cancelled_period_ended",
                        "plan": plan,
                        "upgrade_needed": "starter",
                    }
            except (ValueError, TypeError):
                pass
        else:
            return {
                "allowed": False,
                "reason": "subscription_cancelled",
                "plan": plan,
                "upgrade_needed": "starter",
            }

    if status == "past_due":
        # Allow for grace period but warn
        return {
            "allowed": True,
            "reason": "payment_past_due",
            "plan": plan,
            "upgrade_needed": "",
        }

    # Feature check
    if feature and not _has_feature(plan, feature):
        # Find the cheapest plan that has this feature
        upgrade_to = ""
        for p in _PLAN_ORDER:
            if _has_feature(p, feature):
                idx_current = _PLAN_ORDER.index(plan) if plan in _PLAN_ORDER else -1
                idx_target = _PLAN_ORDER.index(p)
                if idx_target > idx_current:
                    upgrade_to = p
                    break
        return {
            "allowed": False,
            "reason": "feature_not_included",
            "plan": plan,
            "upgrade_needed": upgrade_to or "enterprise",
        }

    return {"allowed": True, "reason": "", "plan": plan, "upgrade_needed": ""}


async def check_limits(client_id: str) -> dict:
    """Check usage vs plan limits for today."""
    sub = await get_subscription(client_id)
    if not sub.get("ok"):
        return {"ok": False, "error": "Client not found"}

    plan = sub["plan"]
    limits = _plan_limits(plan)
    usage = await _get_today_usage(client_id)

    msg_limit = limits.get("messages_per_day", 0)
    book_limit = limits.get("bookings_per_day", 0)
    msg_used = usage["messages_used"]
    book_used = usage["bookings_used"]

    # -1 means unlimited
    msg_remaining = -1 if msg_limit == -1 else max(0, msg_limit - msg_used)
    book_remaining = -1 if book_limit == -1 else max(0, book_limit - book_used)

    at_limit = False
    if msg_limit != -1 and msg_used >= msg_limit:
        at_limit = True
    if book_limit != -1 and book_used >= book_limit:
        at_limit = True

    return {
        "ok": True,
        "plan": plan,
        "messages_used": msg_used,
        "messages_limit": msg_limit,
        "messages_remaining": msg_remaining,
        "bookings_used": book_used,
        "bookings_limit": book_limit,
        "bookings_remaining": book_remaining,
        "at_limit": at_limit,
    }


# ═══════════════════════════════════════════════════════
# TAP PAYMENTS INTEGRATION
# ═══════════════════════════════════════════════════════

async def create_tap_checkout(
    client_id: str,
    plan: str,
    currency: str = "AED",
    include_setup: bool = True,
) -> dict:
    """Create a Tap Payments checkout session (charge).

    Returns: {ok, checkout_url, charge_id, amount, currency}
    The checkout_url is sent to the owner via WhatsApp.
    """
    if not _TAP_SECRET_KEY:
        # Dev mode — return a mock
        mock_id = f"chg_mock_{uuid.uuid4().hex[:12]}"
        return {
            "ok": True,
            "checkout_url": f"https://checkout.tap.company/mock/{mock_id}",
            "charge_id": mock_id,
            "amount": _plan_price(plan, currency) + (SETUP_FEE.get(currency.lower(), 0) if include_setup else 0),
            "currency": currency.upper(),
            "mode": "mock",
        }

    price = _plan_price(plan, currency)
    if include_setup:
        price += SETUP_FEE.get(currency.lower(), 0)

    plan_info = PLANS.get(plan, {})
    description = f"Kapso AI — {plan_info.get('name_en', plan)}"
    if include_setup:
        description += " + Setup Fee"

    client = await _get_client(client_id)
    owner_phone = client.get("owner_phone", "")
    company = client.get("company_name", "")

    payload = {
        "amount": price,
        "currency": currency.upper(),
        "customer_initiated": True,
        "threeDSecure": True,
        "save_card": True,
        "description": description,
        "metadata": {
            "client_id": client_id,
            "plan": plan,
            "include_setup": include_setup,
            "company": company,
        },
        "receipt": {"email": True, "sms": True},
        "customer": {
            "first_name": company or "Business Owner",
            "phone": {"country_code": "", "number": owner_phone},
        },
        "source": {"id": "src_all"},
        "redirect": {"url": _REDIRECT_URL},
        "post": {"url": _WEBHOOK_URL},
    }

    try:
        async with httpx.AsyncClient(timeout=30) as http:
            r = await http.post(
                f"{_TAP_BASE_URL}/charges",
                headers={
                    "Authorization": f"Bearer {_TAP_SECRET_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            data = r.json()

            if r.status_code in (200, 201) and data.get("transaction", {}).get("url"):
                charge_id = data.get("id", "")
                checkout_url = data["transaction"]["url"]

                await _log_billing_event(client_id, "checkout_created", {
                    "charge_id": charge_id,
                    "plan": plan,
                    "amount": price,
                    "currency": currency.upper(),
                    "include_setup": include_setup,
                })

                return {
                    "ok": True,
                    "checkout_url": checkout_url,
                    "charge_id": charge_id,
                    "amount": price,
                    "currency": currency.upper(),
                }
            else:
                error_msg = data.get("errors", [{}])[0].get("description", "Unknown error")
                print(f"[billing] Tap checkout failed: {error_msg}")
                return {"ok": False, "error": f"Payment provider error: {error_msg}"}

    except Exception as e:
        print(f"[billing] Tap API error: {e}")
        return {"ok": False, "error": f"Payment provider unavailable: {e}"}


async def handle_tap_webhook(payload: dict) -> dict:
    """Process Tap Payments webhook (charge.succeeded, charge.failed, etc.)

    On success: activate subscription, send confirmation.
    On failure: log, send retry link.
    """
    obj = payload.get("object", "")
    status = payload.get("status", "")
    charge_id = payload.get("id", "")
    metadata = payload.get("metadata", {})
    client_id = metadata.get("client_id", "")
    plan = metadata.get("plan", "")
    include_setup = metadata.get("include_setup", False)
    amount = payload.get("amount", 0)
    currency = payload.get("currency", "AED")

    if not client_id:
        return {"ok": False, "error": "No client_id in metadata"}

    client = await _get_client(client_id)
    if not client:
        return {"ok": False, "error": "Client not found"}

    owner_phone = client.get("owner_phone", "")

    await _log_billing_event(client_id, f"tap_webhook_{status}", {
        "charge_id": charge_id,
        "status": status,
        "amount": amount,
        "currency": currency,
    })

    if status == "CAPTURED":
        # Payment successful
        now = _now()
        period_end = now + timedelta(days=30)

        update_data = {
            "plan": plan,
            "subscription_status": "active",
            "next_billing_date": (now + timedelta(days=30)).isoformat(),
            "current_period_end": period_end.isoformat(),
        }
        if include_setup:
            update_data["setup_fee_paid"] = True

        # Store Tap customer ID for recurring charges
        tap_customer = payload.get("customer", {})
        if tap_customer.get("id"):
            update_data["tap_customer_id"] = tap_customer["id"]

        await _update_client(client_id, update_data)

        # Send confirmation via WhatsApp
        plan_info = PLANS.get(plan, {})
        msg = (
            f"Payment confirmed! Your {plan_info.get('name_en', plan)} plan is now active.\n\n"
            f"Amount: {currency} {amount}\n"
            f"Next billing: {period_end.strftime('%d %b %Y')}\n\n"
            f"Your AI assistant is fully operational. Let's grow your business!"
        )
        msg_ar = (
            f"تم تأكيد الدفع! خطة {plan_info.get('name_ar', plan)} مفعّلة الحين.\n\n"
            f"المبلغ: {currency} {amount}\n"
            f"الفاتورة الجاية: {period_end.strftime('%d %b %Y')}\n\n"
            f"مساعدك الذكي شغّال بالكامل. يلا نكبّر مشروعك!"
        )

        if owner_phone:
            await _send_whatsapp(owner_phone, f"{msg}\n\n---\n\n{msg_ar}")

        return {
            "ok": True,
            "action": "activated",
            "plan": plan,
            "status": "active",
            "period_end": period_end.isoformat(),
        }

    elif status in ("FAILED", "DECLINED", "RESTRICTED", "VOID", "TIMEDOUT"):
        # Payment failed — send retry link
        retry_checkout = await create_tap_checkout(
            client_id=client_id,
            plan=plan,
            currency=currency,
            include_setup=include_setup,
        )
        retry_url = retry_checkout.get("checkout_url", "")

        msg = (
            f"Your payment didn't go through. No worries — you can try again here:\n"
            f"{retry_url}\n\n"
            f"Need help? Just reply to this message."
        )
        msg_ar = (
            f"ما تم الدفع. لا تشيل هم — جرب مرة ثانية من هنا:\n"
            f"{retry_url}\n\n"
            f"تحتاج مساعدة؟ رد على هالرسالة."
        )

        if owner_phone:
            await _send_whatsapp(owner_phone, f"{msg}\n\n---\n\n{msg_ar}")

        return {
            "ok": True,
            "action": "retry_sent",
            "status": status,
            "retry_url": retry_url,
        }

    # Other statuses (INITIATED, etc.) — just log
    return {"ok": True, "action": "logged", "status": status}


async def create_tap_subscription(client_id: str, plan: str, currency: str = "AED") -> dict:
    """Create a recurring subscription via Tap Payments subscription API.

    Uses Tap's auto-debit / recurring charge for seamless monthly billing.
    Requires saved card (card is saved during first checkout via save_card=True).
    """
    if plan not in PLANS or plan == "trial":
        return {"ok": False, "error": f"Cannot create recurring subscription for plan: {plan}"}

    client = await _get_client(client_id)
    if not client:
        return {"ok": False, "error": "Client not found"}

    tap_customer_id = client.get("tap_customer_id", "")
    if not tap_customer_id:
        return {"ok": False, "error": "No saved payment method. Complete initial checkout first."}

    if not _TAP_SECRET_KEY:
        mock_sub_id = f"sub_mock_{uuid.uuid4().hex[:12]}"
        await _update_client(client_id, {"tap_subscription_id": mock_sub_id})
        return {"ok": True, "subscription_id": mock_sub_id, "mode": "mock"}

    price = _plan_price(plan, currency)
    plan_info = PLANS.get(plan, {})

    payload = {
        "charge": {
            "amount": price,
            "currency": currency.upper(),
            "description": f"Kapso AI — {plan_info.get('name_en', plan)} (Monthly)",
            "receipt": {"email": True, "sms": True},
            "customer": {"id": tap_customer_id},
            "metadata": {
                "client_id": client_id,
                "plan": plan,
            },
        },
        "recurrence": {
            "type": "monthly",
            "start_date": (_now() + timedelta(days=30)).strftime("%Y-%m-%d"),
        },
        "post": {"url": _WEBHOOK_URL},
    }

    try:
        async with httpx.AsyncClient(timeout=30) as http:
            r = await http.post(
                f"{_TAP_BASE_URL}/subscription/v1",
                headers={
                    "Authorization": f"Bearer {_TAP_SECRET_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            data = r.json()

            if r.status_code in (200, 201):
                sub_id = data.get("id", "")
                await _update_client(client_id, {"tap_subscription_id": sub_id})

                await _log_billing_event(client_id, "recurring_subscription_created", {
                    "subscription_id": sub_id,
                    "plan": plan,
                    "amount": price,
                    "currency": currency.upper(),
                })

                return {"ok": True, "subscription_id": sub_id, "plan": plan}
            else:
                error_msg = data.get("errors", [{}])[0].get("description", "Unknown error")
                return {"ok": False, "error": f"Subscription creation failed: {error_msg}"}

    except Exception as e:
        print(f"[billing] Tap subscription error: {e}")
        return {"ok": False, "error": f"Payment provider unavailable: {e}"}


async def cancel_subscription(client_id: str, reason: str = "") -> dict:
    """Cancel a subscription. Keeps access until current period ends.

    Sends confirmation + feedback request via WhatsApp.
    """
    client = await _get_client(client_id)
    if not client:
        return {"ok": False, "error": "Client not found"}

    status = client.get("subscription_status", "")
    if status in ("cancelled", "expired"):
        return {"ok": False, "error": "Subscription is already cancelled or expired"}

    period_end = client.get("current_period_end")
    plan = client.get("plan", "trial")

    # Cancel recurring in Tap if exists
    tap_sub_id = client.get("tap_subscription_id", "")
    if tap_sub_id and _TAP_SECRET_KEY and not tap_sub_id.startswith("sub_mock_"):
        try:
            async with httpx.AsyncClient(timeout=15) as http:
                await http.delete(
                    f"{_TAP_BASE_URL}/subscription/v1/{tap_sub_id}",
                    headers={"Authorization": f"Bearer {_TAP_SECRET_KEY}"},
                )
        except Exception as e:
            print(f"[billing] Failed to cancel Tap subscription: {e}")

    await _update_client(client_id, {
        "subscription_status": "cancelled",
        "cancellation_reason": reason,
        "cancelled_at": _now().isoformat(),
    })

    await _log_billing_event(client_id, "subscription_cancelled", {
        "plan": plan,
        "reason": reason,
        "period_end": period_end,
    })

    # Send WhatsApp confirmation
    owner_phone = client.get("owner_phone", "")
    if owner_phone:
        end_str = ""
        if period_end:
            try:
                end_dt = datetime.fromisoformat(period_end.replace("Z", "+00:00"))
                end_str = end_dt.strftime("%d %b %Y")
            except (ValueError, TypeError):
                end_str = period_end

        msg = (
            f"Your subscription has been cancelled.\n\n"
            f"You'll keep full access until {end_str}.\n\n"
            f"We'd love to know what we could improve. Just reply with your feedback."
        )
        msg_ar = (
            f"تم إلغاء اشتراكك.\n\n"
            f"بتقدر تستخدم كل المميزات لين {end_str}.\n\n"
            f"نحب نعرف كيف نتحسن. رد برأيك."
        )
        await _send_whatsapp(owner_phone, f"{msg}\n\n---\n\n{msg_ar}")

    return {
        "ok": True,
        "status": "cancelled",
        "access_until": period_end,
        "plan": plan,
    }


async def handle_payment_failure(client_id: str) -> dict:
    """Handle failed recurring payment (dunning flow).

    Day 0: Payment fails -> retry automatically (Tap handles this)
    Day 3: Send WhatsApp reminder with payment link
    Day 7: Send urgent reminder
    Day 14: Downgrade to trial / suspend
    """
    client = await _get_client(client_id)
    if not client:
        return {"ok": False, "error": "Client not found"}

    plan = client.get("plan", "trial")
    currency = client.get("billing_currency", "AED")
    owner_phone = client.get("owner_phone", "")
    next_billing = client.get("next_billing_date")

    # Calculate days since payment was due
    days_overdue = 0
    if next_billing:
        try:
            billing_dt = datetime.fromisoformat(next_billing.replace("Z", "+00:00"))
            days_overdue = (_now() - billing_dt).days
        except (ValueError, TypeError):
            pass

    await _log_billing_event(client_id, "payment_failure_dunning", {
        "days_overdue": days_overdue,
        "plan": plan,
    })

    # Generate a fresh payment link
    checkout = await create_tap_checkout(
        client_id=client_id,
        plan=plan,
        currency=currency,
        include_setup=False,
    )
    payment_url = checkout.get("checkout_url", "")

    if days_overdue <= 3:
        # Day 0-3: Gentle reminder
        await _update_client(client_id, {"subscription_status": "past_due"})

        msg = (
            f"Hi! We couldn't process your monthly payment.\n\n"
            f"Please update your payment method to keep your AI assistant running:\n"
            f"{payment_url}"
        )
        msg_ar = (
            f"هلا! ما قدرنا نسحب الاشتراك الشهري.\n\n"
            f"حدّث طريقة الدفع عشان مساعدك الذكي يفضل شغّال:\n"
            f"{payment_url}"
        )
        if owner_phone:
            await _send_whatsapp(owner_phone, f"{msg}\n\n---\n\n{msg_ar}")

        return {"ok": True, "action": "reminder_sent", "days_overdue": days_overdue}

    elif days_overdue <= 7:
        # Day 4-7: Urgent reminder
        msg = (
            f"Your AI assistant will be paused soon. Your payment is {days_overdue} days overdue.\n\n"
            f"Update payment now:\n{payment_url}\n\n"
            f"Reply 'help' if you're having issues."
        )
        msg_ar = (
            f"مساعدك الذكي بيوقف قريب. الدفع متأخر {days_overdue} أيام.\n\n"
            f"حدّث الدفع الحين:\n{payment_url}\n\n"
            f"رد 'مساعدة' اذا عندك مشكلة."
        )
        if owner_phone:
            await _send_whatsapp(owner_phone, f"{msg}\n\n---\n\n{msg_ar}")

        return {"ok": True, "action": "urgent_reminder_sent", "days_overdue": days_overdue}

    else:
        # Day 14+: Suspend
        await _update_client(client_id, {"subscription_status": "suspended"})

        msg = (
            f"Your AI assistant has been paused due to unpaid subscription ({days_overdue} days overdue).\n\n"
            f"Reactivate anytime:\n{payment_url}\n\n"
            f"Your data and trained AI are safe. Just pay to resume."
        )
        msg_ar = (
            f"مساعدك الذكي متوقف بسبب عدم الدفع ({days_overdue} يوم).\n\n"
            f"فعّل اشتراكك أي وقت:\n{payment_url}\n\n"
            f"بياناتك وذكاءك الاصطناعي محفوظين. بس ادفع ويرجع يشتغل."
        )
        if owner_phone:
            await _send_whatsapp(owner_phone, f"{msg}\n\n---\n\n{msg_ar}")

        return {"ok": True, "action": "suspended", "days_overdue": days_overdue}


# ═══════════════════════════════════════════════════════
# TRIAL MANAGEMENT
# ═══════════════════════════════════════════════════════

async def start_trial(client_id: str) -> dict:
    """Start a 7-day free trial. Called from onboarding.

    Sets trial_ends_at, sends welcome message with trial info.
    """
    client = await _get_client(client_id)
    if not client:
        return {"ok": False, "error": "Client not found"}

    now = _now()
    trial_end = now + timedelta(days=7)

    await _update_client(client_id, {
        "plan": "trial",
        "subscription_status": "trialing",
        "trial_ends_at": trial_end.isoformat(),
    })

    await _log_billing_event(client_id, "trial_started", {
        "trial_ends_at": trial_end.isoformat(),
    })

    owner_phone = client.get("owner_phone", "")
    company = client.get("company_name", "your business")

    msg = (
        f"Your 7-day free trial has started!\n\n"
        f"Your AI assistant for {company} is now live. Here's what you get:\n"
        f"- WhatsApp AI agent (handles customer chats)\n"
        f"- Owner brain (daily insights & alerts)\n"
        f"- Basic reports\n\n"
        f"Trial ends: {trial_end.strftime('%d %b %Y')}\n"
        f"Daily limit: 50 messages, 10 bookings\n\n"
        f"Need more? Type 'upgrade' anytime to see our plans."
    )
    msg_ar = (
        f"بدأت تجربتك المجانية لمدة 7 أيام!\n\n"
        f"مساعدك الذكي لـ {company} شغّال الحين. تقدر تستخدم:\n"
        f"- مساعد واتساب ذكي (يرد على العملاء)\n"
        f"- تقارير يومية للمالك\n"
        f"- تقارير أساسية\n\n"
        f"التجربة تنتهي: {trial_end.strftime('%d %b %Y')}\n"
        f"الحد اليومي: 50 رسالة، 10 حجوزات\n\n"
        f"تبي أكثر؟ اكتب 'ترقية' بأي وقت."
    )

    if owner_phone:
        await _send_whatsapp(owner_phone, f"{msg}\n\n---\n\n{msg_ar}")

    return {
        "ok": True,
        "plan": "trial",
        "status": "trialing",
        "trial_ends_at": trial_end.isoformat(),
    }


async def check_trial_status(client_id: str) -> dict:
    """Check trial status. Returns: {is_trial, days_remaining, expired}."""
    client = await _get_client(client_id)
    if not client:
        return {"is_trial": False, "days_remaining": 0, "expired": True}

    status = client.get("subscription_status", "")
    if status != "trialing":
        return {"is_trial": status == "trialing", "days_remaining": 0, "expired": status == "expired"}

    trial_ends_at = client.get("trial_ends_at")
    if not trial_ends_at:
        return {"is_trial": True, "days_remaining": 0, "expired": True}

    try:
        trial_dt = datetime.fromisoformat(trial_ends_at.replace("Z", "+00:00"))
        remaining = (trial_dt - _now()).total_seconds()
        days_remaining = max(0, int(remaining / 86400))
        expired = remaining <= 0

        if expired:
            await _update_client(client_id, {"subscription_status": "expired"})

        return {
            "is_trial": True,
            "days_remaining": days_remaining,
            "expired": expired,
            "trial_ends_at": trial_ends_at,
        }
    except (ValueError, TypeError):
        return {"is_trial": True, "days_remaining": 0, "expired": True}


async def send_trial_reminders() -> list:
    """Run daily: find all clients whose trial is ending soon.

    Day 5: 'Your trial ends in 2 days!'
    Day 6: 'Last day tomorrow. Upgrade to keep your AI running.'
    Day 7: 'Trial ended. Your AI is paused.'
    Day 10: 'We miss you! Reactivate?'
    """
    results = []
    now = _now()

    try:
        async with httpx.AsyncClient(timeout=15) as http:
            # Get all trialing clients
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/clients"
                "?subscription_status=in.(trialing,expired)"
                "&select=id,company_name,owner_phone,trial_ends_at,subscription_status",
                headers=_SUPA_HEADERS,
            )
            clients = r.json() if r.status_code == 200 else []
    except Exception as e:
        print(f"[billing] Failed to fetch trial clients: {e}")
        return []

    for client in clients:
        client_id = client.get("id", "")
        owner_phone = client.get("owner_phone", "")
        company = client.get("company_name", "your business")
        trial_ends_at = client.get("trial_ends_at")

        if not trial_ends_at or not owner_phone:
            continue

        try:
            trial_dt = datetime.fromisoformat(trial_ends_at.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            continue

        days_until_end = (trial_dt - now).total_seconds() / 86400
        days_since_end = -days_until_end  # positive after expiry

        # Generate payment link
        checkout = await create_tap_checkout(client_id, "starter", "AED", include_setup=True)
        payment_url = checkout.get("checkout_url", "")

        msg = None
        msg_ar = None

        if 1.5 < days_until_end <= 2.5:
            # Day 5 of trial — 2 days left
            summary = await generate_trial_summary(client_id, "en")
            summary_ar = await generate_trial_summary(client_id, "ar")
            msg = (
                f"Your trial ends in 2 days!\n\n"
                f"Here's what your AI accomplished so far:\n{summary}\n\n"
                f"Keep it running — upgrade now:\n{payment_url}"
            )
            msg_ar = (
                f"تجربتك تنتهي بعد يومين!\n\n"
                f"شوف وش سوى مساعدك الذكي:\n{summary_ar}\n\n"
                f"خلّه يشتغل — رقّي الحين:\n{payment_url}"
            )

        elif 0.5 < days_until_end <= 1.5:
            # Day 6 — last day tomorrow
            msg = (
                f"Last day of your trial tomorrow!\n\n"
                f"Your AI for {company} will pause after the trial.\n"
                f"Upgrade to keep everything running:\n{payment_url}"
            )
            msg_ar = (
                f"آخر يوم بالتجربة بكرة!\n\n"
                f"مساعدك الذكي لـ {company} بيوقف بعد التجربة.\n"
                f"رقّي عشان كل شي يفضل شغّال:\n{payment_url}"
            )

        elif -0.5 < days_until_end <= 0.5:
            # Day 7 — trial ended today
            msg = (
                f"Your free trial has ended.\n\n"
                f"Your AI assistant is paused. Reactivate to keep handling "
                f"customer conversations for {company}:\n{payment_url}"
            )
            msg_ar = (
                f"انتهت تجربتك المجانية.\n\n"
                f"مساعدك الذكي متوقف. فعّله عشان يرجع يرد على عملاء {company}:\n{payment_url}"
            )

        elif 2.5 < days_since_end <= 3.5:
            # Day 10 — "we miss you" (3 days after expiry)
            summary = await generate_trial_summary(client_id, "en")
            summary_ar = await generate_trial_summary(client_id, "ar")
            msg = (
                f"We miss you!\n\n"
                f"During your trial, your AI:\n{summary}\n\n"
                f"All that knowledge is saved. Reactivate anytime:\n{payment_url}"
            )
            msg_ar = (
                f"وحشتنا!\n\n"
                f"خلال التجربة، مساعدك الذكي:\n{summary_ar}\n\n"
                f"كل المعلومات محفوظة. فعّل اشتراكك أي وقت:\n{payment_url}"
            )

        if msg and msg_ar:
            await _send_whatsapp(owner_phone, f"{msg}\n\n---\n\n{msg_ar}")
            action = "day5" if days_until_end > 1.5 else "day6" if days_until_end > 0.5 else "day7" if days_until_end > -0.5 else "day10"
            await _log_billing_event(client_id, f"trial_reminder_{action}", {"company": company})
            results.append({"client_id": client_id, "company": company, "action": action})

    return results


async def generate_trial_summary(client_id: str, lang: str = "en") -> str:
    """Generate a summary of what happened during the trial.

    Shows: conversations handled, bookings made, rules learned, customers remembered.
    This is the 'look what you'd lose' message.
    """
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            # Count total messages
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/activity_logs"
                f"?client_id=eq.{client_id}"
                f"&action=eq.message_received"
                "&select=id",
                headers={**_SUPA_HEADERS, "Prefer": "count=exact"},
            )
            msg_count = 0
            if r.status_code == 200:
                cr = r.headers.get("content-range", "")
                if "/" in cr:
                    msg_count = int(cr.split("/")[-1])

            # Count bookings
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/activity_logs"
                f"?client_id=eq.{client_id}"
                f"&action=eq.booking_created"
                "&select=id",
                headers={**_SUPA_HEADERS, "Prefer": "count=exact"},
            )
            booking_count = 0
            if r.status_code == 200:
                cr = r.headers.get("content-range", "")
                if "/" in cr:
                    booking_count = int(cr.split("/")[-1])

            # Count unique customers
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/activity_logs"
                f"?client_id=eq.{client_id}"
                f"&action=eq.message_received"
                "&select=details",
                headers=_SUPA_HEADERS,
            )
            unique_customers = set()
            if r.status_code == 200:
                for row in r.json():
                    details = row.get("details", "{}")
                    if isinstance(details, str):
                        try:
                            details = json.loads(details)
                        except (json.JSONDecodeError, TypeError):
                            details = {}
                    phone = details.get("customer_phone", "")
                    if phone:
                        unique_customers.add(phone)

            # Count rules learned (Karpathy loop)
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/activity_logs"
                f"?client_id=eq.{client_id}"
                f"&action=eq.karpathy:rule_added"
                "&select=id",
                headers={**_SUPA_HEADERS, "Prefer": "count=exact"},
            )
            rules_count = 0
            if r.status_code == 200:
                cr = r.headers.get("content-range", "")
                if "/" in cr:
                    rules_count = int(cr.split("/")[-1])

    except Exception as e:
        print(f"[billing] Failed to generate trial summary: {e}")
        msg_count = 0
        booking_count = 0
        unique_customers = set()
        rules_count = 0

    customer_count = len(unique_customers)

    if lang == "ar":
        lines = []
        if msg_count > 0:
            lines.append(f"- رد على {msg_count} رسالة")
        if booking_count > 0:
            lines.append(f"- سوّى {booking_count} حجز")
        if customer_count > 0:
            lines.append(f"- تعامل مع {customer_count} عميل")
        if rules_count > 0:
            lines.append(f"- تعلّم {rules_count} قاعدة عن مشروعك")
        if not lines:
            lines.append("- جاهز يشتغل لك!")
        return "\n".join(lines)
    else:
        lines = []
        if msg_count > 0:
            lines.append(f"- Handled {msg_count} conversations")
        if booking_count > 0:
            lines.append(f"- Made {booking_count} bookings")
        if customer_count > 0:
            lines.append(f"- Served {customer_count} unique customers")
        if rules_count > 0:
            lines.append(f"- Learned {rules_count} rules about your business")
        if not lines:
            lines.append("- Ready to work for you!")
        return "\n".join(lines)


# ═══════════════════════════════════════════════════════
# BILLING WHATSAPP COMMANDS
# ═══════════════════════════════════════════════════════

async def process_billing_command(client_id: str, command: str, lang: str = "en") -> str:
    """Handle billing commands from the owner via WhatsApp.

    'plan' / 'خطتي' -> show current plan
    'upgrade' / 'ترقية' -> show upgrade options with payment links
    'usage' / 'استخدام' -> show usage vs limits
    'billing' / 'فواتير' -> show billing history
    'cancel' / 'إلغاء' -> start cancellation flow
    """
    cmd = command.strip().lower()

    # Auto-detect language
    if lang == "auto":
        lang = _detect_language(command)

    # ── Current Plan ──────────────────────────────────
    if cmd in ("plan", "my plan", "خطتي", "خطة", "الخطة"):
        sub = await get_subscription(client_id)
        if not sub.get("ok"):
            return "Could not retrieve subscription info." if lang == "en" else "ما قدرنا نجيب معلومات الاشتراك."

        if lang == "ar":
            status_map = {
                "trialing": "تجربة مجانية",
                "active": "مفعّل",
                "past_due": "متأخر الدفع",
                "cancelled": "ملغي",
                "expired": "منتهي",
                "suspended": "موقف",
                "pending_payment": "بانتظار الدفع",
            }
            status_text = status_map.get(sub["status"], sub["status"])
            msg = f"خطتك الحالية: {sub['plan_name_ar']}\nالحالة: {status_text}\n"
            if sub["status"] == "trialing" and sub.get("trial_ends_at"):
                try:
                    t = datetime.fromisoformat(sub["trial_ends_at"].replace("Z", "+00:00"))
                    days_left = max(0, int((t - _now()).total_seconds() / 86400))
                    msg += f"باقي {days_left} يوم بالتجربة\n"
                except (ValueError, TypeError):
                    pass
            if sub.get("next_billing_date"):
                msg += f"الفاتورة الجاية: {sub['next_billing_date'][:10]}\n"
            limits = sub.get("limits", {})
            if limits:
                msg_l = limits.get("messages_per_day", 0)
                book_l = limits.get("bookings_per_day", 0)
                msg += f"\nالحدود:\n- رسائل: {'بلا حدود' if msg_l == -1 else str(msg_l)}/يوم\n"
                msg += f"- حجوزات: {'بلا حدود' if book_l == -1 else str(book_l)}/يوم"
            return msg
        else:
            status_map = {
                "trialing": "Free Trial",
                "active": "Active",
                "past_due": "Payment Overdue",
                "cancelled": "Cancelled",
                "expired": "Expired",
                "suspended": "Suspended",
                "pending_payment": "Pending Payment",
            }
            status_text = status_map.get(sub["status"], sub["status"])
            msg = f"Current plan: {sub['plan_name_en']}\nStatus: {status_text}\n"
            if sub["status"] == "trialing" and sub.get("trial_ends_at"):
                try:
                    t = datetime.fromisoformat(sub["trial_ends_at"].replace("Z", "+00:00"))
                    days_left = max(0, int((t - _now()).total_seconds() / 86400))
                    msg += f"{days_left} days left in trial\n"
                except (ValueError, TypeError):
                    pass
            if sub.get("next_billing_date"):
                msg += f"Next billing: {sub['next_billing_date'][:10]}\n"
            limits = sub.get("limits", {})
            if limits:
                msg_l = limits.get("messages_per_day", 0)
                book_l = limits.get("bookings_per_day", 0)
                msg += f"\nLimits:\n- Messages: {'Unlimited' if msg_l == -1 else str(msg_l)}/day\n"
                msg += f"- Bookings: {'Unlimited' if book_l == -1 else str(book_l)}/day"
            return msg

    # ── Upgrade ───────────────────────────────────────
    if cmd in ("upgrade", "ترقية", "رقي", "plans", "الخطط"):
        sub = await get_subscription(client_id)
        current_plan = sub.get("plan", "trial") if sub.get("ok") else "trial"
        currency = sub.get("billing_currency", "AED") if sub.get("ok") else "AED"
        current_idx = _PLAN_ORDER.index(current_plan) if current_plan in _PLAN_ORDER else 0

        if lang == "ar":
            msg = "خطط الترقية المتاحة:\n\n"
        else:
            msg = "Available upgrade plans:\n\n"

        for plan_key in _PLAN_ORDER:
            if plan_key == "trial":
                continue
            plan_idx = _PLAN_ORDER.index(plan_key)
            if plan_idx <= current_idx:
                continue

            p = PLANS[plan_key]
            price = _plan_price(plan_key, currency)

            # Generate checkout link
            checkout = await create_tap_checkout(client_id, plan_key, currency, include_setup=not sub.get("ok", False))
            url = checkout.get("checkout_url", "")

            if lang == "ar":
                msg += f"*{p['name_ar']}* — {currency} {price}/شهر\n"
                features = ", ".join(p.get("features", [])[:3])
                msg += f"  المميزات: {features}\n"
                lim = p.get("limits", {})
                msg_l = lim.get("messages_per_day", 0)
                msg += f"  رسائل: {'بلا حدود' if msg_l == -1 else str(msg_l)}/يوم\n"
                if url:
                    msg += f"  اشترك: {url}\n"
                msg += "\n"
            else:
                msg += f"*{p['name_en']}* — {currency} {price}/month\n"
                features = ", ".join(p.get("features", [])[:3])
                msg += f"  Features: {features}\n"
                lim = p.get("limits", {})
                msg_l = lim.get("messages_per_day", 0)
                msg += f"  Messages: {'Unlimited' if msg_l == -1 else str(msg_l)}/day\n"
                if url:
                    msg += f"  Subscribe: {url}\n"
                msg += "\n"

        return msg.strip()

    # ── Usage ─────────────────────────────────────────
    if cmd in ("usage", "استخدام", "الاستخدام"):
        limits_data = await check_limits(client_id)
        if not limits_data.get("ok"):
            return "Could not retrieve usage." if lang == "en" else "ما قدرنا نجيب الاستخدام."

        if lang == "ar":
            msg_l = limits_data["messages_limit"]
            book_l = limits_data["bookings_limit"]
            msg = (
                f"استخدامك اليوم:\n\n"
                f"الرسائل: {limits_data['messages_used']}/{('بلا حدود' if msg_l == -1 else str(msg_l))}\n"
                f"الحجوزات: {limits_data['bookings_used']}/{('بلا حدود' if book_l == -1 else str(book_l))}\n"
            )
            if limits_data["at_limit"]:
                msg += "\n⚠ وصلت الحد! اكتب 'ترقية' لزيادة الحدود."
            return msg
        else:
            msg_l = limits_data["messages_limit"]
            book_l = limits_data["bookings_limit"]
            msg = (
                f"Today's usage:\n\n"
                f"Messages: {limits_data['messages_used']}/{'Unlimited' if msg_l == -1 else str(msg_l)}\n"
                f"Bookings: {limits_data['bookings_used']}/{'Unlimited' if book_l == -1 else str(book_l)}\n"
            )
            if limits_data["at_limit"]:
                msg += "\nYou've hit your limit! Type 'upgrade' for more capacity."
            return msg

    # ── Billing History ───────────────────────────────
    if cmd in ("billing", "invoices", "فواتير", "الفواتير"):
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                r = await http.get(
                    f"{_SUPA_URL}/rest/v1/activity_logs"
                    f"?client_id=eq.{client_id}"
                    f"&action=like.billing:tap_webhook_CAPTURED"
                    "&order=created_at.desc"
                    "&limit=10"
                    "&select=details,created_at",
                    headers=_SUPA_HEADERS,
                )
                events = r.json() if r.status_code == 200 else []
        except Exception:
            events = []

        if not events:
            return "No billing history yet." if lang == "en" else "ما في فواتير بعد."

        if lang == "ar":
            msg = "سجل الفواتير:\n\n"
            for e in events:
                details = e.get("details", "{}")
                if isinstance(details, str):
                    try:
                        details = json.loads(details)
                    except (json.JSONDecodeError, TypeError):
                        details = {}
                amount = details.get("amount", 0)
                currency = details.get("currency", "AED")
                date = e.get("created_at", "")[:10]
                msg += f"- {date}: {currency} {amount}\n"
            return msg
        else:
            msg = "Billing history:\n\n"
            for e in events:
                details = e.get("details", "{}")
                if isinstance(details, str):
                    try:
                        details = json.loads(details)
                    except (json.JSONDecodeError, TypeError):
                        details = {}
                amount = details.get("amount", 0)
                currency = details.get("currency", "AED")
                date = e.get("created_at", "")[:10]
                msg += f"- {date}: {currency} {amount}\n"
            return msg

    # ── Cancel ────────────────────────────────────────
    if cmd in ("cancel", "إلغاء", "الغاء", "الغي"):
        sub = await get_subscription(client_id)
        if not sub.get("ok") or sub.get("status") in ("cancelled", "expired"):
            return "No active subscription to cancel." if lang == "en" else "ما في اشتراك مفعّل للإلغاء."

        if lang == "ar":
            return (
                "متأكد تبي تلغي اشتراكك؟\n\n"
                "بتفقد:\n"
                "- مساعد الواتساب الذكي\n"
                "- التقارير والتحليلات\n"
                "- كل المميزات الحالية\n\n"
                "اكتب 'تأكيد الإلغاء' للتأكيد\n"
                "أو 'خلها' للاستمرار."
            )
        else:
            return (
                "Are you sure you want to cancel?\n\n"
                "You'll lose:\n"
                "- AI WhatsApp assistant\n"
                "- Reports & analytics\n"
                "- All current features\n\n"
                "Type 'confirm cancel' to proceed\n"
                "or 'keep' to stay."
            )

    # ── Confirm Cancel ────────────────────────────────
    if cmd in ("confirm cancel", "تأكيد الإلغاء", "تاكيد الالغاء"):
        result = await cancel_subscription(client_id, reason="owner_requested")
        if result.get("ok"):
            if lang == "ar":
                return f"تم إلغاء اشتراكك. بتقدر تستخدم المميزات لين {result.get('access_until', '')[:10]}."
            else:
                return f"Subscription cancelled. You'll keep access until {result.get('access_until', '')[:10]}."
        else:
            return result.get("error", "Cancellation failed.")

    # ── Keep (cancel abort) ───────────────────────────
    if cmd in ("keep", "خلها", "استمر"):
        if lang == "ar":
            return "تمام! اشتراكك مستمر. نحن هنا اذا تحتاج شي."
        else:
            return "Great! Your subscription stays active. We're here if you need anything."

    # ── Unknown command ───────────────────────────────
    if lang == "ar":
        return (
            "أوامر الاشتراك:\n"
            "- 'خطتي' — عرض خطتك الحالية\n"
            "- 'ترقية' — عرض خطط الترقية\n"
            "- 'استخدام' — عرض الاستخدام اليوم\n"
            "- 'فواتير' — سجل الدفعات\n"
            "- 'إلغاء' — إلغاء الاشتراك"
        )
    else:
        return (
            "Billing commands:\n"
            "- 'plan' — view current plan\n"
            "- 'upgrade' — see upgrade options\n"
            "- 'usage' — today's usage\n"
            "- 'billing' — payment history\n"
            "- 'cancel' — cancel subscription"
        )


# ═══════════════════════════════════════════════════════
# ACCESS GATING — THE GATEKEEPER
# ═══════════════════════════════════════════════════════

async def gate_request(client_id: str, request_type: str = "message") -> dict:
    """THE GATEKEEPER. Called before EVERY WhatsApp message is processed.

    Simple rule: paid = allowed, not paid = blocked.
    No trial. No free access. Pay first, then we provision.

    Returns: {allowed, reason, action, message_to_send}
    """
    client = await _get_client(client_id)
    if not client:
        return {
            "allowed": False,
            "reason": "client_not_found",
            "action": "block",
            "message_to_send": "",
        }

    plan = client.get("plan", "")
    status = client.get("subscription_status", "")
    currency = client.get("billing_currency", "AED")

    # ── 1. Active paid plan ───────────────────────────
    if status == "active" and plan in PLANS:
        # Check daily limits
        limits_data = await check_limits(client_id)
        if limits_data.get("at_limit"):
            next_up = _next_plan(plan)
            if next_up:
                return {
                    "allowed": True,
                    "reason": "daily_limit_reached",
                    "action": "upgrade",
                    "message_to_send": "",
                }
        return {"allowed": True, "reason": "", "action": "allow", "message_to_send": ""}

    # ── 2. Cancelled but paid period not ended ────────
    if status == "cancelled":
        period_end = client.get("current_period_end")
        if period_end:
            try:
                end_dt = datetime.fromisoformat(period_end.replace("Z", "+00:00"))
                if _now() <= end_dt:
                    return {"allowed": True, "reason": "cancelled_but_active_period", "action": "allow", "message_to_send": ""}
            except (ValueError, TypeError):
                pass

    # ── 3. Legacy/demo clients (professional, etc.) ───
    # Clients created before billing system — allow if status is active
    if client.get("status") == "active" and plan and plan not in ("trial", ""):
        return {"allowed": True, "reason": "legacy_plan", "action": "allow", "message_to_send": ""}

    # ── 4. Not paid — block ───────────────────────────
    checkout = await create_tap_checkout(client_id, "starter", currency, include_setup=True)
    payment_url = checkout.get("checkout_url", "")
    return {
        "allowed": False,
        "reason": "no_active_subscription",
        "action": "block",
        "message_to_send": (
            f"To activate your AI assistant, please complete your subscription:\n"
            f"{payment_url}\n\n"
            f"---\n\n"
            f"لتفعيل مساعدك الذكي، أكمل اشتراكك:\n"
            f"{payment_url}"
        ),
        }

    # ── 5. Past due — allow with warning ──────────────
    if status == "past_due":
        return {
            "allowed": True,
            "reason": "payment_past_due",
            "action": "allow",
            "message_to_send": "",
        }

    # ── 6. Pending payment ────────────────────────────
    if status == "pending_payment":
        # Allow during the pending window (they just created checkout)
        return {
            "allowed": True,
            "reason": "pending_payment",
            "action": "allow",
            "message_to_send": "",
        }

    # ── Fallback: unknown status ──────────────────────
    return {
        "allowed": False,
        "reason": f"unknown_status:{status}",
        "action": "block",
        "message_to_send": "",
    }
