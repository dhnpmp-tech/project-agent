"""Loyalty Program Engine — WhatsApp-based Loyalty for SMBs

Tracks visits, rewards loyal customers, and drives repeat business
for restaurants, cafes, and salons in UAE/KSA — all through WhatsApp.

Features:
1. Points System — configurable per client (per-AED or per-visit)
2. Tier System — Bronze / Silver / Gold / Platinum with tier-specific perks
3. Reward Catalog — configurable per client (free items, discounts, VIP)
4. Auto-tracking — visits from bookings + conversation signals
5. Birthday Rewards — auto-detect from Mem0/conversations, send offers
6. Re-engagement — "We miss you" for lapsed members
7. Referral Program — refer a friend, both earn points
8. WhatsApp Commands — "points" / "نقاطي", "redeem" / "استبدال"
"""

from __future__ import annotations

import os
import json
import re
import uuid
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional

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
# TIER DEFINITIONS
# ═══════════════════════════════════════════════════════

TIERS = {
    "bronze": {
        "min_points": 0,
        "max_points": 99,
        "label_en": "Bronze",
        "label_ar": "برونزي",
        "emoji": "🥉",
        "perks_en": [
            "Earn points on every visit",
            "Birthday reward",
        ],
        "perks_ar": [
            "اكسب نقاط مع كل زيارة",
            "مكافأة عيد ميلاد",
        ],
    },
    "silver": {
        "min_points": 100,
        "max_points": 249,
        "label_en": "Silver",
        "label_ar": "فضي",
        "emoji": "🥈",
        "perks_en": [
            "Earn points on every visit",
            "Birthday reward",
            "5% off every 5th visit",
            "Priority booking",
        ],
        "perks_ar": [
            "اكسب نقاط مع كل زيارة",
            "مكافأة عيد ميلاد",
            "خصم 5% كل 5 زيارات",
            "أولوية الحجز",
        ],
    },
    "gold": {
        "min_points": 250,
        "max_points": 499,
        "label_en": "Gold",
        "label_ar": "ذهبي",
        "emoji": "🥇",
        "perks_en": [
            "Earn 1.5x points on every visit",
            "Birthday reward + surprise gift",
            "10% off every 3rd visit",
            "Priority booking",
            "Exclusive menu items / services",
        ],
        "perks_ar": [
            "اكسب 1.5x نقاط مع كل زيارة",
            "مكافأة عيد ميلاد + هدية مفاجئة",
            "خصم 10% كل 3 زيارات",
            "أولوية الحجز",
            "أصناف / خدمات حصرية",
        ],
    },
    "platinum": {
        "min_points": 500,
        "max_points": 999999,
        "label_en": "Platinum",
        "label_ar": "بلاتيني",
        "emoji": "💎",
        "perks_en": [
            "Earn 2x points on every visit",
            "Birthday reward + VIP experience",
            "15% off every visit",
            "Priority booking + dedicated host",
            "Exclusive menu items / services",
            "Free delivery / valet",
            "Invite to VIP events",
        ],
        "perks_ar": [
            "اكسب 2x نقاط مع كل زيارة",
            "مكافأة عيد ميلاد + تجربة VIP",
            "خصم 15% كل زيارة",
            "أولوية الحجز + مضيف مخصص",
            "أصناف / خدمات حصرية",
            "توصيل مجاني / فاليه",
            "دعوة لفعاليات VIP",
        ],
    },
}

# Default reward catalog (clients can override via their config)
DEFAULT_REWARDS = [
    {
        "id": "free_drink",
        "name_en": "Free Drink",
        "name_ar": "مشروب مجاني",
        "points_cost": 30,
        "category": "food_drink",
        "industries": ["restaurant", "cafe"],
    },
    {
        "id": "free_dessert",
        "name_en": "Free Dessert",
        "name_ar": "حلى مجاني",
        "points_cost": 50,
        "category": "food_drink",
        "industries": ["restaurant", "cafe"],
    },
    {
        "id": "10_percent_off",
        "name_en": "10% Off Your Bill",
        "name_ar": "خصم 10% على الفاتورة",
        "points_cost": 75,
        "category": "discount",
        "industries": ["restaurant", "cafe", "salon"],
    },
    {
        "id": "20_percent_off",
        "name_en": "20% Off Your Bill",
        "name_ar": "خصم 20% على الفاتورة",
        "points_cost": 100,
        "category": "discount",
        "industries": ["restaurant", "cafe", "salon"],
    },
    {
        "id": "free_appetizer",
        "name_en": "Free Appetizer",
        "name_ar": "مقبلات مجانية",
        "points_cost": 40,
        "category": "food_drink",
        "industries": ["restaurant"],
    },
    {
        "id": "free_blowdry",
        "name_en": "Free Blow-Dry",
        "name_ar": "سشوار مجاني",
        "points_cost": 60,
        "category": "service",
        "industries": ["salon"],
    },
    {
        "id": "free_manicure",
        "name_en": "Free Manicure",
        "name_ar": "مانيكير مجاني",
        "points_cost": 80,
        "category": "service",
        "industries": ["salon"],
    },
    {
        "id": "free_coffee_upgrade",
        "name_en": "Free Coffee Upgrade",
        "name_ar": "ترقية قهوة مجانية",
        "points_cost": 25,
        "category": "food_drink",
        "industries": ["cafe"],
    },
    {
        "id": "vip_table",
        "name_en": "VIP Table Reservation",
        "name_ar": "حجز طاولة VIP",
        "points_cost": 150,
        "category": "experience",
        "industries": ["restaurant"],
    },
    {
        "id": "birthday_package",
        "name_en": "Birthday Celebration Package",
        "name_ar": "باكج احتفال عيد ميلاد",
        "points_cost": 200,
        "category": "experience",
        "industries": ["restaurant", "cafe", "salon"],
    },
    {
        "id": "free_facial",
        "name_en": "Free Facial Treatment",
        "name_ar": "علاج وجه مجاني",
        "points_cost": 120,
        "category": "service",
        "industries": ["salon"],
    },
    {
        "id": "chef_special",
        "name_en": "Chef's Special Dish (Off Menu)",
        "name_ar": "طبق الشيف الخاص (خارج المنيو)",
        "points_cost": 180,
        "category": "experience",
        "industries": ["restaurant"],
    },
]

# Points configuration defaults
DEFAULT_POINTS_CONFIG = {
    "mode": "per_visit",           # "per_visit" or "per_amount"
    "points_per_visit": 10,        # Points per visit (if per_visit mode)
    "points_per_unit": 1,          # Points per currency unit (if per_amount mode)
    "currency_unit": 10,           # AED/SAR per point (if per_amount mode: 1pt per 10 AED)
    "referral_bonus_referrer": 50, # Points for referring someone
    "referral_bonus_referee": 50,  # Points for being referred
    "birthday_bonus": 100,         # Birthday bonus points
    "signup_bonus": 25,            # Points on first joining
    "tier_multipliers": {
        "bronze": 1.0,
        "silver": 1.0,
        "gold": 1.5,
        "platinum": 2.0,
    },
}

# Lapsed member thresholds (days since last visit)
LAPSED_THRESHOLDS = {
    "at_risk": 14,     # 2 weeks — nudge
    "lapsed": 30,      # 1 month — "we miss you"
    "dormant": 60,     # 2 months — big incentive
}


# ═══════════════════════════════════════════════════════
# AI HELPERS
# ═══════════════════════════════════════════════════════

def _clean_ai_output(raw: str) -> str:
    """Clean MiniMax M2.7 output: strip think tags, CJK artifacts, bold markers."""
    content = re.sub(r"<think>[\s\S]*?</think>\s*", "", raw).strip()
    if not content:
        content = re.sub(r"</?think>", "", raw).strip()
    content = re.sub(
        r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u0400-\u04ff]+',
        '', content,
    ).strip()
    content = content.replace("**", "")
    content = re.sub(r'\s{2,}', ' ', content).strip()
    return content


async def _minimax_chat(
    system: str,
    user: str,
    max_tokens: int = 2000,
    temperature: float = 0.8,
) -> str:
    """Call MiniMax M2.7 chat completion. Returns cleaned text."""
    if not _MINIMAX_KEY:
        return "[AI key not configured — set MINIMAX_API_KEY]"
    try:
        async with httpx.AsyncClient(timeout=90) as http:
            r = await http.post(
                "https://api.minimax.io/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {_MINIMAX_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "MiniMax-M2.7",
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                },
            )
            raw = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            return _clean_ai_output(raw)
    except Exception as e:
        return f"[AI error: {e}]"


async def _minimax_json(
    system: str,
    user: str,
    max_tokens: int = 3000,
    temperature: float = 0.7,
) -> list | dict:
    """Call MiniMax and parse JSON from the response."""
    raw = await _minimax_chat(system, user, max_tokens, temperature)
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    text = fence_match.group(1).strip() if fence_match else raw.strip()
    start = None
    for i, ch in enumerate(text):
        if ch in ("[", "{"):
            start = i
            break
    if start is not None:
        bracket = text[start]
        close = "]" if bracket == "[" else "}"
        depth = 0
        for i in range(start, len(text)):
            if text[i] == bracket:
                depth += 1
            elif text[i] == close:
                depth -= 1
                if depth == 0:
                    text = text[start:i + 1]
                    break
    text = re.sub(r",\s*([}\]])", r"\1", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"error": "Failed to parse AI response", "raw": raw[:500]}


# ═══════════════════════════════════════════════════════
# SUPABASE HELPERS
# ═══════════════════════════════════════════════════════

async def _supa_get(path: str) -> list | dict:
    """GET from Supabase REST API. Returns parsed JSON or empty list."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(f"{_SUPA_URL}/rest/v1/{path}", headers=_SUPA_HEADERS)
            return r.json() if r.status_code == 200 else []
    except Exception:
        return []


async def _supa_post(table: str, data: dict) -> dict:
    """POST (insert) to Supabase REST API. Returns inserted row or error."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.post(
                f"{_SUPA_URL}/rest/v1/{table}",
                headers=_SUPA_HEADERS,
                json=data,
            )
            rows = r.json() if r.status_code in (200, 201) else []
            return rows[0] if isinstance(rows, list) and rows else {"status": "ok"}
    except Exception as e:
        return {"error": str(e)}


async def _supa_patch(table: str, filter_path: str, data: dict) -> dict:
    """PATCH (update) rows in Supabase REST API matching the filter."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.patch(
                f"{_SUPA_URL}/rest/v1/{table}?{filter_path}",
                headers=_SUPA_HEADERS,
                json=data,
            )
            rows = r.json() if r.status_code == 200 else []
            return rows[0] if isinstance(rows, list) and rows else {"status": "ok"}
    except Exception as e:
        return {"error": str(e)}


async def _log_activity(
    client_id: str,
    event_type: str,
    summary: str = "",
    payload: dict | None = None,
) -> None:
    """Write to activity_logs (append-only event stream)."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            await http.post(
                f"{_SUPA_URL}/rest/v1/activity_logs",
                headers=_SUPA_HEADERS,
                json={
                    "client_id": client_id,
                    "event_type": event_type,
                    "summary": summary[:500] if summary else "",
                    "payload": payload or {},
                },
            )
    except Exception:
        pass


async def _fetch_client(client_id: str) -> dict:
    """Fetch client row (company_name, country, plan, etc.)."""
    rows = await _supa_get(f"clients?id=eq.{client_id}&select=company_name,country,plan")
    return rows[0] if isinstance(rows, list) and rows else {}


async def _fetch_knowledge(client_id: str) -> dict:
    """Fetch business_knowledge for a client."""
    rows = await _supa_get(f"business_knowledge?client_id=eq.{client_id}&select=*")
    return rows[0] if isinstance(rows, list) and rows else {}


async def _fetch_loyalty_config(client_id: str) -> dict:
    """Fetch loyalty program configuration for a client.

    Looks in business_knowledge.loyalty_config. Falls back to defaults.
    """
    kb = await _fetch_knowledge(client_id)
    config = kb.get("loyalty_config", {}) or {}
    # Merge with defaults so missing keys are filled
    merged = {**DEFAULT_POINTS_CONFIG, **config}
    merged["tier_multipliers"] = {
        **DEFAULT_POINTS_CONFIG["tier_multipliers"],
        **(config.get("tier_multipliers", {})),
    }
    return merged


# ═══════════════════════════════════════════════════════
# MEMBER MANAGEMENT
# ═══════════════════════════════════════════════════════

def _determine_tier(total_points: int) -> str:
    """Determine tier from cumulative lifetime points."""
    if total_points >= 500:
        return "platinum"
    if total_points >= 250:
        return "gold"
    if total_points >= 100:
        return "silver"
    return "bronze"


def _format_tier_card(member: dict, lang: str = "en") -> str:
    """Format a compact tier status card for WhatsApp."""
    tier_key = member.get("tier", "bronze")
    tier = TIERS.get(tier_key, TIERS["bronze"])
    points = member.get("points_balance", 0)
    lifetime = member.get("lifetime_points", 0)
    visits = member.get("visit_count", 0)

    if lang == "ar":
        lines = [
            f"{tier['emoji']} عضوية {tier['label_ar']}",
            f"الرصيد: {points} نقطة",
            f"النقاط الكلية: {lifetime}",
            f"الزيارات: {visits}",
            "",
            "المزايا:",
        ]
        for perk in tier["perks_ar"]:
            lines.append(f"  - {perk}")
        # Next tier preview
        next_tier = _next_tier_info(lifetime, lang)
        if next_tier:
            lines.append(f"\n{next_tier}")
        return "\n".join(lines)

    lines = [
        f"{tier['emoji']} {tier['label_en']} Member",
        f"Balance: {points} pts",
        f"Lifetime: {lifetime} pts",
        f"Visits: {visits}",
        "",
        "Your Perks:",
    ]
    for perk in tier["perks_en"]:
        lines.append(f"  - {perk}")
    next_tier = _next_tier_info(lifetime, lang)
    if next_tier:
        lines.append(f"\n{next_tier}")
    return "\n".join(lines)


def _next_tier_info(lifetime_points: int, lang: str = "en") -> str:
    """Return a string showing progress toward the next tier."""
    current = _determine_tier(lifetime_points)
    tier_order = ["bronze", "silver", "gold", "platinum"]
    idx = tier_order.index(current)
    if idx >= len(tier_order) - 1:
        if lang == "ar":
            return "أنت في أعلى مستوى! شكراً لولائك"
        return "You're at the highest tier! Thank you for your loyalty"
    next_key = tier_order[idx + 1]
    next_tier = TIERS[next_key]
    needed = next_tier["min_points"] - lifetime_points
    if lang == "ar":
        return f"تحتاج {needed} نقطة للوصول إلى {next_tier['label_ar']} {next_tier['emoji']}"
    return f"{needed} pts to reach {next_tier['label_en']} {next_tier['emoji']}"


# ═══════════════════════════════════════════════════════
# CORE LOYALTY FUNCTIONS
# ═══════════════════════════════════════════════════════

async def get_member(client_id: str, customer_phone: str) -> dict:
    """Retrieve or create a loyalty member record.

    If the member does not exist yet, they are auto-enrolled with
    signup bonus points.

    Args:
        client_id: UUID of the tenant / business.
        customer_phone: Customer's WhatsApp phone (E.164 format).

    Returns:
        dict with member data: id, client_id, customer_phone, points_balance,
        lifetime_points, tier, visit_count, referral_code, birthday, etc.
    """
    phone_clean = customer_phone.strip().replace(" ", "")
    rows = await _supa_get(
        f"loyalty_members?client_id=eq.{client_id}"
        f"&customer_phone=eq.{phone_clean}&select=*"
    )
    if isinstance(rows, list) and rows:
        member = rows[0]
        # Recalculate tier in case points changed externally
        correct_tier = _determine_tier(member.get("lifetime_points", 0))
        if member.get("tier") != correct_tier:
            await _supa_patch(
                "loyalty_members",
                f"id=eq.{member['id']}",
                {"tier": correct_tier},
            )
            member["tier"] = correct_tier
        return member

    # Auto-enroll new member
    config = await _fetch_loyalty_config(client_id)
    referral_code = f"REF{uuid.uuid4().hex[:8].upper()}"
    new_member = {
        "id": str(uuid.uuid4()),
        "client_id": client_id,
        "customer_phone": phone_clean,
        "points_balance": config.get("signup_bonus", 25),
        "lifetime_points": config.get("signup_bonus", 25),
        "tier": "bronze",
        "visit_count": 0,
        "referral_code": referral_code,
        "referred_by": None,
        "birthday": None,
        "last_visit_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await _supa_post("loyalty_members", new_member)
    if "error" in result:
        # Table might not exist yet — return the in-memory record
        new_member["_note"] = "created_in_memory"
    else:
        new_member.update(result)

    await _log_activity(
        client_id=client_id,
        event_type="loyalty_signup",
        summary=f"New loyalty member: {phone_clean} (+{config.get('signup_bonus', 25)} signup bonus)",
        payload={"phone": phone_clean, "referral_code": referral_code},
    )

    return new_member


async def add_points(
    client_id: str,
    customer_phone: str,
    points: int,
    reason: str = "visit",
) -> dict:
    """Add points to a member's balance.

    Handles tier multipliers (Gold/Platinum earn more), updates
    lifetime total, and recalculates tier.

    Args:
        client_id: UUID of the tenant.
        customer_phone: Customer's phone (E.164).
        points: Base points to add (before multiplier).
        reason: Why points are being added (visit, purchase, referral, birthday, etc.).

    Returns:
        dict with updated member info, points_added, new_balance, tier change info.
    """
    member = await get_member(client_id, customer_phone)
    config = await _fetch_loyalty_config(client_id)

    # Apply tier multiplier
    current_tier = member.get("tier", "bronze")
    multiplier = config.get("tier_multipliers", {}).get(current_tier, 1.0)
    actual_points = int(points * multiplier)

    old_balance = member.get("points_balance", 0)
    old_lifetime = member.get("lifetime_points", 0)
    old_tier = current_tier

    new_balance = old_balance + actual_points
    new_lifetime = old_lifetime + actual_points
    new_tier = _determine_tier(new_lifetime)

    update_data = {
        "points_balance": new_balance,
        "lifetime_points": new_lifetime,
        "tier": new_tier,
    }

    # If reason is visit, also bump visit count
    if reason in ("visit", "booking", "purchase"):
        update_data["visit_count"] = member.get("visit_count", 0) + 1
        update_data["last_visit_at"] = datetime.now(timezone.utc).isoformat()

    await _supa_patch(
        "loyalty_members",
        f"client_id=eq.{client_id}&customer_phone=eq.{customer_phone.strip()}",
        update_data,
    )

    # Log the transaction
    await _supa_post("loyalty_transactions", {
        "id": str(uuid.uuid4()),
        "client_id": client_id,
        "customer_phone": customer_phone.strip(),
        "points": actual_points,
        "type": "earn",
        "reason": reason,
        "balance_after": new_balance,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    tier_changed = old_tier != new_tier

    await _log_activity(
        client_id=client_id,
        event_type="loyalty_points_added",
        summary=(
            f"+{actual_points} pts to {customer_phone} ({reason}). "
            f"Balance: {new_balance}. "
            f"{'Tier upgrade: ' + new_tier + '!' if tier_changed else ''}"
        ),
        payload={
            "phone": customer_phone,
            "points_added": actual_points,
            "multiplier": multiplier,
            "reason": reason,
            "new_balance": new_balance,
            "new_lifetime": new_lifetime,
            "tier_changed": tier_changed,
            "old_tier": old_tier,
            "new_tier": new_tier,
        },
    )

    return {
        "customer_phone": customer_phone,
        "points_added": actual_points,
        "multiplier": multiplier,
        "reason": reason,
        "new_balance": new_balance,
        "lifetime_points": new_lifetime,
        "tier": new_tier,
        "tier_changed": tier_changed,
        "old_tier": old_tier if tier_changed else None,
    }


async def redeem_reward(
    client_id: str,
    customer_phone: str,
    reward_id: str,
) -> dict:
    """Redeem a reward from the catalog.

    Deducts points, creates a redemption record, and returns
    a confirmation with the reward details.

    Args:
        client_id: UUID of the tenant.
        customer_phone: Customer's phone (E.164).
        reward_id: ID of the reward to redeem (from the catalog).

    Returns:
        dict with success/error, reward details, remaining balance.
    """
    member = await get_member(client_id, customer_phone)
    catalog = await get_rewards_catalog(client_id)

    # Find the reward
    reward = None
    for r in catalog:
        if r.get("id") == reward_id:
            reward = r
            break

    if not reward:
        return {
            "success": False,
            "error": "reward_not_found",
            "message": f"Reward '{reward_id}' not found in catalog.",
        }

    cost = reward.get("points_cost", 0)
    balance = member.get("points_balance", 0)

    if balance < cost:
        return {
            "success": False,
            "error": "insufficient_points",
            "message": f"You need {cost} pts but have {balance} pts.",
            "points_needed": cost - balance,
            "current_balance": balance,
        }

    new_balance = balance - cost

    # Deduct points
    await _supa_patch(
        "loyalty_members",
        f"client_id=eq.{client_id}&customer_phone=eq.{customer_phone.strip()}",
        {"points_balance": new_balance},
    )

    # Create redemption record
    redemption_id = str(uuid.uuid4())
    await _supa_post("loyalty_transactions", {
        "id": redemption_id,
        "client_id": client_id,
        "customer_phone": customer_phone.strip(),
        "points": -cost,
        "type": "redeem",
        "reason": f"Redeemed: {reward.get('name_en', reward_id)}",
        "balance_after": new_balance,
        "reward_id": reward_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    await _log_activity(
        client_id=client_id,
        event_type="loyalty_redemption",
        summary=f"{customer_phone} redeemed '{reward.get('name_en', reward_id)}' for {cost} pts",
        payload={
            "phone": customer_phone,
            "reward": reward,
            "cost": cost,
            "new_balance": new_balance,
            "redemption_id": redemption_id,
        },
    )

    return {
        "success": True,
        "redemption_id": redemption_id,
        "reward": reward,
        "points_spent": cost,
        "new_balance": new_balance,
        "message_en": f"Redeemed: {reward.get('name_en', '')}! Show this message to claim.",
        "message_ar": f"تم الاستبدال: {reward.get('name_ar', '')}! أظهر هذه الرسالة للاستلام.",
    }


async def get_rewards_catalog(client_id: str) -> list:
    """Get the rewards catalog for a client.

    Returns client-specific rewards if configured, otherwise
    filters the default catalog by the client's industry.

    Args:
        client_id: UUID of the tenant.

    Returns:
        list of reward dicts with id, name_en, name_ar, points_cost, category.
    """
    # Check for client-specific catalog in business_knowledge
    kb = await _fetch_knowledge(client_id)
    custom_rewards = kb.get("loyalty_rewards", [])
    if custom_rewards and isinstance(custom_rewards, list):
        return custom_rewards

    # Detect industry and filter defaults
    crawl = kb.get("crawl_data", {}) or {}
    industry = (crawl.get("industry", "") or "").lower()

    if not industry:
        desc = (kb.get("business_description", "") or "").lower()
        if any(w in desc for w in ("cafe", "coffee", "barista")):
            industry = "cafe"
        elif any(w in desc for w in ("salon", "beauty", "hair", "spa")):
            industry = "salon"
        else:
            industry = "restaurant"

    filtered = [
        r for r in DEFAULT_REWARDS
        if industry in r.get("industries", [])
    ]
    return filtered if filtered else DEFAULT_REWARDS


async def check_tier(client_id: str, customer_phone: str) -> dict:
    """Check a member's current tier status and progress.

    Args:
        client_id: UUID of the tenant.
        customer_phone: Customer's phone (E.164).

    Returns:
        dict with tier, tier_info, points_balance, lifetime_points,
        next_tier_info, and a formatted status card.
    """
    member = await get_member(client_id, customer_phone)
    tier_key = member.get("tier", "bronze")
    tier_info = TIERS.get(tier_key, TIERS["bronze"])

    return {
        "customer_phone": customer_phone,
        "tier": tier_key,
        "tier_label_en": tier_info["label_en"],
        "tier_label_ar": tier_info["label_ar"],
        "tier_emoji": tier_info["emoji"],
        "points_balance": member.get("points_balance", 0),
        "lifetime_points": member.get("lifetime_points", 0),
        "visit_count": member.get("visit_count", 0),
        "next_tier_en": _next_tier_info(member.get("lifetime_points", 0), "en"),
        "next_tier_ar": _next_tier_info(member.get("lifetime_points", 0), "ar"),
        "perks_en": tier_info["perks_en"],
        "perks_ar": tier_info["perks_ar"],
        "card_en": _format_tier_card(member, "en"),
        "card_ar": _format_tier_card(member, "ar"),
    }


async def get_leaderboard(client_id: str, limit: int = 10) -> list:
    """Get the top loyalty members by lifetime points.

    Useful for gamification — show top members, encourage competition.

    Args:
        client_id: UUID of the tenant.
        limit: Max number of members to return.

    Returns:
        list of dicts with rank, phone (masked), tier, lifetime_points, visit_count.
    """
    rows = await _supa_get(
        f"loyalty_members?client_id=eq.{client_id}"
        f"&select=customer_phone,lifetime_points,tier,visit_count"
        f"&order=lifetime_points.desc&limit={limit}"
    )
    if not isinstance(rows, list):
        return []

    leaderboard = []
    for rank, row in enumerate(rows, 1):
        phone = row.get("customer_phone", "")
        # Mask phone for privacy: +971XXXX1234 -> +971****1234
        if len(phone) > 6:
            masked = phone[:4] + "****" + phone[-4:]
        else:
            masked = "****" + phone[-4:] if len(phone) > 4 else phone

        tier_key = row.get("tier", "bronze")
        tier_info = TIERS.get(tier_key, TIERS["bronze"])

        leaderboard.append({
            "rank": rank,
            "phone_masked": masked,
            "tier": tier_key,
            "tier_emoji": tier_info["emoji"],
            "tier_label_en": tier_info["label_en"],
            "lifetime_points": row.get("lifetime_points", 0),
            "visit_count": row.get("visit_count", 0),
        })

    return leaderboard


# ═══════════════════════════════════════════════════════
# WHATSAPP COMMAND HANDLER
# ═══════════════════════════════════════════════════════

async def process_loyalty_command(
    client_id: str,
    customer_phone: str,
    message: str,
    lang: str = "en",
) -> str:
    """Process loyalty-related WhatsApp commands from customers.

    Recognized commands (EN/AR):
        points / نقاطي / نقاط / رصيدي     — check balance + tier
        redeem <reward> / استبدال <reward>  — redeem a reward
        rewards / مكافآت / المكافآت        — show available rewards
        refer / إحالة / دعوة               — get referral code
        tier / مستوى / درجتي               — detailed tier info
        leaderboard / ترتيب                — top members

    Args:
        client_id: UUID of the tenant.
        customer_phone: Customer's phone (E.164).
        message: Raw text message from the customer.
        lang: Detected language ("en" or "ar").

    Returns:
        str: Response message for WhatsApp.
    """
    cmd = message.strip().lower()

    # --- Check Points / Balance ---
    if cmd in ("points", "balance", "my points", "نقاطي", "نقاط", "رصيدي", "رصيد"):
        member = await get_member(client_id, customer_phone)
        return _format_tier_card(member, lang)

    # --- Tier Details ---
    if cmd in ("tier", "my tier", "level", "مستوى", "درجتي", "مستواي"):
        info = await check_tier(client_id, customer_phone)
        if lang == "ar":
            return info["card_ar"]
        return info["card_en"]

    # --- Show Rewards Catalog ---
    if cmd in ("rewards", "reward", "catalog", "مكافآت", "المكافآت", "مكافأة", "كتالوج"):
        member = await get_member(client_id, customer_phone)
        catalog = await get_rewards_catalog(client_id)
        balance = member.get("points_balance", 0)

        if lang == "ar":
            lines = [f"المكافآت المتاحة (رصيدك: {balance} نقطة):", ""]
            for r in catalog:
                cost = r.get("points_cost", 0)
                can_redeem = "✅" if balance >= cost else "❌"
                lines.append(f"{can_redeem} {r.get('name_ar', r.get('name_en', ''))} — {cost} نقطة")
            lines.append("")
            lines.append("للاستبدال أرسل: استبدال [اسم المكافأة]")
        else:
            lines = [f"Available Rewards (your balance: {balance} pts):", ""]
            for r in catalog:
                cost = r.get("points_cost", 0)
                can_redeem = "✅" if balance >= cost else "❌"
                lines.append(f"{can_redeem} {r.get('name_en', '')} — {cost} pts")
            lines.append("")
            lines.append("To redeem, send: redeem [reward name]")
        return "\n".join(lines)

    # --- Redeem ---
    redeem_match_en = re.match(r"^redeem\s+(.+)$", cmd)
    redeem_match_ar = re.match(r"^(?:استبدال|استبدل)\s+(.+)$", cmd)
    redeem_query = None
    if redeem_match_en:
        redeem_query = redeem_match_en.group(1).strip()
    elif redeem_match_ar:
        redeem_query = redeem_match_ar.group(1).strip()

    if redeem_query:
        catalog = await get_rewards_catalog(client_id)
        # Fuzzy match: find the best matching reward
        matched_reward = _fuzzy_match_reward(redeem_query, catalog, lang)
        if not matched_reward:
            if lang == "ar":
                return f"لم أجد مكافأة بهذا الاسم. أرسل 'مكافآت' لرؤية القائمة."
            return f"Couldn't find that reward. Send 'rewards' to see the catalog."

        result = await redeem_reward(client_id, customer_phone, matched_reward["id"])
        if result.get("success"):
            if lang == "ar":
                return (
                    f"تم الاستبدال بنجاح!\n\n"
                    f"المكافأة: {result['reward'].get('name_ar', '')}\n"
                    f"النقاط المستخدمة: {result['points_spent']}\n"
                    f"الرصيد المتبقي: {result['new_balance']} نقطة\n\n"
                    f"أظهر هذه الرسالة عند زيارتك القادمة"
                )
            return (
                f"Redeemed successfully!\n\n"
                f"Reward: {result['reward'].get('name_en', '')}\n"
                f"Points used: {result['points_spent']}\n"
                f"Remaining balance: {result['new_balance']} pts\n\n"
                f"Show this message on your next visit"
            )
        else:
            error = result.get("error", "unknown")
            if error == "insufficient_points":
                if lang == "ar":
                    return (
                        f"رصيدك غير كافٍ.\n"
                        f"تحتاج {result.get('points_needed', 0)} نقطة إضافية.\n"
                        f"رصيدك الحالي: {result.get('current_balance', 0)} نقطة"
                    )
                return (
                    f"Not enough points.\n"
                    f"You need {result.get('points_needed', 0)} more points.\n"
                    f"Current balance: {result.get('current_balance', 0)} pts"
                )
            if lang == "ar":
                return f"حدث خطأ: {result.get('message', error)}"
            return f"Error: {result.get('message', error)}"

    # --- Referral Code ---
    if cmd in ("refer", "referral", "invite", "إحالة", "دعوة", "كود الإحالة"):
        member = await get_member(client_id, customer_phone)
        code = member.get("referral_code", "N/A")
        config = await _fetch_loyalty_config(client_id)
        bonus = config.get("referral_bonus_referrer", 50)

        if lang == "ar":
            return (
                f"كود الإحالة الخاص بك: {code}\n\n"
                f"شارك هذا الكود مع أصدقائك.\n"
                f"كلاكما ستحصلان على {bonus} نقطة عند زيارتهم الأولى!"
            )
        return (
            f"Your referral code: {code}\n\n"
            f"Share this code with friends.\n"
            f"You both earn {bonus} pts when they visit!"
        )

    # --- Leaderboard ---
    if cmd in ("leaderboard", "top", "ranking", "ترتيب", "المتصدرين"):
        board = await get_leaderboard(client_id, limit=10)
        if not board:
            if lang == "ar":
                return "لا يوجد أعضاء في برنامج الولاء بعد."
            return "No loyalty members yet."

        if lang == "ar":
            lines = ["لوحة المتصدرين:", ""]
            for entry in board:
                lines.append(
                    f"#{entry['rank']} {entry['tier_emoji']} {entry['phone_masked']} "
                    f"— {entry['lifetime_points']} نقطة ({entry['visit_count']} زيارة)"
                )
        else:
            lines = ["Leaderboard:", ""]
            for entry in board:
                lines.append(
                    f"#{entry['rank']} {entry['tier_emoji']} {entry['phone_masked']} "
                    f"— {entry['lifetime_points']} pts ({entry['visit_count']} visits)"
                )
        return "\n".join(lines)

    # --- Not a loyalty command ---
    return ""


def _fuzzy_match_reward(query: str, catalog: list, lang: str = "en") -> Optional[dict]:
    """Fuzzy-match a reward name from the catalog.

    Checks exact ID match first, then substring match on name fields.
    """
    query_lower = query.lower().strip()

    # Exact ID match
    for r in catalog:
        if r.get("id", "").lower() == query_lower:
            return r

    # Substring match on names
    for r in catalog:
        name_en = (r.get("name_en", "") or "").lower()
        name_ar = (r.get("name_ar", "") or "").lower()
        if query_lower in name_en or query_lower in name_ar:
            return r

    # Partial word match
    query_words = set(query_lower.split())
    best_match = None
    best_score = 0
    for r in catalog:
        name_en = (r.get("name_en", "") or "").lower()
        name_ar = (r.get("name_ar", "") or "").lower()
        name_words = set(name_en.split()) | set(name_ar.split())
        overlap = len(query_words & name_words)
        if overlap > best_score:
            best_score = overlap
            best_match = r

    return best_match if best_score > 0 else None


# ═══════════════════════════════════════════════════════
# AUTO-TRACKING
# ═══════════════════════════════════════════════════════

async def auto_track_visit(
    client_id: str,
    customer_phone: str,
    booking_data: dict | None = None,
) -> dict:
    """Automatically track a visit and award points.

    Called when a booking is confirmed, a conversation indicates
    a visit, or a check-in event occurs.

    Args:
        client_id: UUID of the tenant.
        customer_phone: Customer's phone (E.164).
        booking_data: Optional dict with booking details
            (amount, service, date, etc.).

    Returns:
        dict with points_added, new_balance, tier, and any messages.
    """
    config = await _fetch_loyalty_config(client_id)
    mode = config.get("mode", "per_visit")

    if mode == "per_amount" and booking_data:
        # Calculate points from spend amount
        amount = booking_data.get("amount", 0) or booking_data.get("total", 0)
        currency_unit = config.get("currency_unit", 10)
        points_per_unit = config.get("points_per_unit", 1)
        base_points = int((amount / currency_unit) * points_per_unit) if currency_unit > 0 else 0
        reason = f"purchase ({amount} spent)"
    else:
        # Fixed points per visit
        base_points = config.get("points_per_visit", 10)
        reason = "visit"

    if base_points <= 0:
        base_points = config.get("points_per_visit", 10)

    result = await add_points(client_id, customer_phone, base_points, reason)

    # Detect birthday from booking data and store it
    if booking_data and booking_data.get("birthday"):
        member = await get_member(client_id, customer_phone)
        if not member.get("birthday"):
            await _supa_patch(
                "loyalty_members",
                f"client_id=eq.{client_id}&customer_phone=eq.{customer_phone.strip()}",
                {"birthday": booking_data["birthday"]},
            )

    # Build response messages
    messages = []
    if result.get("tier_changed"):
        tier_info = TIERS.get(result["tier"], {})
        messages.append(
            f"Congratulations! You've reached {tier_info.get('label_en', result['tier'])} "
            f"{tier_info.get('emoji', '')} status!"
        )

    result["messages"] = messages
    result["booking_data"] = booking_data
    return result


# ═══════════════════════════════════════════════════════
# BIRTHDAY REWARDS
# ═══════════════════════════════════════════════════════

async def check_birthday_rewards(client_id: str) -> list:
    """Check for members whose birthday is today or in the next 3 days.

    Returns a list of members who should receive birthday rewards,
    along with suggested messages.

    Args:
        client_id: UUID of the tenant.

    Returns:
        list of dicts with member info, birthday date, and suggested
        WhatsApp messages in EN and AR.
    """
    rows = await _supa_get(
        f"loyalty_members?client_id=eq.{client_id}"
        f"&birthday=not.is.null&select=customer_phone,birthday,tier,points_balance,lifetime_points"
    )
    if not isinstance(rows, list):
        return []

    now = datetime.now(timezone.utc)
    config = await _fetch_loyalty_config(client_id)
    client = await _fetch_client(client_id)
    company_name = client.get("company_name", "us")
    birthday_bonus = config.get("birthday_bonus", 100)

    birthday_members = []

    for row in rows:
        birthday_str = row.get("birthday", "")
        if not birthday_str:
            continue

        try:
            # Birthday stored as MM-DD or YYYY-MM-DD
            if len(birthday_str) <= 5:
                bday = datetime.strptime(birthday_str, "%m-%d").replace(
                    year=now.year, tzinfo=timezone.utc
                )
            else:
                bday_parsed = datetime.fromisoformat(birthday_str.replace("Z", "+00:00"))
                bday = bday_parsed.replace(year=now.year, tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue

        days_until = (bday.date() - now.date()).days

        if 0 <= days_until <= 3:
            tier_key = row.get("tier", "bronze")
            tier_info = TIERS.get(tier_key, TIERS["bronze"])

            # Scale birthday reward by tier
            tier_multiplier = {"bronze": 1, "silver": 1.5, "gold": 2, "platinum": 3}
            actual_bonus = int(birthday_bonus * tier_multiplier.get(tier_key, 1))

            if days_until == 0:
                msg_en = (
                    f"Happy Birthday! 🎂 {company_name} is celebrating with you!\n\n"
                    f"We've added {actual_bonus} bonus points to your account.\n"
                    f"As a {tier_info['label_en']} member, enjoy a special treat on us today!"
                )
                msg_ar = (
                    f"عيد ميلاد سعيد! 🎂 {company_name} يحتفل معك!\n\n"
                    f"أضفنا {actual_bonus} نقطة هدية لحسابك.\n"
                    f"كعضو {tier_info['label_ar']}، استمتع بمفاجأة خاصة منا اليوم!"
                )
            else:
                msg_en = (
                    f"Your birthday is in {days_until} day{'s' if days_until > 1 else ''}! 🎂\n\n"
                    f"Visit {company_name} on your special day and receive "
                    f"{actual_bonus} bonus points + a birthday surprise!"
                )
                msg_ar = (
                    f"عيد ميلادك بعد {days_until} يوم! 🎂\n\n"
                    f"زورنا في {company_name} في يومك المميز واحصل على "
                    f"{actual_bonus} نقطة هدية + مفاجأة عيد ميلاد!"
                )

            birthday_members.append({
                "customer_phone": row["customer_phone"],
                "birthday": birthday_str,
                "days_until": days_until,
                "is_today": days_until == 0,
                "tier": tier_key,
                "bonus_points": actual_bonus,
                "message_en": msg_en,
                "message_ar": msg_ar,
            })

    # Log birthday check
    if birthday_members:
        await _log_activity(
            client_id=client_id,
            event_type="loyalty_birthday_check",
            summary=f"Found {len(birthday_members)} upcoming birthdays",
            payload={"members": [m["customer_phone"] for m in birthday_members]},
        )

    return birthday_members


# ═══════════════════════════════════════════════════════
# RE-ENGAGEMENT — "We Miss You" Messages
# ═══════════════════════════════════════════════════════

async def _get_lapsed_members(client_id: str) -> list:
    """Find members who haven't visited recently.

    Categories:
        at_risk (14+ days): gentle nudge
        lapsed (30+ days): "we miss you" + incentive
        dormant (60+ days): big offer to win them back

    Returns:
        list of member dicts with lapse_category and days_since_visit.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=LAPSED_THRESHOLDS["at_risk"])).isoformat()
    rows = await _supa_get(
        f"loyalty_members?client_id=eq.{client_id}"
        f"&last_visit_at=not.is.null"
        f"&last_visit_at=lt.{cutoff}"
        f"&select=customer_phone,last_visit_at,tier,points_balance,visit_count"
        f"&order=last_visit_at.asc&limit=50"
    )
    if not isinstance(rows, list):
        return []

    now = datetime.now(timezone.utc)
    lapsed = []

    for row in rows:
        last_visit_str = row.get("last_visit_at", "")
        if not last_visit_str:
            continue
        try:
            last_visit = datetime.fromisoformat(last_visit_str.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            continue

        days_since = (now - last_visit).days

        if days_since >= LAPSED_THRESHOLDS["dormant"]:
            category = "dormant"
        elif days_since >= LAPSED_THRESHOLDS["lapsed"]:
            category = "lapsed"
        elif days_since >= LAPSED_THRESHOLDS["at_risk"]:
            category = "at_risk"
        else:
            continue

        row["days_since_visit"] = days_since
        row["lapse_category"] = category
        lapsed.append(row)

    return lapsed


async def generate_reengagement_messages(client_id: str, lang: str = "en") -> list:
    """Generate personalized re-engagement messages for lapsed members.

    Uses AI to create warm, personalized messages based on member
    history and lapse severity.

    Args:
        client_id: UUID of the tenant.
        lang: "en" or "ar".

    Returns:
        list of dicts with phone, category, days_since, message.
    """
    lapsed = await _get_lapsed_members(client_id)
    if not lapsed:
        return []

    client = await _fetch_client(client_id)
    company_name = client.get("company_name", "us")
    config = await _fetch_loyalty_config(client_id)

    messages = []
    for member in lapsed:
        category = member["lapse_category"]
        days = member["days_since_visit"]
        balance = member.get("points_balance", 0)
        tier_key = member.get("tier", "bronze")
        tier_info = TIERS.get(tier_key, TIERS["bronze"])

        if category == "at_risk":
            if lang == "ar":
                msg = (
                    f"مرحبا! اشتقنا لك في {company_name} 💫\n\n"
                    f"رصيدك {balance} نقطة بانتظارك.\n"
                    f"تعال زورنا قريباً!"
                )
            else:
                msg = (
                    f"Hey there! We've missed you at {company_name} 💫\n\n"
                    f"You have {balance} pts waiting for you.\n"
                    f"Come visit us soon!"
                )
        elif category == "lapsed":
            bonus_offer = int(config.get("points_per_visit", 10) * 3)
            if lang == "ar":
                msg = (
                    f"وحشتنا! مر علينا شهر من آخر زيارة 🥺\n\n"
                    f"عندك {balance} نقطة. زورنا هالأسبوع واحصل على "
                    f"{bonus_offer} نقاط إضافية كهدية خاصة!\n\n"
                    f"عضوية {tier_info['label_ar']} {tier_info['emoji']} بانتظارك."
                )
            else:
                msg = (
                    f"We miss you! It's been a month since your last visit 🥺\n\n"
                    f"You have {balance} pts. Visit us this week and earn "
                    f"{bonus_offer} bonus pts as a special gift!\n\n"
                    f"Your {tier_info['label_en']} {tier_info['emoji']} membership is waiting."
                )
        else:  # dormant
            bonus_offer = int(config.get("points_per_visit", 10) * 5)
            if lang == "ar":
                msg = (
                    f"اشتقنا لك كثير! مر {days} يوم من آخر زيارة 😢\n\n"
                    f"جهزنا لك عرض خاص:\n"
                    f"زورنا هالأسبوع واحصل على {bonus_offer} نقطة مجانية!\n\n"
                    f"رصيدك الحالي: {balance} نقطة\n"
                    f"لا تخلي نقاطك تروح!"
                )
            else:
                msg = (
                    f"We really miss you! It's been {days} days 😢\n\n"
                    f"We have a special offer for you:\n"
                    f"Visit us this week and get {bonus_offer} FREE bonus points!\n\n"
                    f"Current balance: {balance} pts\n"
                    f"Don't let your points go to waste!"
                )

        messages.append({
            "customer_phone": member["customer_phone"],
            "lapse_category": category,
            "days_since_visit": days,
            "tier": tier_key,
            "points_balance": balance,
            "message": msg,
            "lang": lang,
        })

    await _log_activity(
        client_id=client_id,
        event_type="loyalty_reengagement",
        summary=f"Generated {len(messages)} re-engagement messages",
        payload={
            "counts": {
                "at_risk": sum(1 for m in messages if m["lapse_category"] == "at_risk"),
                "lapsed": sum(1 for m in messages if m["lapse_category"] == "lapsed"),
                "dormant": sum(1 for m in messages if m["lapse_category"] == "dormant"),
            },
        },
    )

    return messages


# ═══════════════════════════════════════════════════════
# REFERRAL PROGRAM
# ═══════════════════════════════════════════════════════

async def process_referral(
    client_id: str,
    new_customer_phone: str,
    referral_code: str,
) -> dict:
    """Process a referral when a new customer provides a referral code.

    Awards points to both the referrer and the new customer.

    Args:
        client_id: UUID of the tenant.
        new_customer_phone: The new customer's phone (E.164).
        referral_code: The referral code provided.

    Returns:
        dict with success status, referrer info, and points awarded.
    """
    # Find the referrer by code
    rows = await _supa_get(
        f"loyalty_members?client_id=eq.{client_id}"
        f"&referral_code=eq.{referral_code}&select=customer_phone,referral_code"
    )
    if not isinstance(rows, list) or not rows:
        return {
            "success": False,
            "error": "invalid_code",
            "message": "Referral code not found.",
        }

    referrer_phone = rows[0]["customer_phone"]

    # Prevent self-referral
    if referrer_phone.strip() == new_customer_phone.strip():
        return {
            "success": False,
            "error": "self_referral",
            "message": "You can't refer yourself.",
        }

    # Check if new customer is already a member (can't be referred twice)
    existing = await _supa_get(
        f"loyalty_members?client_id=eq.{client_id}"
        f"&customer_phone=eq.{new_customer_phone.strip()}&select=id,referred_by"
    )
    if isinstance(existing, list) and existing:
        if existing[0].get("referred_by"):
            return {
                "success": False,
                "error": "already_referred",
                "message": "This member was already referred by someone.",
            }

    config = await _fetch_loyalty_config(client_id)
    referrer_bonus = config.get("referral_bonus_referrer", 50)
    referee_bonus = config.get("referral_bonus_referee", 50)

    # Award points to referrer
    referrer_result = await add_points(
        client_id, referrer_phone, referrer_bonus, "referral_bonus"
    )

    # Create/get the new member and award bonus
    new_member = await get_member(client_id, new_customer_phone)
    referee_result = await add_points(
        client_id, new_customer_phone, referee_bonus, "referred_signup_bonus"
    )

    # Mark who referred them
    await _supa_patch(
        "loyalty_members",
        f"client_id=eq.{client_id}&customer_phone=eq.{new_customer_phone.strip()}",
        {"referred_by": referrer_phone},
    )

    await _log_activity(
        client_id=client_id,
        event_type="loyalty_referral",
        summary=f"Referral: {referrer_phone} -> {new_customer_phone} (+{referrer_bonus}/{referee_bonus} pts)",
        payload={
            "referrer": referrer_phone,
            "referee": new_customer_phone,
            "referral_code": referral_code,
            "referrer_bonus": referrer_bonus,
            "referee_bonus": referee_bonus,
        },
    )

    return {
        "success": True,
        "referrer_phone": referrer_phone,
        "referee_phone": new_customer_phone,
        "referrer_points_added": referrer_bonus,
        "referee_points_added": referee_bonus,
        "referrer_new_balance": referrer_result.get("new_balance", 0),
        "referee_new_balance": referee_result.get("new_balance", 0),
    }


# ═══════════════════════════════════════════════════════
# OWNER MORNING BRIEF
# ═══════════════════════════════════════════════════════

async def get_loyalty_brief(client_id: str, lang: str = "en") -> str:
    """Generate a WhatsApp-friendly loyalty program brief for the owner.

    Summarizes program health: total members, tier distribution,
    recent activity, lapsed members, upcoming birthdays, and
    top performers.

    Args:
        client_id: UUID of the tenant.
        lang: "en" or "ar".

    Returns:
        str: Formatted WhatsApp message with loyalty insights.
    """
    client = await _fetch_client(client_id)
    company_name = client.get("company_name", "your business")

    # Fetch all members
    all_members = await _supa_get(
        f"loyalty_members?client_id=eq.{client_id}"
        f"&select=customer_phone,tier,points_balance,lifetime_points,visit_count,last_visit_at,birthday"
        f"&order=lifetime_points.desc&limit=500"
    )
    if not isinstance(all_members, list):
        all_members = []

    total = len(all_members)

    # Tier distribution
    tier_counts: dict[str, int] = {"bronze": 0, "silver": 0, "gold": 0, "platinum": 0}
    total_visits = 0
    total_lifetime_pts = 0
    for m in all_members:
        tier = m.get("tier", "bronze")
        tier_counts[tier] = tier_counts.get(tier, 0) + 1
        total_visits += m.get("visit_count", 0)
        total_lifetime_pts += m.get("lifetime_points", 0)

    # New members (last 7 days)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    new_members_rows = await _supa_get(
        f"loyalty_members?client_id=eq.{client_id}"
        f"&created_at=gte.{week_ago}&select=id"
    )
    new_this_week = len(new_members_rows) if isinstance(new_members_rows, list) else 0

    # Recent transactions (last 7 days)
    recent_txns = await _supa_get(
        f"loyalty_transactions?client_id=eq.{client_id}"
        f"&created_at=gte.{week_ago}"
        f"&select=type,points&limit=200"
    )
    recent_txns = recent_txns if isinstance(recent_txns, list) else []
    points_earned = sum(t.get("points", 0) for t in recent_txns if t.get("type") == "earn")
    redemptions = sum(1 for t in recent_txns if t.get("type") == "redeem")

    # Lapsed members
    lapsed = await _get_lapsed_members(client_id)
    at_risk_count = sum(1 for m in lapsed if m.get("lapse_category") == "at_risk")
    lapsed_count = sum(1 for m in lapsed if m.get("lapse_category") == "lapsed")
    dormant_count = sum(1 for m in lapsed if m.get("lapse_category") == "dormant")

    # Birthdays
    birthdays = await check_birthday_rewards(client_id)

    # Top 3 members
    top3 = all_members[:3]

    if lang == "ar":
        lines = [
            f"تقرير الولاء — {company_name}",
            f"{datetime.now(timezone.utc).strftime('%d %b %Y')}",
            "",
            "--- الأعضاء ---",
            f"  الإجمالي: {total} عضو",
            f"  جدد هذا الأسبوع: {new_this_week}",
            "",
            "--- التوزيع ---",
        ]
        for tier_key, count in tier_counts.items():
            tier_info = TIERS[tier_key]
            lines.append(f"  {tier_info['emoji']} {tier_info['label_ar']}: {count}")

        lines.extend([
            "",
            "--- النشاط (آخر 7 أيام) ---",
            f"  نقاط مكتسبة: {points_earned}",
            f"  استبدالات: {redemptions}",
            f"  الزيارات الكلية: {total_visits}",
        ])

        if lapsed:
            lines.extend([
                "",
                "--- الأعضاء المتغيبين ---",
                f"  معرضين للخسارة (14+ يوم): {at_risk_count}",
                f"  متغيبين (30+ يوم): {lapsed_count}",
                f"  خاملين (60+ يوم): {dormant_count}",
            ])

        if birthdays:
            lines.extend(["", "--- أعياد ميلاد قادمة ---"])
            for b in birthdays[:5]:
                phone_masked = b["customer_phone"][:4] + "****" + b["customer_phone"][-4:]
                if b["is_today"]:
                    lines.append(f"  🎂 {phone_masked} — اليوم!")
                else:
                    lines.append(f"  🎂 {phone_masked} — بعد {b['days_until']} يوم")

        if top3:
            lines.extend(["", "--- المتصدرين ---"])
            for i, m in enumerate(top3, 1):
                phone = m.get("customer_phone", "")
                masked = phone[:4] + "****" + phone[-4:] if len(phone) > 6 else phone
                tier_info = TIERS.get(m.get("tier", "bronze"), TIERS["bronze"])
                lines.append(
                    f"  {i}. {tier_info['emoji']} {masked} — "
                    f"{m.get('lifetime_points', 0)} نقطة"
                )

        lines.extend(["", "أرسل 'تقرير' لتفاصيل أكثر"])

    else:
        lines = [
            f"Loyalty Brief — {company_name}",
            f"{datetime.now(timezone.utc).strftime('%b %d, %Y')}",
            "",
            "--- Members ---",
            f"  Total: {total} members",
            f"  New this week: {new_this_week}",
            "",
            "--- Tier Distribution ---",
        ]
        for tier_key, count in tier_counts.items():
            tier_info = TIERS[tier_key]
            lines.append(f"  {tier_info['emoji']} {tier_info['label_en']}: {count}")

        lines.extend([
            "",
            "--- Activity (Last 7 Days) ---",
            f"  Points earned: {points_earned}",
            f"  Redemptions: {redemptions}",
            f"  Total visits: {total_visits}",
        ])

        if lapsed:
            lines.extend([
                "",
                "--- Lapsed Members ---",
                f"  At risk (14+ days): {at_risk_count}",
                f"  Lapsed (30+ days): {lapsed_count}",
                f"  Dormant (60+ days): {dormant_count}",
            ])

        if birthdays:
            lines.extend(["", "--- Upcoming Birthdays ---"])
            for b in birthdays[:5]:
                phone_masked = b["customer_phone"][:4] + "****" + b["customer_phone"][-4:]
                if b["is_today"]:
                    lines.append(f"  🎂 {phone_masked} — today!")
                else:
                    lines.append(f"  🎂 {phone_masked} — in {b['days_until']} day(s)")

        if top3:
            lines.extend(["", "--- Top Members ---"])
            for i, m in enumerate(top3, 1):
                phone = m.get("customer_phone", "")
                masked = phone[:4] + "****" + phone[-4:] if len(phone) > 6 else phone
                tier_info = TIERS.get(m.get("tier", "bronze"), TIERS["bronze"])
                lines.append(
                    f"  {i}. {tier_info['emoji']} {masked} — "
                    f"{m.get('lifetime_points', 0)} pts"
                )

        lines.extend(["", "Reply LOYALTY for more details"])

    brief = "\n".join(lines)

    await _log_activity(
        client_id=client_id,
        event_type="loyalty_brief",
        summary=f"Loyalty brief for {company_name} ({total} members)",
        payload={
            "total_members": total,
            "tier_distribution": tier_counts,
            "new_this_week": new_this_week,
            "lapsed_total": len(lapsed),
            "birthdays": len(birthdays),
        },
    )

    return brief


# ═══════════════════════════════════════════════════════
# HEALTH SCORE MODEL — weighted engagement tracking
# ═══════════════════════════════════════════════════════

HEALTH_WEIGHTS = {
    "visit_frequency": 0.30,    # How often they visit vs their historical average
    "order_value_trend": 0.25,  # Is average order going up or down?
    "review_sentiment": 0.15,   # Latest review sentiment (positive/neutral/negative)
    "payment_health": 0.15,     # No payment issues, on-time, etc.
    "referral_activity": 0.15,  # Have they referred anyone recently?
}

HEALTH_TIERS = {
    "healthy": {"min": 80, "color": "green", "action": "Upsell and reward"},
    "attention": {"min": 60, "color": "yellow", "action": "Proactive check-in"},
    "at_risk": {"min": 40, "color": "orange", "action": "Re-engagement campaign"},
    "critical": {"min": 0, "color": "red", "action": "Personal owner outreach"},
}


async def calculate_health_score(client_id: str, customer_phone: str) -> dict:
    """Calculate customer health score using weighted model.

    Factors:
        visit_frequency (30%): Compares recent visit frequency to historical average.
        order_value_trend (25%): Is the customer spending more or less over time?
        review_sentiment (15%): Latest review or conversation sentiment.
        payment_health (15%): No failed payments, disputes, or issues.
        referral_activity (15%): Have they referred anyone recently?

    Args:
        client_id: UUID of the tenant.
        customer_phone: Customer's phone (E.164).

    Returns:
        dict with score (0-100), tier, breakdown per factor, and recommended action.
    """
    phone_clean = customer_phone.strip().replace(" ", "")
    member = await get_member(client_id, phone_clean)

    # --- Factor 1: Visit Frequency (30%) ---
    visit_count = member.get("visit_count", 0)
    last_visit_str = member.get("last_visit_at", "")
    created_str = member.get("created_at", "")

    visit_score = 50  # default mid-score
    if visit_count > 0 and created_str:
        try:
            created = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
            membership_days = max(1, (datetime.now(timezone.utc) - created).days)
            avg_days_between = membership_days / visit_count
            # Ideal: visit every 7-14 days for restaurants
            if avg_days_between <= 7:
                visit_score = 100
            elif avg_days_between <= 14:
                visit_score = 85
            elif avg_days_between <= 30:
                visit_score = 65
            elif avg_days_between <= 60:
                visit_score = 40
            else:
                visit_score = 20
        except (ValueError, TypeError):
            pass

    # Penalize if last visit was long ago
    if last_visit_str:
        try:
            last_visit = datetime.fromisoformat(last_visit_str.replace("Z", "+00:00"))
            days_since = (datetime.now(timezone.utc) - last_visit).days
            if days_since > 60:
                visit_score = min(visit_score, 20)
            elif days_since > 30:
                visit_score = min(visit_score, 40)
            elif days_since > 14:
                visit_score = min(visit_score, 60)
        except (ValueError, TypeError):
            pass

    # --- Factor 2: Order Value Trend (25%) ---
    # Check recent transactions for spending patterns
    transactions = await _supa_get(
        f"loyalty_transactions?client_id=eq.{client_id}"
        f"&customer_phone=eq.{phone_clean}"
        f"&type=eq.earn&select=points,created_at"
        f"&order=created_at.desc&limit=20"
    )
    order_score = 50  # default
    if isinstance(transactions, list) and len(transactions) >= 4:
        half = len(transactions) // 2
        recent_avg = sum(t.get("points", 0) for t in transactions[:half]) / half
        older_avg = sum(t.get("points", 0) for t in transactions[half:]) / (len(transactions) - half)
        if older_avg > 0:
            trend = recent_avg / older_avg
            if trend >= 1.2:
                order_score = 100  # spending more
            elif trend >= 1.0:
                order_score = 80   # stable
            elif trend >= 0.8:
                order_score = 55   # slight decline
            elif trend >= 0.5:
                order_score = 30   # significant decline
            else:
                order_score = 15   # steep drop
    elif isinstance(transactions, list) and len(transactions) > 0:
        order_score = 60  # some activity, not enough data for trend

    # --- Factor 3: Review Sentiment (15%) ---
    # Check activity logs for review-related events
    review_logs = await _supa_get(
        f"activity_logs?client_id=eq.{client_id}"
        f"&event_type=in.(review,feedback,sentiment)"
        f"&select=payload,created_at"
        f"&order=created_at.desc&limit=5"
    )
    review_score = 70  # default (neutral-positive, no data)
    if isinstance(review_logs, list) and review_logs:
        latest = review_logs[0]
        payload = latest.get("payload", {}) or {}
        sentiment = (payload.get("sentiment", "") or "").lower()
        if sentiment in ("positive", "happy", "satisfied"):
            review_score = 100
        elif sentiment in ("neutral", "ok", "mixed"):
            review_score = 60
        elif sentiment in ("negative", "unhappy", "complaint"):
            review_score = 20

    # --- Factor 4: Payment Health (15%) ---
    # Default to healthy — degrade if issues found in logs
    payment_score = 85
    payment_logs = await _supa_get(
        f"activity_logs?client_id=eq.{client_id}"
        f"&event_type=in.(payment_failed,payment_dispute,chargeback)"
        f"&select=created_at"
        f"&order=created_at.desc&limit=5"
    )
    if isinstance(payment_logs, list) and payment_logs:
        payment_score = max(20, 85 - (len(payment_logs) * 20))

    # --- Factor 5: Referral Activity (15%) ---
    referral_logs = await _supa_get(
        f"activity_logs?client_id=eq.{client_id}"
        f"&event_type=eq.loyalty_referral"
        f"&select=payload,created_at"
        f"&order=created_at.desc&limit=10"
    )
    referral_score = 40  # default (no referrals)
    if isinstance(referral_logs, list):
        # Check if this member was the referrer
        referral_count = 0
        for log in referral_logs:
            payload = log.get("payload", {}) or {}
            if payload.get("referrer", "").strip() == phone_clean:
                referral_count += 1
        if referral_count >= 3:
            referral_score = 100
        elif referral_count >= 1:
            referral_score = 75
        else:
            referral_score = 40

    # --- Calculate weighted total ---
    breakdown = {
        "visit_frequency": visit_score,
        "order_value_trend": order_score,
        "review_sentiment": review_score,
        "payment_health": payment_score,
        "referral_activity": referral_score,
    }

    total_score = int(
        visit_score * HEALTH_WEIGHTS["visit_frequency"]
        + order_score * HEALTH_WEIGHTS["order_value_trend"]
        + review_score * HEALTH_WEIGHTS["review_sentiment"]
        + payment_score * HEALTH_WEIGHTS["payment_health"]
        + referral_score * HEALTH_WEIGHTS["referral_activity"]
    )
    total_score = max(0, min(100, total_score))

    # Determine tier
    tier = "critical"
    for tier_name, tier_config in sorted(
        HEALTH_TIERS.items(),
        key=lambda x: x[1]["min"],
        reverse=True,
    ):
        if total_score >= tier_config["min"]:
            tier = tier_name
            break

    tier_config = HEALTH_TIERS[tier]

    await _log_activity(
        client_id=client_id,
        event_type="health_score_calculated",
        summary=f"Health score for {phone_clean}: {total_score}/100 ({tier})",
        payload={
            "phone": phone_clean,
            "score": total_score,
            "tier": tier,
            "breakdown": breakdown,
        },
    )

    return {
        "customer_phone": phone_clean,
        "score": total_score,
        "tier": tier,
        "color": tier_config["color"],
        "breakdown": breakdown,
        "recommended_action": tier_config["action"],
        "member_tier": member.get("tier", "bronze"),
        "visit_count": member.get("visit_count", 0),
        "points_balance": member.get("points_balance", 0),
    }


async def generate_reengagement_sequence(
    client_id: str,
    customer_phone: str,
    lang: str = "en",
) -> list:
    """Generate a 4-touch re-engagement sequence adapted for WhatsApp.

    Creates a graduated sequence of messages with increasing urgency:
        Day 30: Check-in ('We miss you!')
        Day 45: Value reminder (what's new, seasonal menu)
        Day 60: Incentive (special offer for returning)
        Day 90: Last gentle nudge (genuine, not desperate)

    Each message is personalized based on the member's history, tier,
    and business context.

    Args:
        client_id: UUID of the tenant.
        customer_phone: Customer's phone (E.164).
        lang: "en" or "ar".

    Returns:
        list of dicts: [{day, message, tactic, send_at}]
    """
    phone_clean = customer_phone.strip().replace(" ", "")
    member = await get_member(client_id, phone_clean)
    client = await _fetch_client(client_id)
    kb = await _fetch_knowledge(client_id)
    config = await _fetch_loyalty_config(client_id)

    company_name = kb.get("company_name") or client.get("company_name", "us")
    brand_voice = kb.get("brand_voice", "Warm, genuine, personal")
    tier_key = member.get("tier", "bronze")
    tier_info = TIERS.get(tier_key, TIERS["bronze"])
    balance = member.get("points_balance", 0)
    visits = member.get("visit_count", 0)
    bonus_small = int(config.get("points_per_visit", 10) * 2)
    bonus_large = int(config.get("points_per_visit", 10) * 5)

    lang_instruction = {
        "en": "Write all messages in English.",
        "ar": "Write all messages in Gulf Arabic (not formal MSA). Warm, personal tone.",
    }.get(lang, "Write in English.")

    system = f"""You are a customer retention specialist for {company_name}.
Brand voice: {brand_voice}
{lang_instruction}

Create a 4-touch WhatsApp re-engagement sequence for a lapsed customer.

Customer context:
- Tier: {tier_info['label_en']} {tier_info['emoji']}
- Points balance: {balance}
- Total visits: {visits}
- Small bonus to offer: {bonus_small} points
- Large bonus to offer: {bonus_large} points

The sequence must feel GENUINE, not salesy. Each message should be short
(under 300 characters for WhatsApp). Include emojis sparingly (1-2 per message).

For each touch provide:
- day: when to send (30, 45, 60, or 90)
- message: the WhatsApp message text
- tactic: the re-engagement tactic used (check_in, value_reminder, incentive, last_nudge)
- send_at: best time to send (e.g., "10:00 AM" or "6:30 PM")

Output ONLY a JSON array of 4 objects. No markdown, no explanation."""

    user_msg = f"Generate the 4-touch re-engagement sequence for this customer now."

    result = await _minimax_json(system, user_msg, max_tokens=1500, temperature=0.8)

    if isinstance(result, dict) and "error" in result:
        return [{"error": result["error"]}]

    sequence = result if isinstance(result, list) else [result]

    # Ensure we have exactly 4 touches with the right days
    expected_days = [30, 45, 60, 90]
    for i, touch in enumerate(sequence[:4]):
        if isinstance(touch, dict):
            touch["day"] = expected_days[i] if i < len(expected_days) else (i + 1) * 30
            touch["customer_phone"] = phone_clean
            touch["lang"] = lang

    await _log_activity(
        client_id=client_id,
        event_type="reengagement_sequence_generated",
        summary=f"4-touch re-engagement sequence for {phone_clean} ({lang})",
        payload={
            "phone": phone_clean,
            "tier": tier_key,
            "balance": balance,
            "sequence_count": len(sequence),
            "lang": lang,
        },
    )

    return sequence[:4]


async def generate_progress_message(
    client_id: str,
    customer_phone: str,
    lang: str = "en",
) -> str:
    """Goal-gradient: show loyalty progress to accelerate behavior.

    Uses the goal-gradient effect — people accelerate behavior as they
    approach a goal. Generates a message showing how close the customer
    is to their next milestone (tier upgrade, free reward, etc.).

    Examples:
        'You're 2 visits away from Gold tier!'
        'Just 30 points until a free dessert!'
        'One more visit and you unlock priority booking!'

    Args:
        client_id: UUID of the tenant.
        customer_phone: Customer's phone (E.164).
        lang: "en" or "ar".

    Returns:
        str: WhatsApp-ready progress message.
    """
    phone_clean = customer_phone.strip().replace(" ", "")
    member = await get_member(client_id, phone_clean)
    client = await _fetch_client(client_id)
    kb = await _fetch_knowledge(client_id)
    config = await _fetch_loyalty_config(client_id)

    company_name = kb.get("company_name") or client.get("company_name", "us")
    tier_key = member.get("tier", "bronze")
    tier_info = TIERS.get(tier_key, TIERS["bronze"])
    balance = member.get("points_balance", 0)
    lifetime = member.get("lifetime_points", 0)
    visits = member.get("visit_count", 0)
    points_per_visit = config.get("points_per_visit", 10)

    # Calculate distance to next tier
    next_tier_text = _next_tier_info(lifetime, lang)

    # Find the cheapest reward they're close to
    catalog = await get_rewards_catalog(client_id)
    closest_reward = None
    closest_gap = float("inf")
    for reward in catalog:
        cost = reward.get("points_cost", 0)
        gap = cost - balance
        if 0 < gap < closest_gap:
            closest_gap = gap
            closest_reward = reward
        elif gap <= 0 and (closest_reward is None or cost > closest_reward.get("points_cost", 0)):
            # They can already redeem — pick the most valuable one they can afford
            closest_reward = reward
            closest_gap = 0

    # Calculate visits needed for closest reward
    visits_to_reward = (
        max(1, int(closest_gap / points_per_visit)) if closest_gap > 0 and points_per_visit > 0 else 0
    )

    # Build the message
    if lang == "ar":
        lines = [
            f"مرحبا! هنا تحديث تقدمك في {company_name} {tier_info['emoji']}",
            "",
            f"رصيدك: {balance} نقطة",
            f"الزيارات: {visits}",
            f"المستوى: {tier_info['label_ar']}",
        ]

        if closest_reward and closest_gap > 0:
            reward_name = closest_reward.get("name_ar", closest_reward.get("name_en", ""))
            lines.append("")
            if visits_to_reward == 1:
                lines.append(f"زيارة واحدة فقط وتحصل على {reward_name}!")
            else:
                lines.append(f"باقي {visits_to_reward} زيارات فقط للحصول على {reward_name}!")
        elif closest_reward and closest_gap <= 0:
            reward_name = closest_reward.get("name_ar", closest_reward.get("name_en", ""))
            lines.append("")
            lines.append(f"عندك نقاط كافية لاستبدال {reward_name}! أرسل 'استبدال' الحين")

        lines.append("")
        lines.append(next_tier_text)
        lines.append("")
        lines.append(f"تعال زورنا قريب!")

    else:
        lines = [
            f"Hey! Here's your progress update at {company_name} {tier_info['emoji']}",
            "",
            f"Balance: {balance} pts",
            f"Visits: {visits}",
            f"Tier: {tier_info['label_en']}",
        ]

        if closest_reward and closest_gap > 0:
            reward_name = closest_reward.get("name_en", "")
            lines.append("")
            if visits_to_reward == 1:
                lines.append(f"Just 1 more visit to unlock {reward_name}!")
            else:
                lines.append(f"Only {visits_to_reward} visits away from {reward_name}!")
        elif closest_reward and closest_gap <= 0:
            reward_name = closest_reward.get("name_en", "")
            lines.append("")
            lines.append(f"You have enough points to redeem {reward_name}! Send 'redeem' now")

        lines.append("")
        lines.append(next_tier_text)
        lines.append("")
        lines.append(f"Come visit us soon!")

    message = "\n".join(lines)

    await _log_activity(
        client_id=client_id,
        event_type="progress_message_sent",
        summary=f"Progress message for {phone_clean} ({tier_key}, {balance} pts)",
        payload={
            "phone": phone_clean,
            "tier": tier_key,
            "balance": balance,
            "closest_reward": closest_reward.get("id", "") if closest_reward else None,
            "visits_to_reward": visits_to_reward,
            "lang": lang,
        },
    )

    return message


# ═══════════════════════════════════════════════════════
# GAMIFIED ACHIEVEMENTS — toggleable per client
# ═══════════════════════════════════════════════════════

# Default achievements — owners can enable/disable via dashboard or WhatsApp command
DEFAULT_ACHIEVEMENTS = {
    "first_order": {
        "id": "first_order",
        "title_en": "Welcome Explorer",
        "title_ar": "المستكشف الجديد",
        "trigger": "first_visit",
        "condition": {"visits": 1},
        "message_en": "Your first visit! Welcome to the family. Here's a little something to say thanks.",
        "message_ar": "أول زيارة لك! أهلاً بك بالعائلة. هذي هدية ترحيبية.",
        "reward_points": 25,
        "reward_text_en": "10% off next visit",
        "reward_text_ar": "١٠٪ خصم بالزيارة الجاية",
        "enabled_by_default": True,
    },
    "regular_5": {
        "id": "regular_5",
        "title_en": "Familiar Face",
        "title_ar": "وجه مألوف",
        "trigger": "visit_count",
        "condition": {"visits": 5},
        "message_en": "5 visits! You officially have a 'usual.' We love seeing you.",
        "message_ar": "٥ زيارات! صرت من الزبائن الدائمين. نحبك عندنا.",
        "reward_points": 50,
        "reward_text_en": "Free dessert",
        "reward_text_ar": "حلى مجاني",
        "enabled_by_default": True,
    },
    "regular_10": {
        "id": "regular_10",
        "title_en": "Part of the Crew",
        "title_ar": "واحد من الفريق",
        "trigger": "visit_count",
        "condition": {"visits": 10},
        "message_en": "10 visits! At this point, you're practically family.",
        "message_ar": "١٠ زيارات! أنت من العائلة الحين.",
        "reward_points": 100,
        "reward_text_en": "Free main course",
        "reward_text_ar": "طبق رئيسي مجاني",
        "enabled_by_default": True,
    },
    "regular_25": {
        "id": "regular_25",
        "title_en": "Legend",
        "title_ar": "أسطورة",
        "trigger": "visit_count",
        "condition": {"visits": 25},
        "message_en": "25 visits! You're a legend. This calls for something special.",
        "message_ar": "٢٥ زيارة! أنت أسطورة. هذا يستاهل شي خاص.",
        "reward_points": 250,
        "reward_text_en": "VIP dinner for 2 on us",
        "reward_text_ar": "عشاء VIP لشخصين على حسابنا",
        "enabled_by_default": True,
    },
    "referral_first": {
        "id": "referral_first",
        "title_en": "Connector",
        "title_ar": "الموصّل",
        "trigger": "referral_count",
        "condition": {"referrals": 1},
        "message_en": "Your first referral! Thanks for spreading the word.",
        "message_ar": "أول إحالة! شكراً إنك تنشر الكلمة.",
        "reward_points": 30,
        "reward_text_en": "15% off for you and your friend",
        "reward_text_ar": "١٥٪ خصم لك ولصديقك",
        "enabled_by_default": True,
    },
    "referral_3": {
        "id": "referral_3",
        "title_en": "Social Butterfly",
        "title_ar": "الفراشة الاجتماعية",
        "trigger": "referral_count",
        "condition": {"referrals": 3},
        "message_en": "3 friends brought in! You're officially our best ambassador.",
        "message_ar": "٣ أصدقاء جبتهم! أنت سفيرنا الأول.",
        "reward_points": 75,
        "reward_text_en": "AED 50 credit",
        "reward_text_ar": "رصيد ٥٠ درهم",
        "enabled_by_default": True,
    },
    "review_star": {
        "id": "review_star",
        "title_en": "Voice of the People",
        "title_ar": "صوت الناس",
        "trigger": "review_left",
        "condition": {"reviews": 1},
        "message_en": "Thanks for leaving a review! Your feedback helps us grow.",
        "message_ar": "شكراً على التقييم! رأيك يساعدنا نتحسن.",
        "reward_points": 20,
        "reward_text_en": "Free appetizer next visit",
        "reward_text_ar": "مقبلات مجانية بالزيارة الجاية",
        "enabled_by_default": True,
    },
    "birthday_club": {
        "id": "birthday_club",
        "title_en": "Birthday Star",
        "title_ar": "نجم العيد ميلاد",
        "trigger": "birthday",
        "condition": {"is_birthday": True},
        "message_en": "Happy Birthday! Celebrate with us — this one's on the house.",
        "message_ar": "كل عام وأنت بخير! احتفل معنا — هذي على حسابنا.",
        "reward_points": 50,
        "reward_text_en": "Free cake or dessert",
        "reward_text_ar": "كيك أو حلى مجاني",
        "enabled_by_default": True,
    },
    "big_spender": {
        "id": "big_spender",
        "title_en": "High Roller",
        "title_ar": "الكريم",
        "trigger": "spend_milestone",
        "condition": {"total_spend_aed": 1000},
        "message_en": "You've spent over AED 1,000 with us! You deserve something extra.",
        "message_ar": "صرفت أكثر من ١,٠٠٠ درهم عندنا! تستاهل شي إضافي.",
        "reward_points": 100,
        "reward_text_en": "20% off your next visit",
        "reward_text_ar": "٢٠٪ خصم بالزيارة الجاية",
        "enabled_by_default": True,
    },
    "streak_7": {
        "id": "streak_7",
        "title_en": "Weekly Regular",
        "title_ar": "الزائر الأسبوعي",
        "trigger": "visit_streak",
        "condition": {"consecutive_weeks": 4},
        "message_en": "4 weeks in a row! You've got a streak going. Keep it up!",
        "message_ar": "٤ أسابيع متتالية! عندك سلسلة. كمّل!",
        "reward_points": 40,
        "reward_text_en": "Double points on next visit",
        "reward_text_ar": "نقاط مضاعفة بالزيارة الجاية",
        "enabled_by_default": True,
    },
}


async def get_achievement_config(client_id: str) -> dict:
    """Get which achievements are enabled/disabled for this client.

    Stored in business_knowledge.crawl_data.achievements_config.
    Defaults to all DEFAULT_ACHIEVEMENTS enabled.

    Args:
        client_id: UUID of the tenant.

    Returns:
        dict mapping achievement_id -> bool (enabled/disabled).
    """
    kb = await _fetch_knowledge(client_id)
    crawl = kb.get("crawl_data", {}) or {}
    if isinstance(crawl, str):
        try:
            crawl = json.loads(crawl)
        except:
            crawl = {}
    stored_config = crawl.get("achievements_config", {}) or {}

    # Merge with defaults — any achievement not in stored config uses enabled_by_default
    config = {}
    for ach_id, ach in DEFAULT_ACHIEVEMENTS.items():
        if ach_id in stored_config:
            config[ach_id] = stored_config[ach_id]
        else:
            config[ach_id] = ach.get("enabled_by_default", True)

    return config


async def update_achievement_config(client_id: str, achievement_id: str, enabled: bool) -> dict:
    """Toggle an achievement on/off for a client.

    Owner command: 'disable achievement regular_5'

    Args:
        client_id: UUID of the tenant.
        achievement_id: The achievement ID to toggle.
        enabled: True to enable, False to disable.

    Returns:
        dict with success status, achievement_id, enabled state, and full config.
    """
    if achievement_id not in DEFAULT_ACHIEVEMENTS:
        return {
            "success": False,
            "error": "invalid_achievement",
            "message": f"Achievement '{achievement_id}' not found.",
            "valid_ids": list(DEFAULT_ACHIEVEMENTS.keys()),
        }

    # Fetch current knowledge base
    kb = await _fetch_knowledge(client_id)
    crawl = kb.get("crawl_data", {}) or {}
    if isinstance(crawl, str):
        try:
            crawl = json.loads(crawl)
        except:
            crawl = {}
    achievements_config = crawl.get("achievements_config", {}) or {}

    # Update the specific achievement
    achievements_config[achievement_id] = enabled
    crawl["achievements_config"] = achievements_config

    # Persist back to business_knowledge
    await _supa_patch(
        "business_knowledge",
        f"client_id=eq.{client_id}",
        {"crawl_data": crawl},
    )

    await _log_activity(
        client_id=client_id,
        event_type="achievement_config_updated",
        summary=f"Achievement '{achievement_id}' {'enabled' if enabled else 'disabled'}",
        payload={
            "achievement_id": achievement_id,
            "enabled": enabled,
        },
    )

    ach = DEFAULT_ACHIEVEMENTS[achievement_id]
    return {
        "success": True,
        "achievement_id": achievement_id,
        "title": ach["title_en"],
        "enabled": enabled,
        "config": await get_achievement_config(client_id),
    }


async def check_achievements(
    client_id: str,
    customer_phone: str,
    trigger_event: str,
    event_data: dict = None,
) -> list:
    """Check if a customer has earned any new achievements based on a trigger event.

    Called after every visit/referral/review/purchase.

    Args:
        client_id: UUID of the tenant.
        customer_phone: Customer's WhatsApp phone (E.164).
        trigger_event: The event type that occurred (first_visit, visit_count,
                       referral_count, review_left, birthday, spend_milestone,
                       visit_streak).
        event_data: Optional dict with context (e.g., {"visits": 5, "total_spend_aed": 1200}).

    Returns:
        list of newly earned achievements with messages and rewards.
    """
    phone_clean = customer_phone.strip().replace(" ", "")
    event_data = event_data or {}

    # Get enabled achievements for this client
    config = await get_achievement_config(client_id)

    # Get member data for condition checking
    member = await get_member(client_id, phone_clean)

    # Get already-earned achievements for this customer
    earned = await get_customer_achievements(client_id, phone_clean)
    earned_ids = {a.get("achievement_id") for a in earned}

    # Get member stats (augment with event_data)
    visits = event_data.get("visits", member.get("visit_count", 0))
    referrals = event_data.get("referrals", 0)
    reviews = event_data.get("reviews", 0)
    total_spend = event_data.get("total_spend_aed", 0)
    consecutive_weeks = event_data.get("consecutive_weeks", 0)
    is_birthday = event_data.get("is_birthday", False)

    # If referrals/reviews not in event_data, try to count from activity_logs
    if "referrals" not in event_data:
        referral_rows = await _supa_get(
            f"activity_logs?client_id=eq.{client_id}&event_type=eq.loyalty_referral"
            f"&select=payload"
        )
        referrals = sum(
            1 for r in (referral_rows if isinstance(referral_rows, list) else [])
            if (r.get("payload", {}) or {}).get("referrer", "") == phone_clean
        )

    newly_earned = []

    for ach_id, ach in DEFAULT_ACHIEVEMENTS.items():
        # Skip if disabled
        if not config.get(ach_id, False):
            continue

        # Skip if already earned
        if ach_id in earned_ids:
            continue

        # Check if the trigger matches
        if ach["trigger"] != trigger_event:
            continue

        # Evaluate condition
        condition = ach.get("condition", {})
        met = False

        if trigger_event == "first_visit":
            met = visits >= condition.get("visits", 1)
        elif trigger_event == "visit_count":
            met = visits >= condition.get("visits", 0)
        elif trigger_event == "referral_count":
            met = referrals >= condition.get("referrals", 0)
        elif trigger_event == "review_left":
            met = reviews >= condition.get("reviews", 0)
        elif trigger_event == "birthday":
            met = is_birthday or condition.get("is_birthday", False)
        elif trigger_event == "spend_milestone":
            met = total_spend >= condition.get("total_spend_aed", 0)
        elif trigger_event == "visit_streak":
            met = consecutive_weeks >= condition.get("consecutive_weeks", 0)

        if not met:
            continue

        # Award the achievement
        reward_points = ach.get("reward_points", 0)
        if reward_points > 0:
            await add_points(client_id, phone_clean, reward_points, f"achievement_{ach_id}")

        # Record the earned achievement
        achievement_record = {
            "id": str(uuid.uuid4()),
            "client_id": client_id,
            "customer_phone": phone_clean,
            "achievement_id": ach_id,
            "earned_at": datetime.now(timezone.utc).isoformat(),
            "reward_points": reward_points,
        }
        await _supa_post("customer_achievements", achievement_record)

        await _log_activity(
            client_id=client_id,
            event_type="achievement_earned",
            summary=f"{phone_clean} earned '{ach['title_en']}' (+{reward_points} pts)",
            payload={
                "phone": phone_clean,
                "achievement_id": ach_id,
                "title_en": ach["title_en"],
                "title_ar": ach["title_ar"],
                "reward_points": reward_points,
                "trigger": trigger_event,
            },
        )

        newly_earned.append({
            "achievement_id": ach_id,
            "title_en": ach["title_en"],
            "title_ar": ach["title_ar"],
            "message_en": ach["message_en"],
            "message_ar": ach["message_ar"],
            "reward_points": reward_points,
            "reward_text_en": ach.get("reward_text_en", ""),
            "reward_text_ar": ach.get("reward_text_ar", ""),
            "earned_at": achievement_record["earned_at"],
        })

    print(f"[loyalty] Achievements check for {phone_clean}: {len(newly_earned)} new")
    return newly_earned


async def get_customer_achievements(client_id: str, customer_phone: str) -> list:
    """Get all achievements earned by a customer.

    Args:
        client_id: UUID of the tenant.
        customer_phone: Customer's WhatsApp phone (E.164).

    Returns:
        list of dicts with achievement_id, title, earned_at, reward_points.
    """
    phone_clean = customer_phone.strip().replace(" ", "")

    rows = await _supa_get(
        f"customer_achievements?client_id=eq.{client_id}"
        f"&customer_phone=eq.{phone_clean}&select=*&order=earned_at.asc"
    )
    if not isinstance(rows, list):
        return []

    achievements = []
    for row in rows:
        ach_id = row.get("achievement_id", "")
        ach_def = DEFAULT_ACHIEVEMENTS.get(ach_id, {})
        achievements.append({
            "achievement_id": ach_id,
            "title_en": ach_def.get("title_en", ach_id),
            "title_ar": ach_def.get("title_ar", ach_id),
            "message_en": ach_def.get("message_en", ""),
            "message_ar": ach_def.get("message_ar", ""),
            "reward_points": row.get("reward_points", 0),
            "reward_text_en": ach_def.get("reward_text_en", ""),
            "reward_text_ar": ach_def.get("reward_text_ar", ""),
            "earned_at": row.get("earned_at", ""),
        })

    return achievements


async def handle_achievement_command(client_id: str, command: str, lang: str = "en") -> str:
    """Owner WhatsApp commands for managing achievements.

    Recognized commands:
        achievements                    — list all achievements with status
        disable achievement <id>        — disable a specific achievement
        enable achievement <id>         — enable a specific achievement
        add achievement <name> <cond> <reward> — add a custom achievement (future)

    Args:
        client_id: UUID of the tenant.
        command: Raw command text from the owner.
        lang: "en" or "ar".

    Returns:
        str: WhatsApp-ready response message.
    """
    cmd = command.strip().lower()

    # --- List all achievements ---
    if cmd in ("achievements", "achievement", "الإنجازات", "انجازات"):
        config = await get_achievement_config(client_id)
        lines = []

        if lang == "ar":
            lines.append("الإنجازات المتاحة:")
            lines.append("")
            for ach_id, ach in DEFAULT_ACHIEVEMENTS.items():
                enabled = config.get(ach_id, False)
                status = "مفعّل" if enabled else "معطّل"
                icon = "✅" if enabled else "❌"
                lines.append(
                    f"{icon} {ach['title_ar']} — {ach.get('reward_text_ar', '')} "
                    f"(+{ach['reward_points']} نقطة) [{status}]"
                )
            lines.append("")
            lines.append("للتفعيل: enable achievement [id]")
            lines.append("للتعطيل: disable achievement [id]")
        else:
            lines.append("Available Achievements:")
            lines.append("")
            for ach_id, ach in DEFAULT_ACHIEVEMENTS.items():
                enabled = config.get(ach_id, False)
                status = "ON" if enabled else "OFF"
                icon = "✅" if enabled else "❌"
                lines.append(
                    f"{icon} {ach['title_en']} ({ach_id}) — {ach.get('reward_text_en', '')} "
                    f"(+{ach['reward_points']} pts) [{status}]"
                )
            lines.append("")
            lines.append("To enable: enable achievement [id]")
            lines.append("To disable: disable achievement [id]")

        return "\n".join(lines)

    # --- Disable an achievement ---
    disable_match = re.match(r"^disable\s+(?:achievement\s+)?(\S+)$", cmd)
    if disable_match:
        ach_id = disable_match.group(1).strip()
        result = await update_achievement_config(client_id, ach_id, enabled=False)
        if not result.get("success"):
            if lang == "ar":
                return f"لم أجد إنجاز بهذا المعرف: {ach_id}\nالمعرفات المتاحة: {', '.join(DEFAULT_ACHIEVEMENTS.keys())}"
            return f"Achievement not found: {ach_id}\nValid IDs: {', '.join(DEFAULT_ACHIEVEMENTS.keys())}"

        if lang == "ar":
            return f"تم تعطيل الإنجاز: {result['title']}"
        return f"Achievement disabled: {result['title']} ({ach_id})"

    # --- Enable an achievement ---
    enable_match = re.match(r"^enable\s+(?:achievement\s+)?(\S+)$", cmd)
    if enable_match:
        ach_id = enable_match.group(1).strip()
        result = await update_achievement_config(client_id, ach_id, enabled=True)
        if not result.get("success"):
            if lang == "ar":
                return f"لم أجد إنجاز بهذا المعرف: {ach_id}\nالمعرفات المتاحة: {', '.join(DEFAULT_ACHIEVEMENTS.keys())}"
            return f"Achievement not found: {ach_id}\nValid IDs: {', '.join(DEFAULT_ACHIEVEMENTS.keys())}"

        if lang == "ar":
            return f"تم تفعيل الإنجاز: {result['title']}"
        return f"Achievement enabled: {result['title']} ({ach_id})"

    # --- Add custom achievement (future) ---
    add_match = re.match(r"^add\s+achievement\s+(.+)$", cmd)
    if add_match:
        if lang == "ar":
            return "إضافة إنجازات مخصصة قريباً! حالياً يمكنك تفعيل/تعطيل الإنجازات الموجودة."
        return "Custom achievements coming soon! For now, you can enable/disable the built-in achievements."

    # Not an achievement command
    return ""
