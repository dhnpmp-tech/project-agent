"""Content Engine — AI Social Media Agent for SMBs

Generates social media content, tracks performance, and suggests posts
for restaurants, cafes, and salons in UAE/KSA. Works alongside the Owner
Brain (which delivers content briefs via WhatsApp).

Features:
1. Content Calendar — weekly plan mapped to platforms + pillars
2. Caption Generator — bilingual captions with hashtags + brand voice
3. Content Performance Insights — pattern analysis + weekly brief
4. Post Idea Generator — seasonal, cultural, industry-specific ideas
5. Hashtag Strategy — location-aware, mixed volume, Arabic support
6. Story Sequence — Instagram Stories concept generator
7. Trending Topics — UAE/KSA seasonal + cultural awareness
"""

from __future__ import annotations

import os
import json
import re
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
# AI HELPERS — MiniMax M2.7 integration
# ═══════════════════════════════════════════════════════

def _clean_ai_output(raw: str) -> str:
    """Clean MiniMax M2.7 output: strip think tags, CJK artifacts, bold markers."""
    # Strip <think>...</think> blocks (reasoning chain)
    content = re.sub(r"<think>[\s\S]*?</think>\s*", "", raw).strip()
    # If entire output was wrapped in think tags, extract what was inside
    if not content:
        content = re.sub(r"</?think>", "", raw).strip()
    # Strip Chinese/Japanese/Korean/Russian characters (MiniMax artifact)
    content = re.sub(
        r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u0400-\u04ff]+',
        '', content,
    ).strip()
    # Strip bold markdown
    content = content.replace("**", "")
    # Collapse double spaces
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
    """Call MiniMax and parse JSON from the response.

    Handles common issues: markdown fences, trailing commas, think tags.
    Returns parsed JSON or a fallback error dict.
    """
    raw = await _minimax_chat(system, user, max_tokens, temperature)
    # Try to extract JSON from markdown fences first
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    text = fence_match.group(1).strip() if fence_match else raw.strip()
    # Find the first [ or { and match to its closing bracket
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
    # Remove trailing commas before ] or }
    text = re.sub(r",\s*([}\]])", r"\1", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"error": "Failed to parse AI response", "raw": raw[:500]}


# ═══════════════════════════════════════════════════════
# SUPABASE HELPERS
# ═══════════════════════════════════════════════════════

async def _fetch_knowledge(client_id: str) -> dict:
    """Fetch business_knowledge for a client."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/business_knowledge"
                f"?client_id=eq.{client_id}&select=*",
                headers=_SUPA_HEADERS,
            )
            rows = r.json() if r.status_code == 200 else []
            return rows[0] if rows else {}
    except Exception:
        return {}


async def _fetch_client(client_id: str) -> dict:
    """Fetch client row (company_name, country, etc.)."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/clients"
                f"?id=eq.{client_id}&select=company_name,country,plan",
                headers=_SUPA_HEADERS,
            )
            rows = r.json() if r.status_code == 200 else []
            return rows[0] if rows else {}
    except Exception:
        return {}


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


async def _fetch_recent_content_logs(client_id: str, days: int = 30) -> list:
    """Fetch recent content-related activity logs for performance analysis."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/activity_logs"
                f"?client_id=eq.{client_id}"
                f"&event_type=in.(content_generated,content_published,content_calendar,content_performance)"
                f"&created_at=gte.{cutoff}"
                f"&select=event_type,summary,payload,created_at"
                f"&order=created_at.desc&limit=100",
                headers=_SUPA_HEADERS,
            )
            return r.json() if r.status_code == 200 else []
    except Exception:
        return []


# ═══════════════════════════════════════════════════════
# CONTENT PILLARS & INDUSTRY CONFIG
# ═══════════════════════════════════════════════════════

CONTENT_PILLARS = {
    "brand_story":   {"weight": 0.33, "label_en": "Brand Story",       "label_ar": "قصة العلامة"},
    "educational":   {"weight": 0.33, "label_en": "Educational / Tips", "label_ar": "نصائح وتعليم"},
    "community":     {"weight": 0.34, "label_en": "Community / UGC",    "label_ar": "مجتمع ومحتوى"},
}

PLATFORM_SPECS = {
    "instagram": {
        "caption_length": "50-150 words",
        "hashtags": "15-20",
        "format": "Visual-first. Conversational caption, emojis welcome (2-4). CTA in caption.",
    },
    "tiktok": {
        "caption_length": "30-60 words",
        "hashtags": "5-8",
        "format": "Hook in first 3 seconds. Fast-paced, value-packed script/concept. Trending audio.",
    },
    "google_business": {
        "caption_length": "80-150 words",
        "hashtags": "0",
        "format": "Professional update. Clear, informative. Include business details and CTA.",
    },
}

INDUSTRY_IDEAS = {
    "restaurant": {
        "recurring": [
            "Behind the scenes with the chef",
            "Customer of the week spotlight",
            "New dish reveal + taste test",
            "Staff story — who makes your experience",
            "Kitchen prep timelapse",
            "Ingredient spotlight — where our produce comes from",
            "Table setting transformation",
            "Chef's secret tip you can try at home",
            "Menu item history — why we created this dish",
            "Guest reaction compilation",
        ],
        "hashtag_seeds_en": ["foodie", "restaurant", "dining", "chef", "foodphotography", "instafood", "yummy"],
        "hashtag_seeds_ar": ["مطعم", "طبخ", "اكل", "شيف", "لذيذ", "فود"],
    },
    "cafe": {
        "recurring": [
            "Barista tips — how to make the perfect cup",
            "Coffee bean origin story",
            "Latte art showcase",
            "Morning routine at the cafe",
            "Behind the espresso machine",
            "Seasonal drink creation process",
            "Customer cozy corner moments",
            "Meet our barista",
            "Coffee vs. tea — weekly debate",
            "Pastry pairing guide",
        ],
        "hashtag_seeds_en": ["coffee", "cafe", "barista", "latteart", "coffeeshop", "coffeelover", "espresso"],
        "hashtag_seeds_ar": ["قهوة", "كافيه", "باريستا", "كوفي", "اسبريسو"],
    },
    "salon": {
        "recurring": [
            "Transformation reveal — before and after",
            "Skincare tip of the week",
            "Stylist spotlight",
            "Trending styles this season",
            "Hair care routine for Gulf climate",
            "Nail art showcase",
            "Bridal look creation process",
            "Product recommendation",
            "Client consultation walkthrough",
            "Quick styling tutorial",
        ],
        "hashtag_seeds_en": ["beauty", "salon", "hair", "skincare", "nails", "makeup", "hairstyle", "glam"],
        "hashtag_seeds_ar": ["صالون", "جمال", "شعر", "عناية", "مكياج", "تجميل"],
    },
}

# Location-specific hashtag pools
LOCATION_HASHTAGS = {
    "Dubai": {
        "en": ["Dubai", "DubaiLife", "MyDubai", "DubaiEats", "DubaiFoodie",
               "DubaiRestaurants", "DubaiCafes", "DubaiBeauty", "JumeirahFoodie",
               "DowntownDubai", "DubaiMarina", "DIFC"],
        "ar": ["دبي", "حياة_دبي", "مطاعم_دبي", "اكل_دبي"],
    },
    "Abu Dhabi": {
        "en": ["AbuDhabi", "InAbuDhabi", "AbuDhabiEats", "AbuDhabiFoodie",
               "AbuDhabiLife", "AbuDhabiRestaurants", "YasIsland", "Saadiyat"],
        "ar": ["ابوظبي", "اكل_ابوظبي", "مطاعم_ابوظبي"],
    },
    "Riyadh": {
        "en": ["Riyadh", "RiyadhEats", "RiyadhFoodie", "RiyadhCoffee",
               "RiyadhLife", "RiyadhRestaurants", "RiyadhSeason", "BoulevardRiyadh"],
        "ar": ["الرياض", "اكل_الرياض", "مطاعم_الرياض", "كافيهات_الرياض"],
    },
    "Jeddah": {
        "en": ["Jeddah", "JeddahEats", "JeddahFoodie", "JeddahCoffee",
               "JeddahLife", "JeddahRestaurants", "JeddahSeason"],
        "ar": ["جدة", "اكل_جدة", "مطاعم_جدة", "كافيهات_جدة"],
    },
    "Sharjah": {
        "en": ["Sharjah", "SharjahEats", "SharjahLife", "SharjahRestaurants"],
        "ar": ["الشارقة", "مطاعم_الشارقة"],
    },
    "Doha": {
        "en": ["Doha", "DohaEats", "DohaFoodie", "DohaLife", "QatarFood"],
        "ar": ["الدوحة", "اكل_الدوحة", "مطاعم_الدوحة"],
    },
}

# UAE/KSA cultural calendar for trending topics
UAE_KSA_EVENTS = [
    {"month": 1, "day": 1,  "name_en": "New Year",                   "name_ar": "رأس السنة",            "content_angle": "New year menu/services, resolutions"},
    {"month": 2, "day": 14, "name_en": "Valentine's Day",            "name_ar": "يوم الحب",              "content_angle": "Couples specials, gift ideas"},
    {"month": 3, "day": 1,  "name_en": "Ramadan (approx.)",          "name_ar": "رمضان",                 "content_angle": "Iftar menus, Ramadan hours, suhoor, Ramadan vibes"},
    {"month": 3, "day": 21, "name_en": "Mother's Day (Arab world)",  "name_ar": "عيد الأم",              "content_angle": "Mother's Day specials, tribute posts"},
    {"month": 4, "day": 1,  "name_en": "Eid al-Fitr (approx.)",      "name_ar": "عيد الفطر",             "content_angle": "Eid brunch, celebrations, family gatherings"},
    {"month": 6, "day": 1,  "name_en": "Eid al-Adha (approx.)",      "name_ar": "عيد الأضحى",            "content_angle": "Eid greetings, special menus, family feasts"},
    {"month": 6, "day": 15, "name_en": "Summer Season",              "name_ar": "موسم الصيف",            "content_angle": "Summer specials, cool treats, indoor experiences"},
    {"month": 9, "day": 23, "name_en": "Saudi National Day",         "name_ar": "اليوم الوطني السعودي",  "content_angle": "Green theme, national pride, special offers"},
    {"month": 10, "day": 1, "name_en": "Riyadh Season (approx.)",    "name_ar": "موسم الرياض",           "content_angle": "Event tie-ins, seasonal menus, visitor specials"},
    {"month": 11, "day": 11, "name_en": "Singles' Day / 11.11",      "name_ar": "يوم العزاب",            "content_angle": "Flash deals, solo dining specials"},
    {"month": 11, "day": 30, "name_en": "UAE Commemoration Day",     "name_ar": "يوم الشهيد",            "content_angle": "Respectful tribute, national unity"},
    {"month": 12, "day": 2,  "name_en": "UAE National Day",          "name_ar": "اليوم الوطني الإماراتي", "content_angle": "UAE flag colors, national pride, special menus"},
    {"month": 12, "day": 25, "name_en": "Christmas / Holiday Season", "name_ar": "عيد الميلاد",          "content_angle": "Festive menus, holiday decorations, gift cards"},
    {"month": 12, "day": 31, "name_en": "New Year's Eve",            "name_ar": "ليلة رأس السنة",        "content_angle": "NYE dinner, countdown, year in review"},
]

DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DAYS_AR = ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]


# ═══════════════════════════════════════════════════════
# 1. CONTENT CALENDAR
# ═══════════════════════════════════════════════════════

async def generate_content_calendar(
    client_id: str,
    business_type: str = "restaurant",
    days: int = 7,
) -> dict:
    """Generate a weekly content calendar mapped to platforms and pillars.

    Returns a dict with 'calendar' (list of day entries), 'pillars_used',
    and 'platforms_covered'. Logs the calendar to activity_logs.

    Args:
        client_id: UUID of the tenant.
        business_type: One of 'restaurant', 'cafe', 'salon'.
        days: Number of days to plan (default 7).

    Returns:
        dict with calendar entries, metadata, and any errors.
    """
    kb = await _fetch_knowledge(client_id)
    client = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client.get("company_name", "the business")
    brand_voice = kb.get("brand_voice", "Professional, warm, approachable")
    services = kb.get("services", [])
    crawl = kb.get("crawl_data", {}) or {}
    industry = crawl.get("industry", business_type)
    specials = crawl.get("daily_specials", [])
    content_pillars = kb.get("content_pillars", []) or list(CONTENT_PILLARS.keys())

    # Detect upcoming events
    upcoming = _get_upcoming_events(days=days + 7)
    upcoming_text = ""
    if upcoming:
        upcoming_text = "\n".join(
            f"- {e['name_en']} ({e['date']}): {e['content_angle']}"
            for e in upcoming[:4]
        )

    specials_text = ""
    if specials:
        specials_text = "\n".join(f"- {s.get('name', '')}: {s.get('description', '')}" for s in specials[:6])

    pillar_labels = ", ".join(
        CONTENT_PILLARS.get(p, {}).get("label_en", p) for p in content_pillars
    )

    system = f"""You are a social media strategist for {company_name}, a {industry} in the Gulf region.
Brand voice: {brand_voice}
Services: {', '.join(services[:10]) if services else 'various'}
Content pillars: {pillar_labels}

Create a {days}-day content calendar. For EACH day provide:
- day: day of week
- date_offset: 0 for today, 1 for tomorrow, etc.
- platform: "instagram" | "tiktok" | "google_business"
- pillar: one of [{', '.join(content_pillars)}]
- hook: attention-grabbing first line (max 15 words)
- concept: 1-2 sentence content concept
- visual_idea: what the photo/video should show
- best_time: suggested posting time (e.g. "12:00 PM" or "7:30 PM")
- language: "en" or "ar" (alternate ~30% Arabic)

Rules:
- Mix platforms evenly across the week (at least 2 per platform)
- Rotate pillars so no pillar appears more than 3 times
- Friday/Saturday are weekend in GCC — plan engaging content
- Thursday evening = social night — perfect for events/specials
- Make every hook scroll-stopping, not generic
- Output ONLY a JSON array of objects. No markdown, no explanation."""

    user_msg = f"Generate the content calendar for {days} days starting today."
    if upcoming_text:
        user_msg += f"\n\nUpcoming events to incorporate:\n{upcoming_text}"
    if specials_text:
        user_msg += f"\n\nCurrent specials:\n{specials_text}"

    result = await _minimax_json(system, user_msg, max_tokens=3000)

    if isinstance(result, dict) and "error" in result:
        return {"error": result["error"], "calendar": [], "client_id": client_id}

    calendar = result if isinstance(result, list) else [result]

    # Log to Supabase
    await _log_activity(
        client_id=client_id,
        event_type="content_calendar",
        summary=f"{days}-day content calendar for {company_name} ({len(calendar)} posts)",
        payload={
            "calendar": calendar,
            "business_type": business_type,
            "days": days,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    platforms_used = list({entry.get("platform", "") for entry in calendar if isinstance(entry, dict)})
    pillars_used = list({entry.get("pillar", "") for entry in calendar if isinstance(entry, dict)})

    return {
        "client_id": client_id,
        "company_name": company_name,
        "calendar": calendar,
        "platforms_covered": platforms_used,
        "pillars_used": pillars_used,
        "days": days,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ═══════════════════════════════════════════════════════
# 2. CAPTION GENERATOR
# ═══════════════════════════════════════════════════════

async def generate_caption(
    client_id: str,
    topic: str,
    style: str = "casual",
    lang: str = "en",
    platform: str = "instagram",
) -> dict:
    """Generate a social media caption with hashtags in the requested style.

    Produces multiple variants (formal, casual, storytelling) so the owner
    can pick. Matches brand voice from the business knowledge base.

    Args:
        client_id: UUID of the tenant.
        topic: What the post is about (e.g. "new wagyu dish", "Ramadan iftar").
        style: Primary style — "casual", "formal", or "storytelling".
        lang: "en" for English, "ar" for Gulf Arabic, "both" for bilingual.
        platform: Target platform — "instagram", "tiktok", "google_business".

    Returns:
        dict with 'captions' (list of variants), 'hashtags', 'platform'.
    """
    kb = await _fetch_knowledge(client_id)
    client = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client.get("company_name", "the business")
    brand_voice = kb.get("brand_voice", "Professional, warm, approachable")
    location = _detect_location(kb, client)
    business_type = _detect_business_type(kb)
    spec = PLATFORM_SPECS.get(platform, PLATFORM_SPECS["instagram"])

    lang_instruction = {
        "en": "Write in English.",
        "ar": "Write in Gulf Arabic (not formal MSA). Use Arabic naturally, not translated.",
        "both": "Write two versions: first in English, then in Gulf Arabic. Separate with ---. The Arabic should feel native, not translated.",
    }.get(lang, "Write in English.")

    system = f"""You are a social media copywriter for {company_name}.
Brand voice: {brand_voice}
Platform: {platform} — {spec['format']}
Caption length: {spec['caption_length']}
{lang_instruction}

Generate 3 caption variants for the given topic:
1. CASUAL — conversational, fun, relatable. Like talking to a friend.
2. FORMAL — polished, professional, brand-forward. Refined but not stiff.
3. STORYTELLING — narrative hook, mini-story, emotional. Draw the reader in.

For each variant provide:
- style: "casual" | "formal" | "storytelling"
- caption: the full caption text
- cta: call-to-action line
- hashtags: list of {spec['hashtags']} relevant hashtags (no # prefix)

Output ONLY a JSON array of 3 objects. No markdown fences, no explanation."""

    user_msg = f"Topic: {topic}\nLocation: {location}\nBusiness type: {business_type}"

    result = await _minimax_json(system, user_msg, max_tokens=2500)

    if isinstance(result, dict) and "error" in result:
        return {"error": result["error"], "captions": [], "client_id": client_id}

    captions = result if isinstance(result, list) else [result]

    # Enrich hashtags with location-specific tags
    location_tags = _get_location_hashtags(location, lang)
    for cap in captions:
        if isinstance(cap, dict):
            existing = cap.get("hashtags", [])
            if isinstance(existing, list):
                merged = existing + [t for t in location_tags[:4] if t not in existing]
                cap["hashtags"] = merged

    await _log_activity(
        client_id=client_id,
        event_type="content_generated",
        summary=f"Caption for '{topic}' ({platform}, {lang}, {style})",
        payload={
            "topic": topic,
            "platform": platform,
            "style": style,
            "lang": lang,
            "captions": captions,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return {
        "client_id": client_id,
        "topic": topic,
        "platform": platform,
        "lang": lang,
        "captions": captions,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ═══════════════════════════════════════════════════════
# 3. POST IDEA GENERATOR
# ═══════════════════════════════════════════════════════

async def generate_post_ideas(
    client_id: str,
    business_type: str = "restaurant",
    count: int = 5,
) -> list:
    """Generate post ideas based on business type, season, and trends.

    Combines industry-specific recurring ideas with seasonal/cultural
    events and AI-generated creative concepts.

    Args:
        client_id: UUID of the tenant.
        business_type: One of 'restaurant', 'cafe', 'salon'.
        count: Number of ideas to generate.

    Returns:
        list of idea dicts with title, concept, platform, pillar, and tags.
    """
    kb = await _fetch_knowledge(client_id)
    client = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client.get("company_name", "the business")
    brand_voice = kb.get("brand_voice", "")
    location = _detect_location(kb, client)
    services = kb.get("services", [])

    # Get industry-specific ideas
    industry_config = INDUSTRY_IDEAS.get(business_type, INDUSTRY_IDEAS["restaurant"])
    recurring = industry_config["recurring"]

    # Get upcoming events for seasonal relevance
    upcoming = _get_upcoming_events(days=14)
    seasonal_text = ""
    if upcoming:
        seasonal_text = "Upcoming events:\n" + "\n".join(
            f"- {e['name_en']}: {e['content_angle']}" for e in upcoming[:3]
        )

    recurring_text = "\n".join(f"- {idea}" for idea in recurring[:6])

    system = f"""You are a creative content strategist for {company_name}, a {business_type} in {location}.
Brand voice: {brand_voice or 'warm, authentic, Gulf-region vibe'}
Services: {', '.join(services[:8]) if services else 'various'}

Generate {count} unique, creative post ideas. Mix formats:
- Reels/TikTok concepts (short video)
- Carousel ideas (multi-image)
- Single photo + caption
- Stories sequences
- Interactive (polls, questions, quizzes)

For each idea provide:
- title: catchy idea name (5-10 words)
- concept: 2-3 sentence description of the content
- platform: best platform for this idea
- pillar: "brand_story" | "educational" | "community"
- format: "reel" | "carousel" | "photo" | "stories" | "interactive"
- difficulty: "easy" | "medium" | "hard"
- why_it_works: one sentence on why this performs well

Be SPECIFIC to this business type. No generic "post about your product."
Output ONLY a JSON array. No markdown, no explanation."""

    user_msg = f"Generate {count} post ideas for this week."
    if seasonal_text:
        user_msg += f"\n\n{seasonal_text}"
    user_msg += f"\n\nRecurring idea templates for inspiration (create fresh angles):\n{recurring_text}"

    result = await _minimax_json(system, user_msg, max_tokens=2500)

    if isinstance(result, dict) and "error" in result:
        return [{"error": result["error"]}]

    ideas = result if isinstance(result, list) else [result]

    await _log_activity(
        client_id=client_id,
        event_type="content_generated",
        summary=f"{len(ideas)} post ideas for {company_name} ({business_type})",
        payload={
            "ideas": ideas,
            "business_type": business_type,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return ideas


# ═══════════════════════════════════════════════════════
# 4. HASHTAG STRATEGY
# ═══════════════════════════════════════════════════════

async def get_hashtag_strategy(
    business_type: str,
    location: str = "Dubai",
    lang: str = "en",
) -> dict:
    """Generate an optimized hashtag strategy by platform, business type, and location.

    Mixes high-volume, medium, and niche hashtags. Includes Arabic tags.

    Args:
        business_type: One of 'restaurant', 'cafe', 'salon'.
        location: City name — Dubai, Riyadh, Abu Dhabi, Jeddah, etc.
        lang: "en", "ar", or "both".

    Returns:
        dict with sets for each platform + volume tier.
    """
    industry_config = INDUSTRY_IDEAS.get(business_type, INDUSTRY_IDEAS["restaurant"])
    seeds_en = industry_config.get("hashtag_seeds_en", [])
    seeds_ar = industry_config.get("hashtag_seeds_ar", [])
    loc_tags = LOCATION_HASHTAGS.get(location, LOCATION_HASHTAGS.get("Dubai", {}))
    loc_en = loc_tags.get("en", [])
    loc_ar = loc_tags.get("ar", [])

    # Build high / medium / niche tiers
    high_volume = [f"#{tag}" for tag in seeds_en[:3]] + [f"#{loc_en[0]}"] if loc_en else []
    medium_volume = [f"#{loc}_{tag}" if "_" not in tag else f"#{tag}" for loc, tag in zip([location.replace(" ", "")] * 4, seeds_en[:4])]
    medium_volume = [f"#{location.replace(' ', '')}{tag.capitalize()}" for tag in seeds_en[:4]]
    niche = [f"#{loc_en[i]}" for i in range(2, min(6, len(loc_en)))]

    # Arabic set
    arabic_tags = [f"#{tag}" for tag in seeds_ar] + [f"#{tag}" for tag in loc_ar]

    # Also ask AI for creative/trending additions
    system = f"""You are a social media hashtag strategist for the Gulf region.
Business type: {business_type}
Location: {location}

Generate hashtag sets optimized for maximum reach. Output ONLY a JSON object:
{{
  "instagram": {{
    "high_volume": ["tag1", "tag2", ...],  // 5 tags, 500K+ posts
    "medium": ["tag1", "tag2", ...],       // 5 tags, 50K-500K posts
    "niche": ["tag1", "tag2", ...],        // 5 tags, under 50K posts
    "branded": ["tag1", "tag2"]            // 2 tags the business should own
  }},
  "tiktok": {{
    "trending": ["tag1", "tag2", ...],     // 5 trending tags
    "niche": ["tag1", "tag2", ...]         // 3 niche tags
  }},
  "arabic": ["tag1", "tag2", ..."]          // 5-8 Arabic hashtags
}}

All tags WITHOUT # prefix. Mix English and transliterated Arabic.
Make them specific to {location} and {business_type}. No generic tags like #love or #photo."""

    ai_result = await _minimax_json(system, "Generate the hashtag strategy now.", max_tokens=1200)

    if isinstance(ai_result, dict) and "error" not in ai_result:
        # Merge AI suggestions with our pre-built tags
        ig = ai_result.get("instagram", {})
        tt = ai_result.get("tiktok", {})
        ar_ai = ai_result.get("arabic", [])

        strategy = {
            "instagram": {
                "high_volume": _dedupe_tags(ig.get("high_volume", []) + seeds_en[:3]),
                "medium": _dedupe_tags(ig.get("medium", []) + [f"{location.replace(' ', '')}{s.capitalize()}" for s in seeds_en[:3]]),
                "niche": _dedupe_tags(ig.get("niche", []) + [t for t in loc_en[2:6]]),
                "branded": ig.get("branded", []),
            },
            "tiktok": {
                "trending": _dedupe_tags(tt.get("trending", seeds_en[:5])),
                "niche": _dedupe_tags(tt.get("niche", [])),
            },
            "arabic": _dedupe_tags(ar_ai + seeds_ar + loc_ar),
            "location": location,
            "business_type": business_type,
        }
    else:
        # Fallback to pre-built only
        strategy = {
            "instagram": {
                "high_volume": seeds_en[:5],
                "medium": [f"{location.replace(' ', '')}{s.capitalize()}" for s in seeds_en[:5]],
                "niche": loc_en[2:7] if len(loc_en) > 2 else loc_en,
                "branded": [],
            },
            "tiktok": {
                "trending": seeds_en[:5],
                "niche": loc_en[:3],
            },
            "arabic": seeds_ar + loc_ar,
            "location": location,
            "business_type": business_type,
        }

    return strategy


# ═══════════════════════════════════════════════════════
# 5. CONTENT PERFORMANCE INSIGHTS
# ═══════════════════════════════════════════════════════

async def generate_content_brief(client_id: str) -> str:
    """Generate a WhatsApp-friendly weekly content brief.

    Analyzes recent content logs, identifies patterns, and builds
    a concise brief the Owner Brain can send via WhatsApp.

    Args:
        client_id: UUID of the tenant.

    Returns:
        str: Formatted WhatsApp message with content insights + plan.
    """
    kb = await _fetch_knowledge(client_id)
    client = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client.get("company_name", "your business")
    logs = await _fetch_recent_content_logs(client_id, days=30)

    # Analyze what has been generated/published
    total_generated = sum(1 for l in logs if l.get("event_type") == "content_generated")
    total_published = sum(1 for l in logs if l.get("event_type") == "content_published")
    total_calendars = sum(1 for l in logs if l.get("event_type") == "content_calendar")

    # Extract platform + pillar distribution
    platforms: dict[str, int] = {}
    pillars: dict[str, int] = {}
    for log in logs:
        p = log.get("payload", {})
        if isinstance(p, dict):
            plat = p.get("platform", "")
            if plat:
                platforms[plat] = platforms.get(plat, 0) + 1
            pill = p.get("pillar", "")
            if pill:
                pillars[pill] = pillars.get(pill, 0) + 1
            # Check nested calendar entries
            for entry in p.get("calendar", []):
                if isinstance(entry, dict):
                    pl = entry.get("platform", "")
                    pi = entry.get("pillar", "")
                    if pl:
                        platforms[pl] = platforms.get(pl, 0) + 1
                    if pi:
                        pillars[pi] = pillars.get(pi, 0) + 1

    # Get upcoming events
    upcoming = _get_upcoming_events(days=14)

    # Build the brief
    now = datetime.now(timezone.utc)
    lines = [
        f"Content Brief for {company_name}",
        f"Week of {now.strftime('%b %d, %Y')}",
        "",
        "--- Last 30 Days ---",
        f"  Content pieces generated: {total_generated}",
        f"  Calendars created: {total_calendars}",
        f"  Posts published: {total_published}",
    ]

    if platforms:
        lines.append("")
        lines.append("Platform breakdown:")
        for plat, count in sorted(platforms.items(), key=lambda x: -x[1]):
            lines.append(f"  {plat}: {count} posts")

    if pillars:
        lines.append("")
        lines.append("Content pillars used:")
        for pill, count in sorted(pillars.items(), key=lambda x: -x[1]):
            label = CONTENT_PILLARS.get(pill, {}).get("label_en", pill)
            lines.append(f"  {label}: {count}")

    # Recommendations
    lines.append("")
    lines.append("--- Recommendations ---")

    if not platforms:
        lines.append("  No content tracked yet. Let's start posting!")
    else:
        # Find underused platforms
        for plat in PLATFORM_SPECS:
            if plat not in platforms:
                lines.append(f"  Try posting on {plat} — you haven't used it yet")
        # Find underused pillars
        for pill_key, pill_info in CONTENT_PILLARS.items():
            if pill_key not in pillars:
                lines.append(f"  Add more {pill_info['label_en']} content to your mix")

    if upcoming:
        lines.append("")
        lines.append("--- Coming Up ---")
        for e in upcoming[:3]:
            lines.append(f"  {e['name_en']} ({e['date']})")
            lines.append(f"    Angle: {e['content_angle']}")

    lines.append("")
    lines.append("Reply CALENDAR to generate this week's plan")
    lines.append("Reply IDEAS for fresh post ideas")

    brief = "\n".join(lines)

    await _log_activity(
        client_id=client_id,
        event_type="content_brief",
        summary=f"Weekly content brief for {company_name}",
        payload={"brief": brief, "stats": {"generated": total_generated, "published": total_published}},
    )

    return brief


# ═══════════════════════════════════════════════════════
# 6. TRENDING TOPICS
# ═══════════════════════════════════════════════════════

def _get_upcoming_events(days: int = 14) -> list:
    """Get upcoming UAE/KSA events within the next N days."""
    now = datetime.now(timezone.utc)
    upcoming = []
    for event in UAE_KSA_EVENTS:
        # Check this year and next year
        for year in (now.year, now.year + 1):
            try:
                event_date = datetime(year, event["month"], event["day"], tzinfo=timezone.utc)
            except ValueError:
                continue
            delta = (event_date - now).days
            if 0 <= delta <= days:
                upcoming.append({
                    "name_en": event["name_en"],
                    "name_ar": event["name_ar"],
                    "date": event_date.strftime("%b %d"),
                    "days_away": delta,
                    "content_angle": event["content_angle"],
                })
    upcoming.sort(key=lambda e: e["days_away"])
    return upcoming


async def get_trending_topics(location: str = "UAE") -> list:
    """Get seasonal and cultural trending topics for content creation.

    Combines static calendar events with AI-generated trending angles
    relevant to the Gulf region.

    Args:
        location: "UAE", "KSA", or a city name.

    Returns:
        list of trending topic dicts with name, angle, and timeliness.
    """
    # Static upcoming events
    upcoming = _get_upcoming_events(days=30)

    # Day-of-week opportunities
    now = datetime.now(timezone.utc)
    day_name = DAYS_OF_WEEK[now.weekday()]
    day_tips = {
        "Monday": "Motivation Monday — share goals, team energy, fresh starts",
        "Tuesday": "Tip Tuesday — share expertise, mini-tutorials, how-tos",
        "Wednesday": "Midweek check-in — behind the scenes, work in progress",
        "Thursday": "Throwback Thursday + Social Night — event promos, evening specials",
        "Friday": "Friday vibes — relaxed content, weekend plans, family-friendly",
        "Saturday": "Weekend spotlight — customer moments, busy day energy",
        "Sunday": "Self-care Sunday / Prep for the week — reflective, planning ahead",
    }

    topics = []

    # Add day-specific tip
    topics.append({
        "type": "day_of_week",
        "name": f"{day_name} Content",
        "angle": day_tips.get(day_name, "Share something authentic today"),
        "urgency": "today",
    })

    # Add calendar events
    for e in upcoming:
        urgency = "today" if e["days_away"] == 0 else f"in {e['days_away']} days"
        topics.append({
            "type": "cultural_event",
            "name": e["name_en"],
            "name_ar": e["name_ar"],
            "angle": e["content_angle"],
            "urgency": urgency,
        })

    # Add evergreen Gulf-region topics
    month = now.month
    if month in (6, 7, 8):
        topics.append({
            "type": "seasonal",
            "name": "Summer Heat Content",
            "angle": "Indoor experiences, cool treats, AC jokes, summer survival guides",
            "urgency": "this season",
        })
    if month in (11, 12, 1):
        topics.append({
            "type": "seasonal",
            "name": "Cool Season / Tourist Season",
            "angle": "Outdoor dining, tourist-friendly content, seasonal menus, perfect weather",
            "urgency": "this season",
        })

    # AI-generated trending angles
    system = """You are a Gulf region social media trend analyst.
Generate 3 currently trending content angles for businesses in UAE/KSA.
Focus on what's actually trending on Instagram and TikTok right now.

Output ONLY a JSON array:
[{"name": "...", "angle": "...", "platform": "instagram|tiktok"}]

Be specific. No generic advice. Think viral formats, trending audios, meme templates."""

    ai_trends = await _minimax_json(
        system,
        f"What's trending for businesses in {location} this week? Today is {now.strftime('%B %d, %Y')}.",
        max_tokens=800,
    )

    if isinstance(ai_trends, list):
        for t in ai_trends:
            if isinstance(t, dict):
                topics.append({
                    "type": "trending",
                    "name": t.get("name", "Trend"),
                    "angle": t.get("angle", ""),
                    "platform": t.get("platform", ""),
                    "urgency": "this week",
                })

    return topics


# ═══════════════════════════════════════════════════════
# 7. STORY SEQUENCE GENERATOR
# ═══════════════════════════════════════════════════════

async def generate_story_sequence(
    client_id: str,
    topic: str,
    slides: int = 5,
) -> list:
    """Generate an Instagram Stories sequence concept.

    Creates a multi-slide story arc with hooks, visuals, and interactive
    elements (polls, questions, quizzes, sliders).

    Args:
        client_id: UUID of the tenant.
        topic: Story topic (e.g. "new menu launch", "behind the scenes").
        slides: Number of story slides (3-10).

    Returns:
        list of slide dicts with content, visual, and interaction specs.
    """
    slides = max(3, min(slides, 10))
    kb = await _fetch_knowledge(client_id)
    client = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client.get("company_name", "the business")
    brand_voice = kb.get("brand_voice", "Warm, authentic")
    business_type = _detect_business_type(kb)

    system = f"""You are an Instagram Stories strategist for {company_name} ({business_type}).
Brand voice: {brand_voice}

Create a {slides}-slide Instagram Story sequence. Follow this arc:
- Slide 1: HOOK — grab attention immediately (text overlay + visual)
- Slides 2-{slides-1}: CONTENT — deliver value, build engagement
- Slide {slides}: CTA — drive action (DM, visit, book, link in bio)

For each slide provide:
- slide_number: 1-{slides}
- type: "text_overlay" | "photo" | "video" | "poll" | "quiz" | "question" | "slider" | "countdown"
- text: main text shown on the story (keep it SHORT — max 15 words)
- subtext: smaller text below (optional, max 20 words)
- visual_direction: what the background photo/video should show
- sticker: any Instagram sticker to use (poll, question box, emoji slider, etc.)
- sticker_content: the poll options, question text, or slider emoji if applicable
- duration: suggested view time in seconds (5-15)

Make it feel native to Stories — vertical, casual, interactive.
Output ONLY a JSON array. No markdown, no explanation."""

    user_msg = f"Create a {slides}-slide story sequence about: {topic}"

    result = await _minimax_json(system, user_msg, max_tokens=2500)

    if isinstance(result, dict) and "error" in result:
        return [{"error": result["error"]}]

    sequence = result if isinstance(result, list) else [result]

    await _log_activity(
        client_id=client_id,
        event_type="content_generated",
        summary=f"Story sequence: {topic} ({len(sequence)} slides)",
        payload={
            "topic": topic,
            "slides": sequence,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return sequence


# ═══════════════════════════════════════════════════════
# UTILITY HELPERS
# ═══════════════════════════════════════════════════════

def _detect_location(kb: dict, client: dict) -> str:
    """Best-effort location detection from KB and client data."""
    # Check contact info
    contact = kb.get("contact_info", {}) or {}
    if isinstance(contact, dict):
        address = contact.get("address", "")
        if address:
            for city in LOCATION_HASHTAGS:
                if city.lower() in address.lower():
                    return city

    # Check client country
    country = client.get("country", "")
    if "uae" in country.lower() or "emirates" in country.lower():
        return "Dubai"
    if "saudi" in country.lower() or "ksa" in country.lower():
        return "Riyadh"

    # Check industry keywords
    keywords = kb.get("industry_keywords", []) or []
    for kw in keywords:
        for city in LOCATION_HASHTAGS:
            if city.lower() in kw.lower():
                return city

    return "Dubai"  # Default


def _detect_business_type(kb: dict) -> str:
    """Detect business type from KB fields."""
    desc = (kb.get("business_description", "") or "").lower()
    keywords = [kw.lower() for kw in (kb.get("industry_keywords", []) or [])]
    crawl = kb.get("crawl_data", {}) or {}
    industry = (crawl.get("industry", "") or "").lower()

    all_text = f"{desc} {' '.join(keywords)} {industry}"

    if any(w in all_text for w in ("cafe", "coffee", "barista", "roaster", "coffeeshop")):
        return "cafe"
    if any(w in all_text for w in ("salon", "beauty", "hair", "spa", "nail", "skincare", "barbershop")):
        return "salon"
    if any(w in all_text for w in ("restaurant", "dining", "food", "kitchen", "chef", "bistro", "eatery")):
        return "restaurant"

    return "restaurant"  # Default


def _get_location_hashtags(location: str, lang: str = "en") -> list:
    """Get location-specific hashtags."""
    loc_data = LOCATION_HASHTAGS.get(location, LOCATION_HASHTAGS.get("Dubai", {}))
    if lang == "ar":
        return loc_data.get("ar", [])
    if lang == "both":
        return loc_data.get("en", [])[:4] + loc_data.get("ar", [])[:3]
    return loc_data.get("en", [])


def _dedupe_tags(tags: list) -> list:
    """Deduplicate hashtags (case-insensitive), preserving order."""
    seen: set[str] = set()
    result = []
    for tag in tags:
        if not isinstance(tag, str):
            continue
        tag_clean = tag.strip().lstrip("#")
        if tag_clean and tag_clean.lower() not in seen:
            seen.add(tag_clean.lower())
            result.append(tag_clean)
    return result


# ═══════════════════════════════════════════════════════
# OWNER BRAIN INTEGRATION — WhatsApp command handlers
# ═══════════════════════════════════════════════════════

async def handle_content_command(client_id: str, command: str) -> Optional[str]:
    """Handle content-related commands from the owner via WhatsApp.

    Recognized commands:
        CALENDAR / جدول      — generate weekly calendar
        IDEAS / افكار         — generate post ideas
        CAPTION <topic>      — generate caption for a topic
        BRIEF / ملخص         — weekly content brief
        HASHTAGS             — hashtag strategy
        STORY <topic>        — generate story sequence
        TRENDING / ترند      — what's trending

    Args:
        client_id: UUID of the tenant.
        command: Raw text from the owner.

    Returns:
        str response for WhatsApp, or None if command not recognized.
    """
    cmd = command.strip().lower()

    # Calendar
    if cmd in ("calendar", "content calendar", "جدول", "جدول المحتوى"):
        result = await generate_content_calendar(client_id)
        if "error" in result:
            return f"Could not generate calendar: {result['error']}"
        cal = result.get("calendar", [])
        lines = [f"Content Calendar ({len(cal)} posts):"]
        for entry in cal:
            if isinstance(entry, dict):
                day = entry.get("day", "?")
                plat = entry.get("platform", "?")
                hook = entry.get("hook", "")
                lines.append(f"  {day} ({plat}): {hook}")
        return "\n".join(lines)

    # Ideas
    if cmd in ("ideas", "post ideas", "content ideas", "افكار", "أفكار"):
        kb = await _fetch_knowledge(client_id)
        btype = _detect_business_type(kb)
        ideas = await generate_post_ideas(client_id, business_type=btype, count=5)
        if ideas and isinstance(ideas[0], dict) and "error" in ideas[0]:
            return f"Could not generate ideas: {ideas[0]['error']}"
        lines = ["Post Ideas:"]
        for i, idea in enumerate(ideas, 1):
            if isinstance(idea, dict):
                title = idea.get("title", "Idea")
                concept = idea.get("concept", "")
                plat = idea.get("platform", "")
                lines.append(f"\n{i}. {title}")
                if concept:
                    lines.append(f"   {concept}")
                if plat:
                    lines.append(f"   Platform: {plat}")
        return "\n".join(lines)

    # Caption
    if cmd.startswith("caption ") or cmd.startswith("كابشن "):
        topic = command.strip()[8:].strip() if cmd.startswith("caption ") else command.strip()[7:].strip()
        if not topic:
            return "What's the topic? Reply: CAPTION <your topic>"
        result = await generate_caption(client_id, topic)
        captions = result.get("captions", [])
        if not captions:
            return f"Could not generate caption: {result.get('error', 'unknown error')}"
        lines = [f"Captions for '{topic}':"]
        for cap in captions:
            if isinstance(cap, dict):
                style = cap.get("style", "?")
                text = cap.get("caption", "")
                tags = cap.get("hashtags", [])
                lines.append(f"\n--- {style.upper()} ---")
                lines.append(text)
                if tags:
                    tag_str = " ".join(f"#{t}" if not t.startswith("#") else t for t in tags[:10])
                    lines.append(f"\n{tag_str}")
        return "\n".join(lines)

    # Brief
    if cmd in ("brief", "content brief", "weekly brief", "ملخص", "ملخص المحتوى"):
        return await generate_content_brief(client_id)

    # Hashtags
    if cmd in ("hashtags", "hashtag", "هاشتاق", "هاشتاقات"):
        kb = await _fetch_knowledge(client_id)
        client = await _fetch_client(client_id)
        btype = _detect_business_type(kb)
        location = _detect_location(kb, client)
        strategy = await get_hashtag_strategy(btype, location)
        ig = strategy.get("instagram", {})
        lines = [f"Hashtag Strategy ({btype} in {location}):"]
        lines.append("\nInstagram:")
        for tier in ("high_volume", "medium", "niche", "branded"):
            tags = ig.get(tier, [])
            if tags:
                lines.append(f"  {tier}: {' '.join(f'#{t}' for t in tags[:6])}")
        tt = strategy.get("tiktok", {})
        if tt:
            lines.append("\nTikTok:")
            for tier in ("trending", "niche"):
                tags = tt.get(tier, [])
                if tags:
                    lines.append(f"  {tier}: {' '.join(f'#{t}' for t in tags[:6])}")
        ar_tags = strategy.get("arabic", [])
        if ar_tags:
            lines.append(f"\nArabic: {' '.join(f'#{t}' for t in ar_tags[:8])}")
        return "\n".join(lines)

    # Story
    if cmd.startswith("story ") or cmd.startswith("ستوري "):
        topic = command.strip()[6:].strip()
        if not topic:
            return "What's the story about? Reply: STORY <your topic>"
        slides = await generate_story_sequence(client_id, topic, slides=5)
        if slides and isinstance(slides[0], dict) and "error" in slides[0]:
            return f"Could not generate story: {slides[0]['error']}"
        lines = [f"Story Sequence: {topic} ({len(slides)} slides)"]
        for s in slides:
            if isinstance(s, dict):
                num = s.get("slide_number", "?")
                text = s.get("text", "")
                stype = s.get("type", "")
                visual = s.get("visual_direction", "")
                lines.append(f"\n  Slide {num} ({stype}):")
                lines.append(f"    Text: {text}")
                if visual:
                    lines.append(f"    Visual: {visual}")
                sticker = s.get("sticker_content")
                if sticker:
                    lines.append(f"    Sticker: {sticker}")
        return "\n".join(lines)

    # Trending
    if cmd in ("trending", "trends", "ترند", "ترندات", "what's trending"):
        topics = await get_trending_topics(location="UAE")
        lines = ["Trending Now:"]
        for t in topics:
            name = t.get("name", "")
            angle = t.get("angle", "")
            urgency = t.get("urgency", "")
            lines.append(f"\n  {name} ({urgency})")
            if angle:
                lines.append(f"    {angle}")
        return "\n".join(lines)

    # Not a content command
    return None


# ═══════════════════════════════════════════════════════
# 8. CONTENT REPURPOSING PIPELINE
# ═══════════════════════════════════════════════════════

REPURPOSE_PLATFORM_SPECS = {
    "instagram_feed": {
        "caption_length": "50-150 words",
        "hashtags": "15-20 hashtags",
        "format": "Square or portrait image/carousel. Visual-first. Conversational caption with emojis (2-4). CTA in caption.",
        "tone": "Polished casual. Instagram-native. Emojis welcome.",
        "char_limit": 2200,
    },
    "instagram_story": {
        "caption_length": "10-30 words (text overlay)",
        "hashtags": "2-3 in sticker",
        "format": "Vertical 9:16. Bold text overlay. One key message per slide. Sticker/poll/question optional.",
        "tone": "Casual, urgent, ephemeral. Like texting a friend.",
        "char_limit": 250,
    },
    "tiktok": {
        "caption_length": "30-60 words",
        "hashtags": "5-8 hashtags",
        "format": "Vertical video script concept. Hook in first 3 seconds. Fast-paced. Trending audio reference.",
        "tone": "Gen-Z casual. Trend-aware. Slightly edgy. Value-packed.",
        "char_limit": 300,
    },
    "google_business": {
        "caption_length": "80-150 words",
        "hashtags": "0 hashtags (not supported)",
        "format": "Professional update post. Clear, informative. Include business name, hours, CTA.",
        "tone": "Professional, trustworthy. Focus on info + value proposition.",
        "char_limit": 1500,
    },
    "whatsapp_status": {
        "caption_length": "10-25 words",
        "hashtags": "0 hashtags",
        "format": "Single image + short text overlay OR short text status. Ultra-concise.",
        "tone": "Personal, direct, casual. Like a broadcast to friends.",
        "char_limit": 700,
    },
}


async def repurpose_content(
    client_id: str,
    original_content: str,
    original_platform: str = "instagram",
    target_platforms: list | None = None,
) -> dict:
    """Take one piece of content and adapt it for multiple platforms.

    Each adaptation respects the target platform's character limits,
    hashtag conventions, format requirements, and expected tone.

    Args:
        client_id: UUID of the tenant.
        original_content: The original post caption/text to repurpose.
        original_platform: Where the content was originally written for
            (instagram, tiktok, google_business, etc.).
        target_platforms: List of platforms to adapt for. Defaults to all
            platforms except the original.

    Returns:
        dict with 'adaptations' (dict keyed by platform), 'original', metadata.
    """
    if not target_platforms:
        target_platforms = [
            p for p in REPURPOSE_PLATFORM_SPECS
            if p != original_platform
        ]

    kb = await _fetch_knowledge(client_id)
    client = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client.get("company_name", "the business")
    brand_voice = kb.get("brand_voice", "Professional, warm, approachable")
    location = _detect_location(kb, client)
    business_type = _detect_business_type(kb)

    # Build platform specs block for the prompt
    platform_blocks = []
    for plat in target_platforms:
        spec = REPURPOSE_PLATFORM_SPECS.get(plat)
        if not spec:
            continue
        platform_blocks.append(
            f"--- {plat} ---\n"
            f"Format: {spec['format']}\n"
            f"Tone: {spec['tone']}\n"
            f"Length: {spec['caption_length']}\n"
            f"Hashtags: {spec['hashtags']}\n"
            f"Max chars: {spec['char_limit']}"
        )

    platforms_text = "\n\n".join(platform_blocks)

    system = f"""You are a multi-platform content strategist for {company_name}, a {business_type} in {location}.
Brand voice: {brand_voice}

You will be given a piece of content originally written for {original_platform}.
Your job is to REPURPOSE it for each target platform, adapting:
- Length and format to match platform norms
- Tone to match platform culture
- Hashtags to match platform conventions
- CTA to match platform behavior (DM vs link vs visit vs swipe up)
- Visual/format suggestions specific to each platform

Do NOT just copy-paste. Each version should feel NATIVE to its platform.

Target platforms and their specs:
{platforms_text}

Output ONLY a JSON object with platform names as keys:
{{
  "platform_name": {{
    "caption": "adapted caption text",
    "hashtags": ["tag1", "tag2"],
    "cta": "call to action",
    "format_suggestion": "what visual/format works best",
    "text_overlay": "if applicable (stories, status)",
    "hook": "attention-grabbing first line",
    "notes": "any platform-specific tips"
  }}
}}

No markdown fences, no explanation. Just the JSON object."""

    user_msg = (
        f"Original content ({original_platform}):\n\n{original_content}\n\n"
        f"Repurpose for: {', '.join(target_platforms)}"
    )

    result = await _minimax_json(system, user_msg, max_tokens=4000, temperature=0.75)

    if isinstance(result, dict) and "error" in result:
        return {
            "error": result["error"],
            "adaptations": {},
            "client_id": client_id,
        }

    # Enrich with location hashtags where relevant
    for plat, adaptation in result.items():
        if isinstance(adaptation, dict) and plat in ("instagram_feed", "tiktok"):
            existing_tags = adaptation.get("hashtags", [])
            if isinstance(existing_tags, list):
                loc_tags = _get_location_hashtags(location, "en")
                merged = existing_tags + [t for t in loc_tags[:3] if t not in existing_tags]
                adaptation["hashtags"] = merged

    await _log_activity(
        client_id=client_id,
        event_type="content_repurposed",
        summary=(
            f"Repurposed content from {original_platform} to "
            f"{', '.join(target_platforms)} for {company_name}"
        ),
        payload={
            "original_platform": original_platform,
            "target_platforms": target_platforms,
            "original_content": original_content[:300],
            "adaptations": result,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return {
        "client_id": client_id,
        "company_name": company_name,
        "original_platform": original_platform,
        "original_content": original_content,
        "target_platforms": target_platforms,
        "adaptations": result,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ═══════════════════════════════════════════════════════
# 9. VIDEO SCRIPT GENERATOR
# ═══════════════════════════════════════════════════════

VIDEO_SCRIPT_TEMPLATES = {
    "restaurant_dish_reveal": {
        "name": "Dish Reveal",
        "industry": "restaurant",
        "duration": 30,
        "arc": [
            {"beat": "tease", "seconds": "0-3", "description": "Close-up of sizzle/steam/pour — no reveal yet"},
            {"beat": "build", "seconds": "3-10", "description": "Show prep steps, ingredients, chef hands"},
            {"beat": "reveal", "seconds": "10-20", "description": "Full dish reveal with plating, slow motion"},
            {"beat": "reaction", "seconds": "20-25", "description": "First bite / customer reaction / cheese pull"},
            {"beat": "cta", "seconds": "25-30", "description": "Dish name + 'Available now' + location tag"},
        ],
    },
    "restaurant_behind_scenes": {
        "name": "Behind the Scenes",
        "industry": "restaurant",
        "duration": 45,
        "arc": [
            {"beat": "hook", "seconds": "0-3", "description": "POV: You walk into our kitchen at 6AM"},
            {"beat": "morning_prep", "seconds": "3-15", "description": "Ingredients arriving, chopping, mise en place"},
            {"beat": "cooking", "seconds": "15-30", "description": "Fire, flip, seasoning, taste-testing"},
            {"beat": "plating", "seconds": "30-40", "description": "Beautiful plating sequence"},
            {"beat": "cta", "seconds": "40-45", "description": "This is what goes into every plate. Book your table."},
        ],
    },
    "restaurant_chef_story": {
        "name": "Chef's Story",
        "industry": "restaurant",
        "duration": 60,
        "arc": [
            {"beat": "hook", "seconds": "0-3", "description": "I've been cooking for 20 years but this dish..."},
            {"beat": "origin", "seconds": "3-20", "description": "Chef tells the story behind the dish"},
            {"beat": "demo", "seconds": "20-45", "description": "Chef prepares the dish while narrating"},
            {"beat": "taste", "seconds": "45-55", "description": "Final product + chef's pride moment"},
            {"beat": "cta", "seconds": "55-60", "description": "Come taste chef's passion. Link in bio."},
        ],
    },
    "salon_transformation": {
        "name": "Before & After Transformation",
        "industry": "salon",
        "duration": 30,
        "arc": [
            {"beat": "before", "seconds": "0-5", "description": "Client's current look — 'She asked for a total change'"},
            {"beat": "process", "seconds": "5-20", "description": "Quick cuts of washing, cutting, coloring, styling"},
            {"beat": "reveal", "seconds": "20-25", "description": "Chair spin reveal — slow motion reaction"},
            {"beat": "reaction", "seconds": "25-28", "description": "Client's genuine reaction / smile / hair flip"},
            {"beat": "cta", "seconds": "28-30", "description": "Your transformation is waiting. Book now."},
        ],
    },
    "salon_tutorial": {
        "name": "Quick Tutorial",
        "industry": "salon",
        "duration": 45,
        "arc": [
            {"beat": "hook", "seconds": "0-3", "description": "Stop ruining your hair with this one mistake"},
            {"beat": "problem", "seconds": "3-10", "description": "Show the common mistake most people make"},
            {"beat": "solution", "seconds": "10-30", "description": "Step-by-step correct technique with pro tips"},
            {"beat": "result", "seconds": "30-40", "description": "Show the difference — wrong way vs right way"},
            {"beat": "cta", "seconds": "40-45", "description": "For pro results, visit us. Book in bio."},
        ],
    },
    "cafe_barista_art": {
        "name": "Barista Art",
        "industry": "cafe",
        "duration": 30,
        "arc": [
            {"beat": "hook", "seconds": "0-3", "description": "POV: Your barista is an artist"},
            {"beat": "process", "seconds": "3-15", "description": "Espresso shot pulling, milk steaming, pouring"},
            {"beat": "art", "seconds": "15-25", "description": "Latte art creation — close-up, satisfying pour"},
            {"beat": "reveal", "seconds": "25-28", "description": "Final art reveal — overhead shot"},
            {"beat": "cta", "seconds": "28-30", "description": "Too pretty to drink? Come try. Location tag."},
        ],
    },
    "cafe_brew_method": {
        "name": "Brew Method Spotlight",
        "industry": "cafe",
        "duration": 45,
        "arc": [
            {"beat": "hook", "seconds": "0-3", "description": "You've been drinking coffee wrong your whole life"},
            {"beat": "intro", "seconds": "3-10", "description": "Introduce the brew method (V60/Aeropress/etc)"},
            {"beat": "process", "seconds": "10-35", "description": "Step-by-step brew with measurements and tips"},
            {"beat": "taste", "seconds": "35-42", "description": "First sip reaction — describe the flavor notes"},
            {"beat": "cta", "seconds": "42-45", "description": "Try our signature brew. Visit us today."},
        ],
    },
    "general_customer_spotlight": {
        "name": "Customer Spotlight",
        "industry": "any",
        "duration": 30,
        "arc": [
            {"beat": "hook", "seconds": "0-3", "description": "Meet our favorite regular / This guest has visited 50 times"},
            {"beat": "story", "seconds": "3-15", "description": "Quick interview or voiceover about their experience"},
            {"beat": "favorite", "seconds": "15-22", "description": "Show their go-to order / service / table"},
            {"beat": "quote", "seconds": "22-27", "description": "Customer's own words about why they keep coming back"},
            {"beat": "cta", "seconds": "27-30", "description": "Become a regular. Visit us today."},
        ],
    },
    "general_team_intro": {
        "name": "Meet the Team",
        "industry": "any",
        "duration": 30,
        "arc": [
            {"beat": "hook", "seconds": "0-3", "description": "The faces behind your experience"},
            {"beat": "intro", "seconds": "3-10", "description": "Quick name + role + fun fact for each team member"},
            {"beat": "action", "seconds": "10-22", "description": "Show each person doing what they do best"},
            {"beat": "together", "seconds": "22-27", "description": "Group shot / team energy moment"},
            {"beat": "cta", "seconds": "27-30", "description": "Come say hi. We're waiting for you."},
        ],
    },
}

# Duration constraints by style
VIDEO_STYLE_SPECS = {
    "reel": {
        "min_duration": 15,
        "max_duration": 90,
        "default_duration": 30,
        "platform": "instagram",
        "orientation": "vertical (9:16)",
        "notes": "Hook in first 1-3 seconds. Fast cuts. Trending audio. Text overlays.",
    },
    "tiktok": {
        "min_duration": 15,
        "max_duration": 180,
        "default_duration": 30,
        "platform": "tiktok",
        "orientation": "vertical (9:16)",
        "notes": "Hook immediately. Trending sounds. Duet/stitch-friendly. Raw > polished.",
    },
    "story": {
        "min_duration": 5,
        "max_duration": 60,
        "default_duration": 15,
        "platform": "instagram",
        "orientation": "vertical (9:16)",
        "notes": "15s per slide max. Interactive stickers. Swipe-up CTA if eligible.",
    },
    "long_form": {
        "min_duration": 60,
        "max_duration": 600,
        "default_duration": 180,
        "platform": "youtube",
        "orientation": "horizontal (16:9) or vertical",
        "notes": "Strong intro. Chapter markers. Value-dense. Subscribe CTA.",
    },
}


async def generate_video_script(
    client_id: str,
    topic: str,
    style: str = "reel",
    duration: int = 30,
    lang: str = "en",
) -> dict:
    """Generate a video script with timestamps, visuals, and audio direction.

    Uses the Hook-in-3-seconds rule and industry-specific templates.
    Each segment includes timestamp, visual direction, audio/narration,
    and text overlay suggestions.

    Args:
        client_id: UUID of the tenant.
        topic: What the video is about (e.g., "new pasta dish", "hair transformation").
        style: Video style — "reel" (30-60s), "tiktok" (15-60s),
            "story" (15s per slide), "long_form" (2-5min).
        duration: Target duration in seconds.
        lang: "en" or "ar".

    Returns:
        dict with hook, segments (timestamped), cta, music_suggestion,
        style_info, and matching template if available.
    """
    style_spec = VIDEO_STYLE_SPECS.get(style, VIDEO_STYLE_SPECS["reel"])
    duration = max(style_spec["min_duration"], min(duration, style_spec["max_duration"]))

    kb = await _fetch_knowledge(client_id)
    client = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client.get("company_name", "the business")
    brand_voice = kb.get("brand_voice", "Professional, warm, approachable")
    business_type = _detect_business_type(kb)
    location = _detect_location(kb, client)

    # Find matching template
    matching_template = _find_matching_template(topic, business_type)
    template_text = ""
    if matching_template:
        template_text = (
            f"\n\nUse this proven template as a starting structure:\n"
            f"Template: {matching_template['name']}\n"
            f"Arc: {json.dumps(matching_template['arc'], indent=2)}\n"
            f"Adapt the beats to fit the specific topic."
        )

    lang_instruction = {
        "en": "Write all text in English.",
        "ar": "Write all text/narration in Gulf Arabic (not formal MSA). Natural, spoken Arabic.",
    }.get(lang, "Write in English.")

    system = f"""You are a video content director for {company_name}, a {business_type} in {location}.
Brand voice: {brand_voice}
{lang_instruction}

Create a {duration}-second {style} video script about the given topic.

CRITICAL RULES:
1. Hook in the FIRST 3 SECONDS — this is non-negotiable. If you lose them here, nothing else matters.
2. Every second must earn the viewer's attention. No filler.
3. End with a clear, specific CTA.
4. Consider trending audio/music styles for {style}.

For each segment provide:
- timestamp: "0:00-0:03" format
- visual: what the camera shows (shot type, angle, movement)
- audio: narration/voiceover/dialogue OR "trending audio" OR "natural sound"
- text_overlay: text shown on screen (SHORT — max 8 words)
- transition: cut/fade/zoom/swipe (how to transition to next segment)

Output ONLY a JSON object:
{{
  "title": "video title (catchy, 5-10 words)",
  "hook": "the opening hook line (what grabs attention in 3 seconds)",
  "segments": [
    {{
      "timestamp": "0:00-0:03",
      "beat": "hook|build|reveal|reaction|cta|...",
      "visual": "description of what camera shows",
      "audio": "narration or audio direction",
      "text_overlay": "on-screen text",
      "transition": "cut|fade|zoom|swipe"
    }}
  ],
  "cta": "clear call to action",
  "music_suggestion": "type of music/audio that fits (genre, mood, or specific trending sound)",
  "thumbnail_idea": "what the thumbnail should show",
  "caption_suggestion": "suggested post caption (2-3 lines)"
}}

No markdown fences, no explanation. Just the JSON.{template_text}"""

    user_msg = (
        f"Create a {duration}-second {style} script about: {topic}\n"
        f"Business: {company_name} ({business_type}) in {location}"
    )

    result = await _minimax_json(system, user_msg, max_tokens=3000, temperature=0.8)

    if isinstance(result, dict) and "error" in result:
        return {
            "error": result["error"],
            "segments": [],
            "client_id": client_id,
        }

    # Enrich with metadata
    result["client_id"] = client_id
    result["company_name"] = company_name
    result["style"] = style
    result["duration"] = duration
    result["style_info"] = style_spec
    result["lang"] = lang
    if matching_template:
        result["template_used"] = matching_template["name"]
    result["generated_at"] = datetime.now(timezone.utc).isoformat()

    await _log_activity(
        client_id=client_id,
        event_type="content_generated",
        summary=f"Video script ({style}, {duration}s): {topic}",
        payload={
            "topic": topic,
            "style": style,
            "duration": duration,
            "lang": lang,
            "script": result,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return result


def _find_matching_template(topic: str, business_type: str) -> dict | None:
    """Find the best matching video script template for a topic and industry."""
    topic_lower = topic.lower()

    # Keyword mapping to templates
    keyword_map = {
        "restaurant_dish_reveal": ["dish", "food", "menu", "plate", "new item", "special", "reveal"],
        "restaurant_behind_scenes": ["behind", "kitchen", "bts", "prep", "making of"],
        "restaurant_chef_story": ["chef", "story", "journey", "passion", "recipe"],
        "salon_transformation": ["transformation", "before after", "makeover", "new look", "change"],
        "salon_tutorial": ["tutorial", "how to", "tips", "hack", "mistake", "guide"],
        "cafe_barista_art": ["latte", "art", "barista", "pour", "coffee art"],
        "cafe_brew_method": ["brew", "method", "v60", "aeropress", "drip", "pour over", "coffee"],
        "general_customer_spotlight": ["customer", "regular", "testimonial", "review", "spotlight"],
        "general_team_intro": ["team", "staff", "meet", "people", "crew"],
    }

    best_match = None
    best_score = 0

    for template_key, keywords in keyword_map.items():
        template = VIDEO_SCRIPT_TEMPLATES.get(template_key)
        if not template:
            continue

        # Industry match bonus
        industry_match = (
            template["industry"] == business_type
            or template["industry"] == "any"
        )

        score = 0
        for kw in keywords:
            if kw in topic_lower:
                score += 2

        if industry_match:
            score += 1

        if score > best_score:
            best_score = score
            best_match = template

    return best_match if best_score >= 2 else None


# ═══════════════════════════════════════════════════════
# 10. CAROUSEL GROWTH ENGINE
# ═══════════════════════════════════════════════════════

async def generate_carousel(
    client_id: str,
    topic: str,
    slides: int = 6,
    lang: str = "en",
) -> dict:
    """Generate a carousel post using the 6-slide narrative arc.

    The narrative arc follows a proven engagement structure:
        Slide 1: Hook — bold claim or provocative question
        Slide 2: Problem — relatable pain point
        Slide 3: Agitation — what happens if unresolved
        Slide 4: Solution — what you offer
        Slide 5: Feature/Proof — specifics, testimonials, data
        Slide 6: CTA — clear, specific next step

    Designed for Instagram carousels but works for LinkedIn and
    other swipe-based formats.

    Args:
        client_id: UUID of the tenant.
        topic: Carousel topic (e.g., "why our coffee is different",
            "5 hair care mistakes").
        slides: Number of slides (3-10, default 6).
        lang: "en" or "ar".

    Returns:
        dict with 'slides' (list of slide dicts with number, headline,
        body, visual_description, design_notes), 'cover_slide', 'hashtags'.
    """
    slides = max(3, min(slides, 10))

    kb = await _fetch_knowledge(client_id)
    client = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client.get("company_name", "the business")
    brand_voice = kb.get("brand_voice", "Professional, warm, approachable")
    business_type = _detect_business_type(kb)
    location = _detect_location(kb, client)

    lang_instruction = {
        "en": "Write all text in English.",
        "ar": "Write all text in Gulf Arabic (not formal MSA). Keep it natural and conversational.",
        "both": "Write each slide in both English and Gulf Arabic. Arabic should feel native, not translated.",
    }.get(lang, "Write in English.")

    # Build the narrative arc instruction based on slide count
    if slides <= 4:
        arc_instruction = """Narrative arc:
- Slide 1: HOOK — bold statement or question that stops the scroll
- Slide 2: PROBLEM + AGITATION — pain point and consequences
- Slide 3: SOLUTION — what you offer and why it works
- Slide 4: CTA — specific action to take"""
    elif slides <= 6:
        arc_instruction = """Narrative arc (the proven 6-slide framework):
- Slide 1: HOOK — bold claim, provocative question, or surprising stat that stops the scroll
- Slide 2: PROBLEM — relatable pain point your audience faces
- Slide 3: AGITATION — what happens if this problem goes unresolved (make them feel it)
- Slide 4: SOLUTION — introduce what you offer as the answer
- Slide 5: PROOF — specifics, testimonials, data, features that build trust
- Slide 6: CTA — clear, specific next step (DM, visit, book, link in bio)"""
    else:
        arc_instruction = f"""Narrative arc ({slides} slides):
- Slide 1: HOOK — bold statement or question that stops the scroll
- Slide 2: PROBLEM — relatable pain point
- Slide 3: AGITATION — consequences of inaction
- Slides 4-{slides-2}: VALUE — tips, features, proof points (one per slide)
- Slide {slides-1}: SOCIAL PROOF — testimonial, data, or result
- Slide {slides}: CTA — clear next step"""

    system = f"""You are a carousel content strategist for {company_name}, a {business_type} in {location}.
Brand voice: {brand_voice}
{lang_instruction}

Create a {slides}-slide Instagram carousel about the given topic.

{arc_instruction}

DESIGN RULES:
- Slide 1 (cover) must be the most visually striking — this is what people see in the feed
- Keep headlines SHORT (max 8 words). Body text max 25 words per slide.
- Use contrast between slides — alternate background colors or styles
- Each slide should be understandable on its own but create a narrative flow
- Include visual hierarchy: headline > body > design elements

For each slide provide:
- number: slide number (1-{slides})
- role: "hook" | "problem" | "agitation" | "solution" | "proof" | "cta" | "value"
- headline: bold headline text (max 8 words, attention-grabbing)
- body: supporting text (max 25 words, adds detail)
- visual_description: what the background/imagery should show
- design_notes: colors, fonts, layout suggestions
- text_color: suggested text color for contrast

Output ONLY a JSON object:
{{
  "title": "carousel title for internal reference",
  "theme": "visual theme description (color palette, style)",
  "slides": [
    {{
      "number": 1,
      "role": "hook",
      "headline": "...",
      "body": "...",
      "visual_description": "...",
      "design_notes": "...",
      "text_color": "..."
    }}
  ],
  "hashtags": ["tag1", "tag2", ...],
  "caption": "suggested feed caption to accompany the carousel (2-3 lines)",
  "save_hook": "a line that encourages saves (e.g., 'Save this for later')"
}}

No markdown fences, no explanation. Just the JSON."""

    user_msg = (
        f"Create a {slides}-slide carousel about: {topic}\n"
        f"Business: {company_name} ({business_type})"
    )

    result = await _minimax_json(system, user_msg, max_tokens=3500, temperature=0.75)

    if isinstance(result, dict) and "error" in result:
        return {
            "error": result["error"],
            "slides": [],
            "client_id": client_id,
        }

    # Enrich hashtags with location tags
    if isinstance(result, dict):
        existing_tags = result.get("hashtags", [])
        if isinstance(existing_tags, list):
            loc_tags = _get_location_hashtags(location, lang if lang != "both" else "en")
            merged = existing_tags + [t for t in loc_tags[:4] if t not in existing_tags]
            result["hashtags"] = _dedupe_tags(merged)

    # Add metadata
    result["client_id"] = client_id
    result["company_name"] = company_name
    result["topic"] = topic
    result["slide_count"] = slides
    result["lang"] = lang
    result["generated_at"] = datetime.now(timezone.utc).isoformat()

    await _log_activity(
        client_id=client_id,
        event_type="content_generated",
        summary=f"Carousel ({slides} slides): {topic}",
        payload={
            "topic": topic,
            "slides": slides,
            "lang": lang,
            "carousel": result,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return result


# ═══════════════════════════════════════════════════════
# 11. CONTENT PILLAR SYSTEM — configurable per business type
# ═══════════════════════════════════════════════════════

CONTENT_PILLARS_V2 = {
    "restaurant": [
        {"name": "Food & Menu", "weight": 30, "ideas": ["Dish close-up", "Chef plating", "Ingredient spotlight", "New menu item reveal", "Signature dish story"]},
        {"name": "Behind the Scenes", "weight": 25, "ideas": ["Kitchen prep", "Morning setup", "Staff training", "Supplier visit", "Recipe development"]},
        {"name": "Customer Stories", "weight": 20, "ideas": ["Regular customer spotlight", "Birthday celebration", "Anniversary dinner", "Family gathering", "First-time visitor reaction"]},
        {"name": "Local & Events", "weight": 15, "ideas": ["Neighborhood guide", "Local event participation", "Seasonal specials", "Holiday celebration", "Community partnership"]},
        {"name": "Promotions", "weight": 10, "ideas": ["Happy hour", "Lunch deal", "Weekend brunch", "Loyalty reward", "Referral offer"]},
    ],
    "cafe": [
        {"name": "Coffee & Craft", "weight": 30, "ideas": ["Latte art", "Brewing process", "Bean origin story", "New drink reveal", "Barista tips"]},
        {"name": "Atmosphere & Space", "weight": 25, "ideas": ["Cozy corner", "Study spot", "Morning light", "Rain day vibes", "Laptop-friendly setup"]},
        {"name": "Community", "weight": 20, "ideas": ["Regular spotlight", "Book club", "Study group", "Remote workers", "Local artists"]},
        {"name": "Education", "weight": 15, "ideas": ["Coffee 101", "Brewing at home", "Bean varieties", "Milk alternatives", "Seasonal flavors"]},
        {"name": "Offers", "weight": 10, "ideas": ["Office subscription", "Loyalty card", "Bundle deal", "Morning special", "Referral reward"]},
    ],
    "salon": [
        {"name": "Transformations", "weight": 30, "ideas": ["Before/after", "Color transformation", "Bridal look", "Dramatic cut", "Trend recreation"]},
        {"name": "Tips & Tutorials", "weight": 25, "ideas": ["At-home care", "Product recommendation", "Styling hack", "Seasonal hair tips", "Skincare routine"]},
        {"name": "Team & Culture", "weight": 20, "ideas": ["Stylist spotlight", "Training day", "Team celebration", "Client thank you", "Behind chair"]},
        {"name": "Trending", "weight": 15, "ideas": ["Celebrity style", "Runway trends", "Color of the season", "Cut of the month", "Viral technique"]},
        {"name": "Promotions", "weight": 10, "ideas": ["New client offer", "Package deal", "Bridal package", "Loyalty perk", "Referral bonus"]},
    ],
}

# Hook Formula Library — 4 categories with templates
HOOK_FORMULAS = {
    "curiosity": [
        "The real reason {topic} isn't what you think",
        "We stopped doing {common_practice} and here's what happened",
        "{number} things about {topic} that nobody talks about",
        "What happens when {unexpected_scenario}",
        "The {topic} secret that {competitor_type} don't want you to know",
    ],
    "story": [
        "Last {timeframe}, {unexpected_thing} happened at our {business_type}",
        "A customer asked us {unusual_request} and we said yes",
        "This is why our {team_member} {action} every morning at {time}",
        "The story behind our {signature_item} goes back to {origin}",
        "{customer_name} has been coming to us for {years} years. Here's why",
    ],
    "value": [
        "How to {desirable_outcome} without {pain_point}",
        "{number} ways to {benefit} (#{number} will surprise you)",
        "The {timeframe} guide to {topic} for {audience}",
        "Save {amount} on {topic} with this one trick",
        "Everything you need to know about {topic} in {timeframe}",
    ],
    "contrarian": [
        "Unpopular opinion: {bold_statement}",
        "Stop {common_advice}. Do this instead",
        "Why {conventional_wisdom} is actually wrong",
        "{popular_thing} is overrated. Here's what works better",
        "I've been in {industry} for {years} years. {bold_claim}",
    ],
}


async def generate_pillar_based_calendar(
    client_id: str,
    business_type: str = "restaurant",
    days: int = 7,
    lang: str = "en",
) -> dict:
    """Generate a content calendar using the pillar system with weighted distribution.

    Each day gets assigned a pillar based on weight, then a specific idea
    from that pillar. Uses CONTENT_PILLARS_V2 for rich, industry-specific
    pillar definitions with weighted allocation.

    Args:
        client_id: UUID of the tenant.
        business_type: One of 'restaurant', 'cafe', 'salon'.
        days: Number of days to plan (default 7).
        lang: "en" or "ar".

    Returns:
        dict with calendar entries mapped to pillars, weights, and ideas.
    """
    kb = await _fetch_knowledge(client_id)
    client = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client.get("company_name", "the business")
    brand_voice = kb.get("brand_voice", "Professional, warm, approachable")
    location = _detect_location(kb, client)

    pillars = CONTENT_PILLARS_V2.get(business_type, CONTENT_PILLARS_V2["restaurant"])

    # Build weighted distribution of pillars across days
    pillar_names = [p["name"] for p in pillars]
    pillar_weights = [p["weight"] for p in pillars]
    pillar_ideas = {p["name"]: p["ideas"] for p in pillars}

    # Distribute days across pillars proportionally by weight
    total_weight = sum(pillar_weights)
    pillar_slots = []
    for p in pillars:
        count = max(1, round(days * p["weight"] / total_weight))
        pillar_slots.extend([p["name"]] * count)
    pillar_slots = pillar_slots[:days]
    # Pad if needed
    while len(pillar_slots) < days:
        pillar_slots.append(pillar_names[0])

    # Build the distribution text for the AI prompt
    distribution_text = "\n".join(
        f"- Day {i+1}: Pillar '{pillar_slots[i]}' — pick from: {', '.join(pillar_ideas.get(pillar_slots[i], []))}"
        for i in range(days)
    )

    lang_instruction = {
        "en": "Write all content in English.",
        "ar": "Write all content in Gulf Arabic (not formal MSA).",
    }.get(lang, "Write in English.")

    upcoming = _get_upcoming_events(days=days + 7)
    upcoming_text = ""
    if upcoming:
        upcoming_text = "\nUpcoming events:\n" + "\n".join(
            f"- {e['name_en']} ({e['date']}): {e['content_angle']}"
            for e in upcoming[:4]
        )

    system = f"""You are a content strategist for {company_name}, a {business_type} in {location}.
Brand voice: {brand_voice}
{lang_instruction}

Generate a {days}-day content calendar using these pillar assignments:
{distribution_text}

For EACH day provide:
- day_number: 1-{days}
- day_of_week: actual day name
- pillar: the assigned pillar name
- idea: specific content idea from the pillar's list (or a creative variation)
- hook: attention-grabbing first line (max 15 words, scroll-stopping)
- caption_preview: 2-sentence caption preview
- platform: "instagram" | "tiktok" | "google_business" (rotate across week)
- visual_idea: what the photo/video should show
- best_time: posting time (e.g. "12:00 PM")
- format: "reel" | "carousel" | "photo" | "stories"

Rules:
- Stay within the assigned pillar for each day
- Make hooks specific and compelling, never generic
- Rotate platforms so each gets at least 1-2 posts
- Friday/Saturday are GCC weekends — plan engaging content{upcoming_text}

Output ONLY a JSON array. No markdown, no explanation."""

    user_msg = f"Generate the {days}-day pillar-based content calendar now."

    result = await _minimax_json(system, user_msg, max_tokens=3500)

    if isinstance(result, dict) and "error" in result:
        return {"error": result["error"], "calendar": [], "client_id": client_id}

    calendar = result if isinstance(result, list) else [result]

    await _log_activity(
        client_id=client_id,
        event_type="content_calendar",
        summary=f"Pillar-based {days}-day calendar for {company_name} ({len(calendar)} posts)",
        payload={
            "calendar": calendar,
            "business_type": business_type,
            "pillar_distribution": pillar_slots,
            "days": days,
            "lang": lang,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return {
        "client_id": client_id,
        "company_name": company_name,
        "business_type": business_type,
        "calendar": calendar,
        "pillar_distribution": pillar_slots,
        "pillars_config": pillars,
        "days": days,
        "lang": lang,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


async def generate_hook(
    client_id: str,
    topic: str,
    hook_type: str = "auto",
    business_type: str = "restaurant",
    lang: str = "en",
) -> dict:
    """Generate a hook using the formula library.

    If hook_type is 'auto', the AI selects the best type based on topic.
    Uses HOOK_FORMULAS as inspiration templates, then generates a polished,
    specific hook tailored to the business.

    Args:
        client_id: UUID of the tenant.
        topic: What the content is about (e.g. "new wagyu burger", "Ramadan iftar").
        hook_type: "curiosity", "story", "value", "contrarian", or "auto".
        business_type: One of 'restaurant', 'cafe', 'salon'.
        lang: "en" or "ar".

    Returns:
        dict with hook_type, formula_used, hook_text, and why_it_works.
    """
    kb = await _fetch_knowledge(client_id)
    client = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client.get("company_name", "the business")
    brand_voice = kb.get("brand_voice", "Professional, warm, approachable")

    # Build formula reference for the prompt
    if hook_type != "auto" and hook_type in HOOK_FORMULAS:
        formulas_text = f"Use a '{hook_type}' hook. Templates:\n" + "\n".join(
            f"  - {f}" for f in HOOK_FORMULAS[hook_type]
        )
    else:
        formulas_text = "Choose the BEST hook type for this topic.\n\nAvailable types:\n"
        for htype, formulas in HOOK_FORMULAS.items():
            formulas_text += f"\n{htype.upper()}:\n" + "\n".join(f"  - {f}" for f in formulas) + "\n"

    lang_instruction = {
        "en": "Write the hook in English.",
        "ar": "Write the hook in Gulf Arabic (not formal MSA). Natural, spoken Arabic.",
    }.get(lang, "Write in English.")

    system = f"""You are a hook-writing expert for {company_name}, a {business_type}.
Brand voice: {brand_voice}
{lang_instruction}

{formulas_text}

Generate ONE powerful hook for the given topic. The hook must:
1. Stop the scroll in the first 3 seconds
2. Create an open loop or emotional trigger
3. Be specific to this business, not generic
4. Be under 20 words

Output ONLY a JSON object:
{{
  "hook_type": "curiosity|story|value|contrarian",
  "formula_used": "the template formula that inspired this hook",
  "hook_text": "the actual hook text, ready to use",
  "why_it_works": "1-sentence explanation of the psychological principle"
}}

No markdown fences, no explanation. Just the JSON."""

    user_msg = f"Topic: {topic}\nBusiness: {company_name} ({business_type})"

    result = await _minimax_json(system, user_msg, max_tokens=800, temperature=0.85)

    if isinstance(result, dict) and "error" in result:
        return {"error": result["error"], "client_id": client_id}

    result["client_id"] = client_id
    result["topic"] = topic
    result["lang"] = lang
    result["generated_at"] = datetime.now(timezone.utc).isoformat()

    await _log_activity(
        client_id=client_id,
        event_type="content_generated",
        summary=f"Hook for '{topic}' ({result.get('hook_type', 'auto')}, {lang})",
        payload={
            "topic": topic,
            "hook": result,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return result


async def generate_caption_with_psychology(
    client_id: str,
    topic: str,
    psychology_tactic: str = "auto",
    lang: str = "en",
    platform: str = "instagram",
) -> dict:
    """Generate a caption that applies a specific psychological principle.

    Supported tactics:
        scarcity — 'Only 3 tables left for Friday brunch'
        social_proof — 'Join 500+ regulars who love our...'
        reciprocity — 'Free tip: here's how to...'
        urgency — 'Today only / This weekend only'
        authority — 'Our award-winning chef recommends...'
        curiosity_gap — 'The one thing most people get wrong about...'
        loss_aversion — 'Don't miss out on...'
        anchoring — 'Was 150 AED, now just 89 AED'

    If psychology_tactic is 'auto', the AI selects the best tactic for the topic.

    Args:
        client_id: UUID of the tenant.
        topic: What the post is about.
        psychology_tactic: Specific tactic or "auto" for AI selection.
        lang: "en" or "ar".
        platform: Target platform.

    Returns:
        dict with caption, tactic_used, principle explanation, and hashtags.
    """
    kb = await _fetch_knowledge(client_id)
    client = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client.get("company_name", "the business")
    brand_voice = kb.get("brand_voice", "Professional, warm, approachable")
    location = _detect_location(kb, client)
    business_type = _detect_business_type(kb)
    spec = PLATFORM_SPECS.get(platform, PLATFORM_SPECS["instagram"])

    tactics_reference = """Available psychology tactics:
- scarcity: Create urgency through limited availability ('Only X left', 'Limited spots')
- social_proof: Leverage crowd behavior ('500+ customers', 'Most popular', 'Regulars love')
- reciprocity: Give value first to earn goodwill ('Free tip', 'Here's a secret')
- urgency: Time-based pressure ('Today only', 'This weekend', 'Ends tonight')
- authority: Leverage expertise and credentials ('Award-winning', 'Chef-recommended')
- curiosity_gap: Open an information loop ('The one thing...', 'What nobody tells you')
- loss_aversion: Fear of missing out ('Don't miss', 'Last chance', 'You'll regret')
- anchoring: Price comparison to set value perception ('Was X, now Y', 'Value of X for only Y')"""

    tactic_instruction = (
        f"Use the '{psychology_tactic}' tactic specifically."
        if psychology_tactic != "auto"
        else "Choose the BEST psychology tactic for this topic and explain why."
    )

    lang_instruction = {
        "en": "Write in English.",
        "ar": "Write in Gulf Arabic (not formal MSA). Natural, conversational.",
        "both": "Write two versions: English first, then Gulf Arabic. Separate with ---.",
    }.get(lang, "Write in English.")

    system = f"""You are a persuasion-savvy copywriter for {company_name}, a {business_type} in {location}.
Brand voice: {brand_voice}
Platform: {platform} — {spec['format']}
Caption length: {spec['caption_length']}
{lang_instruction}

{tactics_reference}

{tactic_instruction}

Generate a caption that naturally weaves in the psychology tactic.
The tactic should feel organic, NOT manipulative or forced.

Output ONLY a JSON object:
{{
  "caption": "the full caption text with the tactic woven in",
  "tactic_used": "the psychology tactic name",
  "principle": "1-sentence explanation of why this tactic works here",
  "hook": "the opening line (first sentence)",
  "cta": "call to action",
  "hashtags": ["tag1", "tag2", ...],
  "emotional_trigger": "the core emotion this caption activates"
}}

No markdown fences, no explanation. Just the JSON."""

    user_msg = f"Topic: {topic}\nBusiness: {company_name} ({business_type})\nLocation: {location}"

    result = await _minimax_json(system, user_msg, max_tokens=1500, temperature=0.8)

    if isinstance(result, dict) and "error" in result:
        return {"error": result["error"], "client_id": client_id}

    # Enrich hashtags with location tags
    if isinstance(result, dict):
        existing_tags = result.get("hashtags", [])
        if isinstance(existing_tags, list):
            loc_tags = _get_location_hashtags(location, lang if lang != "both" else "en")
            merged = existing_tags + [t for t in loc_tags[:4] if t not in existing_tags]
            result["hashtags"] = _dedupe_tags(merged)

    result["client_id"] = client_id
    result["topic"] = topic
    result["platform"] = platform
    result["lang"] = lang
    result["generated_at"] = datetime.now(timezone.utc).isoformat()

    await _log_activity(
        client_id=client_id,
        event_type="content_generated",
        summary=f"Psychology caption for '{topic}' ({result.get('tactic_used', 'auto')}, {platform})",
        payload={
            "topic": topic,
            "tactic": result.get("tactic_used", ""),
            "platform": platform,
            "lang": lang,
            "caption": result,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return result


async def generate_content_repurpose_plan(
    client_id: str,
    original_content: str,
    original_platform: str = "instagram",
) -> dict:
    """Take one piece of content and create a detailed plan for 5+ platforms.

    For each platform: adapted content, format changes, timing, hashtags.
    Platforms: IG Feed, IG Story, IG Reel, TikTok, GBP Post, WhatsApp Status, LinkedIn.

    Unlike repurpose_content() which generates adapted captions, this function
    produces a strategic PLAN with scheduling, format recommendations, and
    a full cross-platform content lifecycle.

    Args:
        client_id: UUID of the tenant.
        original_content: The original post text/caption to repurpose.
        original_platform: Where the content was originally created for.

    Returns:
        dict with repurpose_plan (list of platform adaptations), scheduling,
        and cross-platform strategy notes.
    """
    kb = await _fetch_knowledge(client_id)
    client = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client.get("company_name", "the business")
    brand_voice = kb.get("brand_voice", "Professional, warm, approachable")
    location = _detect_location(kb, client)
    business_type = _detect_business_type(kb)

    target_platforms = [
        "instagram_feed", "instagram_story", "instagram_reel",
        "tiktok", "google_business", "whatsapp_status", "linkedin",
    ]
    # Remove original if it matches one
    target_platforms = [p for p in target_platforms if p != original_platform]

    system = f"""You are a cross-platform content strategist for {company_name}, a {business_type} in {location}.
Brand voice: {brand_voice}

You will be given content originally created for {original_platform}.
Create a DETAILED repurpose plan for each of these platforms:
{', '.join(target_platforms)}

For EACH platform provide:
- platform: platform name
- adapted_content: the full adapted caption/text (native to that platform)
- format: what format the content should take (photo, carousel, reel, story, text post, etc.)
- format_changes: specific changes needed (aspect ratio, length, tone shifts)
- timing: best day/time to post this on this platform
- hashtags: platform-appropriate hashtags (list, no # prefix)
- cta: platform-specific call to action
- priority: "high" | "medium" | "low" (how important is this platform for this content)
- effort_level: "easy" | "medium" | "hard" (how much work to adapt)
- notes: any platform-specific tips or considerations

Also provide:
- scheduling_order: recommended order to post across platforms (which first?)
- content_lifecycle: how to stagger posts over the week for maximum reach
- cross_promotion: how each platform version can drive traffic to others

Output ONLY a JSON object:
{{
  "original_platform": "{original_platform}",
  "repurpose_plan": [
    {{
      "platform": "...",
      "adapted_content": "...",
      "format": "...",
      "format_changes": "...",
      "timing": "...",
      "hashtags": ["..."],
      "cta": "...",
      "priority": "high|medium|low",
      "effort_level": "easy|medium|hard",
      "notes": "..."
    }}
  ],
  "scheduling_order": ["platform1", "platform2", ...],
  "content_lifecycle": "description of staggering strategy",
  "cross_promotion": "how platforms reference each other"
}}

No markdown fences, no explanation. Just the JSON."""

    user_msg = (
        f"Original content ({original_platform}):\n\n{original_content}\n\n"
        f"Create a full repurpose plan for all target platforms."
    )

    result = await _minimax_json(system, user_msg, max_tokens=4500, temperature=0.75)

    if isinstance(result, dict) and "error" in result:
        return {"error": result["error"], "repurpose_plan": [], "client_id": client_id}

    # Enrich hashtags with location tags for relevant platforms
    if isinstance(result, dict):
        plan = result.get("repurpose_plan", [])
        if isinstance(plan, list):
            for adaptation in plan:
                if isinstance(adaptation, dict):
                    plat = adaptation.get("platform", "")
                    if plat in ("instagram_feed", "instagram_reel", "tiktok"):
                        existing_tags = adaptation.get("hashtags", [])
                        if isinstance(existing_tags, list):
                            loc_tags = _get_location_hashtags(location, "en")
                            merged = existing_tags + [t for t in loc_tags[:3] if t not in existing_tags]
                            adaptation["hashtags"] = _dedupe_tags(merged)

    result["client_id"] = client_id
    result["company_name"] = company_name
    result["original_content"] = original_content[:300]
    result["generated_at"] = datetime.now(timezone.utc).isoformat()

    await _log_activity(
        client_id=client_id,
        event_type="content_repurposed",
        summary=f"Repurpose plan from {original_platform} to {len(target_platforms)} platforms for {company_name}",
        payload={
            "original_platform": original_platform,
            "target_platforms": target_platforms,
            "original_content": original_content[:300],
            "plan": result.get("repurpose_plan", []),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return result


# ═══════════════════════════════════════════════════════
# 12. IMAGE PROMPT GENERATOR — Professional AI image prompts
# ═══════════════════════════════════════════════════════

# 5-layer prompt structure: Subject → Environment → Lighting → Technical → Style
IMAGE_PROMPT_TEMPLATES = {
    "food_hero": {
        "name": "Food Hero Shot",
        "template": "{dish_name}, beautifully plated on {plate_description}, {garnish_details}, shot from {angle} angle on {surface_description}, {lighting_setup}, shallow depth of field f/2.8 with creamy bokeh background, {color_palette} color grade, food photography style inspired by Bon Appetit magazine, 8k resolution, commercial quality",
        "angles": ["45-degree", "overhead flat-lay", "eye-level close-up", "slight low angle"],
        "surfaces": ["dark marble", "rustic wood", "white ceramic", "brushed concrete", "warm terracotta"],
        "lighting": ["soft natural window light from the left", "dramatic side lighting with warm key light", "bright and airy overhead diffused light", "golden hour warm backlight with lens flare"],
    },
    "restaurant_interior": {
        "name": "Restaurant Interior",
        "template": "Interior of {restaurant_style} restaurant, {seating_description}, {decor_details}, {time_of_day} ambiance, {lighting_setup}, shot on 24mm wide angle lens f/5.6, deep depth of field, {atmosphere} atmosphere, architectural photography style, warm inviting tones, 8k resolution",
        "styles": ["upscale modern", "cozy traditional", "sleek minimalist", "rustic Mediterranean", "elegant fine dining"],
        "lighting": ["warm pendant lights creating intimate pools of light", "natural light flooding through floor-to-ceiling windows", "candlelit with soft warm glow", "dramatic accent lighting highlighting textures"],
    },
    "coffee_art": {
        "name": "Coffee & Latte Art",
        "template": "Overhead shot of {coffee_type} in {cup_description}, {latte_art_pattern} latte art, {surrounding_items}, on {surface}, soft diffused natural light from above, shallow depth of field f/2.0, warm earthy tones with {accent_color} accent, lifestyle photography style, cozy cafe aesthetic, 8k resolution",
        "patterns": ["rosetta", "tulip", "heart", "swan", "fern leaf"],
        "surroundings": ["croissant and newspaper", "open book and reading glasses", "succulent plant", "scattered coffee beans", "clean minimalist nothing"],
    },
    "salon_transformation": {
        "name": "Salon Before/After",
        "template": "Professional {service_type} result, {hair_description}, {model_description}, photographed in bright salon studio, ring light with soft fill creating even illumination on face and hair, shot on 85mm portrait lens f/2.0, clean white/neutral background, {style_aesthetic} beauty photography, skin retouching, commercial salon quality, 8k resolution",
        "services": ["balayage hair color", "precision haircut", "bridal updo", "keratin treatment", "nail art manicure"],
    },
    "storefront": {
        "name": "Business Storefront",
        "template": "Exterior of {business_type} called {business_name}, {architectural_style} facade, {signage_description}, {time_of_day}, {weather_conditions}, shot from across the street at slight upward angle on 35mm lens f/8, deep depth of field, {city} urban context visible, warm inviting lighting from windows, architectural photography style, Google Business Profile quality, 8k resolution",
        "times": ["golden hour sunset", "blue hour dusk with warm interior glow", "bright sunny afternoon", "rainy evening with reflections"],
    },
    "team_photo": {
        "name": "Team/Staff Photo",
        "template": "{team_description} standing {pose_description} in {location}, wearing {attire}, {expression}, natural {lighting} lighting, shot on 50mm lens f/4, medium depth of field, {background_treatment}, candid corporate portrait style, authentic and warm, 8k resolution",
        "poses": ["casually grouped together laughing", "standing in a line with arms crossed confidently", "sitting around a table in conversation", "in their workspace doing what they love"],
    },
    "product_flatlay": {
        "name": "Product Flat Lay",
        "template": "Overhead flat-lay of {products_description}, artfully arranged on {background_surface}, {accent_items}, soft even lighting from large overhead diffuser, no harsh shadows, f/8 for complete sharpness, {color_scheme} color palette, clean minimal aesthetic, Instagram-ready product photography, 8k resolution",
        "backgrounds": ["marble slab", "linen fabric", "wooden cutting board", "concrete tile", "colored paper"],
    },
}

# Platform-specific prompt modifiers
PLATFORM_MODIFIERS = {
    "midjourney": {"prefix": "", "suffix": " --ar 4:5 --v 6 --style raw", "notes": "Use :: for multi-prompting, -- for parameters"},
    "dalle": {"prefix": "", "suffix": "", "notes": "Natural language, be very descriptive, avoid technical jargon"},
    "stable_diffusion": {"prefix": "masterpiece, best quality, ", "suffix": ", (worst quality:1.4), (low quality:1.4)", "notes": "Use () for emphasis, negative prompt supported"},
    "flux": {"prefix": "", "suffix": "", "notes": "Detailed natural language, photorealistic emphasis"},
    "general": {"prefix": "", "suffix": "", "notes": "Platform-agnostic prompt"},
}

# Template detection keywords for auto-matching
_IMAGE_TEMPLATE_KEYWORDS = {
    "food_hero": ["dish", "food", "plate", "meal", "menu", "cuisine", "appetizer", "dessert",
                   "steak", "pasta", "sushi", "burger", "salad", "soup", "grill", "rice",
                   "lamb", "chicken", "fish", "pizza", "biryani", "kabsa", "shawarma",
                   "طبق", "اكل", "وجبة", "كبسة", "مندي", "شاورما", "مشويات"],
    "restaurant_interior": ["interior", "inside", "dining room", "ambiance", "decor",
                             "seating", "restaurant space", "الداخل", "ديكور", "جلسة"],
    "coffee_art": ["coffee", "latte", "cappuccino", "espresso", "brew", "cup", "barista",
                    "قهوة", "لاتيه", "كابتشينو", "اسبريسو"],
    "salon_transformation": ["hair", "salon", "beauty", "nails", "makeup", "balayage",
                              "transformation", "styling", "شعر", "صالون", "جمال", "مكياج"],
    "storefront": ["storefront", "exterior", "facade", "building", "outside", "entrance",
                    "واجهة", "خارج", "مدخل"],
    "team_photo": ["team", "staff", "crew", "employees", "group", "people", "chef", "barista",
                    "فريق", "موظفين", "طاقم"],
    "product_flatlay": ["product", "flatlay", "flat lay", "display", "collection", "items",
                         "منتجات", "عرض"],
}

# Negative prompt for Stable Diffusion
_SD_NEGATIVE_PROMPT = (
    "ugly, blurry, low quality, watermark, text, logo, oversaturated, "
    "deformed, disfigured, bad anatomy, extra fingers, mutated hands, "
    "poorly drawn, out of frame, duplicate, cropped, jpeg artifacts, "
    "low resolution, pixelated, grainy, cartoon, illustration, 3d render"
)

# Aspect ratio recommendations by template type
_ASPECT_RATIOS = {
    "food_hero": "4:5",
    "restaurant_interior": "16:9",
    "coffee_art": "1:1",
    "salon_transformation": "4:5",
    "storefront": "16:9",
    "team_photo": "3:2",
    "product_flatlay": "1:1",
}

# Business-type to recommended batch template sets
_BATCH_TEMPLATES = {
    "restaurant": [
        ("food_hero", "Signature dish hero shot"),
        ("food_hero", "Second best-seller close-up"),
        ("restaurant_interior", "Dining room ambiance"),
        ("storefront", "Restaurant exterior"),
        ("team_photo", "Kitchen and service team"),
    ],
    "cafe": [
        ("coffee_art", "Signature latte art"),
        ("coffee_art", "Specialty brew close-up"),
        ("restaurant_interior", "Cafe seating area"),
        ("storefront", "Cafe exterior"),
        ("product_flatlay", "Pastry and drink spread"),
    ],
    "salon": [
        ("salon_transformation", "Hair transformation result"),
        ("salon_transformation", "Nail art or beauty service"),
        ("restaurant_interior", "Salon interior stations"),
        ("team_photo", "Stylist team portrait"),
        ("product_flatlay", "Products and tools flat lay"),
    ],
}


def _detect_image_template(subject: str) -> str:
    """Auto-detect the best image template from the subject text."""
    subject_lower = subject.lower()
    best_template = "food_hero"
    best_score = 0

    for template_key, keywords in _IMAGE_TEMPLATE_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in subject_lower)
        if score > best_score:
            best_score = score
            best_template = template_key

    return best_template


def _slugify(text: str) -> str:
    """Create a URL/filename-safe slug from text."""
    slug = re.sub(r'[^\w\s-]', '', text.lower().strip())
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug[:80] if slug else "image"


async def generate_image_prompt(
    client_id: str,
    subject: str,
    template_type: str = "auto",
    platform: str = "general",
    style_notes: str = "",
    lang: str = "en",
) -> dict:
    """Generate a professional AI image prompt for the given subject.

    Uses a 5-layer prompt structure (Subject, Environment, Lighting,
    Technical, Style) and business context to produce commercial-quality
    prompts for AI image generators.

    Args:
        client_id: UUID of the tenant — used to fetch business context.
        subject: What to photograph ("our lamb chops", "cafe interior", "team photo").
        template_type: Which template to use, or "auto" to detect from subject.
        platform: Target AI tool — "midjourney", "dalle", "stable_diffusion", "flux", "general".
        style_notes: Additional style direction from the owner.
        lang: "en" for English, "ar" for Arabic.

    Returns:
        dict with prompt, negative_prompt, template_used, platform,
        aspect_ratio, tips, seo_filename, alt_text.
    """
    # 1. Detect template from subject if auto
    if template_type == "auto":
        template_type = _detect_image_template(subject)

    template_data = IMAGE_PROMPT_TEMPLATES.get(template_type, IMAGE_PROMPT_TEMPLATES["food_hero"])
    modifier = PLATFORM_MODIFIERS.get(platform, PLATFORM_MODIFIERS["general"])

    # 2. Fetch business context
    kb = await _fetch_knowledge(client_id)
    client = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client.get("company_name", "the business")
    brand_voice = kb.get("brand_voice", "Professional, warm, approachable")
    business_type = _detect_business_type(kb)
    location = _detect_location(kb, client)

    # 3. Use MiniMax to fill template variables with business-specific details
    lang_instruction = {
        "en": "Write the prompt in English.",
        "ar": "Write the prompt in English (image AI tools work best in English), but include any Arabic text/signage that should appear in the image.",
    }.get(lang, "Write the prompt in English.")

    style_instruction = f"\nAdditional style direction: {style_notes}" if style_notes else ""

    system = f"""You are a professional AI image prompt engineer specializing in commercial photography for SMBs.

Business: {company_name} — a {business_type} in {location}
Brand voice: {brand_voice}
{lang_instruction}{style_instruction}

You are generating a prompt for the "{template_data['name']}" template type.
Target platform: {platform} ({modifier['notes']})

TEMPLATE STRUCTURE:
{template_data['template']}

Your job:
1. Fill ALL the {{placeholder}} variables in the template with specific, vivid details appropriate for {company_name}
2. Make the prompt specific to this business — not generic stock photography
3. Include sensory details: textures, colors, steam, condensation, reflections
4. Keep the technical photography specs (lens, f-stop, resolution) exactly as shown
5. Add 2-3 extra details that make the image feel authentic to {location} / Gulf region

Output ONLY a JSON object:
{{
  "filled_prompt": "the complete filled prompt with all placeholders replaced",
  "key_elements": ["list", "of", "3-5", "hero", "elements", "in", "the", "image"],
  "color_palette": "describe the dominant color palette (3-4 colors)",
  "mood": "one-word mood descriptor"
}}

No markdown fences, no explanation. Just the JSON."""

    user_msg = f"Generate an image prompt for: {subject}"

    result = await _minimax_json(system, user_msg, max_tokens=1500, temperature=0.8)

    if isinstance(result, dict) and "error" in result:
        return {
            "error": result["error"],
            "prompt": "",
            "template_used": template_type,
            "client_id": client_id,
        }

    filled_prompt = result.get("filled_prompt", "")
    if not filled_prompt:
        return {
            "error": "AI did not return a filled prompt",
            "prompt": "",
            "template_used": template_type,
            "client_id": client_id,
        }

    # 4. Apply platform-specific modifiers
    final_prompt = f"{modifier['prefix']}{filled_prompt}{modifier['suffix']}"

    # 5. Generate negative prompt for SD
    negative_prompt = _SD_NEGATIVE_PROMPT if platform == "stable_diffusion" else ""

    # 6. Generate SEO filename and alt text
    slug = _slugify(subject)
    company_slug = _slugify(company_name)
    seo_filename = f"{company_slug}-{slug}-{template_type.replace('_', '-')}.jpg"

    mood = result.get("mood", "professional")
    key_elements = result.get("key_elements", [subject])
    alt_text = f"{subject} at {company_name} — {', '.join(key_elements[:3])}, {mood} {business_type} photography"

    # Tips for best results
    tips = [
        f"Best aspect ratio for this template: {_ASPECT_RATIOS.get(template_type, '4:5')}",
        f"Platform: {platform} — {modifier['notes']}",
    ]
    if platform == "midjourney":
        tips.append("Try adding --chaos 10-30 for creative variation")
        tips.append("Use --no to exclude unwanted elements")
    elif platform == "stable_diffusion":
        tips.append("Use the negative prompt to refine results")
        tips.append("Try CFG scale 7-12 for best balance of creativity and adherence")
    elif platform == "dalle":
        tips.append("DALL-E works best with natural, descriptive language")
        tips.append("Specify the exact style you want (photorealistic, editorial, etc.)")
    elif platform == "flux":
        tips.append("Flux excels at photorealism — lean into detailed descriptions")
    tips.append("Generate 3-4 variations and pick the best one")

    aspect_ratio = _ASPECT_RATIOS.get(template_type, "4:5")

    # 7. Log to activity_logs
    await _log_activity(
        client_id=client_id,
        event_type="image_prompt_generated",
        summary=f"Image prompt ({template_data['name']}): {subject[:80]}",
        payload={
            "subject": subject,
            "template_type": template_type,
            "platform": platform,
            "prompt": final_prompt[:500],
            "style_notes": style_notes,
            "lang": lang,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return {
        "prompt": final_prompt,
        "negative_prompt": negative_prompt,
        "template_used": template_type,
        "template_name": template_data["name"],
        "platform": platform,
        "aspect_ratio": aspect_ratio,
        "tips": tips,
        "seo_filename": seo_filename,
        "alt_text": alt_text,
        "key_elements": key_elements,
        "color_palette": result.get("color_palette", ""),
        "mood": mood,
        "client_id": client_id,
        "company_name": company_name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


async def generate_image_prompt_batch(
    client_id: str,
    count: int = 5,
    business_type: str = "restaurant",
    platform: str = "general",
    lang: str = "en",
) -> list:
    """Generate a batch of image prompts covering all key visual needs.

    Produces a complete visual content package tailored to the business type:
        - restaurant: food hero x2, interior, storefront, team
        - cafe: coffee art x2, interior, storefront, product flatlay
        - salon: transformation x2, interior, team, product

    Args:
        client_id: UUID of the tenant.
        count: Number of prompts to generate (default 5).
        business_type: One of 'restaurant', 'cafe', 'salon'.
        platform: Target AI tool — "midjourney", "dalle", "stable_diffusion", "flux", "general".
        lang: "en" or "ar".

    Returns:
        list of prompt dicts (same structure as generate_image_prompt).
    """
    # Auto-detect business type if not specified
    if business_type not in _BATCH_TEMPLATES:
        kb = await _fetch_knowledge(client_id)
        business_type = _detect_business_type(kb)

    template_set = _BATCH_TEMPLATES.get(business_type, _BATCH_TEMPLATES["restaurant"])

    # Limit to requested count
    template_set = template_set[:count]

    results = []
    for template_type, subject_hint in template_set:
        prompt_result = await generate_image_prompt(
            client_id=client_id,
            subject=subject_hint,
            template_type=template_type,
            platform=platform,
            lang=lang,
        )
        results.append(prompt_result)

    await _log_activity(
        client_id=client_id,
        event_type="image_prompt_batch",
        summary=f"Batch of {len(results)} image prompts for {business_type} on {platform}",
        payload={
            "business_type": business_type,
            "platform": platform,
            "count": len(results),
            "templates_used": [r.get("template_used", "") for r in results],
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return results


async def enhance_photo_description(
    client_id: str,
    raw_description: str,
    platform: str = "general",
    lang: str = "en",
) -> dict:
    """Take a simple description and enhance it into a professional prompt.

    Transforms casual input like "photo of our pasta" into a full 5-layer
    prompt with lighting, lens, composition, and style details.
    Uses MiniMax to enrich with photography terminology.

    Args:
        client_id: UUID of the tenant.
        raw_description: Simple description ("photo of our pasta", "picture of the cafe").
        platform: Target AI tool — "midjourney", "dalle", "stable_diffusion", "flux", "general".
        lang: "en" or "ar".

    Returns:
        dict with original, enhanced prompt, template_used, platform details.
    """
    kb = await _fetch_knowledge(client_id)
    client = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client.get("company_name", "the business")
    brand_voice = kb.get("brand_voice", "Professional, warm, approachable")
    business_type = _detect_business_type(kb)
    location = _detect_location(kb, client)
    modifier = PLATFORM_MODIFIERS.get(platform, PLATFORM_MODIFIERS["general"])

    system = f"""You are a professional AI image prompt engineer. Your job is to take a simple, casual photo description and transform it into a professional, detailed AI image prompt.

Business: {company_name} — a {business_type} in {location}
Brand voice: {brand_voice}
Target platform: {platform} ({modifier['notes']})

ENHANCEMENT PROCESS — apply all 5 layers:
1. SUBJECT: Expand the subject with specific, vivid details (textures, colors, arrangement)
2. ENVIRONMENT: Add the setting, surfaces, background elements, props
3. LIGHTING: Specify lighting setup (direction, quality, color temperature, shadows)
4. TECHNICAL: Add camera specs (lens mm, aperture, depth of field, resolution)
5. STYLE: Define the photography style, color grade, mood, reference

Rules:
- Keep the original intent — enhance, don't replace the concept
- Make it specific to {company_name} and {location}
- Include sensory details that make the image feel real
- Use professional photography terminology
- The enhanced prompt should be 40-80 words

Output ONLY a JSON object:
{{
  "enhanced_prompt": "the full enhanced prompt",
  "layers_applied": {{
    "subject": "what you added for subject detail",
    "environment": "what you added for setting",
    "lighting": "what lighting you specified",
    "technical": "camera specs added",
    "style": "style and mood direction"
  }},
  "detected_template": "food_hero|restaurant_interior|coffee_art|salon_transformation|storefront|team_photo|product_flatlay",
  "mood": "one-word mood"
}}

No markdown fences, no explanation. Just the JSON."""

    user_msg = f"Enhance this simple description into a professional AI image prompt:\n\n\"{raw_description}\""

    result = await _minimax_json(system, user_msg, max_tokens=1500, temperature=0.75)

    if isinstance(result, dict) and "error" in result:
        return {
            "error": result["error"],
            "original": raw_description,
            "enhanced_prompt": "",
            "client_id": client_id,
        }

    enhanced = result.get("enhanced_prompt", "")
    if not enhanced:
        return {
            "error": "AI did not return an enhanced prompt",
            "original": raw_description,
            "enhanced_prompt": "",
            "client_id": client_id,
        }

    # Apply platform modifiers
    final_prompt = f"{modifier['prefix']}{enhanced}{modifier['suffix']}"

    detected_template = result.get("detected_template", "food_hero")
    negative_prompt = _SD_NEGATIVE_PROMPT if platform == "stable_diffusion" else ""

    # SEO filename
    slug = _slugify(raw_description)
    company_slug = _slugify(company_name)
    seo_filename = f"{company_slug}-{slug}.jpg"

    mood = result.get("mood", "professional")
    alt_text = f"{raw_description} at {company_name} — {mood} {business_type} photography in {location}"

    await _log_activity(
        client_id=client_id,
        event_type="image_prompt_enhanced",
        summary=f"Enhanced photo description: {raw_description[:80]}",
        payload={
            "original": raw_description,
            "enhanced": final_prompt[:500],
            "platform": platform,
            "detected_template": detected_template,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    return {
        "original": raw_description,
        "prompt": final_prompt,
        "negative_prompt": negative_prompt,
        "layers_applied": result.get("layers_applied", {}),
        "template_used": detected_template,
        "platform": platform,
        "aspect_ratio": _ASPECT_RATIOS.get(detected_template, "4:5"),
        "seo_filename": seo_filename,
        "alt_text": alt_text,
        "mood": mood,
        "client_id": client_id,
        "company_name": company_name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


async def handle_image_command(client_id: str, command: str, lang: str = "en") -> str:
    """Process image prompt commands from WhatsApp.

    Recognized commands:
        image <subject> / صورة <موضوع>      — generate a single prompt
        image batch / صور كاملة              — generate full batch for business
        image enhance: <desc> / حسّن: <desc> — enhance a simple description

    Args:
        client_id: UUID of the tenant.
        command: Raw text from the owner (e.g. "image lamb chops").
        lang: "en" or "ar".

    Returns:
        str response formatted for WhatsApp.
    """
    cmd = command.strip()
    cmd_lower = cmd.lower()

    # --- Batch command ---
    if cmd_lower in ("image batch", "images batch", "صور كاملة", "صور كامله", "image all"):
        kb = await _fetch_knowledge(client_id)
        business_type = _detect_business_type(kb)
        results = await generate_image_prompt_batch(
            client_id=client_id,
            count=5,
            business_type=business_type,
            lang=lang,
        )
        lines = [f"Image Prompts ({len(results)} for your {business_type}):"]
        for i, r in enumerate(results, 1):
            if r.get("error"):
                lines.append(f"\n{i}. Error: {r['error']}")
                continue
            template_name = r.get("template_name", r.get("template_used", ""))
            lines.append(f"\n{i}. {template_name}")
            lines.append(f"   Prompt: {r.get('prompt', '')[:300]}")
            lines.append(f"   Ratio: {r.get('aspect_ratio', '4:5')}")
            if r.get("negative_prompt"):
                lines.append(f"   Negative: {r['negative_prompt'][:150]}")
        lines.append("\nCopy any prompt into Midjourney, DALL-E, or Flux to generate.")
        return "\n".join(lines)

    # --- Enhance command ---
    enhance_match = None
    if cmd_lower.startswith("image enhance:") or cmd_lower.startswith("image enhance "):
        enhance_match = cmd[len("image enhance"):].lstrip(": ").strip()
    elif cmd_lower.startswith("حسّن:") or cmd_lower.startswith("حسن:"):
        colon_idx = cmd.index(":") + 1
        enhance_match = cmd[colon_idx:].strip()
    elif cmd_lower.startswith("حسّن ") or cmd_lower.startswith("حسن "):
        enhance_match = cmd.split(None, 1)[1].strip() if len(cmd.split(None, 1)) > 1 else ""

    if enhance_match:
        if not enhance_match:
            if lang == "ar":
                return "وش تبي تحسّن؟ اكتب: حسّن: وصف الصورة"
            return "What do you want to enhance? Reply: image enhance: your description"
        result = await enhance_photo_description(
            client_id=client_id,
            raw_description=enhance_match,
            lang=lang,
        )
        if result.get("error"):
            return f"Could not enhance: {result['error']}"
        lines = ["Enhanced Image Prompt:"]
        lines.append(f"\nOriginal: {result.get('original', '')}")
        lines.append(f"\nPrompt: {result.get('prompt', '')}")
        if result.get("negative_prompt"):
            lines.append(f"\nNegative: {result['negative_prompt'][:200]}")
        lines.append(f"\nRatio: {result.get('aspect_ratio', '4:5')}")
        layers = result.get("layers_applied", {})
        if layers:
            lines.append("\nLayers applied:")
            for layer_name, layer_val in layers.items():
                if layer_val:
                    lines.append(f"  {layer_name}: {layer_val}")
        lines.append(f"\nFilename: {result.get('seo_filename', '')}")
        return "\n".join(lines)

    # --- Single image prompt ---
    # Strip command prefix to get the subject
    subject = ""
    if cmd_lower.startswith("image ") or cmd_lower.startswith("images "):
        subject = cmd.split(None, 1)[1].strip() if len(cmd.split(None, 1)) > 1 else ""
    elif cmd_lower.startswith("صورة ") or cmd_lower.startswith("صوره "):
        subject = cmd.split(None, 1)[1].strip() if len(cmd.split(None, 1)) > 1 else ""
    else:
        # Try treating the whole command as subject (fallback)
        subject = cmd

    if not subject:
        if lang == "ar":
            return "وش تبي صورة؟ اكتب: صورة كبسة\nأو: صور كاملة (لمجموعة كاملة)\nأو: حسّن: وصف الصورة"
        return (
            "What do you want an image of? Try:\n"
            "  image lamb chops\n"
            "  image batch (full set)\n"
            "  image enhance: a photo of our terrace"
        )

    result = await generate_image_prompt(
        client_id=client_id,
        subject=subject,
        template_type="auto",
        lang=lang,
    )

    if result.get("error"):
        return f"Could not generate prompt: {result['error']}"

    lines = [f"Image Prompt ({result.get('template_name', '')}):"]
    lines.append(f"\n{result.get('prompt', '')}")
    if result.get("negative_prompt"):
        lines.append(f"\nNegative prompt:\n{result['negative_prompt']}")
    lines.append(f"\nAspect ratio: {result.get('aspect_ratio', '4:5')}")
    lines.append(f"Mood: {result.get('mood', '')}")
    if result.get("color_palette"):
        lines.append(f"Colors: {result['color_palette']}")
    lines.append(f"Filename: {result.get('seo_filename', '')}")
    lines.append(f"Alt text: {result.get('alt_text', '')}")
    tips = result.get("tips", [])
    if tips:
        lines.append("\nTips:")
        for tip in tips:
            lines.append(f"  - {tip}")
    lines.append("\nCopy the prompt into Midjourney, DALL-E, or Flux to generate.")
    return "\n".join(lines)
