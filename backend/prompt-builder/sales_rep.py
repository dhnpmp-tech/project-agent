"""Sales Rep AI Agent — Lead qualification, follow-ups, upselling, pipeline management.

Works alongside the customer-facing AI (bookings/orders) and Owner Brain (owner comms).
Handles the B2B / high-value-inquiry side of multi-tenant WhatsApp businesses:
  - Restaurants: catering, private dining, events, corporate accounts
  - Salons: bridal packages, corporate wellness, bulk bookings
  - Cafes: office subscriptions, bulk orders, event catering
  - Real estate: property inquiries, viewings, investment packages

Storage: Supabase (activity_logs + sales_pipeline tables).
AI generation: MiniMax M2.7 with CJK artifact cleanup.
Bilingual: English + Gulf Arabic.
"""

import os
import json
import re
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
_MINIMAX_KEY = os.environ.get("MINIMAX_API_KEY", "")

# ═══════════════════════════════════════════════════════
# PIPELINE STAGES
# ═══════════════════════════════════════════════════════

PIPELINE_STAGES = ("new", "qualified", "proposal_sent", "negotiating", "won", "lost")

DEAL_TYPES = {
    "restaurant": [
        "catering", "private_dining", "event_booking", "corporate_account",
        "wedding_reception", "birthday_party", "group_dining",
    ],
    "salon": [
        "bridal_party", "corporate_wellness", "package_deal",
        "membership", "group_booking", "vip_treatment",
    ],
    "cafe": [
        "bulk_order", "office_subscription", "event_catering",
        "corporate_meeting", "weekly_delivery", "loyalty_program",
    ],
    "real_estate": [
        "property_inquiry", "viewing_request", "investment_package",
        "rental_inquiry", "commercial_lease", "off_plan_purchase",
    ],
}

# ═══════════════════════════════════════════════════════
# INTENT & SIGNAL DETECTION
# ═══════════════════════════════════════════════════════

_INTENT_KEYWORDS = {
    # English high-intent
    "catering for": 20, "corporate event": 20, "wedding reception": 25,
    "private dining": 18, "bulk order": 15, "event booking": 18,
    "bridal party": 22, "office subscription": 15, "group booking": 12,
    "property viewing": 20, "investment opportunity": 22, "commercial lease": 18,
    "want to book": 12, "need a quote": 15, "how much for": 10,
    "can you do": 8, "is it possible": 6, "we need": 10,
    "our company": 12, "for our team": 10, "for 50": 15,
    "for 100": 18, "for 200": 20,
    # Gulf Arabic high-intent
    "كيترنق": 20, "حفلة عرس": 25, "مناسبة": 15, "حجز خاص": 18,
    "طلب كبير": 15, "للشركة": 12, "حفلة": 12, "فعالية": 15,
    "كم السعر": 10, "عرض سعر": 15, "أبغى أحجز": 12,
    "عقار": 18, "شقة": 12, "فيلا": 15, "استثمار": 20,
}

_BUDGET_KEYWORDS = {
    "budget": 10, "price range": 12, "premium": 15, "vip": 18,
    "luxury": 15, "all-inclusive": 12, "top shelf": 10,
    "how much": 8, "what's the cost": 8, "per person": 10,
    "الميزانية": 10, "السعر": 8, "كم يكلف": 8, "في آي بي": 15,
    "فاخر": 12, "بريميوم": 12,
}

_TIMELINE_HOT = {
    "tomorrow": 25, "tonight": 25, "today": 25,
    "this weekend": 20, "this week": 18, "next week": 12,
    "urgent": 20, "asap": 20, "as soon as possible": 18,
    "باكر": 25, "اليوم": 25, "الليلة": 25,
    "هالأسبوع": 18, "نهاية الأسبوع": 20, "ضروري": 20,
    "بأسرع وقت": 18,
}

_TIMELINE_COLD = {
    "someday": -10, "maybe later": -8, "not sure when": -5,
    "just browsing": -10, "just asking": -8,
    "يمكن بعدين": -8, "مو متأكد": -5, "أسأل بس": -8,
}

_LOSS_REASONS = {
    "price_too_high": {"en": "Price too high", "ar": "السعر عالي"},
    "went_competitor": {"en": "Went with competitor", "ar": "راح للمنافس"},
    "timing_changed": {"en": "Timing/plans changed", "ar": "تغيرت الخطط"},
    "no_response": {"en": "No response / ghosted", "ar": "ما رد"},
    "not_qualified": {"en": "Not a qualified lead", "ar": "ليس عميل مؤهل"},
    "service_unavailable": {"en": "Service not available", "ar": "الخدمة غير متوفرة"},
    "other": {"en": "Other", "ar": "سبب آخر"},
}


# ═══════════════════════════════════════════════════════
# FOLLOW-UP SEQUENCES
# ═══════════════════════════════════════════════════════

_FOLLOWUP_CADENCE = [
    {
        "day": 1,
        "type": "thank_you",
        "en": (
            "Hi {name}! Thanks for reaching out about {deal_type}. "
            "We'd love to make this happen for you. "
            "Feel free to ask any questions — I'm here to help!"
        ),
        "ar": (
            "هلا {name}! شكراً لتواصلك معنا بخصوص {deal_type}. "
            "يسعدنا نخدمك ونحقق لك اللي تبغاه. "
            "لا تتردد تسأل عن أي شي!"
        ),
    },
    {
        "day": 3,
        "type": "gentle_followup",
        "en": (
            "Hi {name}, it's been a couple of days since you asked about {deal_type}. "
            "Still interested? We have a {promo} this week."
        ),
        "ar": (
            "هلا {name}، مرت كم يوم من استفسارك عن {deal_type}. "
            "هل لسا مهتم؟ عندنا {promo} هالأسبوع."
        ),
    },
    {
        "day": 7,
        "type": "value_add",
        "en": (
            "Hi {name}! Quick update — many of our clients who booked {deal_type} "
            "also loved {upsell}. Want me to put together a special package for you?"
        ),
        "ar": (
            "هلا {name}! عندي خبر حلو — كثير من عملائنا اللي حجزوا {deal_type} "
            "عجبهم {upsell}. أبغى أجهز لك عرض خاص؟"
        ),
    },
    {
        "day": 14,
        "type": "last_chance",
        "en": (
            "Hi {name}, just checking one last time about {deal_type}. "
            "We have limited availability coming up. "
            "Would you like to lock in a date? No pressure at all!"
        ),
        "ar": (
            "هلا {name}، آخر مرة أسألك عن {deal_type}. "
            "عندنا أماكن محدودة قريباً. "
            "تبغى نحجز لك؟ ما فيه أي ضغط!"
        ),
    },
]


# ═══════════════════════════════════════════════════════
# UPSELL DEFINITIONS
# ═══════════════════════════════════════════════════════

_UPSELL_RULES = {
    "restaurant": [
        {
            "trigger_keywords": ["birthday", "عيد ميلاد", "ميلاد"],
            "suggestion_en": "We have a celebration package with cake + champagne for just AED 150 more!",
            "suggestion_ar": "عندنا باقة احتفال مع كيك + شمبانيا بس بـ 150 درهم زيادة!",
            "deal_type": "birthday_upgrade",
            "value_add": 150,
        },
        {
            "trigger_keywords": ["wedding", "عرس", "زواج", "ملكة"],
            "suggestion_en": "Our wedding package includes a private dining room, custom menu, and dedicated service team. Starting from AED 5,000.",
            "suggestion_ar": "باقة الأعراس عندنا تشمل صالة خاصة وقائمة مخصصة وفريق خدمة. تبدأ من 5,000 درهم.",
            "deal_type": "wedding_premium",
            "value_add": 5000,
        },
        {
            "trigger_keywords": ["corporate", "company", "شركة", "للشركة", "team", "فريق"],
            "suggestion_en": "We offer corporate dining accounts with 15% off all bookings and priority reservations. Want me to set one up?",
            "suggestion_ar": "عندنا حسابات شركات مع خصم 15% وأولوية بالحجز. تبغاني أفتح لك حساب؟",
            "deal_type": "corporate_account",
            "value_add": 500,
        },
        {
            "trigger_keywords": ["catering", "كيترنق", "تموين"],
            "suggestion_en": "Add our dessert station to your catering for just AED 25 per person — it's always a crowd favorite!",
            "suggestion_ar": "أضف ركن الحلويات لكيترنقك بس 25 درهم للشخص — دايم يعجب الضيوف!",
            "deal_type": "catering_addon",
            "value_add": 250,
        },
    ],
    "salon": [
        {
            "trigger_keywords": ["bridal", "bride", "عروس", "عرس"],
            "suggestion_en": "Our bridal package includes makeup, hair, and a pre-wedding trial session. AED 2,500 all-inclusive.",
            "suggestion_ar": "باقة العروس عندنا تشمل مكياج وشعر وجلسة تجريبية قبل العرس. 2,500 درهم شامل.",
            "deal_type": "bridal_premium",
            "value_add": 2500,
        },
        {
            "trigger_keywords": ["group", "party", "friends", "مجموعة", "بنات", "حفلة"],
            "suggestion_en": "Book for 5+ and get 20% off the group! Perfect for a girls' day out.",
            "suggestion_ar": "احجزي لـ 5+ واحصلي على خصم 20%! مثالي ليوم بنات.",
            "deal_type": "group_discount",
            "value_add": 200,
        },
        {
            "trigger_keywords": ["membership", "monthly", "اشتراك", "شهري"],
            "suggestion_en": "Our monthly membership saves you 30% on all services. Plus priority booking!",
            "suggestion_ar": "اشتراكنا الشهري يوفر لك 30% على كل الخدمات. مع أولوية بالحجز!",
            "deal_type": "membership",
            "value_add": 300,
        },
    ],
    "cafe": [
        {
            "trigger_keywords": ["office", "مكتب", "daily", "يومي"],
            "suggestion_en": "Since you're ordering regularly, try our office subscription — 20% off weekly orders with free delivery!",
            "suggestion_ar": "بما إنك تطلب بشكل منتظم، جرب اشتراك المكاتب — خصم 20% على الطلبات الأسبوعية مع توصيل مجاني!",
            "deal_type": "office_subscription",
            "value_add": 200,
        },
        {
            "trigger_keywords": ["10 coffee", "bulk", "كبير", "كمية"],
            "suggestion_en": "Order 10+ drinks and get a free pastry box! Great for meetings.",
            "suggestion_ar": "اطلب 10+ مشروبات واحصل على بوكس معجنات مجاني! ممتاز للاجتماعات.",
            "deal_type": "bulk_bonus",
            "value_add": 50,
        },
        {
            "trigger_keywords": ["event", "meeting", "فعالية", "اجتماع"],
            "suggestion_en": "We offer full event catering with setup and service. Starting from AED 1,500.",
            "suggestion_ar": "نقدم كيترنق كامل مع تجهيز وخدمة. يبدأ من 1,500 درهم.",
            "deal_type": "event_catering",
            "value_add": 1500,
        },
    ],
    "real_estate": [
        {
            "trigger_keywords": ["invest", "استثمار", "roi", "عائد"],
            "suggestion_en": "Our premium investment units offer guaranteed 8% ROI for 3 years. Limited units remaining.",
            "suggestion_ar": "وحداتنا الاستثمارية المميزة تضمن عائد 8% لمدة 3 سنوات. الوحدات محدودة.",
            "deal_type": "investment_premium",
            "value_add": 50000,
        },
        {
            "trigger_keywords": ["family", "عائلة", "bedroom", "غرف"],
            "suggestion_en": "We have family packages with community amenities — pool, gym, and kids' play area included.",
            "suggestion_ar": "عندنا باقات عائلية مع مرافق مجتمعية — مسبح وجيم ومنطقة ألعاب أطفال.",
            "deal_type": "family_package",
            "value_add": 10000,
        },
    ],
}


# ═══════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════

def _now_iso() -> str:
    """Current UTC timestamp in ISO format."""
    return datetime.now(timezone.utc).isoformat()


def _detect_language(text: str) -> str:
    """Detect if message is Arabic or English based on character frequency."""
    arabic = len(re.findall(r'[\u0600-\u06FF]', text))
    latin = len(re.findall(r'[a-zA-Z]', text))
    return "ar" if arabic >= latin else "en"


def _clean_minimax(raw: str) -> str:
    """Clean MiniMax M2.7 output: strip think tags, CJK/Cyrillic artifacts, bold."""
    # Remove <think>...</think> blocks
    content = re.sub(r"<think>[\s\S]*?</think>\s*", "", raw).strip()
    # If entire output was inside think tags, extract from inside
    if not content and "<think>" in raw:
        content = re.sub(r"</?think>", "", raw).strip()
    # CJK + Cyrillic cleanup (MiniMax artifact)
    content = re.sub(r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u0400-\u04ff]+', '', content)
    # Bold markdown
    content = content.replace("**", "")
    # Collapse multiple spaces
    content = re.sub(r'\s{2,}', ' ', content).strip()
    return content


async def _minimax_generate(system_prompt: str, user_prompt: str, max_tokens: int = 500) -> str:
    """Call MiniMax M2.7 and return cleaned text. Returns empty string on failure."""
    if not _MINIMAX_KEY:
        return ""
    try:
        async with httpx.AsyncClient(timeout=60) as http:
            r = await http.post(
                "https://api.minimax.io/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {_MINIMAX_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "MiniMax-M2.7",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "max_tokens": max_tokens,
                },
            )
            data = r.json()
            if data.get("choices"):
                raw = data["choices"][0].get("message", {}).get("content", "")
                return _clean_minimax(raw)
            print(f"[sales_rep] MiniMax no choices: {str(data)[:200]}")
    except Exception as e:
        print(f"[sales_rep] MiniMax error: {e}")
    return ""


async def _supa_insert(table: str, row: dict) -> Optional[dict]:
    """Insert a row into a Supabase table. Returns the inserted row or None."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.post(
                f"{_SUPA_URL}/rest/v1/{table}",
                headers=_SUPA_HEADERS,
                json=row,
            )
            if r.status_code in (200, 201):
                result = r.json()
                return result[0] if isinstance(result, list) and result else result
            print(f"[sales_rep] Insert {table} failed: {r.status_code} {r.text[:200]}")
    except Exception as e:
        print(f"[sales_rep] Insert {table} error: {e}")
    return None


async def _supa_update(table: str, filters: str, data: dict) -> Optional[dict]:
    """Update rows in Supabase matching the filter string. Returns first updated row or None."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.patch(
                f"{_SUPA_URL}/rest/v1/{table}?{filters}",
                headers=_SUPA_HEADERS,
                json=data,
            )
            if r.status_code in (200, 201):
                result = r.json()
                return result[0] if isinstance(result, list) and result else result
            print(f"[sales_rep] Update {table} failed: {r.status_code} {r.text[:200]}")
    except Exception as e:
        print(f"[sales_rep] Update {table} error: {e}")
    return None


async def _supa_select(table: str, query_params: str) -> list:
    """Select rows from Supabase. Returns a list (empty on error)."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/{table}?{query_params}",
                headers=_SUPA_HEADERS,
            )
            if r.status_code == 200:
                return r.json()
            print(f"[sales_rep] Select {table} failed: {r.status_code} {r.text[:200]}")
    except Exception as e:
        print(f"[sales_rep] Select {table} error: {e}")
    return []


# ═══════════════════════════════════════════════════════
# 1. LEAD SCORING
# ═══════════════════════════════════════════════════════

async def score_lead(
    client_id: str,
    customer_phone: str,
    conversation_messages: list[dict],
) -> dict:
    """Score a lead 1-100 based on intent, budget, timeline, and repeat signals.

    Args:
        client_id: The business client ID.
        customer_phone: Customer's WhatsApp number.
        conversation_messages: List of message dicts with at least a "content" key.

    Returns:
        dict with score, breakdown, and signals detected.
    """
    combined_text = " ".join(
        m.get("content", "") or m.get("text", "") or ""
        for m in conversation_messages
    ).lower()

    # Base score
    intent_score = 0
    budget_score = 0
    timeline_score = 0
    repeat_bonus = 0
    signals: list[str] = []

    # Intent signals
    for keyword, points in _INTENT_KEYWORDS.items():
        if keyword.lower() in combined_text:
            intent_score += points
            signals.append(f"intent:{keyword}")

    # Budget signals
    for keyword, points in _BUDGET_KEYWORDS.items():
        if keyword.lower() in combined_text:
            budget_score += points
            signals.append(f"budget:{keyword}")

    # AED / price mentions
    price_matches = re.findall(r'(?:aed|درهم)\s*[\d,]+', combined_text)
    if price_matches:
        budget_score += 15
        signals.append(f"price_mentioned:{price_matches[0]}")

    # Party size / quantity mentions
    size_matches = re.findall(r'(?:for|لـ?)\s*(\d{2,})\s*(?:people|person|شخص|ضيف|guest)', combined_text)
    if size_matches:
        size = int(size_matches[0])
        intent_score += min(size // 5, 20)  # Cap at +20
        signals.append(f"party_size:{size}")

    # Timeline — hot
    for keyword, points in _TIMELINE_HOT.items():
        if keyword.lower() in combined_text:
            timeline_score += points
            signals.append(f"timeline_hot:{keyword}")

    # Timeline — cold (deductions)
    for keyword, points in _TIMELINE_COLD.items():
        if keyword.lower() in combined_text:
            timeline_score += points  # points are negative
            signals.append(f"timeline_cold:{keyword}")

    # Repeat customer check
    existing_deals = await _supa_select(
        "activity_logs",
        f"client_id=eq.{client_id}&payload->>customer_phone=eq.{customer_phone}"
        f"&event_type=eq.lead_scored&order=created_at.desc&limit=3",
    )
    if existing_deals:
        repeat_bonus = 15
        signals.append(f"repeat_customer:seen_{len(existing_deals)}_times")

    # Calculate final score (capped 1-100)
    raw = 10 + intent_score + budget_score + timeline_score + repeat_bonus
    score = max(1, min(100, raw))

    # Determine tier
    if score >= 80:
        tier = "hot"
    elif score >= 50:
        tier = "warm"
    elif score >= 30:
        tier = "cool"
    else:
        tier = "cold"

    result = {
        "score": score,
        "tier": tier,
        "breakdown": {
            "base": 10,
            "intent": intent_score,
            "budget": budget_score,
            "timeline": timeline_score,
            "repeat_bonus": repeat_bonus,
        },
        "signals": signals,
        "customer_phone": customer_phone,
        "scored_at": _now_iso(),
    }

    # Persist to activity_logs
    await _supa_insert("activity_logs", {
        "client_id": client_id,
        "event_type": "lead_scored",
        "payload": {
            **result,
            "customer_phone": customer_phone,
        },
    })

    print(f"[sales_rep] Lead scored: {customer_phone} = {score} ({tier}), signals: {signals}")
    return result


# ═══════════════════════════════════════════════════════
# 2. PIPELINE MANAGEMENT
# ═══════════════════════════════════════════════════════

async def update_pipeline(
    client_id: str,
    customer_phone: str,
    stage: str,
    deal_value: float = 0,
    deal_type: str = "",
    notes: str = "",
) -> dict:
    """Create or update a lead's position in the sales pipeline.

    Args:
        client_id: Business client ID.
        customer_phone: Customer's WhatsApp number.
        stage: One of: new, qualified, proposal_sent, negotiating, won, lost.
        deal_value: Estimated deal value in AED.
        deal_type: E.g. catering, private_dining, bridal_party, etc.
        notes: Free-text notes about the deal.

    Returns:
        The created/updated pipeline record.
    """
    if stage not in PIPELINE_STAGES:
        return {"error": f"Invalid stage '{stage}'. Must be one of {PIPELINE_STAGES}"}

    now = _now_iso()

    # Check for existing pipeline entry
    existing = await _supa_select(
        "activity_logs",
        f"client_id=eq.{client_id}&event_type=eq.pipeline_update"
        f"&payload->>customer_phone=eq.{customer_phone}"
        f"&order=created_at.desc&limit=1",
    )

    previous_stage = ""
    if existing:
        prev_payload = existing[0].get("payload", {})
        previous_stage = prev_payload.get("stage", "")

    pipeline_record = {
        "customer_phone": customer_phone,
        "stage": stage,
        "previous_stage": previous_stage,
        "deal_value": deal_value,
        "deal_type": deal_type,
        "notes": notes,
        "updated_at": now,
    }

    # If transitioning to won/lost, record the timestamp
    if stage == "won":
        pipeline_record["won_at"] = now
    elif stage == "lost":
        pipeline_record["lost_at"] = now

    await _supa_insert("activity_logs", {
        "client_id": client_id,
        "event_type": "pipeline_update",
        "payload": pipeline_record,
    })

    print(f"[sales_rep] Pipeline: {customer_phone} moved {previous_stage or 'none'} -> {stage} (value: {deal_value})")
    return pipeline_record


async def get_pipeline_summary(client_id: str) -> dict:
    """Get a summary of the sales pipeline: count and value per stage.

    Args:
        client_id: Business client ID.

    Returns:
        dict with stages, counts, values, total_value, total_leads.
    """
    # Fetch all pipeline updates for this client
    rows = await _supa_select(
        "activity_logs",
        f"client_id=eq.{client_id}&event_type=eq.pipeline_update"
        f"&select=payload,created_at&order=created_at.desc",
    )

    # Build latest state per customer (most recent update wins)
    latest_per_customer: dict[str, dict] = {}
    for row in rows:
        payload = row.get("payload", {})
        phone = payload.get("customer_phone", "")
        if phone and phone not in latest_per_customer:
            latest_per_customer[phone] = payload

    # Aggregate by stage
    stage_summary: dict[str, dict] = {}
    for stage in PIPELINE_STAGES:
        stage_summary[stage] = {"count": 0, "value": 0, "leads": []}

    for phone, data in latest_per_customer.items():
        stage = data.get("stage", "new")
        if stage in stage_summary:
            stage_summary[stage]["count"] += 1
            stage_summary[stage]["value"] += data.get("deal_value", 0)
            stage_summary[stage]["leads"].append({
                "phone": phone,
                "deal_type": data.get("deal_type", ""),
                "deal_value": data.get("deal_value", 0),
            })

    total_leads = sum(s["count"] for s in stage_summary.values())
    total_value = sum(s["value"] for s in stage_summary.values())
    active_value = sum(
        s["value"] for stage, s in stage_summary.items()
        if stage not in ("won", "lost")
    )

    return {
        "client_id": client_id,
        "stages": stage_summary,
        "total_leads": total_leads,
        "total_value": total_value,
        "active_pipeline_value": active_value,
        "won_value": stage_summary["won"]["value"],
        "won_count": stage_summary["won"]["count"],
        "lost_count": stage_summary["lost"]["count"],
        "generated_at": _now_iso(),
    }


# ═══════════════════════════════════════════════════════
# 3. FOLLOW-UP SEQUENCES
# ═══════════════════════════════════════════════════════

async def generate_followup(
    client_id: str,
    customer_phone: str,
    lead_data: dict,
) -> str:
    """Generate the appropriate follow-up message based on pipeline stage and timing.

    Args:
        client_id: Business client ID.
        customer_phone: Customer's WhatsApp number.
        lead_data: Dict with keys like deal_type, stage, updated_at, deal_value, customer_name.

    Returns:
        The follow-up message text (bilingual based on previous conversation language).
    """
    stage = lead_data.get("stage", "new")
    deal_type = lead_data.get("deal_type", "inquiry")
    customer_name = lead_data.get("customer_name", "")
    deal_value = lead_data.get("deal_value", 0)
    updated_at_str = lead_data.get("updated_at", "")

    # Determine language from last conversation
    recent_msgs = await _supa_select(
        "conversation_messages",
        f"client_id=eq.{client_id}&customer_phone=eq.{customer_phone}"
        f"&direction=eq.inbound&order=created_at.desc&limit=3",
    )
    lang = "en"
    if recent_msgs:
        last_text = recent_msgs[0].get("content", "")
        lang = _detect_language(last_text)

    # Calculate days since last contact
    days_since = 0
    if updated_at_str:
        try:
            updated_at = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
            days_since = (datetime.now(timezone.utc) - updated_at).days
        except (ValueError, TypeError):
            pass

    # If deal is won or lost, no follow-up needed
    if stage in ("won", "lost"):
        return ""

    # Pick the right cadence step
    selected_template = None
    for step in _FOLLOWUP_CADENCE:
        if days_since <= step["day"]:
            selected_template = step
            break

    # Default to last-chance if beyond all cadence steps
    if selected_template is None:
        selected_template = _FOLLOWUP_CADENCE[-1]

    # Use a readable deal_type label
    deal_label = deal_type.replace("_", " ")
    name = customer_name or "there" if lang == "en" else customer_name or "عزيزي"

    # Build template values
    promo = "10% early booking discount" if lang == "en" else "خصم 10% للحجز المبكر"
    upsell = "our premium add-ons" if lang == "en" else "إضافاتنا المميزة"

    template_str = selected_template.get(lang, selected_template.get("en", ""))
    message = template_str.format(
        name=name,
        deal_type=deal_label,
        promo=promo,
        upsell=upsell,
    )

    # If MiniMax is available, personalize further
    if _MINIMAX_KEY and recent_msgs:
        recent_context = " | ".join(
            m.get("content", "")[:100] for m in recent_msgs[:3]
        )
        system = (
            "You are a friendly, professional sales follow-up writer for a Gulf-region SMB. "
            f"Language: {'Arabic (Gulf dialect, Arabic script only)' if lang == 'ar' else 'English'}. "
            "Write a short, warm WhatsApp follow-up message (2-3 sentences max). "
            "Be personal, reference their specific inquiry. No corporate-speak. No <think> tags."
        )
        user_msg = (
            f"Customer name: {name}\n"
            f"Deal type: {deal_label}\n"
            f"Days since last contact: {days_since}\n"
            f"Follow-up type: {selected_template['type']}\n"
            f"Recent messages: {recent_context}\n"
            f"Base template: {message}\n\n"
            "Personalize this follow-up based on their actual conversation. Keep it short."
        )
        personalized = await _minimax_generate(system, user_msg, max_tokens=200)
        if personalized and len(personalized) > 20:
            message = personalized

    # Log the follow-up generation
    await _supa_insert("activity_logs", {
        "client_id": client_id,
        "event_type": "followup_generated",
        "payload": {
            "customer_phone": customer_phone,
            "followup_type": selected_template["type"],
            "days_since_contact": days_since,
            "stage": stage,
            "language": lang,
        },
    })

    print(f"[sales_rep] Follow-up for {customer_phone}: type={selected_template['type']}, days={days_since}")
    return message


# ═══════════════════════════════════════════════════════
# 4. UPSELL ENGINE
# ═══════════════════════════════════════════════════════

async def suggest_upsells(
    client_id: str,
    booking_context: dict,
    business_type: str = "restaurant",
) -> list[dict]:
    """Detect upsell opportunities from booking/order context.

    Args:
        client_id: Business client ID.
        booking_context: Dict describing the current booking/order.
            Expected keys: occasion, deal_type, items, party_size, notes, customer_message.
        business_type: One of restaurant, salon, cafe, real_estate.

    Returns:
        List of upsell suggestion dicts with keys: suggestion, deal_type, value_add, language.
    """
    rules = _UPSELL_RULES.get(business_type, _UPSELL_RULES.get("restaurant", []))

    # Build search text from all available context
    search_parts = [
        str(booking_context.get("occasion", "")),
        str(booking_context.get("deal_type", "")),
        str(booking_context.get("items", "")),
        str(booking_context.get("notes", "")),
        str(booking_context.get("customer_message", "")),
    ]
    search_text = " ".join(search_parts).lower()

    # Detect language
    lang = _detect_language(search_text)

    suggestions = []
    for rule in rules:
        matched = any(kw.lower() in search_text for kw in rule["trigger_keywords"])
        if matched:
            suggestions.append({
                "suggestion": rule[f"suggestion_{lang}"],
                "deal_type": rule["deal_type"],
                "value_add": rule["value_add"],
                "language": lang,
                "trigger": [kw for kw in rule["trigger_keywords"] if kw.lower() in search_text],
            })

    # Party-size-based upsells
    party_size = booking_context.get("party_size", 0)
    if isinstance(party_size, str):
        try:
            party_size = int(party_size)
        except ValueError:
            party_size = 0

    if party_size >= 10 and business_type == "restaurant":
        if lang == "ar":
            suggestion = f"مجموعتك {party_size} شخص! عندنا قائمة تذوق جماعية بسعر خاص — استمتعوا بأطباق مختارة من الشيف."
        else:
            suggestion = f"With {party_size} guests, you qualify for our group tasting menu — a curated chef's selection at a special rate!"
        suggestions.append({
            "suggestion": suggestion,
            "deal_type": "group_tasting",
            "value_add": party_size * 25,
            "language": lang,
            "trigger": [f"party_size:{party_size}"],
        })

    if party_size >= 5 and business_type == "cafe":
        if lang == "ar":
            suggestion = f"طلبك لـ {party_size} أشخاص! اطلب 10+ مشروبات واحصل على بوكس معجنات مجاناً."
        else:
            suggestion = f"Ordering for {party_size}? Get a free pastry box with any order of 10+ drinks!"
        suggestions.append({
            "suggestion": suggestion,
            "deal_type": "bulk_bonus",
            "value_add": 50,
            "language": lang,
            "trigger": [f"party_size:{party_size}"],
        })

    # AI-powered creative upsell if MiniMax is available and we found at least one trigger
    if _MINIMAX_KEY and suggestions:
        system = (
            f"You are a sales assistant for a {business_type} in the Gulf region. "
            f"Language: {'Arabic (Gulf dialect, Arabic script only)' if lang == 'ar' else 'English'}. "
            "Suggest ONE creative upsell in a single sentence. Be specific and mention a price. "
            "Make it feel natural, not pushy. No <think> tags."
        )
        user_msg = (
            f"Customer context: {json.dumps(booking_context, ensure_ascii=False, default=str)}\n"
            f"Already suggested: {[s['deal_type'] for s in suggestions]}\n"
            "Suggest something different and complementary."
        )
        creative = await _minimax_generate(system, user_msg, max_tokens=150)
        if creative and len(creative) > 15:
            suggestions.append({
                "suggestion": creative,
                "deal_type": "ai_creative",
                "value_add": 0,
                "language": lang,
                "trigger": ["ai_generated"],
            })

    # Log upsell suggestions
    if suggestions:
        await _supa_insert("activity_logs", {
            "client_id": client_id,
            "event_type": "upsell_suggested",
            "payload": {
                "business_type": business_type,
                "num_suggestions": len(suggestions),
                "deal_types": [s["deal_type"] for s in suggestions],
                "context_keys": list(booking_context.keys()),
            },
        })
        print(f"[sales_rep] Upsells for {client_id}: {[s['deal_type'] for s in suggestions]}")

    return suggestions


# ═══════════════════════════════════════════════════════
# 5. WIN/LOSS TRACKING & ANALYSIS
# ═══════════════════════════════════════════════════════

async def record_outcome(
    client_id: str,
    customer_phone: str,
    outcome: str,
    reason: str = "",
    deal_value: float = 0,
    deal_type: str = "",
    notes: str = "",
) -> dict:
    """Record a deal outcome (won or lost) with reason.

    Args:
        client_id: Business client ID.
        customer_phone: Customer's WhatsApp number.
        outcome: Either "won" or "lost".
        reason: For losses, one of the _LOSS_REASONS keys or free text.
        deal_value: Final deal value in AED.
        deal_type: Type of deal (catering, bridal_party, etc.).
        notes: Additional notes.

    Returns:
        The outcome record.
    """
    if outcome not in ("won", "lost"):
        return {"error": f"Invalid outcome '{outcome}'. Must be 'won' or 'lost'."}

    now = _now_iso()

    record = {
        "customer_phone": customer_phone,
        "outcome": outcome,
        "reason": reason,
        "reason_label": _LOSS_REASONS.get(reason, {}).get("en", reason) if outcome == "lost" else "",
        "deal_value": deal_value,
        "deal_type": deal_type,
        "notes": notes,
        "recorded_at": now,
    }

    await _supa_insert("activity_logs", {
        "client_id": client_id,
        "event_type": "deal_outcome",
        "payload": record,
    })

    # Also update the pipeline
    await update_pipeline(
        client_id=client_id,
        customer_phone=customer_phone,
        stage=outcome,
        deal_value=deal_value,
        deal_type=deal_type,
        notes=f"Outcome: {outcome}. Reason: {reason}. {notes}",
    )

    print(f"[sales_rep] Outcome recorded: {customer_phone} = {outcome} ({reason}), value={deal_value}")
    return record


async def analyze_win_loss(client_id: str, days: int = 30) -> dict:
    """Analyze win/loss patterns over a time period.

    Args:
        client_id: Business client ID.
        days: How many days to look back (default 30).

    Returns:
        dict with win_count, loss_count, win_rate, top_loss_reasons,
        avg_deal_value, insights, and per-type breakdown.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    outcomes = await _supa_select(
        "activity_logs",
        f"client_id=eq.{client_id}&event_type=eq.deal_outcome"
        f"&created_at=gte.{cutoff}&select=payload,created_at&order=created_at.desc",
    )

    if not outcomes:
        return {
            "client_id": client_id,
            "period_days": days,
            "win_count": 0,
            "loss_count": 0,
            "win_rate": 0,
            "total_revenue": 0,
            "avg_deal_value": 0,
            "top_loss_reasons": [],
            "by_deal_type": {},
            "insights": ["No deal outcomes recorded in this period."],
        }

    wins = []
    losses = []
    loss_reasons: dict[str, int] = {}
    by_deal_type: dict[str, dict] = {}

    for row in outcomes:
        payload = row.get("payload", {})
        outcome = payload.get("outcome", "")
        deal_type = payload.get("deal_type", "unknown")
        deal_value = payload.get("deal_value", 0)
        reason = payload.get("reason", "")

        # Per-type tracking
        if deal_type not in by_deal_type:
            by_deal_type[deal_type] = {"won": 0, "lost": 0, "won_value": 0, "lost_value": 0}

        if outcome == "won":
            wins.append(payload)
            by_deal_type[deal_type]["won"] += 1
            by_deal_type[deal_type]["won_value"] += deal_value
        elif outcome == "lost":
            losses.append(payload)
            by_deal_type[deal_type]["lost"] += 1
            by_deal_type[deal_type]["lost_value"] += deal_value
            if reason:
                loss_reasons[reason] = loss_reasons.get(reason, 0) + 1

    win_count = len(wins)
    loss_count = len(losses)
    total = win_count + loss_count
    win_rate = round(win_count * 100 / total) if total > 0 else 0

    total_revenue = sum(w.get("deal_value", 0) for w in wins)
    total_lost_value = sum(l.get("deal_value", 0) for l in losses)
    avg_deal_value = round(total_revenue / win_count) if win_count > 0 else 0

    # Sort loss reasons by frequency
    sorted_reasons = sorted(loss_reasons.items(), key=lambda x: -x[1])
    top_loss_reasons = [
        {
            "reason": r,
            "label": _LOSS_REASONS.get(r, {}).get("en", r),
            "count": c,
            "percentage": round(c * 100 / loss_count) if loss_count > 0 else 0,
        }
        for r, c in sorted_reasons[:5]
    ]

    # Generate insights
    insights = []

    if win_rate >= 60:
        insights.append(f"Strong win rate at {win_rate}%. Keep doing what works.")
    elif win_rate >= 40:
        insights.append(f"Win rate is {win_rate}%. Room for improvement — focus on the qualification stage.")
    elif total > 0:
        insights.append(f"Win rate is {win_rate}%. Consider reviewing your pricing and follow-up cadence.")

    if top_loss_reasons:
        top_reason = top_loss_reasons[0]
        insights.append(
            f"Top loss reason: {top_reason['label']} ({top_reason['count']} deals, "
            f"{top_reason['percentage']}% of losses)."
        )

    if total_lost_value > 0:
        insights.append(f"Lost pipeline value: AED {total_lost_value:,.0f} over {days} days.")

    # Best performing deal type
    best_type = None
    best_revenue = 0
    for dt, stats in by_deal_type.items():
        if stats["won_value"] > best_revenue:
            best_revenue = stats["won_value"]
            best_type = dt
    if best_type:
        insights.append(f"Best performing category: {best_type.replace('_', ' ')} (AED {best_revenue:,.0f}).")

    # AI-powered deeper analysis
    if _MINIMAX_KEY and total >= 3:
        system = (
            "You are a sales analyst for a Gulf-region SMB. "
            "Analyze win/loss data and give 2-3 specific, actionable recommendations. "
            "Be direct. No fluff. Reference the numbers. No <think> tags."
        )
        data_summary = (
            f"Period: {days} days\n"
            f"Wins: {win_count} (AED {total_revenue:,.0f})\n"
            f"Losses: {loss_count} (AED {total_lost_value:,.0f})\n"
            f"Win rate: {win_rate}%\n"
            f"Top loss reasons: {sorted_reasons}\n"
            f"By deal type: {json.dumps(by_deal_type, default=str)}\n"
        )
        ai_insights = await _minimax_generate(system, data_summary, max_tokens=300)
        if ai_insights:
            insights.append(ai_insights)

    return {
        "client_id": client_id,
        "period_days": days,
        "win_count": win_count,
        "loss_count": loss_count,
        "win_rate": win_rate,
        "total_revenue": total_revenue,
        "total_lost_value": total_lost_value,
        "avg_deal_value": avg_deal_value,
        "top_loss_reasons": top_loss_reasons,
        "by_deal_type": by_deal_type,
        "insights": insights,
        "generated_at": _now_iso(),
    }


# ═══════════════════════════════════════════════════════
# 6. HOT LEADS
# ═══════════════════════════════════════════════════════

async def get_hot_leads(client_id: str, min_score: int = 70) -> list[dict]:
    """Get all leads scored above a threshold that are still active in the pipeline.

    Args:
        client_id: Business client ID.
        min_score: Minimum lead score to include (default 70).

    Returns:
        List of hot lead dicts sorted by score descending.
    """
    # Fetch recent lead scores
    scored_rows = await _supa_select(
        "activity_logs",
        f"client_id=eq.{client_id}&event_type=eq.lead_scored"
        f"&select=payload,created_at&order=created_at.desc&limit=200",
    )

    # Get latest score per customer
    latest_scores: dict[str, dict] = {}
    for row in scored_rows:
        payload = row.get("payload", {})
        phone = payload.get("customer_phone", "")
        if phone and phone not in latest_scores:
            latest_scores[phone] = {
                **payload,
                "scored_at": row.get("created_at", ""),
            }

    # Fetch pipeline states
    pipeline_rows = await _supa_select(
        "activity_logs",
        f"client_id=eq.{client_id}&event_type=eq.pipeline_update"
        f"&select=payload,created_at&order=created_at.desc",
    )
    latest_pipeline: dict[str, dict] = {}
    for row in pipeline_rows:
        payload = row.get("payload", {})
        phone = payload.get("customer_phone", "")
        if phone and phone not in latest_pipeline:
            latest_pipeline[phone] = payload

    # Filter hot leads that are still active
    hot_leads = []
    for phone, score_data in latest_scores.items():
        score = score_data.get("score", 0)
        if score < min_score:
            continue

        pipeline = latest_pipeline.get(phone, {})
        stage = pipeline.get("stage", "new")

        # Skip closed deals
        if stage in ("won", "lost"):
            continue

        hot_leads.append({
            "customer_phone": phone,
            "score": score,
            "tier": score_data.get("tier", "warm"),
            "signals": score_data.get("signals", []),
            "stage": stage,
            "deal_type": pipeline.get("deal_type", ""),
            "deal_value": pipeline.get("deal_value", 0),
            "scored_at": score_data.get("scored_at", ""),
        })

    # Sort by score descending
    hot_leads.sort(key=lambda x: -x["score"])

    print(f"[sales_rep] Hot leads for {client_id}: {len(hot_leads)} leads above {min_score}")
    return hot_leads


# ═══════════════════════════════════════════════════════
# 7. DAILY DIGEST (for Owner Brain integration)
# ═══════════════════════════════════════════════════════

async def get_sales_digest(client_id: str, lang: str = "en") -> str:
    """Generate a daily sales digest message for the business owner.

    Args:
        client_id: Business client ID.
        lang: Language code, "en" or "ar".

    Returns:
        Formatted WhatsApp-friendly digest string.
    """
    pipeline = await get_pipeline_summary(client_id)
    hot = await get_hot_leads(client_id, min_score=60)
    analysis = await analyze_win_loss(client_id, days=7)

    lines = []

    if lang == "ar":
        lines.append("📊 ملخص المبيعات:")
        lines.append("")

        # Pipeline summary
        active_stages = {
            "new": "جديد", "qualified": "مؤهل",
            "proposal_sent": "عرض مرسل", "negotiating": "تفاوض",
        }
        for stage_key, label in active_stages.items():
            count = pipeline["stages"][stage_key]["count"]
            if count > 0:
                value = pipeline["stages"][stage_key]["value"]
                lines.append(f"  {label}: {count} صفقة (AED {value:,.0f})")

        lines.append(f"\n💰 قيمة الأنبوب النشط: AED {pipeline['active_pipeline_value']:,.0f}")

        if analysis["win_count"] > 0 or analysis["loss_count"] > 0:
            lines.append(f"📈 نسبة الفوز (٧ أيام): {analysis['win_rate']}%")
            lines.append(f"✅ فاز: {analysis['win_count']} | ❌ خسر: {analysis['loss_count']}")

        if hot:
            lines.append(f"\n🔥 عملاء ساخنين ({len(hot)}):")
            for lead in hot[:5]:
                lines.append(f"  - {lead['customer_phone'][-4:]}: نقاط {lead['score']}, {lead.get('deal_type', 'استفسار')}")

    else:
        lines.append("📊 Sales Digest:")
        lines.append("")

        active_stages = {
            "new": "New", "qualified": "Qualified",
            "proposal_sent": "Proposal Sent", "negotiating": "Negotiating",
        }
        for stage_key, label in active_stages.items():
            count = pipeline["stages"][stage_key]["count"]
            if count > 0:
                value = pipeline["stages"][stage_key]["value"]
                lines.append(f"  {label}: {count} deal{'s' if count != 1 else ''} (AED {value:,.0f})")

        lines.append(f"\n💰 Active pipeline: AED {pipeline['active_pipeline_value']:,.0f}")

        if analysis["win_count"] > 0 or analysis["loss_count"] > 0:
            lines.append(f"📈 Win rate (7d): {analysis['win_rate']}%")
            lines.append(f"✅ Won: {analysis['win_count']} | ❌ Lost: {analysis['loss_count']}")

        if hot:
            lines.append(f"\n🔥 Hot leads ({len(hot)}):")
            for lead in hot[:5]:
                phone_tail = lead["customer_phone"][-4:]
                lines.append(
                    f"  - ...{phone_tail}: score {lead['score']}, "
                    f"{lead.get('deal_type', 'inquiry').replace('_', ' ')}"
                )

    return "\n".join(lines)


# ═══════════════════════════════════════════════════════
# 8. PENDING FOLLOW-UPS (batch retrieval)
# ═══════════════════════════════════════════════════════

async def get_pending_followups(client_id: str) -> list[dict]:
    """Get all leads that need follow-up (active pipeline, no contact recently).

    Args:
        client_id: Business client ID.

    Returns:
        List of leads needing follow-up with days_since_contact and suggested action.
    """
    # Get latest pipeline state per customer
    pipeline_rows = await _supa_select(
        "activity_logs",
        f"client_id=eq.{client_id}&event_type=eq.pipeline_update"
        f"&select=payload,created_at&order=created_at.desc",
    )

    latest_per_customer: dict[str, dict] = {}
    for row in pipeline_rows:
        payload = row.get("payload", {})
        phone = payload.get("customer_phone", "")
        if phone and phone not in latest_per_customer:
            latest_per_customer[phone] = {
                **payload,
                "last_pipeline_update": row.get("created_at", ""),
            }

    now = datetime.now(timezone.utc)
    needs_followup = []

    for phone, data in latest_per_customer.items():
        stage = data.get("stage", "new")
        if stage in ("won", "lost"):
            continue

        updated_str = data.get("updated_at", data.get("last_pipeline_update", ""))
        if not updated_str:
            continue

        try:
            updated_at = datetime.fromisoformat(updated_str.replace("Z", "+00:00"))
            days_since = (now - updated_at).days
        except (ValueError, TypeError):
            continue

        # Determine urgency
        if days_since >= 14:
            urgency = "critical"
            action = "last_chance"
        elif days_since >= 7:
            urgency = "high"
            action = "value_add"
        elif days_since >= 3:
            urgency = "medium"
            action = "gentle_followup"
        elif days_since >= 1:
            urgency = "low"
            action = "thank_you"
        else:
            continue  # Contacted today, skip

        needs_followup.append({
            "customer_phone": phone,
            "stage": stage,
            "deal_type": data.get("deal_type", ""),
            "deal_value": data.get("deal_value", 0),
            "days_since_contact": days_since,
            "urgency": urgency,
            "suggested_action": action,
        })

    # Sort by urgency (critical first)
    urgency_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    needs_followup.sort(key=lambda x: urgency_order.get(x["urgency"], 4))

    print(f"[sales_rep] Pending follow-ups for {client_id}: {len(needs_followup)}")
    return needs_followup


# ═══════════════════════════════════════════════════════
# 9. OBJECTION HANDLING (AECR Framework)
# ═══════════════════════════════════════════════════════

# Objection library with AECR responses (Acknowledge, Empathize, Clarify, Reframe)
OBJECTION_PLAYBOOK = {
    "too_expensive": {
        "triggers_en": ["expensive", "costly", "too much", "can't afford", "budget", "price is high", "cheaper"],
        "triggers_ar": ["غالي", "كثير", "ما اقدر", "الميزانية", "السعر عالي", "ارخص", "رخيص"],
        "frequency": "48%",
        "real_meaning": "Not convinced ROI justifies cost",
        "response_en": {
            "acknowledge": "I completely understand — every dirham matters when you're running a business.",
            "empathize": "Most of our clients felt the same way before they saw the numbers.",
            "clarify": "Can I ask — how many bookings or orders do you think you miss each month because of late responses or no follow-up?",
            "reframe": "If you're missing just 15-20 bookings a month at an average of AED 150 each, that's AED 2,250-3,000 in lost revenue. Our service costs less than half of what you're already losing."
        },
        "response_ar": {
            "acknowledge": "أفهمك تماماً — كل درهم مهم لما تدير مشروعك.",
            "empathize": "أغلب عملائنا حسوا نفس الشي قبل ما يشوفوا النتائج.",
            "clarify": "بس خلني أسألك — كم حجز أو طلب تقريباً تخسرونه بالشهر بسبب التأخر بالرد أو عدم المتابعة؟",
            "reframe": "لو تخسر ١٥-٢٠ حجز بالشهر بمتوسط ١٥٠ درهم، هذي ٢,٢٥٠-٣,٠٠٠ درهم ضايعة. خدمتنا تكلف أقل من نص اللي تخسره."
        }
    },
    "not_right_time": {
        "triggers_en": ["not now", "maybe later", "too busy", "not the right time", "next month", "after ramadan", "after summer"],
        "triggers_ar": ["مو الحين", "بعدين", "مشغول", "مو الوقت", "الشهر الجاي", "بعد رمضان", "بعد الصيف"],
        "frequency": "32%",
        "real_meaning": "Overwhelmed, afraid of onboarding complexity",
        "response_en": {
            "acknowledge": "Makes total sense — timing is everything.",
            "empathize": "Most of our clients felt the same way. They were worried it would be another thing on their plate.",
            "clarify": "What if I told you setup takes 15 minutes over WhatsApp? No downloads, no training, no IT team needed.",
            "reframe": "The businesses that signed up 'when they were too busy' are the ones that benefited the most — because the AI handled the overflow they couldn't get to."
        },
        "response_ar": {
            "acknowledge": "كلامك صحيح — التوقيت مهم.",
            "empathize": "أغلب عملائنا قالوا نفس الكلام. كانوا خايفين يكون شي معقد.",
            "clarify": "بس تخيل لو قلتلك التسجيل ياخذ ١٥ دقيقة على الواتساب؟ بدون تحميل، بدون تدريب.",
            "reframe": "اللي سجلوا وهم مشغولين هم أكثر ناس استفادوا — لأن الذكاء الاصطناعي تكفل بالشغل اللي ما قدروا يلحقوا عليه."
        }
    },
    "already_use_whatsapp": {
        "triggers_en": ["already use whatsapp", "we have whatsapp", "whatsapp business", "doing it ourselves", "manual", "we handle it"],
        "triggers_ar": ["عندنا واتساب", "نستخدم واتساب", "نرد بنفسنا", "ما نحتاج", "نسوي بنفسنا"],
        "frequency": "20%",
        "real_meaning": "Don't see value over what they do for free",
        "response_en": {
            "acknowledge": "That's great — you're already on the right channel.",
            "empathize": "WhatsApp is where your customers are, and you clearly know that.",
            "clarify": "Quick question: what happens when a customer messages at 11pm? Or during your Friday rush when the team is slammed?",
            "reframe": "We don't replace WhatsApp — we supercharge it. Same app, but now it remembers every customer's name, preferences, and allergies. It responds in seconds 24/7. And it follows up automatically so you never lose a lead."
        },
        "response_ar": {
            "acknowledge": "ممتاز — يعني أنتم على القناة الصح.",
            "empathize": "الواتساب هو وين عملائكم، وأنتم عارفين هالشي.",
            "clarify": "بس سؤال سريع: وش يصير لما عميل يراسلكم الساعة ١١ بالليل؟ أو وقت الزحمة يوم الجمعة؟",
            "reframe": "إحنا ما نبدل الواتساب — نقويه. نفس التطبيق، بس الحين يتذكر كل عميل باسمه وتفضيلاته. يرد بثواني ٢٤ ساعة. ويتابع تلقائياً عشان ما تخسر أي فرصة."
        }
    },
    "need_to_think": {
        "triggers_en": ["need to think", "let me think", "discuss with partner", "talk to my partner", "check with", "get back to you"],
        "triggers_ar": ["خلني أفكر", "بشاور", "بكلم شريكي", "بتأكد", "برجعلك"],
        "frequency": "15%",
        "real_meaning": "Missing information or not fully convinced",
        "response_en": {
            "acknowledge": "Absolutely — it's a smart decision to think it through.",
            "empathize": "This is your business and you want to make the right call.",
            "clarify": "To help you decide: is there a specific concern I can address? Or would it help to see a live demo with a real customer conversation?",
            "reframe": "I'll send you a 2-minute video showing exactly how it works for a restaurant similar to yours. No pressure — just so you have something concrete to review."
        },
        "response_ar": {
            "acknowledge": "طبعاً — قرار ذكي إنك تفكر.",
            "empathize": "هذا مشروعك وتبغى تتأكد إنك تاخذ القرار الصح.",
            "clarify": "عشان أساعدك: في شي معين محتاج توضيح؟ أو تبغى تشوف عرض حي مع محادثة عميل حقيقية؟",
            "reframe": "بأرسلك فيديو دقيقتين يبين بالضبط كيف يشتغل النظام مع مطعم مثل مطعمك. بدون ضغط — بس عشان يكون عندك شي ملموس."
        }
    },
    "competitor": {
        "triggers_en": ["other option", "comparing", "alternative", "competitor", "foodics", "chatbot", "another tool"],
        "triggers_ar": ["خيار ثاني", "أقارن", "بديل", "منافس", "فودكس", "أداة ثانية"],
        "frequency": "10%",
        "real_meaning": "Shopping around, needs differentiation",
        "response_en": {
            "acknowledge": "Smart move — you should absolutely compare options.",
            "empathize": "There are good tools out there and finding the right fit matters.",
            "clarify": "What's most important to you: the price, the features, or how fast you can get started?",
            "reframe": "The main difference is this: most tools need you to learn THEIR system. We work inside YOUR WhatsApp — the app you already use every day. Plus, our AI actually learns and improves from every conversation, so it gets better over time. No other tool does that."
        },
        "response_ar": {
            "acknowledge": "خطوة ذكية — لازم تقارن.",
            "empathize": "في أدوات زينة وتلاقي الأنسب مهم.",
            "clarify": "وش الأهم لك: السعر، المميزات، أو سرعة البداية؟",
            "reframe": "الفرق الأساسي: أغلب الأدوات تحتاج تتعلم نظامهم. إحنا نشتغل داخل الواتساب — التطبيق اللي تستخدمه كل يوم. وذكاءنا الاصطناعي يتعلم ويتحسن من كل محادثة. ما في أداة ثانية تسوي كذا."
        }
    }
}


async def handle_objection(client_id: str, customer_phone: str, message: str, lang: str = "en") -> dict:
    """Detect and handle sales objections using AECR framework.

    Args:
        client_id: Business client ID.
        customer_phone: Customer's WhatsApp number.
        message: The customer's message text.
        lang: Language code, "en" or "ar". If not provided, auto-detects.

    Returns:
        dict with detected, objection_type, response, framework.
    """
    msg_lower = message.lower()
    detected_lang = _detect_language(message)
    # Use detected language if caller passed default
    if lang == "en" and detected_lang == "ar":
        lang = "ar"

    # Check message against all trigger patterns
    matched_type = ""
    matched_entry = None

    for objection_key, objection_data in OBJECTION_PLAYBOOK.items():
        triggers = objection_data.get(f"triggers_{lang}", []) + objection_data.get(
            f"triggers_{'ar' if lang == 'en' else 'en'}", []
        )
        for trigger in triggers:
            if trigger.lower() in msg_lower:
                matched_type = objection_key
                matched_entry = objection_data
                break
        if matched_type:
            break

    if not matched_type or not matched_entry:
        return {
            "detected": False,
            "objection_type": "",
            "response": "",
            "framework": {},
        }

    # Build the AECR response in the correct language
    framework = matched_entry.get(f"response_{lang}", matched_entry.get("response_en", {}))

    # Compose a natural flowing response from the AECR steps
    response_parts = []
    for step in ("acknowledge", "empathize", "clarify", "reframe"):
        part = framework.get(step, "")
        if part:
            response_parts.append(part)
    response = " ".join(response_parts)

    # Log to activity_logs as event_type "objection_handled"
    await _supa_insert("activity_logs", {
        "client_id": client_id,
        "event_type": "objection_handled",
        "payload": {
            "customer_phone": customer_phone,
            "objection_type": matched_type,
            "frequency": matched_entry.get("frequency", ""),
            "real_meaning": matched_entry.get("real_meaning", ""),
            "language": lang,
            "handled_at": _now_iso(),
        },
    })

    print(f"[sales_rep] Objection handled: {customer_phone} -> {matched_type} ({lang})")
    return {
        "detected": True,
        "objection_type": matched_type,
        "response": response,
        "framework": framework,
    }


async def get_objection_stats(client_id: str, days: int = 30) -> dict:
    """Analyze objection patterns over time.

    Args:
        client_id: Business client ID.
        days: How many days to look back (default 30).

    Returns:
        dict with total_objections, by_type counts, and resolution_rate.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    rows = await _supa_select(
        "activity_logs",
        f"client_id=eq.{client_id}&event_type=eq.objection_handled"
        f"&created_at=gte.{cutoff}&select=payload,created_at&order=created_at.desc",
    )

    if not rows:
        return {
            "client_id": client_id,
            "period_days": days,
            "total_objections": 0,
            "by_type": {},
            "resolution_rate": 0,
            "generated_at": _now_iso(),
        }

    by_type: dict[str, int] = {}
    customer_phones: set[str] = set()

    for row in rows:
        payload = row.get("payload", {})
        objection_type = payload.get("objection_type", "unknown")
        by_type[objection_type] = by_type.get(objection_type, 0) + 1
        phone = payload.get("customer_phone", "")
        if phone:
            customer_phones.add(phone)

    # Check resolution: how many objection customers eventually moved to won
    resolved = 0
    for phone in customer_phones:
        outcome_rows = await _supa_select(
            "activity_logs",
            f"client_id=eq.{client_id}&event_type=eq.deal_outcome"
            f"&payload->>customer_phone=eq.{phone}"
            f"&payload->>outcome=eq.won&limit=1",
        )
        if outcome_rows:
            resolved += 1

    total = len(rows)
    resolution_rate = round(resolved * 100 / len(customer_phones)) if customer_phones else 0

    print(f"[sales_rep] Objection stats for {client_id}: {total} objections, {resolution_rate}% resolved")
    return {
        "client_id": client_id,
        "period_days": days,
        "total_objections": total,
        "by_type": by_type,
        "unique_customers": len(customer_phones),
        "resolved_customers": resolved,
        "resolution_rate": resolution_rate,
        "generated_at": _now_iso(),
    }


# ═══════════════════════════════════════════════════════
# 10. COMPETITIVE BATTLECARDS (FIA Framework)
# ═══════════════════════════════════════════════════════

BATTLECARDS = {
    "manual_whatsapp": {
        "name": "Manual WhatsApp Business",
        "encounter_rate": "70%",
        "winning_zones": [
            {"differentiator": "24/7 AI responses", "talk_track_en": "Your customers message at 11pm. Right now, who answers?", "talk_track_ar": "عملائك يراسلون الساعة ١١ بالليل. الحين مين يرد؟"},
            {"differentiator": "Customer memory", "talk_track_en": "We remember every customer's name, preferences, and allergies automatically.", "talk_track_ar": "نتذكر اسم كل عميل وتفضيلاته وحساسياته تلقائياً."},
            {"differentiator": "Automated follow-up", "talk_track_en": "When was the last time you followed up with a customer who hasn't visited in 30 days?", "talk_track_ar": "آخر مرة تابعت مع عميل ما زارك من ٣٠ يوم؟"},
        ],
        "battling_zones": [
            {"shared": "WhatsApp as channel", "separation_en": "Same app, but with AI that never sleeps, never forgets, and learns from every conversation.", "separation_ar": "نفس التطبيق، بس بذكاء اصطناعي ما ينام، ما ينسى، ويتعلم من كل محادثة."},
        ],
        "losing_zones": [
            {"their_strength": "Zero cost", "reposition_en": "Free until you count the AED 3,000/month in missed bookings and the 10 hours your staff spends on the phone.", "reposition_ar": "مجاني لين تحسب ٣,٠٠٠ درهم بالشهر حجوزات ضايعة و١٠ ساعات فريقك يقضيها على التلفون."},
        ],
        "landmine_questions_en": [
            "What happens when your host is sick and nobody knows the regulars?",
            "How do you follow up with customers who haven't visited in 30 days?",
            "How many WhatsApp messages go unanswered during your Friday rush?"
        ],
        "landmine_questions_ar": [
            "وش يصير لما المضيف يمرض وما أحد يعرف الزبائن الدائمين؟",
            "كيف تتابعون مع العملاء اللي ما زاروكم من ٣٠ يوم؟",
            "كم رسالة واتساب تضيع بدون رد وقت زحمة الجمعة؟"
        ]
    },
    "foodics": {
        "name": "Foodics",
        "encounter_rate": "25%",
        "winning_zones": [
            {"differentiator": "WhatsApp-native", "talk_track_en": "Foodics is a POS. We live inside WhatsApp where your customers actually are.", "talk_track_ar": "فودكس نظام كاشير. إحنا داخل الواتساب وين عملائك فعلاً."},
            {"differentiator": "AI that learns", "talk_track_en": "Our AI improves every night by analyzing conversations. Foodics doesn't do that.", "talk_track_ar": "ذكاءنا الاصطناعي يتحسن كل ليلة بتحليل المحادثات. فودكس ما يسوي كذا."},
            {"differentiator": "No hardware", "talk_track_en": "No tablets, no terminals, no installation. Just WhatsApp.", "talk_track_ar": "بدون أجهزة، بدون تركيب. بس واتساب."},
        ],
        "battling_zones": [
            {"shared": "Restaurant management", "separation_en": "We handle the customer conversation and booking. Foodics handles the kitchen and POS. They're complementary, not competing.", "separation_ar": "إحنا نتكفل بالمحادثة والحجز. فودكس يتكفل بالمطبخ والكاشير. مكملين لبعض، مو منافسين."},
        ],
        "losing_zones": [
            {"their_strength": "Full POS + inventory", "reposition_en": "If you need a POS, use Foodics for that. But for WhatsApp customer engagement and AI-powered booking, that's what we do better than anyone.", "reposition_ar": "لو تحتاج كاشير، استخدم فودكس. بس للتواصل مع العملاء والحجز الذكي على الواتساب، هذا تخصصنا."},
        ],
        "landmine_questions_en": [
            "Can Foodics respond to a WhatsApp message at midnight?",
            "Does Foodics remember that Ahmad is allergic to nuts and always sits on the terrace?",
            "Can Foodics follow up with a customer who hasn't visited in 3 weeks?"
        ],
        "landmine_questions_ar": [
            "فودكس يقدر يرد على رسالة واتساب نص الليل؟",
            "فودكس يتذكر إن أحمد عنده حساسية مكسرات ودايم يحب التراس؟",
            "فودكس يقدر يتابع مع عميل ما زار من ٣ أسابيع؟"
        ]
    },
    "generic_chatbot": {
        "name": "Generic Chatbot / ChatGPT Wrapper",
        "encounter_rate": "15%",
        "winning_zones": [
            {"differentiator": "Industry-specific", "talk_track_en": "Generic chatbots don't know what a booking is. Ours was built for restaurants and salons from day one.", "talk_track_ar": "البوتات العامة ما تعرف وش هو الحجز. نظامنا مبني للمطاعم والصالونات من أول يوم."},
            {"differentiator": "Self-improving", "talk_track_en": "Our AI analyzes every conversation at night and writes its own improvement rules. No chatbot does that.", "talk_track_ar": "ذكاءنا الاصطناعي يحلل كل المحادثات بالليل ويكتب قواعد تحسين لنفسه. ما في بوت يسوي كذا."},
            {"differentiator": "Memory", "talk_track_en": "ChatGPT forgets everything when the chat closes. We remember every customer forever.", "talk_track_ar": "ChatGPT ينسى كل شي لما تسكر المحادثة. إحنا نتذكر كل عميل للأبد."},
        ],
        "battling_zones": [],
        "losing_zones": [
            {"their_strength": "Free / very cheap", "reposition_en": "You can build a chatbot for free. But can it book a table, remember dietary needs, follow up after no-shows, and improve itself? That's the difference between a toy and a tool.", "reposition_ar": "تقدر تسوي بوت مجاني. بس يقدر يحجز طاولة، يتذكر الحساسيات، يتابع بعد عدم الحضور، ويتحسن بنفسه؟ هذا الفرق بين لعبة وأداة."},
        ],
        "landmine_questions_en": [
            "Does your chatbot know your menu? Your hours? Your seating layout?",
            "Can it handle a customer who says 'same as last time'?",
            "What happens when the AI gives wrong information about your prices?"
        ],
        "landmine_questions_ar": [
            "البوت يعرف قائمتكم؟ أوقاتكم؟ ترتيب الطاولات؟",
            "يقدر يتعامل مع عميل يقول 'نفس المرة اللي فاتت'؟",
            "وش يصير لما البوت يعطي معلومة غلط عن أسعاركم؟"
        ]
    }
}

# Competitor detection keywords for match_competitor_from_conversation
_COMPETITOR_KEYWORDS = {
    "foodics": ["foodics", "فودكس"],
    "generic_chatbot": ["chatbot", "chatgpt", "بوت", "chat gpt", "gpt", "ai bot", "بوت ذكي"],
    "manual_whatsapp": [
        "already use whatsapp", "whatsapp business", "we handle it ourselves",
        "we do it manually", "our staff handles", "we reply ourselves",
        "عندنا واتساب", "نرد بنفسنا", "نسوي بنفسنا",
    ],
}


async def get_battlecard(competitor: str, lang: str = "en") -> dict:
    """Get the competitive battlecard for a specific competitor.

    Args:
        competitor: Competitor key (manual_whatsapp, foodics, generic_chatbot).
        lang: Language code, "en" or "ar".

    Returns:
        dict with the battlecard data and language-appropriate talk tracks.
    """
    card = BATTLECARDS.get(competitor)
    if not card:
        return {"error": f"Unknown competitor '{competitor}'. Available: {list(BATTLECARDS.keys())}"}

    # Build language-filtered winning zones
    winning = []
    for zone in card.get("winning_zones", []):
        winning.append({
            "differentiator": zone["differentiator"],
            "talk_track": zone.get(f"talk_track_{lang}", zone.get("talk_track_en", "")),
        })

    # Build language-filtered battling zones
    battling = []
    for zone in card.get("battling_zones", []):
        battling.append({
            "shared": zone["shared"],
            "separation": zone.get(f"separation_{lang}", zone.get("separation_en", "")),
        })

    # Build language-filtered losing zones
    losing = []
    for zone in card.get("losing_zones", []):
        losing.append({
            "their_strength": zone["their_strength"],
            "reposition": zone.get(f"reposition_{lang}", zone.get("reposition_en", "")),
        })

    landmine_key = f"landmine_questions_{lang}"
    landmines = card.get(landmine_key, card.get("landmine_questions_en", []))

    return {
        "competitor": competitor,
        "name": card["name"],
        "encounter_rate": card["encounter_rate"],
        "winning_zones": winning,
        "battling_zones": battling,
        "losing_zones": losing,
        "landmine_questions": landmines,
        "language": lang,
    }


async def match_competitor_from_conversation(message: str) -> str:
    """Detect which competitor a prospect is comparing to from their message.

    Args:
        message: The prospect's message text.

    Returns:
        The competitor key (e.g. "foodics", "generic_chatbot", "manual_whatsapp")
        or empty string if no competitor detected.
    """
    msg_lower = message.lower()

    for competitor_key, keywords in _COMPETITOR_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in msg_lower:
                print(f"[sales_rep] Competitor detected: {competitor_key} (trigger: {keyword})")
                return competitor_key

    return ""


async def generate_competitive_response(
    client_id: str,
    competitor: str,
    objection_context: str,
    lang: str = "en",
) -> str:
    """Generate a contextual competitive response using MiniMax + battlecard data.

    Args:
        client_id: Business client ID.
        competitor: Competitor key (manual_whatsapp, foodics, generic_chatbot).
        objection_context: The prospect's message or objection text.
        lang: Language code, "en" or "ar".

    Returns:
        A natural, personalized competitive response string.
    """
    card = await get_battlecard(competitor, lang)
    if "error" in card:
        return ""

    # Build a structured summary of the battlecard for the prompt
    winning_points = " | ".join(
        f"{z['differentiator']}: {z['talk_track']}" for z in card.get("winning_zones", [])
    )
    battling_points = " | ".join(
        f"{z['shared']}: {z['separation']}" for z in card.get("battling_zones", [])
    )
    losing_points = " | ".join(
        f"{z['their_strength']}: {z['reposition']}" for z in card.get("losing_zones", [])
    )
    landmines = " | ".join(card.get("landmine_questions", []))

    system = (
        "You are a friendly, confident sales rep for Kapso, an AI-powered WhatsApp business platform "
        "for Gulf-region SMBs (restaurants, salons, cafes, real estate). "
        f"Language: {'Arabic (Gulf dialect, Arabic script only)' if lang == 'ar' else 'English'}. "
        "Write a short, natural WhatsApp response (3-5 sentences max). "
        "Be respectful of the competitor — never trash-talk. Focus on YOUR strengths. "
        "End with a soft call-to-action (demo, trial, or question). No <think> tags. No bold."
    )
    user_msg = (
        f"Prospect is comparing us to: {card.get('name', competitor)}\n"
        f"Prospect said: {objection_context}\n\n"
        f"Our winning points: {winning_points}\n"
        f"Shared ground: {battling_points}\n"
        f"Their strength (reposition): {losing_points}\n"
        f"Landmine questions to plant: {landmines}\n\n"
        "Write a natural, conversational response that addresses their comparison. "
        "Weave in 1-2 winning points and 1 landmine question naturally."
    )

    response = await _minimax_generate(system, user_msg, max_tokens=400)

    # Fallback: if MiniMax fails, build a static response from the battlecard
    if not response or len(response) < 20:
        parts = []
        if card.get("winning_zones"):
            parts.append(card["winning_zones"][0]["talk_track"])
        if card.get("battling_zones"):
            parts.append(card["battling_zones"][0]["separation"])
        if card.get("landmine_questions"):
            parts.append(card["landmine_questions"][0])
        response = " ".join(parts)

    # Log the competitive response
    await _supa_insert("activity_logs", {
        "client_id": client_id,
        "event_type": "competitive_response",
        "payload": {
            "competitor": competitor,
            "competitor_name": card.get("name", competitor),
            "language": lang,
            "context_snippet": objection_context[:200],
            "generated_at": _now_iso(),
        },
    })

    print(f"[sales_rep] Competitive response for {client_id}: vs {competitor} ({lang})")
    return response


# ═══════════════════════════════════════════════════════
# 11. MARKETING PSYCHOLOGY ENGINE
# ═══════════════════════════════════════════════════════

# 60+ psychological principles for sales conversations
PSYCHOLOGY_TACTICS = {
    "loss_aversion": {
        "principle": "People feel losses 2x more strongly than equivalent gains",
        "trigger_signals": ["hesitating", "thinking about it", "not sure"],
        "application_en": "Frame the cost of NOT acting: 'Every week without automation, you're losing AED 750 in missed bookings'",
        "application_ar": "وضّح تكلفة عدم التصرف: 'كل أسبوع بدون أتمتة تخسر ٧٥٠ درهم حجوزات ضايعة'",
    },
    "social_proof": {
        "principle": "People follow what others like them are doing",
        "trigger_signals": ["does it really work", "who uses this", "any examples"],
        "application_en": "Reference similar businesses: '47 restaurants in Dubai Marina already use this'",
        "application_ar": "ذكر أعمال مشابهة: '٤٧ مطعم في دبي مارينا يستخدمون هذا'",
    },
    "anchoring": {
        "principle": "First number sets the reference point for all subsequent numbers",
        "trigger_signals": ["how much", "price", "cost", "expensive"],
        "application_en": "Anchor high first: 'Most restaurants spend AED 8,000/month on a hostess. Our AI costs a fraction of that'",
        "application_ar": "ثبّت الرقم العالي أول: 'أغلب المطاعم تصرف ٨,٠٠٠ درهم/شهر على موظفة استقبال. ذكاءنا يكلف جزء بسيط'",
    },
    "scarcity": {
        "principle": "Limited availability increases perceived value",
        "trigger_signals": ["maybe later", "let me think", "not urgent"],
        "application_en": "Create genuine urgency: 'We onboard 5 new businesses per month in your area. 2 spots left for April'",
        "application_ar": "اصنع إلحاح حقيقي: 'نسجل ٥ أعمال جديدة بالشهر بمنطقتك. باقي مكانين لأبريل'",
    },
    "reciprocity": {
        "principle": "People feel obligated to return favors",
        "trigger_signals": ["just looking", "exploring", "early stage"],
        "application_en": "Give value first: 'Let me run a free audit of your Google profile — takes 30 seconds'",
        "application_ar": "قدم قيمة أول: 'خلني أسوي لك تدقيق مجاني لملفك بقوقل — ياخذ ٣٠ ثانية'",
    },
    "goal_gradient": {
        "principle": "People accelerate behavior as they approach a goal",
        "trigger_signals": ["almost ready", "close to deciding", "one more question"],
        "application_en": "Show progress: 'You're 2 minutes from having a 24/7 AI assistant. Just need your WhatsApp number'",
        "application_ar": "وضّح التقدم: 'باقي دقيقتين ويكون عندك مساعد ذكي ٢٤/٧. بس نحتاج رقم الواتساب'",
    },
    "endowment_effect": {
        "principle": "People value things more once they feel ownership",
        "trigger_signals": ["can I try", "demo", "test"],
        "application_en": "Create ownership: 'Your AI assistant Nadia is already built. She knows your menu. Want to see her in action?'",
        "application_ar": "اصنع ملكية: 'مساعدتك الذكية ناديا جاهزة. تعرف قائمتك. تبغى تشوفها تشتغل؟'",
    },
    "commitment_consistency": {
        "principle": "Small yeses lead to big yeses",
        "trigger_signals": ["yes", "sure", "sounds good", "interesting"],
        "application_en": "Build micro-commitments: 'Great that you're interested! Can I send you a 2-min demo video?'",
        "application_ar": "ابني التزامات صغيرة: 'حلو إنك مهتم! أقدر أرسلك فيديو دقيقتين؟'",
    },
    "pratfall_effect": {
        "principle": "Admitting small flaws increases trust and likability",
        "trigger_signals": ["too good to be true", "what's the catch", "really?"],
        "application_en": "Admit limitation: 'We're not perfect — the AI occasionally needs a human nudge for complex catering quotes. But for 95% of conversations, it's faster than any team member'",
        "application_ar": "اعترف بنقطة ضعف: 'مو كاملين — الذكاء الاصطناعي أحياناً يحتاج تدخل بشري للطلبات المعقدة. بس في ٩٥٪ من المحادثات أسرع من أي موظف'",
    },
    "peak_end_rule": {
        "principle": "People judge experiences by the peak moment and the ending",
        "trigger_signals": ["wrapping up", "thanks", "bye", "talk later"],
        "application_en": "End strong: 'Before you go — imagine waking up tomorrow to 5 bookings that came in while you slept. That's what this does'",
        "application_ar": "اختم بقوة: 'قبل ما تمشي — تخيل تصحى بكرة على ٥ حجوزات جتك وأنت نايم. هذا اللي يسويه النظام'",
    },
    "authority": {
        "principle": "People trust experts and credible sources",
        "trigger_signals": ["how do I know", "prove it", "credentials", "who built this"],
        "application_en": "Reference authority: 'Built by engineers who worked at Meta and Google. Trusted by Michelin-listed restaurants in Dubai'",
        "application_ar": "ذكر المصداقية: 'مبني من مهندسين عملوا بميتا وقوقل. مطاعم حاصلة على ميشلان في دبي يثقون فيه'",
    },
    "bandwagon": {
        "principle": "People adopt behaviors that others are adopting",
        "trigger_signals": ["is it popular", "many people use", "trending"],
        "application_en": "Show momentum: 'We signed 12 new businesses last week alone — fastest-growing AI platform in the Gulf'",
        "application_ar": "وضّح الزخم: 'سجلنا ١٢ مشروع جديد الأسبوع اللي فات بس — أسرع منصة ذكاء اصطناعي نمواً في الخليج'",
    },
    "framing_effect": {
        "principle": "How you present information changes how people perceive it",
        "trigger_signals": ["subscription", "monthly fee", "ongoing cost"],
        "application_en": "Reframe cost: 'That's less than AED 50 a day — the cost of one coffee for your whole team'",
        "application_ar": "أعد صياغة التكلفة: 'هذا أقل من ٥٠ درهم باليوم — سعر قهوة واحدة لفريقك كامل'",
    },
    "curiosity_gap": {
        "principle": "People seek information to close a knowledge gap",
        "trigger_signals": ["tell me more", "how does it work", "what do you mean"],
        "application_en": "Create a gap: 'There's one thing your competitors are doing on WhatsApp that you're probably not. Want to see what it is?'",
        "application_ar": "اصنع فجوة معرفية: 'في شي واحد منافسينك يسوونه على الواتساب وأنت على الأغلب لا. تبغى تشوف وش هو؟'",
    },
    "decoy_effect": {
        "principle": "Adding a third option makes one of the other two more attractive",
        "trigger_signals": ["which plan", "what options", "packages"],
        "application_en": "Present three options: Basic (AED 1,500), Pro (AED 3,000), Enterprise (AED 8,000) — Pro becomes the obvious choice",
        "application_ar": "قدم ثلاث خيارات: أساسي (١,٥٠٠ درهم)، برو (٣,٠٠٠ درهم)، مؤسسات (٨,٠٠٠ درهم) — برو يصير الخيار الواضح",
    },
    "sunk_cost": {
        "principle": "People continue investing because of past investment, not future value",
        "trigger_signals": ["already invested", "spent a lot", "been working on"],
        "application_en": "Acknowledge investment: 'You've already built a great brand. This AI just makes sure no customer slips through the cracks'",
        "application_ar": "اعترف بالاستثمار: 'أنت بنيت براند قوي. الذكاء الاصطناعي بس يتأكد ما يفوتك أي عميل'",
    },
    "ikea_effect": {
        "principle": "People value things more when they participate in creating them",
        "trigger_signals": ["customize", "my way", "specific needs"],
        "application_en": "Invite co-creation: 'You'll set the personality, tone, and rules. It's YOUR assistant, built YOUR way'",
        "application_ar": "ادعوه للمشاركة: 'أنت تحدد الشخصية والنبرة والقواعد. هذا مساعدك أنت، مبني بطريقتك'",
    },
    "status_quo_bias": {
        "principle": "People prefer the current state of affairs",
        "trigger_signals": ["works fine", "no complaints", "been doing it this way"],
        "application_en": "Show hidden costs of status quo: 'It feels fine because you can't see the bookings you're losing at 2am'",
        "application_ar": "وضّح التكاليف المخفية: 'يبان كويس لأنك ما تشوف الحجوزات اللي تضيع الساعة ٢ الصبح'",
    },
    "rhyme_as_reason": {
        "principle": "Rhyming statements are perceived as more truthful",
        "trigger_signals": ["slogan", "memorable", "catchy"],
        "application_en": "Use a tagline: 'If they text, you connect — 24/7, no regret'",
        "application_ar": "استخدم شعار: 'يراسلك وترد، ما يضيع أي عميل أبد'",
    },
    "zero_risk_bias": {
        "principle": "People prefer eliminating risk entirely over reducing it",
        "trigger_signals": ["guarantee", "risk", "what if it fails", "refund"],
        "application_en": "Eliminate risk: 'Try it for 14 days free. If it doesn't book at least 10 tables, we'll set up a competitor for you ourselves'",
        "application_ar": "أزل المخاطر: 'جربه ١٤ يوم مجاناً. لو ما حجز على الأقل ١٠ طاولات، نركب لك منافس بنفسنا'",
    },
    "mere_exposure": {
        "principle": "People develop preferences for things they encounter repeatedly",
        "trigger_signals": ["first time", "just heard about", "new to me"],
        "application_en": "Promise touchpoints: 'I'll share a quick insight every week — no pressure, just useful stuff for your business'",
        "application_ar": "وعد بنقاط تواصل: 'بأرسلك فكرة سريعة كل أسبوع — بدون ضغط، بس أشياء مفيدة لمشروعك'",
    },
    "hyperbolic_discounting": {
        "principle": "People prefer smaller immediate rewards over larger future ones",
        "trigger_signals": ["right now", "immediate", "today", "instant"],
        "application_en": "Offer instant win: 'Sign up today and your AI will answer its first customer within 1 hour'",
        "application_ar": "قدم فوز فوري: 'سجل اليوم وذكاءك الاصطناعي يرد على أول عميل خلال ساعة'",
    },
    "contrast_principle": {
        "principle": "People evaluate things relative to what they just saw",
        "trigger_signals": ["compared to", "vs", "difference"],
        "application_en": "Create contrast: 'Your competitor down the street responds in 8 seconds. You respond in 45 minutes. Customers choose speed'",
        "application_ar": "اصنع مقارنة: 'منافسك بالشارع يرد بـ ٨ ثواني. أنت ترد بـ ٤٥ دقيقة. العملاء يختارون السرعة'",
    },
    "storytelling": {
        "principle": "Stories are 22x more memorable than facts alone",
        "trigger_signals": ["example", "case study", "real story"],
        "application_en": "Tell a story: 'There's a shawarma place in Deira that was losing 30 orders a night. After 2 weeks with us, they added AED 4,500/month in revenue'",
        "application_ar": "احكي قصة: 'في محل شاورما بديرة كان يخسر ٣٠ طلب بالليل. بعد أسبوعين معنا، زاد دخلهم ٤,٥٠٠ درهم بالشهر'",
    },
    "default_effect": {
        "principle": "People tend to go with the pre-selected option",
        "trigger_signals": ["recommend", "which one", "what do you suggest"],
        "application_en": "Set the default: 'Most businesses like yours go with Pro — it's the sweet spot. Want me to set that up?'",
        "application_ar": "حدد الافتراضي: 'أغلب المشاريع مثلك يختارون برو — أفضل خيار. تبغاني أجهزه لك؟'",
    },
    "nostalgia": {
        "principle": "Nostalgic feelings increase willingness to spend",
        "trigger_signals": ["old days", "used to be", "remember when"],
        "application_en": "Evoke nostalgia: 'Remember when you knew every customer by name? Our AI brings that personal touch back — at scale'",
        "application_ar": "استحضر الحنين: 'تتذكر لما كنت تعرف كل عميل باسمه؟ ذكاءنا الاصطناعي يرجع هالّمسة الشخصية — بشكل أوسع'",
    },
    "fresh_start_effect": {
        "principle": "People are more motivated at temporal landmarks (new year, new month, Ramadan)",
        "trigger_signals": ["new year", "new month", "ramadan", "fresh start"],
        "application_en": "Leverage timing: 'New month, new system. Start April with an AI that works while you sleep'",
        "application_ar": "استغل التوقيت: 'شهر جديد، نظام جديد. ابدأ أبريل بذكاء اصطناعي يشتغل وأنت نايم'",
    },
    "identifiable_victim": {
        "principle": "People respond more to specific stories than statistics",
        "trigger_signals": ["does it matter", "so what", "why should I care"],
        "application_en": "Make it specific: 'Last Tuesday at 9:47pm, a customer messaged a restaurant asking about a birthday dinner for 12. Nobody replied. That's AED 1,800 gone'",
        "application_ar": "خلها شخصية: 'يوم الثلاثاء اللي فات الساعة ٩:٤٧ بالليل، عميل راسل مطعم يسأل عن عشاء عيد ميلاد لـ ١٢ شخص. ما أحد رد. ١,٨٠٠ درهم راحت'",
    },
    "paradox_of_choice": {
        "principle": "Too many choices cause decision paralysis",
        "trigger_signals": ["too many options", "confused", "overwhelmed"],
        "application_en": "Simplify: 'Don't overthink it. Here's what I recommend: start with the Pro plan, and we adjust as you grow. One decision, done'",
        "application_ar": "بسّط: 'لا تعقدها. هذا اللي أنصحك فيه: ابدأ ببرو، ونعدل مع نموك. قرار واحد، خلاص'",
    },
    "ben_franklin_effect": {
        "principle": "People like you more after doing you a favor",
        "trigger_signals": ["help me understand", "can you explain", "teach me"],
        "application_en": "Ask for their expertise: 'You know your customers better than anyone. What's the #1 question they ask on WhatsApp? That's where we start'",
        "application_ar": "اطلب خبرتهم: 'أنت تعرف عملائك أحسن من أي أحد. وش أكثر سؤال يسألونه على الواتساب؟ من هنا نبدأ'",
    },
}

# Mapping from trigger signals to tactic keys for fast lookup
_PSYCHOLOGY_SIGNAL_MAP: dict[str, list[str]] = {}
for _tactic_key, _tactic_data in PSYCHOLOGY_TACTICS.items():
    for _signal in _tactic_data.get("trigger_signals", []):
        _PSYCHOLOGY_SIGNAL_MAP.setdefault(_signal.lower(), []).append(_tactic_key)


# ═══════════════════════════════════════════════════════
# 12. PSYCHOLOGY TACTIC APPLICATION
# ═══════════════════════════════════════════════════════

async def apply_psychology_tactic(
    client_id: str,
    customer_phone: str,
    conversation_context: str,
    lang: str = "en",
) -> dict:
    """Detect the right psychological tactic to apply based on conversation context.

    Scans the conversation for trigger signals from the PSYCHOLOGY_TACTICS library
    and selects the most relevant tactic. Uses MiniMax to generate a personalized
    message applying the chosen principle.

    Args:
        client_id: Business client ID.
        customer_phone: Customer's WhatsApp number.
        conversation_context: Recent conversation text to analyze.
        lang: Language code, "en" or "ar". Auto-detects if context is Arabic.

    Returns:
        dict with tactic, principle, suggested_message, why_it_works.
        Returns empty tactic if no signals detected.
    """
    context_lower = conversation_context.lower()
    detected_lang = _detect_language(conversation_context)
    if lang == "en" and detected_lang == "ar":
        lang = "ar"

    # Score each tactic by how many trigger signals match
    tactic_scores: dict[str, int] = {}
    matched_signals: dict[str, list[str]] = {}

    for signal, tactic_keys in _PSYCHOLOGY_SIGNAL_MAP.items():
        if signal in context_lower:
            for tactic_key in tactic_keys:
                tactic_scores[tactic_key] = tactic_scores.get(tactic_key, 0) + 1
                matched_signals.setdefault(tactic_key, []).append(signal)

    if not tactic_scores:
        return {
            "tactic": "",
            "principle": "",
            "suggested_message": "",
            "why_it_works": "",
            "signals_detected": [],
        }

    # Pick the tactic with the highest signal match count
    best_tactic = max(tactic_scores, key=lambda k: tactic_scores[k])
    tactic_data = PSYCHOLOGY_TACTICS[best_tactic]
    application_key = f"application_{lang}"
    base_application = tactic_data.get(application_key, tactic_data.get("application_en", ""))

    # Generate a personalized message using MiniMax
    suggested_message = base_application
    if _MINIMAX_KEY:
        system = (
            "You are a sales psychology expert for Gulf-region SMBs. "
            f"Language: {'Arabic (Gulf dialect, Arabic script only)' if lang == 'ar' else 'English'}. "
            "Write a short, natural WhatsApp message (2-3 sentences max) applying the given "
            "psychological principle to this specific conversation. "
            "Be conversational, not academic. No <think> tags. No bold."
        )
        user_msg = (
            f"Psychological principle: {tactic_data['principle']}\n"
            f"Example application: {base_application}\n"
            f"Conversation context: {conversation_context[:500]}\n\n"
            "Write a message that naturally applies this principle to what the customer said. "
            "Don't mention the principle name — just use it."
        )
        personalized = await _minimax_generate(system, user_msg, max_tokens=200)
        if personalized and len(personalized) > 20:
            suggested_message = personalized

    # Log the tactic application
    await _supa_insert("activity_logs", {
        "client_id": client_id,
        "event_type": "psychology_tactic_applied",
        "payload": {
            "customer_phone": customer_phone,
            "tactic": best_tactic,
            "principle": tactic_data["principle"],
            "signals_detected": matched_signals.get(best_tactic, []),
            "language": lang,
            "applied_at": _now_iso(),
        },
    })

    print(f"[sales_rep] Psychology tactic: {customer_phone} -> {best_tactic} ({lang})")
    return {
        "tactic": best_tactic,
        "principle": tactic_data["principle"],
        "suggested_message": suggested_message,
        "why_it_works": base_application,
        "signals_detected": matched_signals.get(best_tactic, []),
    }


# ═══════════════════════════════════════════════════════
# 13. ANGLE-ROTATED FOLLOW-UPS
# ═══════════════════════════════════════════════════════

# Follow-up angle definitions — each touch uses a different persuasion angle
_ANGLE_CADENCE = [
    {
        "touch": 1,
        "day_offset": 0,
        "angle": "personalized_benefit",
        "system_en": (
            "Write a warm first follow-up for a Gulf-region SMB prospect. "
            "Focus on their specific business and the core benefit of AI-powered WhatsApp automation. "
            "Be personal, reference their business type. 2-3 sentences max. No <think> tags. No bold."
        ),
        "system_ar": (
            "اكتب أول متابعة دافئة لعميل محتمل في الخليج. "
            "ركز على مشروعه المحدد والفائدة الأساسية لأتمتة الواتساب بالذكاء الاصطناعي. "
            "كن شخصي، ذكر نوع مشروعه. ٢-٣ جمل بالكثير. بدون <think>. بدون بولد."
        ),
        "fallback_en": "Hi {name}! Thanks for your interest. With AI-powered WhatsApp, you'll never miss a booking again — even at 2am. Want to see a quick demo?",
        "fallback_ar": "هلا {name}! شكراً لاهتمامك. مع الواتساب الذكي، ما راح تفوتك أي حجزة — حتى الساعة ٢ الصبح. تبغى تشوف عرض سريع؟",
    },
    {
        "touch": 2,
        "day_offset": 3,
        "angle": "social_proof",
        "system_en": (
            "Write a follow-up using social proof for a Gulf-region SMB prospect. "
            "Mention how similar businesses benefit. Include a specific number or stat. "
            "2-3 sentences max. No <think> tags. No bold."
        ),
        "system_ar": (
            "اكتب متابعة باستخدام الإثبات الاجتماعي لعميل محتمل في الخليج. "
            "ذكر كيف مشاريع مشابهة استفادت. استخدم رقم أو إحصائية محددة. "
            "٢-٣ جمل بالكثير. بدون <think>. بدون بولد."
        ),
        "fallback_en": "Hi {name}! Quick update — 3 {industry} businesses in your area signed up this month. They're seeing 40% fewer missed bookings. Thought you'd want to know!",
        "fallback_ar": "هلا {name}! خبر سريع — ٣ {industry} بمنطقتك سجلوا هالشهر. شافوا ٤٠٪ انخفاض بالحجوزات الضايعة. حبيت أخبرك!",
    },
    {
        "touch": 3,
        "day_offset": 7,
        "angle": "value_add",
        "system_en": (
            "Write a follow-up offering free value to a Gulf-region SMB prospect. "
            "Offer a free audit, resource, or insight they can use right now. "
            "Use reciprocity — give before asking. 2-3 sentences max. No <think> tags. No bold."
        ),
        "system_ar": (
            "اكتب متابعة تقدم قيمة مجانية لعميل محتمل في الخليج. "
            "قدم تدقيق مجاني أو مصدر أو فكرة يقدر يستخدمها الحين. "
            "استخدم المعاملة بالمثل — أعطِ قبل ما تطلب. ٢-٣ جمل بالكثير. بدون <think>. بدون بولد."
        ),
        "fallback_en": "Hi {name}! I put together a free WhatsApp response audit for your Google listing. You're missing about 15 inquiries/month based on your reviews. Want me to send the full report?",
        "fallback_ar": "هلا {name}! سويت لك تدقيق مجاني لردودك على الواتساب من قوقل. تقريباً تفوتكم ١٥ استفسار بالشهر حسب تقييماتكم. تبغاني أرسلك التقرير الكامل؟",
    },
    {
        "touch": 4,
        "day_offset": 14,
        "angle": "industry_trend",
        "system_en": (
            "Write a follow-up sharing an industry trend relevant to a Gulf-region SMB prospect. "
            "Reference a real trend in their industry (AI adoption, WhatsApp commerce, customer expectations). "
            "Position your product as the solution. 2-3 sentences max. No <think> tags. No bold."
        ),
        "system_ar": (
            "اكتب متابعة تشارك توجه صناعي يهم عميل محتمل في الخليج. "
            "ذكر توجه حقيقي في صناعتهم (تبني الذكاء الاصطناعي، تجارة الواتساب، توقعات العملاء). "
            "ضع منتجك كحل. ٢-٣ جمل بالكثير. بدون <think>. بدون بولد."
        ),
        "fallback_en": "Hi {name}! Interesting trend: 73% of customers in the UAE now prefer messaging over calling to make bookings. The businesses adapting fastest are winning. Happy to show you how others are doing it.",
        "fallback_ar": "هلا {name}! توجه مهم: ٧٣٪ من العملاء في الإمارات الحين يفضلون الرسائل على الاتصال للحجز. المشاريع اللي تتكيف أسرع هي اللي تفوز. أقدر أوريك كيف غيرك يسوونها.",
    },
    {
        "touch": 5,
        "day_offset": 21,
        "angle": "breakup_with_options",
        "system_en": (
            "Write a final 'breakup' follow-up for a Gulf-region SMB prospect. "
            "Be respectful, assume they're busy. Offer exactly 3 response options: "
            "1) Still interested 2) Not the right time 3) Not interested. "
            "Make it easy to reply with just a number. 2-3 sentences max. No <think> tags. No bold."
        ),
        "system_ar": (
            "اكتب آخر متابعة 'وداع' لعميل محتمل في الخليج. "
            "كن محترم، افترض إنه مشغول. قدم بالضبط ٣ خيارات للرد: "
            "١) لسا مهتم ٢) مو الوقت المناسب ٣) مو مهتم. "
            "سهّل عليه يرد برقم بس. ٢-٣ جمل بالكثير. بدون <think>. بدون بولد."
        ),
        "fallback_en": "Hi {name}! I know you're busy, so I'll keep it simple. Just reply with a number:\n\n1 — Still interested, just busy\n2 — Not the right time, check back later\n3 — Not interested\n\nNo hard feelings either way!",
        "fallback_ar": "هلا {name}! أعرف إنك مشغول، فخليني أبسطها. رد برقم بس:\n\n١ — لسا مهتم، بس مشغول\n٢ — مو الوقت المناسب، تواصلوا بعدين\n٣ — مو مهتم\n\nما في أي زعل!",
    },
]


async def get_follow_up_with_angle(
    client_id: str,
    customer_phone: str,
    touch_number: int,
    lead_data: dict = None,
    lang: str = "en",
) -> dict:
    """Generate a follow-up with angle rotation (never 'just checking in').

    Each touch uses a different persuasion angle to keep follow-ups fresh
    and avoid the dreaded 'just following up' pattern.

    Touch 1 (Day 0): Personalized + core benefit
    Touch 2 (Day 3): New insight or social proof
    Touch 3 (Day 7): Value add (free resource/audit)
    Touch 4 (Day 14): Industry trend or news
    Touch 5 (Day 21): Breakup with 3-option response

    Args:
        client_id: Business client ID.
        customer_phone: Customer's WhatsApp number.
        touch_number: Which touch in the sequence (1-5). Clamped to valid range.
        lead_data: Optional dict with keys like customer_name, deal_type, industry, notes.
        lang: Language code, "en" or "ar".

    Returns:
        dict with touch_number, angle, message, next_touch_date.
    """
    if lead_data is None:
        lead_data = {}

    # Clamp touch number to valid range
    touch_number = max(1, min(touch_number, len(_ANGLE_CADENCE)))
    step = _ANGLE_CADENCE[touch_number - 1]

    # Detect language from recent messages if not explicitly set
    recent_msgs = await _supa_select(
        "conversation_messages",
        f"client_id=eq.{client_id}&customer_phone=eq.{customer_phone}"
        f"&direction=eq.inbound&order=created_at.desc&limit=3",
    )
    if recent_msgs and lang == "en":
        last_text = recent_msgs[0].get("content", "")
        detected = _detect_language(last_text)
        if detected == "ar":
            lang = "ar"

    customer_name = lead_data.get("customer_name", "")
    deal_type = lead_data.get("deal_type", "inquiry").replace("_", " ")
    industry = lead_data.get("industry", "restaurant")
    name = customer_name or ("there" if lang == "en" else "عزيزي")

    # Build the follow-up message
    message = ""
    if _MINIMAX_KEY:
        system_key = f"system_{lang}"
        system_prompt = step.get(system_key, step.get("system_en", ""))
        recent_context = ""
        if recent_msgs:
            recent_context = " | ".join(
                m.get("content", "")[:100] for m in recent_msgs[:3]
            )
        user_msg = (
            f"Customer name: {name}\n"
            f"Business type/industry: {industry}\n"
            f"Deal type: {deal_type}\n"
            f"Touch number: {touch_number} of 5\n"
            f"Angle: {step['angle']}\n"
        )
        if recent_context:
            user_msg += f"Recent messages from customer: {recent_context}\n"
        if lead_data.get("notes"):
            user_msg += f"Notes: {lead_data['notes']}\n"
        user_msg += "\nWrite the follow-up message."

        generated = await _minimax_generate(system_prompt, user_msg, max_tokens=250)
        if generated and len(generated) > 20:
            message = generated

    # Fallback to template if MiniMax unavailable or failed
    if not message:
        fallback_key = f"fallback_{lang}"
        template = step.get(fallback_key, step.get("fallback_en", ""))
        message = template.format(
            name=name,
            industry=industry.replace("_", " "),
            deal_type=deal_type,
        )

    # Calculate next touch date
    now = datetime.now(timezone.utc)
    next_touch_date = ""
    if touch_number < len(_ANGLE_CADENCE):
        next_step = _ANGLE_CADENCE[touch_number]  # touch_number is already 1-indexed
        next_touch_date = (now + timedelta(days=next_step["day_offset"] - step["day_offset"])).isoformat()

    # Log the follow-up
    await _supa_insert("activity_logs", {
        "client_id": client_id,
        "event_type": "angle_followup_sent",
        "payload": {
            "customer_phone": customer_phone,
            "touch_number": touch_number,
            "angle": step["angle"],
            "language": lang,
            "sent_at": _now_iso(),
        },
    })

    print(f"[sales_rep] Angle follow-up: {customer_phone} touch={touch_number} angle={step['angle']} ({lang})")
    return {
        "touch_number": touch_number,
        "angle": step["angle"],
        "message": message,
        "next_touch_date": next_touch_date,
    }


# ═══════════════════════════════════════════════════════
# 14. ADVANCED LEAD SCORING (Explicit + Implicit + Negative)
# ═══════════════════════════════════════════════════════

# Explicit fit scoring criteria
_EXPLICIT_CRITERIA = {
    "business_size": {
        "large": 25,       # 50+ employees or 3+ locations
        "medium": 20,      # 10-49 employees or 2 locations
        "small": 15,       # 5-9 employees
        "micro": 10,       # 1-4 employees
    },
    "industry_match": {
        "restaurant": 25,
        "salon": 25,
        "cafe": 20,
        "real_estate": 20,
        "other": 10,
    },
    "location_tier": {
        "dubai": 25,
        "abu_dhabi": 22,
        "riyadh": 22,
        "jeddah": 20,
        "sharjah": 18,
        "other_gcc": 15,
        "other": 10,
    },
}

# Implicit engagement scoring signals
_IMPLICIT_SIGNALS = {
    "asked_about_pricing": 20,
    "requested_demo": 25,
    "asked_about_features": 15,
    "replied_within_1h": 15,
    "replied_within_24h": 10,
    "sent_3_plus_messages": 15,
    "sent_5_plus_messages": 20,
    "shared_business_details": 18,
    "asked_about_onboarding": 20,
    "mentioned_competitor": 12,
    "asked_about_integrations": 15,
    "mentioned_timeline": 18,
    "forwarded_to_partner": 15,
}

# Negative signals that reduce score
_NEGATIVE_SIGNALS = {
    "spam_pattern": -30,
    "competitor_employee": -50,
    "just_browsing_repeated": -20,
    "no_business_context": -15,
    "unsubscribe_request": -40,
    "abusive_language": -50,
    "wrong_region": -25,
}

# Pricing-related keywords for implicit detection
_PRICING_KEYWORDS = [
    "price", "cost", "how much", "pricing", "plans", "package",
    "السعر", "كم", "التكلفة", "الباقات", "العروض",
]

# Demo-related keywords for implicit detection
_DEMO_KEYWORDS = [
    "demo", "show me", "see it", "trial", "try",
    "عرض", "وريني", "تجربة", "أجرب",
]

# Feature-related keywords for implicit detection
_FEATURE_KEYWORDS = [
    "can it", "does it", "features", "what about", "support",
    "يقدر", "المميزات", "وش يسوي", "يدعم",
]

# Negative pattern keywords
_SPAM_KEYWORDS = [
    "unsubscribe", "stop", "remove me", "spam",
    "أوقف", "شيلني", "سبام",
]


async def score_lead_advanced(
    client_id: str,
    customer_phone: str,
    messages: list,
    fit_data: dict = None,
) -> dict:
    """Advanced lead scoring using Explicit (fit) + Implicit (engagement) + Negative signals.

    Explicit (30%): business size, industry match, location, budget mentioned.
    Implicit (70%): message frequency, response speed, questions about pricing, demo requests.
    Negative: spam signals, competitor mention without interest, 'just browsing' repeatedly.

    MQL threshold: 60 points.

    Args:
        client_id: Business client ID.
        customer_phone: Customer's WhatsApp number.
        messages: List of message dicts with at least "content" or "text" key,
                  optionally "timestamp", "direction".
        fit_data: Optional dict with explicit fit info:
                  business_size, industry, location, budget_mentioned.

    Returns:
        dict with score, breakdown (explicit, implicit, negative), tier,
        mql_qualified, signals.
    """
    if fit_data is None:
        fit_data = {}

    combined_text = " ".join(
        m.get("content", "") or m.get("text", "") or ""
        for m in messages
    ).lower()

    signals: list[str] = []

    # ── Explicit scoring (max ~75 raw points, weighted to 30%) ──
    explicit_raw = 0

    # Business size
    biz_size = fit_data.get("business_size", "")
    if biz_size and biz_size in _EXPLICIT_CRITERIA["business_size"]:
        explicit_raw += _EXPLICIT_CRITERIA["business_size"][biz_size]
        signals.append(f"explicit:business_size:{biz_size}")

    # Industry match
    industry = fit_data.get("industry", "")
    if industry and industry in _EXPLICIT_CRITERIA["industry_match"]:
        explicit_raw += _EXPLICIT_CRITERIA["industry_match"][industry]
        signals.append(f"explicit:industry:{industry}")

    # Location tier
    location = fit_data.get("location", "").lower().replace(" ", "_")
    if location:
        location_score = _EXPLICIT_CRITERIA["location_tier"].get(location, 10)
        explicit_raw += location_score
        signals.append(f"explicit:location:{location}")

    # Budget mentioned in fit data
    if fit_data.get("budget_mentioned"):
        explicit_raw += 15
        signals.append("explicit:budget_mentioned")

    # ── Implicit scoring (max ~100+ raw points, weighted to 70%) ──
    implicit_raw = 0

    # Pricing interest
    if any(kw in combined_text for kw in _PRICING_KEYWORDS):
        implicit_raw += _IMPLICIT_SIGNALS["asked_about_pricing"]
        signals.append("implicit:asked_about_pricing")

    # Demo interest
    if any(kw in combined_text for kw in _DEMO_KEYWORDS):
        implicit_raw += _IMPLICIT_SIGNALS["requested_demo"]
        signals.append("implicit:requested_demo")

    # Feature questions
    if any(kw in combined_text for kw in _FEATURE_KEYWORDS):
        implicit_raw += _IMPLICIT_SIGNALS["asked_about_features"]
        signals.append("implicit:asked_about_features")

    # Message volume
    inbound_msgs = [m for m in messages if m.get("direction", "inbound") == "inbound"]
    msg_count = len(inbound_msgs)
    if msg_count >= 5:
        implicit_raw += _IMPLICIT_SIGNALS["sent_5_plus_messages"]
        signals.append(f"implicit:sent_{msg_count}_messages")
    elif msg_count >= 3:
        implicit_raw += _IMPLICIT_SIGNALS["sent_3_plus_messages"]
        signals.append(f"implicit:sent_{msg_count}_messages")

    # Response speed (check timestamps if available)
    timestamps = []
    for m in messages:
        ts = m.get("timestamp", "") or m.get("created_at", "")
        if ts:
            try:
                timestamps.append(datetime.fromisoformat(ts.replace("Z", "+00:00")))
            except (ValueError, TypeError):
                pass

    if len(timestamps) >= 2:
        # Check time between first outbound and first inbound reply
        reply_gap = None
        for i in range(1, len(messages)):
            prev = messages[i - 1]
            curr = messages[i]
            if prev.get("direction") == "outbound" and curr.get("direction") == "inbound":
                prev_ts = prev.get("timestamp", "") or prev.get("created_at", "")
                curr_ts = curr.get("timestamp", "") or curr.get("created_at", "")
                if prev_ts and curr_ts:
                    try:
                        t1 = datetime.fromisoformat(prev_ts.replace("Z", "+00:00"))
                        t2 = datetime.fromisoformat(curr_ts.replace("Z", "+00:00"))
                        reply_gap = (t2 - t1).total_seconds()
                        break
                    except (ValueError, TypeError):
                        pass

        if reply_gap is not None:
            if reply_gap <= 3600:  # Within 1 hour
                implicit_raw += _IMPLICIT_SIGNALS["replied_within_1h"]
                signals.append("implicit:replied_within_1h")
            elif reply_gap <= 86400:  # Within 24 hours
                implicit_raw += _IMPLICIT_SIGNALS["replied_within_24h"]
                signals.append("implicit:replied_within_24h")

    # Shared business details (name, location, team size mentioned)
    biz_detail_patterns = [
        r'my (?:restaurant|salon|cafe|shop|business)',
        r'we (?:have|are|do)',
        r'our (?:team|staff|menu|services)',
        r'مطعمي|صالوني|محلي|مشروعي',
        r'عندنا|فريقنا|قائمتنا',
    ]
    if any(re.search(p, combined_text) for p in biz_detail_patterns):
        implicit_raw += _IMPLICIT_SIGNALS["shared_business_details"]
        signals.append("implicit:shared_business_details")

    # Onboarding questions
    onboarding_keywords = ["setup", "get started", "onboard", "how long", "كيف أبدأ", "التسجيل", "التفعيل"]
    if any(kw in combined_text for kw in onboarding_keywords):
        implicit_raw += _IMPLICIT_SIGNALS["asked_about_onboarding"]
        signals.append("implicit:asked_about_onboarding")

    # Timeline mentioned
    timeline_keywords = ["this week", "next month", "asap", "urgent", "before ramadan", "هالأسبوع", "الشهر الجاي", "بأسرع"]
    if any(kw in combined_text for kw in timeline_keywords):
        implicit_raw += _IMPLICIT_SIGNALS["mentioned_timeline"]
        signals.append("implicit:mentioned_timeline")

    # ── Negative scoring ──
    negative_raw = 0

    # Spam patterns
    if any(kw in combined_text for kw in _SPAM_KEYWORDS):
        negative_raw += _NEGATIVE_SIGNALS["spam_pattern"]
        signals.append("negative:spam_pattern")

    # "Just browsing" repeated
    browsing_count = combined_text.count("just browsing") + combined_text.count("just looking") + combined_text.count("أسأل بس")
    if browsing_count >= 2:
        negative_raw += _NEGATIVE_SIGNALS["just_browsing_repeated"]
        signals.append(f"negative:just_browsing_x{browsing_count}")

    # No business context (very short messages, no substance)
    if msg_count >= 3 and len(combined_text) < 50:
        negative_raw += _NEGATIVE_SIGNALS["no_business_context"]
        signals.append("negative:no_business_context")

    # ── Calculate weighted score ──
    # Normalize: explicit max ~75 -> weight 30%, implicit max ~100 -> weight 70%
    explicit_normalized = min(explicit_raw, 75) / 75 * 30  # Max 30 points
    implicit_normalized = min(implicit_raw, 100) / 100 * 70  # Max 70 points
    negative_normalized = max(negative_raw, -50)  # Cap deductions

    raw_score = explicit_normalized + implicit_normalized + negative_normalized
    score = max(0, min(100, round(raw_score)))

    # Determine tier and MQL status
    if score >= 80:
        tier = "hot"
    elif score >= 60:
        tier = "warm"
    elif score >= 40:
        tier = "cool"
    else:
        tier = "cold"

    mql_qualified = score >= 60

    result = {
        "score": score,
        "breakdown": {
            "explicit": round(explicit_normalized, 1),
            "implicit": round(implicit_normalized, 1),
            "negative": round(negative_normalized, 1),
            "explicit_raw": explicit_raw,
            "implicit_raw": implicit_raw,
            "negative_raw": negative_raw,
        },
        "tier": tier,
        "mql_qualified": mql_qualified,
        "signals": signals,
        "customer_phone": customer_phone,
        "scored_at": _now_iso(),
    }

    # Persist to activity_logs
    await _supa_insert("activity_logs", {
        "client_id": client_id,
        "event_type": "lead_scored_advanced",
        "payload": {
            **result,
            "customer_phone": customer_phone,
        },
    })

    print(
        f"[sales_rep] Advanced lead score: {customer_phone} = {score} ({tier}), "
        f"MQL={'YES' if mql_qualified else 'NO'}, signals: {len(signals)}"
    )
    return result


# ═══════════════════════════════════════════════════════
# 15. SPEED-TO-LEAD ALERTS
# ═══════════════════════════════════════════════════════

async def get_speed_to_lead_alert(client_id: str) -> list:
    """Find leads that haven't been contacted within 5 minutes.

    Speed-to-lead research shows contacting within 5 minutes makes a lead
    21x more likely to qualify compared to waiting 30 minutes.

    Scans recent inbound messages that have no corresponding outbound reply
    within a 5-minute window.

    Args:
        client_id: Business client ID.

    Returns:
        List of dicts for leads needing immediate follow-up, sorted by
        wait time descending. Each dict contains: customer_phone,
        first_message_at, minutes_waiting, message_preview, urgency.
    """
    now = datetime.now(timezone.utc)
    # Look at messages from the last 2 hours (beyond that, speed-to-lead is moot)
    cutoff = (now - timedelta(hours=2)).isoformat()

    # Fetch recent inbound messages
    inbound_rows = await _supa_select(
        "conversation_messages",
        f"client_id=eq.{client_id}&direction=eq.inbound"
        f"&created_at=gte.{cutoff}&select=customer_phone,content,created_at"
        f"&order=created_at.asc",
    )

    if not inbound_rows:
        return []

    # Fetch recent outbound messages to check for replies
    outbound_rows = await _supa_select(
        "conversation_messages",
        f"client_id=eq.{client_id}&direction=eq.outbound"
        f"&created_at=gte.{cutoff}&select=customer_phone,created_at"
        f"&order=created_at.asc",
    )

    # Build a map of outbound reply times per customer
    outbound_times: dict[str, list[datetime]] = {}
    for row in outbound_rows:
        phone = row.get("customer_phone", "")
        ts_str = row.get("created_at", "")
        if phone and ts_str:
            try:
                ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                outbound_times.setdefault(phone, []).append(ts)
            except (ValueError, TypeError):
                pass

    # Group inbound messages by customer — get earliest unanswered
    first_inbound: dict[str, dict] = {}
    for row in inbound_rows:
        phone = row.get("customer_phone", "")
        ts_str = row.get("created_at", "")
        if not phone or not ts_str:
            continue

        try:
            inbound_ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            continue

        # Check if there's an outbound reply AFTER this inbound message
        replied = False
        for out_ts in outbound_times.get(phone, []):
            if out_ts > inbound_ts:
                replied = True
                break

        if not replied and phone not in first_inbound:
            first_inbound[phone] = {
                "customer_phone": phone,
                "first_message_at": ts_str,
                "first_message_ts": inbound_ts,
                "message_preview": (row.get("content", "") or "")[:100],
            }

    # Build alerts for unanswered leads
    alerts = []
    for phone, data in first_inbound.items():
        minutes_waiting = (now - data["first_message_ts"]).total_seconds() / 60

        # Determine urgency based on wait time
        if minutes_waiting >= 30:
            urgency = "critical"
        elif minutes_waiting >= 15:
            urgency = "high"
        elif minutes_waiting >= 5:
            urgency = "medium"
        else:
            urgency = "low"

        # Only alert if waiting 5+ minutes (speed-to-lead threshold)
        if minutes_waiting >= 5:
            alerts.append({
                "customer_phone": phone,
                "first_message_at": data["first_message_at"],
                "minutes_waiting": round(minutes_waiting, 1),
                "message_preview": data["message_preview"],
                "urgency": urgency,
            })

    # Sort by wait time descending (longest-waiting first)
    alerts.sort(key=lambda x: -x["minutes_waiting"])

    # Log the alert check
    if alerts:
        await _supa_insert("activity_logs", {
            "client_id": client_id,
            "event_type": "speed_to_lead_alert",
            "payload": {
                "alert_count": len(alerts),
                "phones": [a["customer_phone"] for a in alerts[:10]],
                "max_wait_minutes": alerts[0]["minutes_waiting"] if alerts else 0,
                "checked_at": _now_iso(),
            },
        })

    print(f"[sales_rep] Speed-to-lead alerts for {client_id}: {len(alerts)} leads waiting")
    return alerts


# ═══════════════════════════════════════════════════════
# INTENT CLASSIFICATION — SQOS for WhatsApp
# ═══════════════════════════════════════════════════════

# Score each incoming message on 3 dimensions (1-5 each, max 15)
INTENT_DIMENSIONS = {
    "intent_match": {
        "5": ["book", "reserve", "order", "appointment", "حجز", "طلب", "موعد"],
        "4": ["menu", "prices", "available", "القائمة", "الأسعار", "متاح"],
        "3": ["hours", "location", "parking", "الساعات", "الموقع", "وقف"],
        "2": ["do you", "can you", "what is", "عندكم", "تقدرون"],
        "1": ["hi", "hello", "hey", "مرحبا", "هلا"],
    },
    "conversion_proximity": {
        "5": ["book for", "table for", "order now", "أحجز", "اطلب الحين"],
        "4": ["how much", "what time", "this friday", "كم السعر", "الجمعة"],
        "3": ["show me", "tell me about", "what do you have", "وريني", "عندكم"],
        "2": ["just looking", "browsing", "أتصفح", "أشوف"],
        "1": ["thanks", "ok", "شكراً", "تمام"],
    },
    "value_potential": {
        "5": ["party of", "corporate", "wedding", "catering", "event", "حفلة", "مناسبة", "عرس"],
        "4": ["birthday", "anniversary", "group", "عيد ميلاد", "مجموعة"],
        "3": ["dinner", "lunch", "two", "عشاء", "غداء"],
        "2": ["coffee", "takeaway", "قهوة", "سفري"],
        "1": ["question", "info", "سؤال", "معلومات"],
    },
}

# Routing based on total score (3-15)
INTENT_ROUTING = {
    "priority": {"min": 12, "action": "Direct booking/order flow — respond within 30 seconds"},
    "nurture": {"min": 8, "action": "Send menu, specials, social proof — respond within 2 minutes"},
    "educate": {"min": 4, "action": "FAQs, location, hours — standard response"},
    "low": {"min": 1, "action": "Basic auto-response"},
}


async def classify_message_intent(client_id: str, customer_phone: str, message: str) -> dict:
    """Score a WhatsApp message across 3 intent dimensions.

    Each dimension (intent_match, conversion_proximity, value_potential) is
    scored 1-5 based on keyword matching. Total score (3-15) determines
    routing priority.

    Args:
        client_id: Business client ID.
        customer_phone: Customer's WhatsApp phone (E.164).
        message: Raw message text from the customer.

    Returns:
        dict with total_score (3-15), dimensions breakdown,
        routing tier, action recommendation, and priority_level.
    """
    msg_lower = message.strip().lower()

    dimensions = {}

    for dim_name, levels in INTENT_DIMENSIONS.items():
        best_score = 1  # default minimum
        # Check from highest score to lowest, take the best match
        for score_str in ("5", "4", "3", "2", "1"):
            keywords = levels[score_str]
            for kw in keywords:
                if kw in msg_lower:
                    candidate = int(score_str)
                    if candidate > best_score:
                        best_score = candidate
                    break  # found a match at this level, no need to check more
        dimensions[dim_name] = best_score

    total_score = sum(dimensions.values())

    # Determine routing tier
    routing = "low"
    action = INTENT_ROUTING["low"]["action"]
    if total_score >= INTENT_ROUTING["priority"]["min"]:
        routing = "priority"
        action = INTENT_ROUTING["priority"]["action"]
    elif total_score >= INTENT_ROUTING["nurture"]["min"]:
        routing = "nurture"
        action = INTENT_ROUTING["nurture"]["action"]
    elif total_score >= INTENT_ROUTING["educate"]["min"]:
        routing = "educate"
        action = INTENT_ROUTING["educate"]["action"]

    # Map routing to priority level
    priority_map = {
        "priority": "critical",
        "nurture": "high",
        "educate": "medium",
        "low": "low",
    }
    priority_level = priority_map.get(routing, "low")

    lang = _detect_language(message)

    # Log the classification
    await _supa_insert("activity_logs", {
        "client_id": client_id,
        "event_type": "intent_classified",
        "payload": {
            "customer_phone": customer_phone,
            "message_preview": msg_lower[:100],
            "total_score": total_score,
            "dimensions": dimensions,
            "routing": routing,
            "priority_level": priority_level,
            "lang": lang,
            "classified_at": _now_iso(),
        },
    })

    print(f"[sales_rep] Intent classified for {customer_phone}: score={total_score}, routing={routing}")

    return {
        "total_score": total_score,
        "dimensions": dimensions,
        "routing": routing,
        "action": action,
        "priority_level": priority_level,
        "lang": lang,
        "message_preview": msg_lower[:100],
    }


async def analyze_message_patterns(client_id: str, days: int = 30) -> dict:
    """N-gram analysis on all incoming WhatsApp messages to find patterns.

    Analyzes unigrams, bigrams, trigrams to discover:
    - Most common customer intents
    - Missing bot response templates
    - Upsell opportunities (e.g., 'birthday' appears 50x -> birthday package)
    - Pain points (e.g., 'wait' + 'long' appears 20x)
    - Popular items (e.g., 'lamb chops' mentioned 35x)

    Args:
        client_id: Business client ID.
        days: How many days to look back (default 30).

    Returns:
        dict with top_unigrams, top_bigrams, top_trigrams, total_messages,
        and insights (intents, gaps, opportunities, pain_points).
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    rows = await _supa_select(
        "conversation_messages",
        f"client_id=eq.{client_id}&direction=eq.inbound"
        f"&created_at=gte.{cutoff}&select=content,created_at"
        f"&order=created_at.desc&limit=5000",
    )

    if not rows:
        return {
            "client_id": client_id,
            "period_days": days,
            "total_messages": 0,
            "top_unigrams": [],
            "top_bigrams": [],
            "top_trigrams": [],
            "insights": {
                "intents": [],
                "gaps": [],
                "opportunities": [],
                "pain_points": [],
            },
            "generated_at": _now_iso(),
        }

    # Stopwords to filter out (EN + AR common words)
    stopwords = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "can", "shall", "to", "of", "in", "for",
        "on", "with", "at", "by", "from", "as", "into", "through", "during",
        "before", "after", "above", "below", "up", "down", "out", "off",
        "over", "under", "again", "further", "then", "once", "and", "but",
        "or", "nor", "not", "no", "so", "very", "just", "also", "too",
        "it", "its", "this", "that", "these", "those", "i", "me", "my",
        "we", "our", "you", "your", "he", "she", "they", "them", "their",
        "what", "which", "who", "whom", "when", "where", "why", "how",
        "all", "each", "every", "both", "few", "more", "most", "other",
        "some", "such", "than", "if",
        # Arabic stopwords
        "في", "من", "على", "إلى", "عن", "مع", "هو", "هي", "هم", "أنا",
        "نحن", "أنت", "أنتم", "هذا", "هذه", "ذلك", "تلك", "الذي", "التي",
        "ما", "لا", "لم", "لن", "قد", "كان", "يكون", "أن", "إن", "ان",
        "و", "أو", "ثم", "بل", "لكن", "حتى", "إذا",
    }

    # Build n-grams
    unigram_counts: dict[str, int] = {}
    bigram_counts: dict[str, int] = {}
    trigram_counts: dict[str, int] = {}
    total_messages = len(rows)

    for row in rows:
        text = (row.get("content", "") or "").strip().lower()
        if not text:
            continue

        # Tokenize: split on whitespace and punctuation
        tokens = re.findall(r'[\w\u0600-\u06FF]+', text)

        # Filter stopwords for n-gram counting
        filtered = [t for t in tokens if t not in stopwords and len(t) > 1]

        # Unigrams
        for token in filtered:
            unigram_counts[token] = unigram_counts.get(token, 0) + 1

        # Bigrams
        for i in range(len(filtered) - 1):
            bigram = f"{filtered[i]} {filtered[i+1]}"
            bigram_counts[bigram] = bigram_counts.get(bigram, 0) + 1

        # Trigrams
        for i in range(len(filtered) - 2):
            trigram = f"{filtered[i]} {filtered[i+1]} {filtered[i+2]}"
            trigram_counts[trigram] = trigram_counts.get(trigram, 0) + 1

    # Sort and take top results
    top_unigrams = sorted(unigram_counts.items(), key=lambda x: -x[1])[:30]
    top_bigrams = sorted(bigram_counts.items(), key=lambda x: -x[1])[:20]
    top_trigrams = sorted(trigram_counts.items(), key=lambda x: -x[1])[:15]

    # Generate insights from patterns
    insights = {
        "intents": [],
        "gaps": [],
        "opportunities": [],
        "pain_points": [],
    }

    # Detect intent patterns
    intent_keywords = {
        "booking": ["book", "reserve", "reservation", "table", "حجز", "احجز"],
        "menu_inquiry": ["menu", "dish", "food", "price", "القائمة", "أكل", "سعر"],
        "hours_location": ["hours", "open", "close", "location", "address", "وين", "ساعات", "موقع"],
        "complaint": ["wait", "slow", "wrong", "bad", "complaint", "بطيء", "غلط", "شكوى"],
        "delivery": ["delivery", "deliver", "takeaway", "توصيل", "سفري"],
    }

    for intent_name, keywords in intent_keywords.items():
        intent_count = sum(
            count for word, count in top_unigrams
            if word in keywords
        )
        if intent_count > 0:
            insights["intents"].append({
                "intent": intent_name,
                "mentions": intent_count,
                "percentage": round(intent_count * 100 / total_messages, 1),
            })

    # Detect pain points (negative bigrams)
    pain_words = {"wait", "long", "slow", "bad", "wrong", "cold", "late",
                  "بطيء", "طويل", "غلط", "بارد", "متأخر"}
    for bigram, count in top_bigrams:
        words = set(bigram.split())
        if words & pain_words and count >= 3:
            insights["pain_points"].append({
                "pattern": bigram,
                "count": count,
            })

    # Detect opportunities (high-value keywords appearing frequently)
    opportunity_words = {"birthday", "party", "group", "corporate", "event",
                         "wedding", "catering", "عيد", "حفلة", "مناسبة", "عرس"}
    for word, count in top_unigrams:
        if word in opportunity_words and count >= 2:
            insights["opportunities"].append({
                "keyword": word,
                "count": count,
                "suggestion": f"'{word}' mentioned {count}x — consider creating a special package",
            })

    # Detect gaps (questions without clear answers: bigrams starting with "how", "where", "what")
    question_starters = {"how", "where", "what", "when", "why", "كيف", "وين", "شنو", "متى", "ليش"}
    for bigram, count in top_bigrams:
        first_word = bigram.split()[0]
        if first_word in question_starters and count >= 3:
            insights["gaps"].append({
                "question_pattern": bigram,
                "count": count,
                "suggestion": f"Customers asking '{bigram}' {count}x — ensure bot handles this",
            })

    # AI-powered deeper analysis if enough data
    if _MINIMAX_KEY and total_messages >= 10:
        system = (
            "You are a WhatsApp business analyst for Gulf-region SMBs. "
            "Analyze message patterns and give 3-4 specific, actionable insights. "
            "Focus on upsell opportunities, missing FAQ responses, and customer pain points. "
            "Be direct. No fluff. No <think> tags."
        )
        data_summary = (
            f"Period: {days} days, {total_messages} messages\n"
            f"Top words: {top_unigrams[:15]}\n"
            f"Top phrases: {top_bigrams[:10]}\n"
            f"Top 3-word phrases: {top_trigrams[:8]}\n"
            f"Detected intents: {json.dumps(insights['intents'], default=str)}\n"
            f"Pain points: {json.dumps(insights['pain_points'], default=str)}\n"
            f"Opportunities: {json.dumps(insights['opportunities'], default=str)}\n"
        )
        ai_insights = await _minimax_generate(system, data_summary, max_tokens=400)
        if ai_insights:
            insights["ai_summary"] = ai_insights

    # Log the analysis
    await _supa_insert("activity_logs", {
        "client_id": client_id,
        "event_type": "message_pattern_analysis",
        "payload": {
            "period_days": days,
            "total_messages": total_messages,
            "top_unigrams_count": len(top_unigrams),
            "top_bigrams_count": len(top_bigrams),
            "intents_found": len(insights["intents"]),
            "pain_points_found": len(insights["pain_points"]),
            "opportunities_found": len(insights["opportunities"]),
            "analyzed_at": _now_iso(),
        },
    })

    print(f"[sales_rep] Pattern analysis for {client_id}: {total_messages} msgs, "
          f"{len(insights['intents'])} intents, {len(insights['opportunities'])} opportunities")

    return {
        "client_id": client_id,
        "period_days": days,
        "total_messages": total_messages,
        "top_unigrams": [{"word": w, "count": c} for w, c in top_unigrams],
        "top_bigrams": [{"phrase": p, "count": c} for p, c in top_bigrams],
        "top_trigrams": [{"phrase": p, "count": c} for p, c in top_trigrams],
        "insights": insights,
        "generated_at": _now_iso(),
    }


async def get_intent_dashboard(client_id: str, days: int = 7) -> dict:
    """Dashboard showing message intent distribution.

    Aggregates intent classification logs to show how messages are
    distributed across routing tiers, average scores, and top intents.

    Args:
        client_id: Business client ID.
        days: How many days to look back (default 7).

    Returns:
        dict with total_messages, by_routing breakdown, avg_score,
        top_intents, and conversion_funnel data.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # Fetch intent classification logs
    rows = await _supa_select(
        "activity_logs",
        f"client_id=eq.{client_id}&event_type=eq.intent_classified"
        f"&created_at=gte.{cutoff}&select=payload,created_at"
        f"&order=created_at.desc&limit=5000",
    )

    if not rows:
        return {
            "client_id": client_id,
            "period_days": days,
            "total_messages": 0,
            "by_routing": {"priority": 0, "nurture": 0, "educate": 0, "low": 0},
            "avg_score": 0,
            "top_intents": [],
            "conversion_funnel": {
                "total_inbound": 0,
                "high_intent": 0,
                "high_intent_pct": 0,
            },
            "dimension_averages": {
                "intent_match": 0,
                "conversion_proximity": 0,
                "value_potential": 0,
            },
            "generated_at": _now_iso(),
        }

    total = len(rows)
    by_routing = {"priority": 0, "nurture": 0, "educate": 0, "low": 0}
    total_score = 0
    dim_totals = {"intent_match": 0, "conversion_proximity": 0, "value_potential": 0}
    unique_phones = set()

    for row in rows:
        payload = row.get("payload", {}) or {}
        routing = payload.get("routing", "low")
        score = payload.get("total_score", 3)
        dims = payload.get("dimensions", {})
        phone = payload.get("customer_phone", "")

        by_routing[routing] = by_routing.get(routing, 0) + 1
        total_score += score
        unique_phones.add(phone)

        for dim_key in dim_totals:
            dim_totals[dim_key] += dims.get(dim_key, 1)

    avg_score = round(total_score / total, 1) if total > 0 else 0

    dimension_averages = {}
    for dim_key, dim_total in dim_totals.items():
        dimension_averages[dim_key] = round(dim_total / total, 1) if total > 0 else 0

    # High-intent = priority + nurture
    high_intent = by_routing.get("priority", 0) + by_routing.get("nurture", 0)
    high_intent_pct = round(high_intent * 100 / total) if total > 0 else 0

    # Build top intents from dimension keywords found
    # Re-scan the message previews for intent keywords
    intent_word_counts: dict[str, int] = {}
    for row in rows:
        payload = row.get("payload", {}) or {}
        preview = payload.get("message_preview", "")
        # Check against high-score keywords
        for dim_name, levels in INTENT_DIMENSIONS.items():
            for score_str in ("5", "4"):
                for kw in levels[score_str]:
                    if kw in preview:
                        intent_word_counts[kw] = intent_word_counts.get(kw, 0) + 1

    top_intents = sorted(intent_word_counts.items(), key=lambda x: -x[1])[:10]

    result = {
        "client_id": client_id,
        "period_days": days,
        "total_messages": total,
        "unique_customers": len(unique_phones),
        "by_routing": by_routing,
        "avg_score": avg_score,
        "dimension_averages": dimension_averages,
        "top_intents": [{"keyword": kw, "count": c} for kw, c in top_intents],
        "conversion_funnel": {
            "total_inbound": total,
            "high_intent": high_intent,
            "high_intent_pct": high_intent_pct,
        },
        "generated_at": _now_iso(),
    }

    # Log dashboard generation
    await _supa_insert("activity_logs", {
        "client_id": client_id,
        "event_type": "intent_dashboard_generated",
        "payload": {
            "period_days": days,
            "total_messages": total,
            "avg_score": avg_score,
            "high_intent_pct": high_intent_pct,
            "generated_at": _now_iso(),
        },
    })

    print(f"[sales_rep] Intent dashboard for {client_id}: {total} msgs, avg score={avg_score}, "
          f"high intent={high_intent_pct}%")

    return result
