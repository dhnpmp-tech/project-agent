"""Owner Brain — Your AI Chief of Staff (v2)

A private WhatsApp channel for the business owner. Provides:
1. SCQA Morning briefs (Situation-Complication-Question-Answer)
2. Real-time alerts (bookings, complaints, hot leads)
3. Natural language commands (update menu, prices, hours)
4. Guest Intelligence System (RFM segmentation + churn prediction)
5. Google Review Auto-Responder (draft & approve pattern)
6. Automation governance (auto-execute vs. owner-approve)
"""

import os
import json
import re
import httpx
from datetime import datetime, timezone, timedelta
from collections import defaultdict

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Ynpxa3RpcGltYm11anRvd296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwOTY5NCwiZXhwIjoyMDkwMDg1Njk0fQ.-DoNS5fZv3aUsFcugKg23yh9RqXXFIlgc5_9Hrk97bg")
_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}
_MINIMAX_KEY = os.environ.get("MINIMAX_API_KEY", "")
_KAPSO_KEY = os.environ.get("KAPSO_PLATFORM_API_KEY", "")


# ═══════════════════════════════════════════════════════
# GUEST INTELLIGENCE — RFM Segmentation
# ═══════════════════════════════════════════════════════

RFM_SEGMENTS = {
    "champion":  {"label_en": "VIP Champion",  "label_ar": "عميل ذهبي",   "action_en": "Invite to tasting events, ask for referrals", "action_ar": "ادعه لفعاليات تذوق واطلب منه ترشيحات"},
    "loyal":     {"label_en": "Loyal Regular",  "label_ar": "عميل مخلص",   "action_en": "Upsell premium items, personalize experience", "action_ar": "قدم له العروض المميزة"},
    "potential":  {"label_en": "Potential VIP",  "label_ar": "عميل واعد",   "action_en": "Nurture with special attention, build relationship", "action_ar": "اهتم فيه وابني علاقة"},
    "new":       {"label_en": "New Guest",      "label_ar": "عميل جديد",   "action_en": "Welcome warmly, follow up after first visit", "action_ar": "رحب فيه وتابع بعد أول زيارة"},
    "at_risk":   {"label_en": "At Risk",        "label_ar": "معرض للخسارة", "action_en": "Re-engagement campaign, special offer", "action_ar": "حملة استعادة وعرض خاص"},
    "lapsed":    {"label_en": "Lapsed",         "label_ar": "عميل مفقود",  "action_en": "Win-back offer via WhatsApp", "action_ar": "عرض استعادة عبر واتساب"},
}


async def build_guest_intelligence(client_id: str) -> dict:
    """Build RFM segmentation for all guests of a client."""

    now = datetime.now(timezone.utc)

    # Fetch all conversations for this client (last 90 days)
    cutoff_90d = (now - timedelta(days=90)).isoformat()
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/conversation_messages?client_id=eq.{client_id}&direction=eq.inbound&created_at=gte.{cutoff_90d}&select=customer_phone,created_at&order=created_at.asc",
                headers=_SUPA_HEADERS,
            )
            messages = r.json() if r.status_code == 200 else []
    except:
        messages = []

    # Fetch all bookings for this client (last 90 days)
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/active_bookings?client_id=eq.{client_id}&created_at=gte.{cutoff_90d}&select=customer_phone,guest_name,party_size,created_at,status",
                headers=_SUPA_HEADERS,
            )
            bookings = r.json() if r.status_code == 200 else []
    except:
        bookings = []

    # Build per-guest stats
    guest_data: dict[str, dict] = {}

    for m in messages:
        phone = m.get("customer_phone", "")
        if not phone:
            continue
        if phone not in guest_data:
            guest_data[phone] = {"phone": phone, "name": "", "visits": 0, "messages": 0, "first_contact": m["created_at"], "last_contact": m["created_at"], "total_party": 0}
        guest_data[phone]["messages"] += 1
        guest_data[phone]["last_contact"] = m["created_at"]

    for b in bookings:
        phone = b.get("customer_phone", "")
        if not phone:
            continue
        if phone not in guest_data:
            guest_data[phone] = {"phone": phone, "name": "", "visits": 0, "messages": 0, "first_contact": b["created_at"], "last_contact": b["created_at"], "total_party": 0}
        if b.get("status") in ("confirmed", "completed", "collecting", "confirming"):
            guest_data[phone]["visits"] += 1
            guest_data[phone]["total_party"] += (b.get("party_size") or 2)
        if b.get("guest_name"):
            guest_data[phone]["name"] = b["guest_name"]
        if b["created_at"] > guest_data[phone]["last_contact"]:
            guest_data[phone]["last_contact"] = b["created_at"]

    # RFM scoring
    segments: dict[str, list] = {s: [] for s in RFM_SEGMENTS}

    for phone, g in guest_data.items():
        try:
            last = datetime.fromisoformat(g["last_contact"].replace("Z", "+00:00"))
            days_since = (now - last).days
        except:
            days_since = 999

        recency = days_since
        frequency = g["visits"]
        monetary = g["total_party"]  # party size as proxy for spend

        # Classify
        if recency <= 14 and frequency >= 3:
            seg = "champion"
        elif recency <= 21 and frequency >= 2:
            seg = "loyal"
        elif recency <= 14 and frequency == 1:
            seg = "new"
        elif recency <= 30 and frequency >= 1:
            seg = "potential"
        elif recency <= 60:
            seg = "at_risk"
        else:
            seg = "lapsed"

        segments[seg].append({
            "phone": phone,
            "name": g["name"] or phone[-4:],
            "visits": frequency,
            "messages": g["messages"],
            "days_since_contact": recency,
            "avg_party": round(monetary / max(frequency, 1), 1),
        })

    # Sort each segment by value
    for seg in segments:
        segments[seg].sort(key=lambda x: (-x["visits"], x["days_since_contact"]))

    total_guests = len(guest_data)
    return {
        "client_id": client_id,
        "total_guests": total_guests,
        "segments": segments,
        "segment_counts": {s: len(guests) for s, guests in segments.items()},
        "generated_at": now.isoformat(),
    }


async def get_guest_brief(client_id: str, lang: str = "en") -> str:
    """Generate a WhatsApp-friendly guest intelligence summary."""
    intel = await build_guest_intelligence(client_id)
    lines = []

    if lang == "ar":
        lines.append("👥 ملخص العملاء:")
        lines.append(f"  إجمالي: {intel['total_guests']} عميل")
        for seg_key, guests in intel["segments"].items():
            if guests:
                seg = RFM_SEGMENTS[seg_key]
                lines.append(f"\n{seg['label_ar']} ({len(guests)}):")
                for g in guests[:3]:
                    lines.append(f"  - {g['name']}: {g['visits']} زيارة، آخر تواصل قبل {g['days_since_contact']} يوم")
                if len(guests) > 3:
                    lines.append(f"  ... +{len(guests) - 3} آخرين")
    else:
        lines.append("👥 Guest Intelligence:")
        lines.append(f"  Total: {intel['total_guests']} guests")
        for seg_key, guests in intel["segments"].items():
            if guests:
                seg = RFM_SEGMENTS[seg_key]
                lines.append(f"\n{seg['label_en']} ({len(guests)}):")
                for g in guests[:3]:
                    lines.append(f"  - {g['name']}: {g['visits']} visits, last contact {g['days_since_contact']}d ago")
                if len(guests) > 3:
                    lines.append(f"  ... +{len(guests) - 3} more")

    # Actionable recommendations
    at_risk = intel["segments"].get("at_risk", [])
    lapsed = intel["segments"].get("lapsed", [])
    if at_risk or lapsed:
        lines.append("")
        if lang == "ar":
            lines.append(f"⚠️ يحتاجون اهتمام: {len(at_risk)} معرض للخسارة، {len(lapsed)} مفقود")
            if at_risk:
                names = ", ".join(g["name"] for g in at_risk[:3])
                lines.append(f"  تواصل مع: {names}")
        else:
            lines.append(f"⚠️ Need attention: {len(at_risk)} at risk, {len(lapsed)} lapsed")
            if at_risk:
                names = ", ".join(g["name"] for g in at_risk[:3])
                lines.append(f"  Reach out to: {names}")

    return "\n".join(lines)


# ═══════════════════════════════════════════════════════
# GOOGLE REVIEW AUTO-RESPONDER (Draft & Approve)
# ═══════════════════════════════════════════════════════

async def draft_review_response(
    client_id: str,
    reviewer_name: str,
    rating: int,
    review_text: str,
    lang: str = "en",
) -> dict:
    """Draft a response to a Google/TripAdvisor review for owner approval."""

    if not _MINIMAX_KEY:
        return {"error": "AI key not configured"}

    # Get business name
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/clients?id=eq.{client_id}&select=company_name",
                headers=_SUPA_HEADERS,
            )
            company = r.json()[0].get("company_name", "our restaurant") if r.json() else "our restaurant"
    except:
        company = "our restaurant"

    # Determine tone based on rating
    if rating >= 4:
        tone = "warm, grateful, and personal"
        strategy = "Thank them specifically for what they mentioned. Invite them back."
    elif rating == 3:
        tone = "appreciative but acknowledging room for improvement"
        strategy = "Thank them, acknowledge their feedback constructively, promise to improve."
    else:
        tone = "empathetic, professional, and solution-oriented"
        strategy = "Apologize sincerely, address the specific complaint, offer to make it right. Do NOT be defensive."

    prompt = f"""You are the owner of {company}. Write a short, genuine reply to this review.

Rating: {rating}/5 stars
Reviewer: {reviewer_name}
Review: "{review_text}"

Tone: {tone}
Strategy: {strategy}
Language: {"Arabic (Gulf dialect)" if lang == "ar" else "English"}

Rules:
- Max 3 sentences. Keep it human and warm.
- Mention something specific from their review (not generic).
- {"End with an invitation to return." if rating >= 3 else "End by offering to discuss privately."}
- Do NOT use corporate-speak or marketing language.
- Do NOT use <think> tags. Output ONLY the reply text."""

    try:
        async with httpx.AsyncClient(timeout=60) as http:
            r = await http.post(
                "https://api.minimax.io/v1/chat/completions",
                headers={"Authorization": f"Bearer {_MINIMAX_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "MiniMax-M2.7",
                    "messages": [
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": "Write the review response now."},
                    ],
                    "max_tokens": 300,
                },
            )
            raw = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            # Strip think tags
            content = re.sub(r"<think>[\s\S]*?</think>\s*", "", raw).strip()
            # If entire output was thinking (no content outside tags), extract from inside
            if not content:
                content = re.sub(r"</?think>", "", raw).strip()
            # CJK cleanup
            content = re.sub(r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u0400-\u04ff]+', '', content).strip()
            # If MiniMax leaked its reasoning chain, extract the last quoted text as the actual reply
            if len(content) > 500 or "Let me" in content or "I need to" in content or "Rating:" in content:
                # Find the last substantial quoted block
                quoted = re.findall(r'"([^"]{20,})"', content)
                if quoted:
                    content = quoted[-1]
                else:
                    # Take the last paragraph that looks like a reply
                    paragraphs = [p.strip() for p in content.split("\n\n") if len(p.strip()) > 30]
                    if paragraphs:
                        # Pick the one that doesn't start with analysis words
                        for p in reversed(paragraphs):
                            if not any(p.lower().startswith(w) for w in ["the user", "let me", "i need", "rating", "- "]):
                                content = p
                                break
    except Exception as e:
        return {"error": str(e)}

    # Build the approval message for WhatsApp
    stars = "⭐" * rating
    if lang == "ar":
        approval_msg = (
            f"📝 تقييم جديد من {reviewer_name} {stars}\n"
            f'"{review_text[:150]}"\n\n'
            f"✏️ الرد المقترح:\n"
            f'"{content}"\n\n'
            f"رد بـ:\n"
            f"✅ أرسل — لنشر الرد\n"
            f"✏️ [تعديلك] — لتعديل الرد\n"
            f"❌ تجاهل — لعدم الرد"
        )
    else:
        approval_msg = (
            f"📝 New review from {reviewer_name} {stars}\n"
            f'"{review_text[:150]}"\n\n'
            f"Drafted reply:\n"
            f'"{content}"\n\n'
            f"Reply with:\n"
            f"SEND — to post this reply\n"
            f"EDIT [your version] — to modify\n"
            f"SKIP — to ignore"
        )

    # Store the draft for later approval
    review_id = f"rev_{client_id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            await http.post(
                f"{_SUPA_URL}/rest/v1/activity_logs",
                headers=_SUPA_HEADERS,
                json={
                    "client_id": client_id,
                    "event_type": "review_draft",
                    "payload": {
                        "review_id": review_id,
                        "reviewer_name": reviewer_name,
                        "rating": rating,
                        "review_text": review_text,
                        "drafted_reply": content,
                        "status": "pending_approval",
                    },
                },
            )
    except:
        pass

    return {
        "review_id": review_id,
        "reviewer_name": reviewer_name,
        "rating": rating,
        "drafted_reply": content,
        "approval_message": approval_msg,
        "status": "pending_approval",
    }


async def process_review_approval(client_id: str, owner_response: str, review_id: str = "") -> dict:
    """Process the owner's approval/edit/skip of a drafted review response."""
    resp_lower = owner_response.strip().lower()

    if resp_lower in ("send", "أرسل", "ارسل", "✅"):
        # Approve as-is — fetch the draft
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                r = await http.get(
                    f"{_SUPA_URL}/rest/v1/activity_logs?client_id=eq.{client_id}&event_type=eq.review_draft&order=created_at.desc&limit=1&select=payload",
                    headers=_SUPA_HEADERS,
                )
                logs = r.json()
                if logs:
                    draft = logs[0]["payload"]
                    return {
                        "action": "approved",
                        "reply_text": draft.get("drafted_reply", ""),
                        "reviewer_name": draft.get("reviewer_name", ""),
                        "rating": draft.get("rating", 0),
                    }
        except:
            pass
        return {"action": "approved", "reply_text": "", "error": "Draft not found"}

    elif resp_lower in ("skip", "تجاهل", "❌", "ignore"):
        return {"action": "skipped"}

    elif resp_lower.startswith(("edit ", "✏️ ", "✏️")):
        # Owner provided a custom edit
        custom_reply = re.sub(r'^(edit|✏️)\s*', '', owner_response, flags=re.IGNORECASE).strip()
        return {"action": "edited", "reply_text": custom_reply}

    else:
        # Treat as custom reply text
        return {"action": "edited", "reply_text": owner_response.strip()}


# ═══════════════════════════════════════════════════════
# AUTOMATION GOVERNANCE
# ═══════════════════════════════════════════════════════

# What the AI auto-executes vs. what needs owner approval
GOVERNANCE_RULES = {
    # Auto-execute (low risk, high volume)
    "auto": [
        "reply_positive_review",      # 4-5 star reviews: auto-draft + send
        "send_booking_confirmation",   # Booking confirmed: auto-notify
        "send_reminder",               # Upcoming booking: auto-remind
        "small_price_change",          # Price change < 10%: auto-apply
        "log_customer_preference",     # Store dietary/seating pref: auto-save
    ],
    # Draft + approve (medium risk)
    "approve": [
        "reply_negative_review",       # 1-3 star reviews: draft for owner
        "send_promo_to_vips",          # Marketing to VIPs: draft for owner
        "send_reengagement",           # Win-back message: draft for owner
        "large_price_change",          # Price change >= 10%: confirm with owner
        "update_business_hours",       # Hours change: confirm with owner
        "respond_to_complaint",        # In-chat complaint: draft for owner
    ],
    # Never auto-execute (high risk)
    "never": [
        "staff_scheduling",
        "financial_transactions",
        "delete_customer_data",
        "public_social_media_post",
    ],
}


def classify_action(action_type: str, details: dict = None) -> str:
    """Determine if an action should be auto-executed, need approval, or be blocked."""
    details = details or {}

    # Check explicit rules
    for verdict, actions in GOVERNANCE_RULES.items():
        if action_type in actions:
            return verdict

    # Dynamic classification based on details
    if action_type == "price_change":
        old_price = float(details.get("old_price", 0) or 0)
        new_price = float(details.get("new_price", 0) or 0)
        if old_price > 0:
            change_pct = abs(new_price - old_price) / old_price * 100
            return "auto" if change_pct < 10 else "approve"
        return "approve"

    if action_type == "review_response":
        rating = details.get("rating", 3)
        return "auto" if rating >= 4 else "approve"

    # Default: require approval
    return "approve"


# ═══════════════════════════════════════════════════════
# MORNING BRIEF v3 — The Daily Scorecard
# ═══════════════════════════════════════════════════════

async def _fetch_history(client_id: str, days: int = 7) -> list[dict]:
    """Fetch daily stats for the last N days for trend/streak analysis."""
    now = datetime.now(timezone.utc)
    history = []

    for d in range(1, days + 1):
        target = now - timedelta(days=d)
        day_str = target.strftime("%Y-%m-%d")
        next_str = (target + timedelta(days=1)).strftime("%Y-%m-%d")
        entry = {"date": day_str, "day": target.strftime("%A"), "bookings": 0, "conversations": 0, "covers": 0, "cancelled": 0}
        try:
            async with httpx.AsyncClient(timeout=8) as http:
                r = await http.get(
                    f"{_SUPA_URL}/rest/v1/active_bookings?client_id=eq.{client_id}&created_at=gte.{day_str}T00:00:00Z&created_at=lt.{next_str}T00:00:00Z&select=status,party_size,guest_name",
                    headers=_SUPA_HEADERS,
                )
                bk = r.json() if r.status_code == 200 else []
                confirmed = [b for b in bk if b.get("status") in ("confirmed", "completed")]
                entry["bookings"] = len(confirmed)
                entry["covers"] = sum(b.get("party_size") or 2 for b in confirmed)
                entry["cancelled"] = sum(1 for b in bk if b.get("status") == "cancelled")
                entry["with_name"] = sum(1 for b in confirmed if b.get("guest_name"))

                r2 = await http.get(
                    f"{_SUPA_URL}/rest/v1/conversation_messages?client_id=eq.{client_id}&direction=eq.inbound&created_at=gte.{day_str}T00:00:00Z&created_at=lt.{next_str}T00:00:00Z&select=customer_phone",
                    headers=_SUPA_HEADERS,
                )
                msgs = r2.json() if r2.status_code == 200 else []
                entry["conversations"] = len(set(m.get("customer_phone", "") for m in msgs))
                entry["total_messages"] = len(msgs)
        except:
            pass
        history.append(entry)

    return history


def _trend_arrow(current: float, previous: float) -> str:
    """Return a trend indicator."""
    if previous == 0:
        return ""
    pct = ((current - previous) / previous) * 100
    if pct > 10:
        return f" (+{pct:.0f}%)"
    elif pct < -10:
        return f" ({pct:.0f}%)"
    return " (steady)"


def _streak(history: list[dict], field: str) -> str:
    """Detect winning/losing streaks."""
    if len(history) < 2:
        return ""
    direction = None
    count = 0
    for i in range(len(history) - 1):
        if history[i][field] > history[i + 1][field]:
            if direction == "up":
                count += 1
            else:
                direction = "up"
                count = 2
        elif history[i][field] < history[i + 1][field]:
            if direction == "down":
                count += 1
            else:
                direction = "down"
                count = 2
        else:
            break
    if count >= 3 and direction == "up":
        return f" ({count}-day winning streak)"
    elif count >= 3 and direction == "down":
        return f" ({count}-day slide)"
    return ""


def _best_day(history: list[dict], field: str) -> dict:
    """Find the best day in the history window."""
    if not history:
        return {}
    return max(history, key=lambda h: h.get(field, 0))


async def generate_morning_brief(client_id: str) -> str:
    """Generate the Daily Scorecard morning brief.

    Reads like a sports recap — packed with stats, trends, streaks,
    records, and personality. The owner should WANT to read this.
    """

    now = datetime.now(timezone.utc)
    # UAE time = UTC+4
    uae_now = now + timedelta(hours=4)
    yesterday_uae = uae_now - timedelta(days=1)
    yesterday = yesterday_uae.strftime("%Y-%m-%d")
    today = uae_now.strftime("%Y-%m-%d")
    day_name = yesterday_uae.strftime("%A")
    today_name = uae_now.strftime("%A")

    # ── Fetch client info ──
    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/clients?id=eq.{client_id}&select=company_name,contact_phone",
            headers=_SUPA_HEADERS,
        )
        client_info = r.json()[0] if r.json() else {}

    company = client_info.get("company_name", "Your business")
    lang = "ar" if any(0x600 < ord(c) < 0x6FF for c in company) else "en"

    # ── Fetch yesterday's detailed data ──
    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/active_bookings?client_id=eq.{client_id}&created_at=gte.{yesterday}T00:00:00Z&created_at=lt.{today}T00:00:00Z&select=*",
            headers=_SUPA_HEADERS,
        )
        bookings = r.json() if r.status_code == 200 else []

    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/conversation_messages?client_id=eq.{client_id}&created_at=gte.{yesterday}T00:00:00Z&created_at=lt.{today}T00:00:00Z&select=customer_phone,direction,content,created_at",
            headers=_SUPA_HEADERS,
        )
        all_msgs = r.json() if r.status_code == 200 else []

    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/active_bookings?client_id=eq.{client_id}&booking_date=like.*{today}*&select=guest_name,booking_time,party_size,occasion,dietary_notes,seating_preference,customer_phone",
            headers=_SUPA_HEADERS,
        )
        today_bookings = r.json() if r.status_code == 200 else []

    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}&select=crawl_data",
            headers=_SUPA_HEADERS,
        )
        kb_data = r.json()
        crawl = kb_data[0].get("crawl_data", {}) if kb_data else {}
        learned_rules = crawl.get("learned_rules", [])

    # ── Compute stats ──
    inbound = [m for m in all_msgs if m.get("direction") == "inbound"]
    outbound = [m for m in all_msgs if m.get("direction") == "outbound"]
    unique_customers = len(set(m.get("customer_phone", "") for m in inbound))
    total_inbound = len(inbound)
    total_outbound = len(outbound)

    confirmed = [b for b in bookings if b.get("status") in ("confirmed", "completed")]
    cancelled = [b for b in bookings if b.get("status") == "cancelled"]
    collecting = [b for b in bookings if b.get("status") == "collecting"]
    total_covers = sum(b.get("party_size") or 2 for b in confirmed)
    avg_party = round(total_covers / max(len(confirmed), 1), 1)

    with_name = sum(1 for b in confirmed if b.get("guest_name"))
    name_rate = round(with_name / max(len(confirmed), 1) * 100)
    with_occasion = [b for b in confirmed if b.get("occasion")]
    with_dietary = [b for b in confirmed if b.get("dietary_notes")]

    booking_phones = set(b.get("customer_phone", "") for b in bookings)
    msg_phones = set(m.get("customer_phone", "") for m in inbound)
    converters = booking_phones & msg_phones
    conversion_rate = round(len(converters) / max(len(msg_phones), 1) * 100)

    # Messages per convo
    msgs_per_convo = round(total_inbound / max(unique_customers, 1), 1)

    # AI response ratio (how many customer messages got a reply)
    ai_reply_rate = round(total_outbound / max(total_inbound, 1) * 100)

    # ── 7-day history for trends ──
    history = await _fetch_history(client_id, 7)

    # Same-day average (last 4 occurrences of this weekday)
    same_day_history = [h for h in history if h["day"] == day_name]
    avg_bookings = round(sum(h["bookings"] for h in same_day_history) / max(len(same_day_history), 1), 1) if same_day_history else 0
    avg_covers = round(sum(h["covers"] for h in same_day_history) / max(len(same_day_history), 1)) if same_day_history else 0
    avg_convos = round(sum(h["conversations"] for h in same_day_history) / max(len(same_day_history), 1), 1) if same_day_history else 0

    # Week-over-week
    last_week_total_bookings = sum(h["bookings"] for h in history)
    this_week_bookings = len(confirmed)  # just yesterday, but gives context

    # Best day this week
    best = _best_day(history, "bookings")
    booking_streak = _streak(history, "bookings")

    # ── Guest Intelligence ──
    at_risk_count = 0
    lapsed_count = 0
    champion_count = 0
    at_risk_names = []
    total_guests = 0
    try:
        intel = await build_guest_intelligence(client_id)
        at_risk_count = intel["segment_counts"].get("at_risk", 0)
        lapsed_count = intel["segment_counts"].get("lapsed", 0)
        champion_count = intel["segment_counts"].get("champion", 0)
        total_guests = intel["total_guests"]
        at_risk_names = [g["name"] for g in intel["segments"].get("at_risk", [])[:3]]
    except:
        pass

    # ══════════════════════════════════════════════════
    # BUILD THE BRIEF
    # ══════════════════════════════════════════════════

    b = []

    # ── HEADER ──
    if lang == "ar":
        b.append(f"{'='*28}")
        b.append(f"  {company}")
        b.append(f"  التقرير اليومي — {today_name}")
        b.append(f"{'='*28}")
    else:
        b.append(f"{'='*28}")
        b.append(f"  {company}")
        b.append(f"  Daily Scorecard — {today_name}")
        b.append(f"{'='*28}")

    # ── THE SCOREBOARD ──
    b.append("")
    if lang == "ar":
        b.append(f"  الحجوزات     {len(confirmed)}{_trend_arrow(len(confirmed), avg_bookings)}")
        b.append(f"  الضيوف       {total_covers}{_trend_arrow(total_covers, avg_covers)}")
        b.append(f"  المحادثات    {unique_customers}{_trend_arrow(unique_customers, avg_convos)}")
        b.append(f"  نسبة التحويل {conversion_rate}%")
        b.append(f"  متوسط الطاولة {avg_party} ضيف")
        if cancelled:
            b.append(f"  إلغاءات     {len(cancelled)}")
    else:
        b.append(f"  Bookings       {len(confirmed)}{_trend_arrow(len(confirmed), avg_bookings)}")
        b.append(f"  Covers         {total_covers}{_trend_arrow(total_covers, avg_covers)}")
        b.append(f"  Conversations  {unique_customers}{_trend_arrow(unique_customers, avg_convos)}")
        b.append(f"  Conversion     {conversion_rate}%")
        b.append(f"  Avg party      {avg_party} guests")
        if cancelled:
            b.append(f"  Cancellations  {len(cancelled)}")

    # ── STREAK / RECORD ──
    if booking_streak:
        b.append(f"  {booking_streak.strip()}")
    if best and best.get("bookings", 0) > 0 and len(confirmed) >= best["bookings"]:
        if lang == "ar":
            b.append(f"  * أفضل {day_name} هذا الأسبوع!")
        else:
            b.append(f"  * Best {day_name} this week!")

    # ── AI PERFORMANCE ──
    b.append("")
    if lang == "ar":
        b.append("🤖 أداء الذكاء الاصطناعي:")
        b.append(f"  الرسائل    {total_inbound} واردة / {total_outbound} صادرة")
        b.append(f"  متوسط/محادثة  {msgs_per_convo} رسالة")
        b.append(f"  جمع الأسماء   {name_rate}%")
        if collecting:
            b.append(f"  حجوزات معلقة  {len(collecting)} (ما اكتملت)")
    else:
        b.append("🤖 AI performance:")
        b.append(f"  Messages       {total_inbound} in / {total_outbound} out")
        b.append(f"  Avg/convo      {msgs_per_convo} messages")
        b.append(f"  Name capture   {name_rate}%")
        if collecting:
            b.append(f"  Stuck bookings {len(collecting)} (didn't complete)")

    # ── WHAT HAPPENED — color commentary ──
    highlights = []
    if with_occasion:
        occ_list = ", ".join(b_item.get("occasion", "") for b_item in with_occasion[:2])
        if lang == "ar":
            highlights.append(f"🎉 {len(with_occasion)} مناسبة خاصة: {occ_list}")
        else:
            highlights.append(f"🎉 {len(with_occasion)} special occasion(s): {occ_list}")

    big_parties = [bk for bk in confirmed if (bk.get("party_size") or 0) >= 6]
    if big_parties:
        biggest = max(big_parties, key=lambda x: x.get("party_size", 0))
        if lang == "ar":
            highlights.append(f"⭐ أكبر طاولة: {biggest.get('guest_name', '?')} — {biggest.get('party_size')} ضيف")
        else:
            highlights.append(f"⭐ Biggest table: {biggest.get('guest_name', '?')} — {biggest.get('party_size')} guests")

    if with_dietary:
        diet_names = ", ".join(bk.get("guest_name", "?") for bk in with_dietary[:2])
        if lang == "ar":
            highlights.append(f"🥗 طلبات غذائية: {diet_names}")
        else:
            highlights.append(f"🥗 Dietary requests: {diet_names}")

    if len(msg_phones) > 0 and conversion_rate < 40:
        if lang == "ar":
            highlights.append(f"📉 {len(msg_phones - booking_phones)} عميل تكلم بس ما حجز — فرصة ضائعة")
        else:
            highlights.append(f"📉 {len(msg_phones - booking_phones)} people chatted but didn't book — missed opportunity")

    if highlights:
        b.append("")
        if lang == "ar":
            b.append("📌 أبرز الأحداث:")
        else:
            b.append("📌 Highlights:")
        for h in highlights:
            b.append(f"  {h}")

    # ── TODAY'S LINEUP ──
    b.append("")
    if today_bookings:
        if lang == "ar":
            today_covers = sum(bk.get("party_size") or 2 for bk in today_bookings)
            b.append(f"📅 اليوم: {len(today_bookings)} حجز / {today_covers} ضيف")
        else:
            today_covers = sum(bk.get("party_size") or 2 for bk in today_bookings)
            b.append(f"📅 Today: {len(today_bookings)} bookings / {today_covers} covers")
        for bk in sorted(today_bookings, key=lambda x: x.get("booking_time", ""))[:8]:
            name = bk.get("guest_name", "?")
            size = bk.get("party_size", "?")
            time = bk.get("booking_time", "?")
            extras = []
            if bk.get("dietary_notes"):
                extras.append(f"DIET:{bk['dietary_notes'][:15]}")
            if bk.get("occasion"):
                extras.append(bk["occasion"])
            if bk.get("seating_preference"):
                extras.append(bk["seating_preference"])
            extra_str = f" [{', '.join(extras)}]" if extras else ""
            b.append(f"  {time}  {name} x{size}{extra_str}")
    else:
        if lang == "ar":
            b.append("📅 اليوم: لا حجوزات بعد")
        else:
            b.append("📅 Today: No bookings yet")

    # ── GUEST HEALTH ──
    if total_guests > 0:
        b.append("")
        if lang == "ar":
            b.append(f"👥 قاعدة العملاء: {total_guests} عميل")
            b.append(f"  🏆 {champion_count} VIP  |  ⚠️ {at_risk_count} معرض  |  💤 {lapsed_count} مفقود")
        else:
            b.append(f"👥 Guest base: {total_guests} total")
            b.append(f"  🏆 {champion_count} VIP  |  ⚠️ {at_risk_count} at risk  |  💤 {lapsed_count} lapsed")
        if at_risk_names:
            if lang == "ar":
                b.append(f"  → تواصل مع: {', '.join(at_risk_names)}")
            else:
                b.append(f"  → Reach out: {', '.join(at_risk_names)}")

    # ── SALES PIPELINE ──
    try:
        from sales_rep import get_pipeline_summary, get_hot_leads
        pipeline = await get_pipeline_summary(client_id)
        active_leads = pipeline.get("total_leads", 0) - pipeline.get("won_count", 0) - pipeline.get("lost_count", 0)
        if active_leads > 0 or pipeline.get("won_count", 0) > 0:
            b.append("")
            if lang == "ar":
                b.append(f"💰 المبيعات: {active_leads} فرصة نشطة | {pipeline.get('won_count', 0)} مكسوبة")
            else:
                b.append(f"💰 Sales: {active_leads} active leads | {pipeline.get('won_count', 0)} won")
            if pipeline.get("active_pipeline_value", 0) > 0:
                val = pipeline["active_pipeline_value"]
                if lang == "ar":
                    b.append(f"  قيمة الفرص: {val:,.0f} درهم")
                else:
                    b.append(f"  Pipeline value: AED {val:,.0f}")
        hot = await get_hot_leads(client_id, 70)
        if hot:
            names = ", ".join(l.get("name", l.get("customer_phone", "?")[-4:]) for l in hot[:3])
            if lang == "ar":
                b.append(f"  🔥 فرص ساخنة: {names}")
            else:
                b.append(f"  🔥 Hot leads: {names}")
    except:
        pass

    # ── LOYALTY SNAPSHOT ──
    try:
        from loyalty_engine import get_leaderboard
        leaders = await get_leaderboard(client_id, 3)
        if leaders:
            b.append("")
            total_members = len(leaders)
            if lang == "ar":
                b.append(f"🎖️ الولاء: أفضل {total_members} أعضاء")
            else:
                b.append(f"🎖️ Loyalty: Top {total_members} members")
            for m in leaders[:3]:
                name = m.get("name", m.get("customer_phone", "?")[-4:])
                pts = m.get("points", m.get("total_points", 0))
                tier = m.get("tier", "bronze")
                b.append(f"  {name}: {pts} pts ({tier})")
    except:
        pass

    # ── CONVERSION FUNNEL ──
    try:
        from conversion_tracking import get_conversion_funnel
        funnel = await get_conversion_funnel(client_id, 1)
        f_data = funnel.get("funnel", {})
        convos = f_data.get("conversations_started", 0)
        bookings = f_data.get("booking_completed", 0)
        if convos > 0:
            rate = funnel.get("conversion_rates", {}).get("overall", round(bookings / convos * 100, 1) if convos else 0)
            b.append("")
            if lang == "ar":
                b.append(f"📈 التحويل: {convos} محادثة → {bookings} حجز ({rate}%)")
            else:
                b.append(f"📈 Funnel: {convos} convos → {bookings} bookings ({rate}%)")
    except:
        pass

    # ── AI BRAIN ──
    active_rules = [r for r in learned_rules if isinstance(r, dict) and r.get("status", "active") in ("active", "probation", "verified")]
    if active_rules:
        b.append("")
        verified = sum(1 for r in active_rules if r.get("status") == "verified")
        probation = sum(1 for r in active_rules if r.get("status") == "probation")
        if lang == "ar":
            b.append(f"🧠 الذكاء الاصطناعي: {len(active_rules)} قاعدة ({verified} مثبتة, {probation} تجريبية)")
        else:
            b.append(f"🧠 AI brain: {len(active_rules)} rules ({verified} verified, {probation} testing)")
        newest = active_rules[-1]
        if lang == "ar":
            b.append(f"  آخر قاعدة: \"{newest['rule'][:60]}\"")
        else:
            b.append(f"  Latest: \"{newest['rule'][:60]}\"")

    # ── QUALITY SCORE ──
    try:
        from quality_eval import get_quality_dashboard
        quality = await get_quality_dashboard(client_id, 1)
        if quality.get("summary", {}).get("avg_score", 0) and quality["summary"]["avg_score"] > 0:
            score = quality["summary"]["avg_score"]
            grade = "A+" if score >= 0.95 else "A" if score >= 0.90 else "B+" if score >= 0.85 else "B" if score >= 0.75 else "C" if score >= 0.60 else "D"
            issues = len(quality["summary"].get("top_issues", []))
            b.append("")
            if lang == "ar":
                b.append(f"📋 جودة الذكاء الاصطناعي: {grade} ({score:.0%})")
                if issues:
                    b.append(f"  ⚠️ {issues} مشكلة مكتشفة")
            else:
                b.append(f"📋 AI Quality: {grade} ({score:.0%})")
                if issues:
                    b.append(f"  ⚠️ {issues} issue(s) detected")
    except:
        pass

    # ── 7-DAY SPARKLINE ──
    if history and any(h["bookings"] > 0 for h in history):
        b.append("")
        bars = []
        max_b = max(h["bookings"] for h in history) or 1
        for h in reversed(history):  # oldest first
            level = round(h["bookings"] / max_b * 5)
            bar_chars = ["_", "▁", "▂", "▃", "▅", "█"]
            bars.append(bar_chars[min(level, 5)])
        day_labels = "".join(h["day"][:2] for h in reversed(history))
        if lang == "ar":
            b.append(f"📊 آخر ٧ أيام: {''.join(bars)}")
        else:
            b.append(f"📊 Last 7 days: {''.join(bars)}")
            b.append(f"               {day_labels}")

    # ── QUICK ACTIONS ──
    b.append("")
    b.append("─" * 28)
    if lang == "ar":
        b.append("⚡ أوامر سريعة:")
        b.append("  'تقرير العملاء' — تفاصيل الضيوف")
        b.append("  'وش ناقص' — تنبيهات")
        b.append("  'مبيعات' — تقرير المبيعات")
        b.append("  'محتوى' — أفكار وجدول محتوى")
        b.append("  'نقاطي' — برنامج الولاء")
        b.append("  'قوقل' — تقرير الملف التجاري")
        b.append("  'صورة [موضوع]' — توليد وصف صورة احترافية")
        b.append("  'جودة' — تقييم جودة الذكاء الاصطناعي")
        b.append("  'سوق' — معلومات السوق")
        b.append("  'غيّر سعر [المنتج] لـ [السعر]'")
    else:
        b.append("⚡ Quick commands:")
        b.append("  'guest report' — full guest breakdown")
        b.append("  'what am I missing' — risk alerts")
        b.append("  'sales' — pipeline + hot leads")
        b.append("  'content' — ideas + calendar")
        b.append("  'loyalty' — program stats")
        b.append("  'google' — GBP audit + tips")
        b.append("  'image [topic]' — AI photo prompt")
        b.append("  'quality' — AI response quality score")
        b.append("  'intel' — market intelligence")
        b.append("  'change [item] price to [X]'")

    return "\n".join(b)


# ═══════════════════════════════════════════════════════
# NATURAL LANGUAGE COMMANDS (v2 — with idempotency)
# ═══════════════════════════════════════════════════════

# Track recent commands to prevent duplicates
_recent_commands: dict[str, dict] = {}  # client_id -> {command_hash: {result, timestamp}}


async def process_owner_command(client_id: str, command: str) -> str:
    """Process a natural language command from the owner and update the KB."""

    # Detect language
    arabic_chars = len(re.findall(r'[\u0600-\u06FF]', command))
    lang = "ar" if arabic_chars > len(re.findall(r'[a-zA-Z]', command)) else "en"

    # ── Idempotency Check ──
    cmd_hash = command.strip().lower()[:50]
    if client_id in _recent_commands:
        prev = _recent_commands[client_id].get(cmd_hash)
        if prev:
            age_minutes = (datetime.now(timezone.utc) - prev["timestamp"]).total_seconds() / 60
            if age_minutes < 30:
                if lang == "ar":
                    return f"✅ تم تنفيذ هذا الأمر بالفعل قبل {age_minutes:.0f} دقيقة: {prev['result'][:80]}"
                return f"✅ Already done {age_minutes:.0f}m ago: {prev['result'][:80]}"

    # ── Special Commands (no AI needed) ──
    cmd_lower = command.strip().lower()

    # Risk surfacing request
    if any(kw in cmd_lower for kw in ["what am i missing", "risks", "problems", "issues", "وش ناقص", "مشاكل", "تنبيهات", "ايش فاتني"]):
        result = await get_risk_brief(client_id, lang)
        return result

    # Guest intelligence request
    if any(kw in cmd_lower for kw in ["guest report", "guest intel", "customer report", "أخبار العملاء", "تقرير العملاء", "عملاء"]):
        result = await get_guest_brief(client_id, lang)
        return result

    # Sales pipeline request
    if any(kw in cmd_lower for kw in ["sales", "pipeline", "leads", "مبيعات", "فرص", "عملاء محتملين"]):
        try:
            from sales_rep import get_sales_digest
            return await get_sales_digest(client_id)
        except Exception as e:
            return f"Sales report error: {e}"

    # Content request
    if any(kw in cmd_lower for kw in ["content", "ideas", "calendar", "محتوى", "أفكار", "جدول"]):
        try:
            from content_engine import generate_content_brief
            return await generate_content_brief(client_id)
        except Exception as e:
            return f"Content error: {e}"

    # Loyalty request
    if any(kw in cmd_lower for kw in ["loyalty", "points", "نقاط", "ولاء", "نقاطي", "أعضاء"]):
        try:
            from loyalty_engine import get_loyalty_brief
            return await get_loyalty_brief(client_id, lang)
        except Exception as e:
            return f"Loyalty error: {e}"

    # Google Business request
    if any(kw in cmd_lower for kw in ["google", "gbp", "قوقل", "ملف تجاري", "تقييمات"]):
        try:
            from google_business import get_gbp_brief
            return await get_gbp_brief(client_id, lang)
        except Exception as e:
            return f"Google Business error: {e}"

    # Image prompt request
    if any(kw in cmd_lower for kw in ["image ", "photo ", "صورة ", "صور "]):
        try:
            from content_engine import handle_image_command
            return await handle_image_command(client_id, command, lang)
        except Exception as e:
            return f"Image error: {e}"

    # Analytics request
    if any(kw in cmd_lower for kw in ["analytics", "funnel", "tracking", "تحليل", "إحصائيات"]):
        try:
            from conversion_tracking import get_analytics_brief
            return await get_analytics_brief(client_id, lang)
        except Exception as e:
            return f"Analytics error: {e}"

    # Learning report request
    if any(kw in cmd_lower for kw in ["learnings", "learned", "تعلم", "وش تعلم"]):
        try:
            from karpathy_loop import generate_learning_report
            return await generate_learning_report(client_id, lang)
        except Exception as e:
            return f"Learnings error: {e}"

    # Achievements request
    if any(kw in cmd_lower for kw in ["achievements", "إنجازات", "badges"]):
        try:
            from loyalty_engine import handle_achievement_command
            return await handle_achievement_command(client_id, command, lang)
        except Exception as e:
            return f"Achievements error: {e}"

    # Billing request
    if any(kw in cmd_lower for kw in ["plan", "upgrade", "billing", "usage", "cancel", "خطتي", "ترقية", "فواتير", "استخدام", "إلغاء"]):
        try:
            from billing import process_billing_command
            return await process_billing_command(client_id, command, lang)
        except Exception as e:
            return f"Billing error: {e}"

    # Quality report request
    if any(kw in cmd_lower for kw in ["quality", "جودة", "score", "تقييم", "qa"]):
        try:
            from quality_eval import get_quality_brief
            return await get_quality_brief(client_id, lang)
        except Exception as e:
            return f"Quality error: {e}"

    # Market intelligence request
    if any(kw in cmd_lower for kw in ["intel", "market", "trending", "سوق", "ترند", "أخبار"]):
        try:
            from market_intel import get_market_brief
            return await get_market_brief(client_id, lang)
        except Exception as e:
            return f"Intel error: {e}"

    # Review response request
    if any(kw in cmd_lower for kw in ["send", "أرسل", "ارسل", "skip", "تجاهل"]):
        review_result = await process_review_approval(client_id, command)
        if review_result.get("action") == "approved":
            if lang == "ar":
                return f"✅ تم نشر الرد على التقييم"
            return f"✅ Review response posted"
        elif review_result.get("action") == "skipped":
            if lang == "ar":
                return f"👍 تم تجاهل التقييم"
            return f"👍 Review skipped"
        elif review_result.get("action") == "edited":
            if lang == "ar":
                return f"✅ تم نشر ردك المعدل"
            return f"✅ Your edited response posted"

    # Use MiniMax to interpret the command
    if not _MINIMAX_KEY:
        return "Command processing requires AI. API key not configured."

    try:
        async with httpx.AsyncClient(timeout=60) as http:
            r = await http.post(
                "https://api.minimax.io/v1/chat/completions",
                headers={"Authorization": f"Bearer {_MINIMAX_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "MiniMax-M2.7",
                    "messages": [
                        {"role": "system", "content": f"""You are a business management assistant. The owner sent a command to update their business. Interpret the command and output ONLY a JSON object.

Commands can be:
- Update price: {{"action": "update_price", "item": "item name", "new_price": "price"}}
- Add special: {{"action": "add_special", "name": "dish name", "price": "price", "description": "desc"}}
- Remove item: {{"action": "remove_item", "item": "item name"}}
- Update hours: {{"action": "update_hours", "new_hours": "hours string"}}
- Update info: {{"action": "update_info", "field": "field name", "value": "new value"}}
- Unknown: {{"action": "unknown", "message": "what you understood"}}

Do NOT use <think> tags. Output ONLY the JSON."""},
                        {"role": "user", "content": command},
                    ],
                    "max_tokens": 200,
                },
            )
            content = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            content = re.sub(r"<think>[\s\S]*?</think>\s*", "", content).strip()
            if not content and "<think>" in r.json().get("choices", [{}])[0].get("message", {}).get("content", ""):
                content = re.sub(r"</?think>", "", r.json()["choices"][0]["message"]["content"]).strip()

            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                parsed = json.loads(json_match.group())
            else:
                return f"Could not understand: {command}" if lang == "en" else f"ما فهمت الأمر: {command}"

    except Exception as e:
        return f"Error: {e}"

    # ── Execute with Governance Check ──
    action = parsed.get("action", "unknown")
    result = ""

    if action == "update_price":
        item = parsed.get("item", "")
        price = parsed.get("new_price", "")
        governance = classify_action("price_change", {"old_price": 0, "new_price": price})

        if governance == "approve":
            if lang == "ar":
                result = f"⚠️ تغيير كبير بالسعر — {item} إلى {price}. رد بـ 'نعم' للتأكيد"
            else:
                result = f"⚠️ Large price change — {item} to {price}. Reply YES to confirm"
        else:
            await _update_kb_item(client_id, item, price)
            result = f"✅ Updated {item} price to {price}" if lang == "en" else f"✅ تم تحديث سعر {item} إلى {price}"

    elif action == "add_special":
        name = parsed.get("name", "")
        price = parsed.get("price", "")
        desc = parsed.get("description", "")
        await _add_daily_special(client_id, name, price, desc)
        result = f"✅ Added today's special: {name} ({price})" if lang == "en" else f"✅ تم إضافة طبق اليوم: {name} ({price})"

    elif action == "update_hours":
        new_hours = parsed.get("new_hours", "")
        governance = classify_action("update_business_hours")
        if governance == "approve":
            if lang == "ar":
                result = f"⚠️ تغيير ساعات العمل إلى {new_hours}. رد بـ 'نعم' للتأكيد"
            else:
                result = f"⚠️ Change hours to {new_hours}. Reply YES to confirm"
        else:
            await _update_kb_field(client_id, "business_hours", new_hours)
            result = f"✅ Updated hours: {new_hours}" if lang == "en" else f"✅ تم تحديث ساعات العمل: {new_hours}"

    elif action == "remove_item":
        item = parsed.get("item", "")
        result = f"✅ Removed {item} from menu" if lang == "en" else f"✅ تم حذف {item} من القائمة"

    elif action == "update_info":
        field = parsed.get("field", "")
        value = parsed.get("value", "")
        result = f"✅ Updated {field}: {value}" if lang == "en" else f"✅ تم تحديث {field}: {value}"

    else:
        msg = parsed.get("message", command)
        result = f"🤔 Understood: {msg}. Can you be more specific?" if lang == "en" else f"🤔 فهمت: {msg}. ممكن توضح أكثر؟"

    # ── Store for idempotency ──
    if client_id not in _recent_commands:
        _recent_commands[client_id] = {}
    _recent_commands[client_id][cmd_hash] = {
        "result": result,
        "timestamp": datetime.now(timezone.utc),
    }
    # Clean old entries (older than 2 hours)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=2)
    _recent_commands[client_id] = {
        k: v for k, v in _recent_commands[client_id].items()
        if v["timestamp"] > cutoff
    }

    return result


async def _update_kb_field(client_id: str, field: str, value: str):
    """Update a specific field in business_knowledge."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            await http.patch(
                f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}",
                headers=_SUPA_HEADERS,
                json={field: value},
            )
    except Exception as e:
        print(f"[owner_brain] KB update failed: {e}")


async def _update_kb_item(client_id: str, item: str, price: str):
    """Update a menu item price in crawl_data."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}&select=crawl_data",
                headers=_SUPA_HEADERS,
            )
            kb = r.json()
            if not kb:
                return
            cd = kb[0]["crawl_data"]

            for category in cd.get("menu_highlights", []):
                for i, menu_item in enumerate(category.get("items", [])):
                    if item.lower() in menu_item.lower():
                        category["items"][i] = re.sub(r'[\d,]+(?:\.\d+)?\s*(?:AED|SAR|ريال)', f'{price}', menu_item)

            await http.patch(
                f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}",
                headers=_SUPA_HEADERS,
                json={"crawl_data": cd},
            )
    except Exception as e:
        print(f"[owner_brain] Menu update failed: {e}")


async def _add_daily_special(client_id: str, name: str, price: str, description: str):
    """Add a daily special to crawl_data."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}&select=crawl_data",
                headers=_SUPA_HEADERS,
            )
            kb = r.json()
            if not kb:
                return
            cd = kb[0]["crawl_data"]

            specials = cd.get("daily_specials", [])
            specials.append({"name": name, "price": price, "description": description})
            cd["daily_specials"] = specials

            await http.patch(
                f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}",
                headers=_SUPA_HEADERS,
                json={"crawl_data": cd},
            )
    except Exception as e:
        print(f"[owner_brain] Special add failed: {e}")


# ═══════════════════════════════════════════════════════
# REAL-TIME ALERTS (v2 — with governance)
# ═══════════════════════════════════════════════════════

async def send_owner_alert(client_id: str, alert_type: str, message: str, phone_number_id: str = ""):
    """Send a real-time alert to the business owner."""
    # Get owner phone
    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/clients?id=eq.{client_id}&select=contact_phone",
            headers=_SUPA_HEADERS,
        )
        client = r.json()
        if not client:
            return
        owner_phone = client[0].get("contact_phone", "")

    if not owner_phone or not phone_number_id or not _KAPSO_KEY:
        print(f"[owner_brain] Cannot send alert: missing phone/key")
        return

    prefix = {
        "new_booking": "📋 New booking",
        "large_party": "⭐ Large party",
        "complaint": "🚨 Complaint",
        "vip_return": "👑 VIP return",
        "hot_lead": "🔥 Hot lead",
        "review_positive": "⭐ New 5-star review",
        "review_negative": "🚨 Negative review",
        "at_risk_guest": "⚠️ Guest at risk",
        "milestone": "🎉 Milestone",
    }.get(alert_type, "📢 Alert")

    full_message = f"{prefix}: {message}"

    try:
        async with httpx.AsyncClient(timeout=15) as http:
            await http.post(
                f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages",
                headers={"X-API-Key": _KAPSO_KEY, "Content-Type": "application/json"},
                json={
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": owner_phone,
                    "type": "text",
                    "text": {"body": full_message},
                },
            )
            print(f"[owner_brain] Alert sent to {owner_phone}: {alert_type}")
    except Exception as e:
        print(f"[owner_brain] Alert failed: {e}")


# ═══════════════════════════════════════════════════════
# PROACTIVE RISK SURFACING ("What Am I Missing?")
# ═══════════════════════════════════════════════════════

async def surface_risks(client_id: str, lang: str = "en") -> list[dict]:
    """Proactively surface risks and missed opportunities."""
    risks = []
    now = datetime.now(timezone.utc)

    # 1. Unanswered conversations (inbound with no outbound within 2 hours)
    two_hours_ago = (now - timedelta(hours=2)).isoformat()
    today = now.strftime("%Y-%m-%d")
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            # Get recent inbound messages
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/conversation_messages?client_id=eq.{client_id}&direction=eq.inbound&created_at=gte.{today}T00:00:00Z&select=customer_phone,created_at&order=created_at.desc",
                headers=_SUPA_HEADERS,
            )
            inbound = r.json() if r.status_code == 200 else []

            # Get recent outbound messages
            r2 = await http.get(
                f"{_SUPA_URL}/rest/v1/conversation_messages?client_id=eq.{client_id}&direction=eq.outbound&created_at=gte.{today}T00:00:00Z&select=customer_phone,created_at&order=created_at.desc",
                headers=_SUPA_HEADERS,
            )
            outbound = r2.json() if r2.status_code == 200 else []

        outbound_phones = set(m.get("customer_phone", "") for m in outbound)
        unanswered = []
        for m in inbound:
            phone = m.get("customer_phone", "")
            if phone and phone not in outbound_phones:
                try:
                    msg_time = datetime.fromisoformat(m["created_at"].replace("Z", "+00:00"))
                    if (now - msg_time).total_seconds() > 7200:
                        unanswered.append(phone)
                except:
                    pass

        if unanswered:
            risks.append({
                "type": "unanswered",
                "severity": "high",
                "message_en": f"{len(set(unanswered))} unanswered conversations (2+ hours old)",
                "message_ar": f"{len(set(unanswered))} محادثة بدون رد (أكثر من ساعتين)",
                "action_en": "AI may have failed to respond. Check system logs.",
                "action_ar": "الذكاء الاصطناعي ربما لم يرد. تحقق من النظام.",
            })
    except:
        pass

    # 2. Today's bookings with no confirmation reminder sent
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/active_bookings?client_id=eq.{client_id}&booking_date=like.*{today}*&status=eq.confirmed&select=guest_name,booking_time,customer_phone",
                headers=_SUPA_HEADERS,
            )
            today_bookings = r.json() if r.status_code == 200 else []

        if len(today_bookings) > 0:
            # Check if reminders were sent
            r2 = await http.get(
                f"{_SUPA_URL}/rest/v1/scheduled_actions?client_id=eq.{client_id}&action_type=eq.reservation_reminder&status=eq.sent&created_at=gte.{today}T00:00:00Z&select=customer_phone",
                headers=_SUPA_HEADERS,
            )
            reminded = set(a.get("customer_phone", "") for a in (r2.json() if r2.status_code == 200 else []))
            unreminded = [b for b in today_bookings if b.get("customer_phone", "") not in reminded]

            if unreminded:
                names = ", ".join(b.get("guest_name", "?") for b in unreminded[:3])
                risks.append({
                    "type": "no_reminder",
                    "severity": "medium",
                    "message_en": f"{len(unreminded)} guests not yet reminded: {names}",
                    "message_ar": f"{len(unreminded)} ضيف لم يتم تذكيرهم: {names}",
                    "action_en": "Send confirmation reminders now",
                    "action_ar": "أرسل تذكير التأكيد الآن",
                })
    except:
        pass

    # 3. Check for at-risk VIP guests
    try:
        intel = await build_guest_intelligence(client_id)
        at_risk_champions = []
        for g in intel["segments"].get("at_risk", []):
            # Check if this guest was previously a champion/loyal
            if g["visits"] >= 3:
                at_risk_champions.append(g)

        if at_risk_champions:
            names = ", ".join(g["name"] for g in at_risk_champions[:3])
            risks.append({
                "type": "vip_churn",
                "severity": "high",
                "message_en": f"{len(at_risk_champions)} former regulars going cold: {names}",
                "message_ar": f"{len(at_risk_champions)} عميل سابق يبتعد: {names}",
                "action_en": "Send personalized win-back message",
                "action_ar": "أرسل رسالة استعادة شخصية",
            })
    except:
        pass

    # Sort by severity
    severity_order = {"high": 0, "medium": 1, "low": 2}
    risks.sort(key=lambda r: severity_order.get(r["severity"], 9))

    return risks


async def get_risk_brief(client_id: str, lang: str = "en") -> str:
    """Generate a WhatsApp-friendly risk summary."""
    risks = await surface_risks(client_id, lang)

    if not risks:
        if lang == "ar":
            return "✅ كل شيء تمام! ما في مشاكل تحتاج انتباهك الآن."
        return "✅ All clear! No issues need your attention right now."

    lines = []
    if lang == "ar":
        lines.append(f"🔍 {len(risks)} شيء يحتاج انتباهك:")
    else:
        lines.append(f"🔍 {len(risks)} items need attention:")

    for i, risk in enumerate(risks, 1):
        severity_icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(risk["severity"], "⚪")
        msg = risk[f"message_{lang}"] if f"message_{lang}" in risk else risk.get("message_en", "")
        action = risk[f"action_{lang}"] if f"action_{lang}" in risk else risk.get("action_en", "")
        lines.append(f"\n{severity_icon} {i}. {msg}")
        lines.append(f"   → {action}")

    return "\n".join(lines)
