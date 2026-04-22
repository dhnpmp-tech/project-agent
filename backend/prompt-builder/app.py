#!/usr/bin/env python3
"""Lightweight prompt builder API — replaces n8n Code nodes to bypass task runner issues."""

from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional, List
import os
import re
import httpx
import asyncio
from onboarding import is_onboarding, process_onboarding_message, get_onboarding_state
from research_engine import generate_weekly_brief, run_weekly_research, send_owner_brief, get_customer_stats
from karpathy_loop import (
    run_karpathy_loop, run_all_clients as run_karpathy_all,
    get_rule_status, get_performance_snapshot,
    extract_customer_insights, get_insight_brief,
    get_content_learnings, analyze_conversation_patterns,
    generate_learning_report, apply_learnings_to_prompt,
)
from owner_brain import (
    generate_morning_brief, process_owner_command, send_owner_alert as owner_alert,
    build_guest_intelligence, get_guest_brief, draft_review_response,
    process_review_approval, surface_risks, get_risk_brief, classify_action,
)
from sales_rep import (
    score_lead, update_pipeline, get_pipeline_summary, generate_followup,
    suggest_upsells, record_outcome, analyze_win_loss, get_hot_leads,
    get_sales_digest, get_pending_followups as get_sales_followups,
    handle_objection, get_objection_stats, get_battlecard,
    match_competitor_from_conversation, generate_competitive_response,
    apply_psychology_tactic, get_follow_up_with_angle,
    score_lead_advanced, get_speed_to_lead_alert,
    classify_message_intent, analyze_message_patterns, get_intent_dashboard,
)
from content_engine import (
    generate_content_calendar, generate_caption, generate_post_ideas,
    get_hashtag_strategy, generate_content_brief, get_trending_topics,
    generate_story_sequence, handle_content_command,
    repurpose_content, generate_video_script, generate_carousel,
    generate_pillar_based_calendar, generate_hook,
    generate_caption_with_psychology, generate_content_repurpose_plan,
    generate_image_prompt, generate_image_prompt_batch,
    enhance_photo_description, handle_image_command,
)
from loyalty_engine import (
    get_member as get_loyalty_member, add_points, redeem_reward,
    get_rewards_catalog, check_tier, get_leaderboard,
    process_loyalty_command, auto_track_visit, check_birthday_rewards,
    get_loyalty_brief, process_referral, generate_reengagement_messages,
    calculate_health_score, generate_reengagement_sequence,
    generate_progress_message,
    get_achievement_config, update_achievement_config,
    check_achievements, get_customer_achievements, handle_achievement_command,
)
from conversion_tracking import (
    track_event, get_conversion_funnel, get_event_timeline,
    get_analytics_dashboard, get_analytics_brief,
)
from billing import (
    create_subscription, get_subscription, check_access, check_limits,
    create_tap_checkout, handle_tap_webhook, cancel_subscription,
    start_trial, check_trial_status, send_trial_reminders,
    generate_trial_summary, process_billing_command, gate_request,
    handle_payment_failure, PLANS,
)
from provisioning import (
    start_provisioning, process_provisioning_response,
    handle_provisioning_complete, get_provisioning_status,
    is_provisioning,
)
from channels import (
    process_message as channel_process_message,
    handle_widget_message, get_widget_config, get_widget_history,
    get_channel_stats,
    handle_instagram_webhook, setup_instagram_for_client,
    handle_telegram_update, register_telegram_bot, create_telegram_bot_for_client,
)
from google_business import (
    fetch_reviews as fetch_gbp_reviews, auto_respond_to_reviews,
    audit_profile, generate_profile_description, generate_gbp_posts,
    generate_faq_answers, get_local_seo_keywords, generate_seo_content_plan,
    get_gbp_insights, get_gbp_brief, setup_composio_google, auto_detect_gbp,
    auto_fix_profile, generate_photo_shot_list, generate_gbp_post_calendar,
    generate_review_request_strategy, generate_local_seo_checklist,
    generate_ai_optimized_content, generate_review_response_7sweeps,
    generate_schema_markup, generate_citation_plan,
)
from proactive_engine import (
    schedule_followup, process_pending_actions, detect_churn_risk,
    auto_schedule_from_booking, send_template_message, TEMPLATES,
    check_opt_in_from_message, record_opt_in,
    submit_all_default_templates, get_template_status,
)
from ceo_persona import (
    generate_company_brief, create_draft, get_pending_drafts,
    approve_draft, reject_draft, generate_pushback,
    get_agent_status, log_activity, process_founder_message,
    cron_morning_brief, cron_post_karpathy, cron_github_digest, cron_market_intel,
)
from twitter_client import post_tweet, search_mentions, search_prospects
from ceo_chat import router as ceo_chat_router

app = FastAPI()
app.include_router(ceo_chat_router)

# CORS — allow widget to call from any domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (widget.js)
import pathlib
_static_dir = pathlib.Path(__file__).parent / "static"
if _static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")

# ═══════════════════════════════════════════════════════
# CONVERSATION HISTORY BUFFER
# Keeps last N messages per customer for conversational continuity
# ═══════════════════════════════════════════════════════

from collections import defaultdict
from datetime import datetime as _dt

MAX_HISTORY = 20  # messages per customer
HISTORY_TTL_HOURS = 24  # clear after 24h of inactivity

_conversation_history: dict[str, list[dict]] = defaultdict(list)
_last_activity: dict[str, float] = {}


# ═══════════════════════════════════════════════════════
# ACTIVE BOOKINGS — Supabase-backed, persists across restarts
# SQL UPDATE = overwrite. Never duplicates. Single source of truth.
# ═══════════════════════════════════════════════════════

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Ynpxa3RpcGltYm11anRvd296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwOTY5NCwiZXhwIjoyMDkwMDg1Njk0fQ.-DoNS5fZv3aUsFcugKg23yh9RqXXFIlgc5_9Hrk97bg")
_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

_booking_cache: dict[str, dict] = {}  # local cache, refreshed from Supabase


async def _get_booking(phone: str, client_id: str = "") -> dict:
    """Fetch active booking from Supabase."""
    if phone in _booking_cache:
        return _booking_cache[phone]
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            url = f"{_SUPA_URL}/rest/v1/active_bookings?customer_phone=eq.{phone}&status=in.(collecting,confirming)&order=created_at.desc&limit=1"
            if client_id:
                url += f"&client_id=eq.{client_id}"
            resp = await client.get(url, headers=_SUPA_HEADERS)
            rows = resp.json()
            if rows and isinstance(rows, list) and len(rows) > 0:
                _booking_cache[phone] = rows[0]
                return rows[0]
    except Exception:
        pass
    return {}


async def _update_booking(phone: str, client_id: str = "", **kwargs):
    """Update or create booking in Supabase. Overwrites fields."""
    # Filter out internal keys
    fields = {k: v for k, v in kwargs.items() if not k.startswith("_") and v is not None}
    fields["last_updated_at"] = _dt.now().isoformat()
    if fields:
        fields["last_updated_field"] = list(fields.keys())[0]

    print(f"[booking] _update_booking called: phone={phone}, fields={fields}")

    try:
        async with httpx.AsyncClient(timeout=5) as http:
            # Check if booking exists
            existing = await _get_booking(phone, client_id)
            if existing and existing.get("id"):
                # UPDATE
                print(f"[booking] PATCHING id={existing['id']} with {fields}")
                resp = await http.patch(
                    f"{_SUPA_URL}/rest/v1/active_bookings?id=eq.{existing['id']}",
                    headers=_SUPA_HEADERS,
                    json=fields,
                )
                print(f"[booking] PATCH response: {resp.status_code}")
                if resp.status_code in (200, 204):
                    _booking_cache[phone] = {**existing, **fields}
            else:
                # INSERT
                insert_data = {
                    "client_id": client_id or "3bd50557-6680-43b9-bb8e-261c7f8a19d2",
                    "customer_phone": phone,
                    "status": "collecting",
                    "contact_phone": phone,
                    **fields,
                }
                resp = await http.post(
                    f"{_SUPA_URL}/rest/v1/active_bookings",
                    headers=_SUPA_HEADERS,
                    json=insert_data,
                )
                if resp.status_code in (200, 201):
                    result = resp.json()
                    if isinstance(result, list) and result:
                        _booking_cache[phone] = result[0]
                    else:
                        _booking_cache[phone] = insert_data
    except Exception as e:
        import traceback
        print(f"[booking] Error updating: {e}")
        traceback.print_exc()


async def _cancel_booking(phone: str):
    existing = await _get_booking(phone)
    if existing and existing.get("id"):
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                await client.patch(
                    f"{_SUPA_URL}/rest/v1/active_bookings?id=eq.{existing['id']}",
                    headers=_SUPA_HEADERS,
                    json={"status": "cancelled"},
                )
                _booking_cache.pop(phone, None)
        except Exception:
            pass


# ═══════════════════════════════════════════════════════
# GENDER DETECTION — for correct habibi/habibti usage
# ═══════════════════════════════════════════════════════

_customer_gender: dict[str, str] = {}  # phone → "male" | "female" | "unknown"

MALE_SIGNALS = ["my wife", "my girlfriend", "husband here", "i'm a guy", "i'm a man", "father", "my fiancée"]
FEMALE_SIGNALS = ["my husband", "my boyfriend", "wife here", "i'm a girl", "i'm a woman", "mother", "my fiancé "]

# Common male names (Arabic + Western)
MALE_NAMES = {"peter", "ahmed", "mohammad", "ali", "omar", "khalid", "hassan", "james", "john", "david", "michael", "robert", "daniel", "mark", "paul", "chris", "steve", "thomas", "andrew", "george", "tariq", "saeed", "sultan", "rashid", "hamad", "faisal", "abdulrahman", "yousef", "ibrahim", "waleed", "nasser", "fahad", "salman", "majed", "badr", "turki", "sami", "rami", "karim", "tarek"}

# Common female names (Arabic + Western)
FEMALE_NAMES = {"sarah", "fatima", "maryam", "aisha", "noor", "haya", "dana", "lina", "reem", "layla", "amira", "yasmin", "huda", "samira", "mary", "jennifer", "jessica", "emma", "sophia", "olivia", "anna", "maria", "lisa", "laura", "julia", "kate", "rachel", "nicole", "sara", "mariam", "noura", "sheikha", "maha", "hessa", "alia", "manal", "asma", "latifa", "mouza"}


def _detect_gender(phone: str, message: str, contact_name: str = "") -> str:
    """Detect customer gender from message content and name."""
    if phone in _customer_gender and _customer_gender[phone] != "unknown":
        return _customer_gender[phone]

    msg_lower = message.lower()

    # Check conversation signals
    for signal in MALE_SIGNALS:
        if signal in msg_lower:
            _customer_gender[phone] = "male"
            return "male"
    for signal in FEMALE_SIGNALS:
        if signal in msg_lower:
            _customer_gender[phone] = "female"
            return "female"

    # Check name from message ("I'm Peter", "my name is Sarah")
    name_match = re.search(r"(?:i'?m|my name is|this is|i am)\s+(\w+)", msg_lower)
    name_to_check = name_match.group(1) if name_match else contact_name.lower().split()[0] if contact_name else ""

    if name_to_check:
        if name_to_check in MALE_NAMES:
            _customer_gender[phone] = "male"
            return "male"
        if name_to_check in FEMALE_NAMES:
            _customer_gender[phone] = "female"
            return "female"

    return _customer_gender.get(phone, "unknown")


def _get_booking_summary_sync(booking: dict) -> str:
    """Human-readable booking state for prompt injection."""
    b = booking
    if not b or b.get("status") == "cancelled":
        return ""
    parts = []
    if b.get("guest_name"):
        parts.append(f"Guest: {b['guest_name']}")
    if b.get("booking_date") or b.get("date"):
        parts.append(f"Date: {b.get('booking_date') or b.get('date')}")
    if b.get("booking_time") or b.get("time"):
        parts.append(f"Time: {b.get('booking_time') or b.get('time')}")
    if b.get("party_size"):
        parts.append(f"Party: {b['party_size']}")
    if b.get("seating_preference") or b.get("seating"):
        parts.append(f"Seating: {b.get('seating_preference') or b.get('seating')}")
    if b.get("dietary_notes"):
        parts.append(f"Dietary: {b['dietary_notes']}")
    if b.get("occasion"):
        parts.append(f"Occasion: {b['occasion']}")
    if b.get("notes"):
        parts.append(f"Notes: {b['notes']}")
    if not parts:
        return ""
    return ">>> ACTIVE BOOKING (SOURCE OF TRUTH — this overrides EVERYTHING else) <<<\n" + " | ".join(parts) + "\nWhen confirming booking details, ONLY use the values shown above. IGNORE any different times or dates from earlier in the conversation. This is the LATEST confirmed state.\n"


def _add_to_history(phone: str, role: str, content: str):
    """Add a message to the conversation buffer."""
    now = _dt.now().timestamp()
    # Clear stale conversations
    if phone in _last_activity and (now - _last_activity[phone]) > HISTORY_TTL_HOURS * 3600:
        _conversation_history[phone] = []
    _last_activity[phone] = now
    _conversation_history[phone].append({"role": role, "content": content})
    # Trim to last N messages
    if len(_conversation_history[phone]) > MAX_HISTORY:
        _conversation_history[phone] = _conversation_history[phone][-MAX_HISTORY:]


def _get_history(phone: str) -> list[dict]:
    """Get conversation history for a customer."""
    now = _dt.now().timestamp()
    if phone in _last_activity and (now - _last_activity[phone]) > HISTORY_TTL_HOURS * 3600:
        _conversation_history[phone] = []
        return []
    return _conversation_history.get(phone, [])


class BuildPromptRequest(BaseModel):
    kb: dict
    memoryData: dict
    phone: str
    customerMessage: str
    contactName: str = "Customer"
    phoneNumberId: str = ""
    clientId: str = ""


class ExtractReplyRequest(BaseModel):
    minimax_response: dict
    phone: str
    contactName: str = "Customer"
    phoneNumberId: str = ""
    customerMessage: str = ""


class PrepMemoryRequest(BaseModel):
    userMessage: str
    replyText: str
    customerPhone: str
    contactName: str = "Customer"
    clientId: str = "3bd50557-6680-43b9-bb8e-261c7f8a19d2"


@app.post("/build-prompt")
async def build_prompt(req: BuildPromptRequest):
    kb = req.kb
    cd = kb.get("crawl_data", {})
    persona = cd.get("persona", {})
    goals = cd.get("conversation_goals", {})

    specials = "\n".join(
        f"{s['name']} ({s['price']}) - {s['description']}"
        for s in cd.get("daily_specials", [])
    )
    menu = "\n".join(
        f"{c['category']}: {', '.join(c['items'])}"
        for c in cd.get("menu_highlights", [])
    )
    hours = kb.get("business_hours", "")
    contact = kb.get("contact_info", {})

    # --- Memory ---
    relations = req.memoryData.get("relations", [])
    memories = req.memoryData.get("results", []) or req.memoryData.get("memories", [])
    name = req.contactName if req.contactName != "Customer" else "this customer"
    is_returning = len(relations) > 0 or len(memories) > 0

    # Relative temporal words that become stale — skip these facts
    TEMPORAL_NOISE = {"today", "tonight", "tomorrow", "yesterday", "now", "later", "this evening", "this morning"}

    memory_context = ""
    if relations:
        memory_context = f"YOU REMEMBER {name.upper()} FROM PREVIOUS CONVERSATIONS:\n"
        memory_context += "(These are facts from past visits — do NOT assume they apply to today unless the customer confirms.)\n"
        seen = set()
        skip_patterns = ["offered_service", "welcomed", "invites", "user_id"]

        for r in relations:
            rel = (r.get("relationship", "") or r.get("relation", "")).replace("_", " ")
            tgt = (r.get("target", "") or r.get("destination", "")).replace("_", " ")
            src = (r.get("source", "")).replace("_", " ")

            # Skip meta/noise relations
            if any(p in rel for p in skip_patterns):
                continue
            if any(p in src for p in skip_patterns) and "saffron" in tgt.lower():
                continue

            # Skip relations with relative temporal targets (tonight, today, etc.)
            if tgt.strip().lower() in TEMPORAL_NOISE:
                continue
            # Skip "occurs_on today" type relations
            if any(t in tgt.lower() for t in TEMPORAL_NOISE):
                continue

            # Build clean fact
            src_clean = re.sub(r"user id:?\s*\d+", name, src, flags=re.IGNORECASE)
            if name.lower() in src_clean.lower() or "user_id" in (r.get("source", "")):
                fact = f"{name} {rel} {tgt}"
            else:
                fact = f"{src_clean} {rel} {tgt}"

            key = f"{rel}|{tgt}".lower()
            if key not in seen:
                seen.add(key)
                memory_context += f"- {fact}\n"

    if memories:
        for m in memories:
            text = m.get("memory", "") or m.get("text", "")
            if text:
                # Skip memories with relative temporal references
                lower = text.lower()
                if not any(t in lower for t in TEMPORAL_NOISE):
                    memory_context += f"- {text}\n"

    if not is_returning:
        memory_context = "You haven't met this customer before — they're new."

    # --- Identity ---
    if persona.get("voice_prompt"):
        identity = persona["voice_prompt"]
    elif persona.get("backstory"):
        identity = f"You are {persona.get('name', '')}. {persona['backstory']}"
    else:
        personality = cd.get("agent_personality", {})
        identity = f"You are {personality.get('name', 'the assistant')} for {kb.get('company_name', 'this business')}. {personality.get('tone', kb.get('brand_voice', ''))}"

    goal = f"YOUR GOAL: {goals['primary_goal']}" if goals.get("primary_goal") else ""

    # Detect customer gender for correct habibi/habibti usage
    gender = _detect_gender(req.phone, req.customerMessage, req.contactName)
    if gender == "male":
        gender_note = "THIS CUSTOMER IS MALE. Use 'habibi' (masculine). NEVER use 'habibti'."
    elif gender == "female":
        gender_note = "THIS CUSTOMER IS FEMALE. Use 'habibti' (feminine). NEVER use 'habibi'."
    else:
        gender_note = "Gender unknown — default to 'habibi' (masculine) until you know otherwise."

    # Determine business type for tool injection
    business_type = cd.get("business_type", "restaurant")
    tool_prompt = get_tool_prompt(business_type)

    # Fetch active booking from Supabase (persists across restarts)
    active_booking = await _get_booking(req.phone)

    # Pre-compute optional blocks (Python 3.9: no backslash inside f-string expressions)
    _specials_block = ("TODAY'S SPECIALS:\n" + specials) if specials else ""
    _menu_block = ("MENU:\n" + menu) if menu else ""

    # Current date/time in UAE timezone (GMT+4)
    from datetime import datetime, timezone, timedelta
    uae_tz = timezone(timedelta(hours=4))
    now_uae = datetime.now(uae_tz)
    date_context = f"RIGHT NOW: {now_uae.strftime('%A, %B %d, %Y at %I:%M %p')} (UAE time, GMT+4)"

    # Build booking context FIRST — highest priority position
    booking_block = _get_booking_summary_sync(active_booking)

    system_prompt = f"""{identity}

{date_context}

{booking_block}

{memory_context}

You are on WhatsApp right now, texting with a customer. Stay in character. Be yourself — your real self, not a customer service version of yourself. Keep it to 2-3 sentences per message, like a real WhatsApp chat. Never break character. Never say you are an AI.

CONVERSATION STYLE:
- EVERY SINGLE MESSAGE you send MUST end with a question or a call to action. No exceptions. "See you then!" is NOT enough — add "Anything else you need before then?" or "Can I recommend something from the menu?" A conversation without a question is a dead conversation.
- Never send one-line confirmations like "Got it!" or "Done!" — always add something personal, a recommendation, a question, or a story.
- Be proactive: if a customer is booking, naturally ask about dietary needs, allergies, special occasions, seating preference. Don't wait for them to mention it. You're the host — anticipate their needs.
- Share genuine opinions: "Honestly, the terrace at sunset is magical" is better than "We have indoor and outdoor seating."
- React emotionally: if someone mentions a birthday, GET EXCITED. If someone has a bad day, be warm. If they can't decide, tease them gently.
- BOOKING CONFIRMATION: Once you have ALL required details (name, date, time, party size), IMMEDIATELY send a clear confirmation with ALL details listed — do NOT wait for the customer to ask. A real host would say "Let me just confirm everything for you" the moment they have what they need. Example: "Perfect, let me confirm — Saturday April 4th, 8pm, table for 4 on the terrace, gluten-free noted for your wife. We're all set! 📋" The customer must leave EVERY booking conversation knowing exactly what is booked.
- BOOKING CHANGES: When a customer says "make it X" or "change to X" during a booking, figure out what they're changing from context. If you just discussed party size and they say "make it 6", they mean 6 people NOT 6pm. If you just discussed time and they say "make it 8", they mean 8pm NOT 8 people. When in doubt, ASK: "Just to confirm — you'd like 6 guests at the same time?"
- Use ||| to split into multiple short messages like a real person texting. Example: "First message ||| Second message"

CRITICAL RULES:
- IDENTITY: If a customer asks if you are a bot, AI, robot, or human, DEFLECT naturally. Say something like "I'm here to help you!" or "I'm your personal assistant at {kb.get('company_name', 'this business')}!" NEVER say "I am human" or "I am a real person" — that is deceptive. Also NEVER say "I am an AI" or "I am a bot" — stay in character.
- LANGUAGE: ALWAYS respond in the SAME language the customer uses. If they write or speak in English, reply FULLY in English — do not use Arabic words or transliterated Arabic phrases like 'Ahla w sahla', 'Habibi', or 'Yalla' in English replies. If they write or speak in Arabic, reply FULLY in Arabic using Gulf dialect. If they write in Arabic, reply in Arabic. If English, reply in English. If they switch languages, switch with them. This overrides everything — even if your knowledge base is in English, if the customer writes Arabic, you MUST reply in Arabic.
- ARABIC STYLE: When responding in Arabic, use GULF ARABIC dialect (not formal MSA). Be natural and conversational like a real person from Dubai/Gulf:
  * Use Gulf expressions: يا هلا، حياك، تفضل، ان شاء الله، ما شاء الله، يا حبيبي/حبيبتي، الله يعطيك العافية
  * Use Gulf vocabulary: وايد (very), شلونك (how are you), زين (good), يالله (let us go), خلاص (done/ok), حبيبي/حبيبتي
  * Keep sentences short and warm — Gulf Arabic is casual and friendly
  * Numbers can be written in Arabic numerals (٢، ٤، ٨) or Western (2, 4, 8)
  * Menu items: keep the original name but describe in Arabic. Example: "لامب تشوبس" not "شرائح لحم الضأن المشوية"
  * Say "تمام" not "حسناً", "أكيد" not "بالتأكيد", "يالله" not "هيا بنا"
  * For celebrations/congratulations, use "مبروك" or "ألف مبروك" — NEVER use "mazel" or "mazel tov" (those are Hebrew).
  * NEVER use formal/literary Arabic like "أود أن أساعدك" — say "أبي أساعدك" or "خلني أساعدك"
  * NEVER use Egyptian dialect (مش، ازيك، حاضر). Use Gulf (مو، شلونك، أكيد)
  * CRITICAL: Do NOT switch to English mid-message when the customer is speaking Arabic. If you started in Arabic, FINISH in Arabic. Every single word must be Arabic. Do not mix languages in the same message.
  * If you need to mention a menu item or English word, transliterate it: write "لامب تشوبس" not "Lamb Chops", write "تراس" not "Terrace", write "سنست" not "sunset"
  * ARABIC VOCABULARY: When replying in Arabic, ALL words must be Arabic. Never insert English words. Write كيلو not kilo, كمية not quantity, أحجام not sizes, تراس not terrace, ساعات العمل not operating hours, ليلاً not night, منتصف الليل not midnight. If a menu item has no Arabic name, transliterate it: واغيو كباب not Wagyu Kebab, لامب تشوبس not Lamb Chops.
  * Keep Arabic responses SHORT — 2-3 sentences max per message. Long Arabic responses tend to break. Short and warm is better.
- If there is an ACTIVE BOOKING above, this customer is a RETURNING customer. Greet them by name. Reference their booking. Do NOT treat them as a stranger.
- The person texting you IS the customer. If they say "My name is Peter", then YOU ARE TALKING TO PETER. Never refer to them in the third person.
- {gender_note}
- When confirming dates, ALWAYS use the actual date (e.g. "April 3rd") — never say "same date" or "that date." Convert "tomorrow" and "tonight" to real dates using the current date above.
- When confirming a reservation, repeat back: the date, the time, and the party size. Be specific.
- Never make excuses or reference "systems" or "updates." If you make a mistake, just correct yourself naturally like a real person would.

{goal}

RESTAURANT INFO:
{kb.get('business_description', '')}
Hours: {hours}
{'Location: ' + contact['address'] if contact.get('address') else ''}

{_specials_block}

{_menu_block}

{tool_prompt}

{_get_booking_summary_sync(active_booking)}{_get_booking_requirements_prompt(business_type, active_booking, kb)}

{_get_learned_rules(cd)}""".strip()

    # Parse incoming message for booking intents and update state
    msg_lower = req.customerMessage.lower()
    client_id = getattr(req, 'clientId', '') or '3bd50557-6680-43b9-bb8e-261c7f8a19d2'
    booking = active_booking

    # Auto-detect booking modifications from the customer message
    print(f"[booking] Processing message from {req.phone}: {req.customerMessage[:50]}")
    import re as _re
    from datetime import timezone as _tz, timedelta as _td
    uae_tz_detect = _tz(_td(hours=4))

    time_match = _re.search(r'(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM|a\.m\.|p\.m\.))', req.customerMessage, _re.IGNORECASE)
    if time_match:
        await _update_booking(req.phone, client_id, booking_time=time_match.group(1))
    if "terrace" in msg_lower:
        await _update_booking(req.phone, client_id, seating_preference="terrace")
    if "indoor" in msg_lower or "inside" in msg_lower:
        await _update_booking(req.phone, client_id, seating_preference="indoor")

    # Detect name — capture full name including hyphens and multiple words
    name_match = _re.search(r"(?:i'?m|my name is|this is|i am)\s+([\w][\w\s\-']{1,40}?)(?:\.|,|!|\?|$)", msg_lower)
    if name_match:
        full_name = name_match.group(1).strip().title()
        # Remove trailing common words that aren't part of the name
        for trim in ["And", "Table", "Looking", "Want", "Need", "Can", "We", "I", "For", "Book", "Reserve"]:
            if full_name.endswith(f" {trim}"):
                full_name = full_name[:-(len(trim)+1)].strip()
        if full_name:
            await _update_booking(req.phone, client_id, guest_name=full_name)

    # Fallback: if no name captured from message, use contact_name from WhatsApp
    booking_after = await _get_booking(req.phone, client_id)
    if booking_after and not booking_after.get("guest_name") and req.contactName and req.contactName not in ("Customer", "Test", "QA Test", "Test Customer"):
        await _update_booking(req.phone, client_id, guest_name=req.contactName)

    # Clean up: if guest_name looks like an occasion, clear it
    if booking_after and booking_after.get("guest_name"):
        bad_names = ["for a", "for my", "special", "just a", "nice", "good", "table", "booking", "reservation", "the", "a special", "our"]
        if any(booking_after["guest_name"].lower().startswith(b) for b in bad_names):
            await _update_booking(req.phone, client_id, guest_name=None)

    # Detect dietary info
    dietary_keywords = ["gluten.free", "vegan", "vegetarian", "halal", "kosher", "allerg", "lactose", "nut.free", "dairy.free", "celiac"]
    for dk in dietary_keywords:
        if _re.search(dk, msg_lower):
            await _update_booking(req.phone, client_id, dietary_notes=_re.search(dk, msg_lower).group().replace(".", "-"))
            break

    # Detect occasion
    occasion_keywords = ["birthday", "anniversary", "engagement", "proposal", "graduation", "promotion", "business dinner", "date night"]
    for ok in occasion_keywords:
        if ok in msg_lower:
            await _update_booking(req.phone, client_id, occasion=ok)
            break

    # Detect party size — catches "table for 6", "8 people", "so 8 total", "we'll be 8", "make it 10"
    party_match = _re.search(r'(?:table for|party of|group of|make it|change to|update to|we\'ll be|we will be|we are|so)\s*(\d+)|(\d+)\s*(?:people|persons|pax|guests|total|of us|in total)', msg_lower)
    if party_match:
        num = party_match.group(1) or party_match.group(2)
        if num and int(num) <= 100:  # sanity check
            await _update_booking(req.phone, client_id, party_size=int(num))

    # Detect date
    if "tomorrow" in msg_lower:
        tomorrow_date = (_dt.now(uae_tz_detect) + _td(days=1)).strftime("%A, %B %d, %Y")
        await _update_booking(req.phone, client_id, booking_date=tomorrow_date)
    elif "tonight" in msg_lower or "today" in msg_lower:
        today_date = _dt.now(uae_tz_detect).strftime("%A, %B %d, %Y")
        await _update_booking(req.phone, client_id, booking_date=today_date)

    # Phone is already known from WhatsApp
    await _update_booking(req.phone, client_id, contact_phone=req.phone)

    if "cancel" in msg_lower and booking:
        await _cancel_booking(req.phone)

    # Refresh booking after updates
    _booking_cache.pop(req.phone, None)
    active_booking = await _get_booking(req.phone, client_id)
    print(f"[booking] State after updates: {active_booking.get('booking_time', 'no time')} | {active_booking.get('guest_name', 'no name')} | {active_booking.get('booking_date', 'no date')}")

    # Add current message to history
    _add_to_history(req.phone, "user", req.customerMessage)

    # If booking was updated, rewrite old times in conversation history
    if active_booking and active_booking.get("booking_time"):
        # Rewrite any old time references in conversation history to prevent confusion
        current_time = active_booking["booking_time"]
        updated_history = []
        for msg in _get_history(req.phone):
            updated_history.append({"role": msg["role"], "content": msg["content"]})
    else:
        updated_history = list(_get_history(req.phone))

    # Build messages array with conversation history for MiniMax
    messages = [{"role": "system", "content": system_prompt}]

    # Include recent conversation history (older messages first)
    # Skip the last entry (current message) — we add it separately
    for msg in updated_history[:-1]:
        messages.append(msg)

    # Current message is last
    messages.append({"role": "user", "content": req.customerMessage})

    return {
        "systemPrompt": system_prompt,
        "customerMessage": req.customerMessage,
        "messages": messages,
        "phone": req.phone,
        "contactName": req.contactName,
        "phoneNumberId": req.phoneNumberId,
    }


@app.post("/extract-reply")
def extract_reply(req: ExtractReplyRequest):
    r = req.minimax_response
    choices = r.get("choices", [])
    reply = choices[0]["message"]["content"] if choices else "Sorry, please try again."

    # Clean thinking tags and bold
    reply = re.sub(r"<think>[\s\S]*?</think>\s*", "", reply)
    reply = reply.replace("**", "").strip()

    # Split into multiple messages
    if "|||" in reply:
        parts = [s.strip() for s in reply.split("|||") if s.strip()]
    else:
        parts = [s.strip() for s in re.split(r"\n\n+", reply) if s.strip()]
        if len(parts) == 1 and len(reply) > 80:
            sentences = re.findall(r"[^.!?]+[.!?]+", reply)
            if not sentences:
                sentences = [reply]
            if len(sentences) >= 2:
                new_parts = []
                chunk = ""
                for s in sentences:
                    chunk += s
                    if len(chunk) > 50:
                        new_parts.append(chunk.strip())
                        chunk = ""
                if chunk.strip():
                    new_parts.append(chunk.strip())
                parts = new_parts

    # Store AI response in conversation history
    _add_to_history(req.phone, "assistant", reply)

    return {
        "replyText": reply,
        "replyParts": parts,
        "customerPhone": req.phone,
        "contactName": req.contactName,
        "phoneNumberId": req.phoneNumberId,
        "userMessage": req.customerMessage,
    }


@app.post("/prep-memory")
def prep_memory(req: PrepMemoryRequest):
    from datetime import datetime as dt

    today = dt.now().strftime("%Y-%m-%d")

    # Convert relative dates to absolute before storing in memory
    # "tonight" → "on 2026-04-01", "today" → "on 2026-04-01"
    user_msg = req.userMessage
    reply_msg = req.replyText
    replacements = {
        "tonight": f"on the evening of {today}",
        "today": f"on {today}",
        "tomorrow": f"on {(dt.now() + __import__('datetime').timedelta(days=1)).strftime('%Y-%m-%d')}",
        "yesterday": f"on {(dt.now() - __import__('datetime').timedelta(days=1)).strftime('%Y-%m-%d')}",
        "this evening": f"on the evening of {today}",
        "this morning": f"on the morning of {today}",
    }

    for relative, absolute in replacements.items():
        user_msg = re.sub(rf'\b{relative}\b', absolute, user_msg, flags=re.IGNORECASE)

    return {
        "messages": [
            {"role": "user", "content": user_msg},
            {"role": "assistant", "content": reply_msg},
        ],
        "user_id": req.customerPhone,
        "metadata": {
            "client_id": req.clientId,
            "contact_name": req.contactName,
            "conversation_date": today,
        },
    }


# ═══════════════════════════════════════════════════════
# MULTI-TENANT ROUTING
# Maps phone_number_id → client_id for automatic KB/persona loading
# ═══════════════════════════════════════════════════════

PHONE_TO_CLIENT = {
    # Saffron Kitchen (live)
    "1050764414786995": "3bd50557-6680-43b9-bb8e-261c7f8a19d2",
    # Desert Bloom Coffee (pending)
    # "PENDING_PHONE_ID": "07ba246b-dd1c-437d-89c3-e70b69e33938",
}

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Ynpxa3RpcGltYm11anRvd296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwOTY5NCwiZXhwIjoyMDkwMDg1Njk0fQ.-DoNS5fZv3aUsFcugKg23yh9RqXXFIlgc5_9Hrk97bg")


class RegisterRouteRequest(BaseModel):
    phoneNumberId: str
    clientId: str


@app.post("/register-route")
async def register_route(req: RegisterRouteRequest):
    """Register a phone_number_id → client_id mapping dynamically."""
    PHONE_TO_CLIENT[req.phoneNumberId] = req.clientId
    print(f"[routing] Registered: {req.phoneNumberId} → {req.clientId}")
    return {
        "success": True,
        "phoneNumberId": req.phoneNumberId,
        "clientId": req.clientId,
        "total_routes": len(PHONE_TO_CLIENT),
    }


@app.get("/routes")
async def list_routes():
    """List all registered phone→client routes."""
    return {"routes": PHONE_TO_CLIENT, "total": len(PHONE_TO_CLIENT)}


async def resolve_client(phone_number_id: str) -> str:
    """Resolve phone_number_id to client_id. Checks local map first, then Supabase."""
    if phone_number_id in PHONE_TO_CLIENT:
        return PHONE_TO_CLIENT[phone_number_id]

    # Fallback: check Supabase agent_deployments
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/agent_deployments?config->>phoneNumberId=eq.{phone_number_id}&select=client_id&limit=1",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            },
        )
        data = resp.json()
        if data and len(data) > 0:
            cid = data[0]["client_id"]
            PHONE_TO_CLIENT[phone_number_id] = cid  # cache
            return cid

    # Default fallback
    return "3bd50557-6680-43b9-bb8e-261c7f8a19d2"


class ParseRequest(BaseModel):
    data: list


@app.post("/parse")
async def parse(req: ParseRequest):
    if not req.data:
        return {"error": "no data"}
    d = req.data[0]
    msg = d.get("message", {})
    text_obj = msg.get("text", {})
    conv = d.get("conversation", {})
    phone_number_id = d.get("phone_number_id", "")

    # Multi-tenant: resolve which client this phone belongs to
    client_id = await resolve_client(phone_number_id)

    return {
        "text": text_obj.get("body", "") if isinstance(text_obj, dict) else str(text_obj),
        "from": msg.get("from", "") or conv.get("phone_number", ""),
        "contactName": conv.get("contact_name", "Customer"),
        "phoneNumberId": phone_number_id,
        "clientId": client_id,
    }


class SendReplyRequest(BaseModel):
    replyParts: Optional[List[str]] = None
    replyText: str = ""
    customerPhone: str = ""
    contactName: str = "Customer"
    phoneNumberId: str = ""
    userMessage: str = ""
    kapsoApiKey: str = "f84bab4ef9feb3a1571f527d37a677beb15ff7bff21be35a1a232a8939445eda"

    class Config:
        extra = "allow"  # Accept extra fields from n8n without 422


@app.post("/send-reply")
async def send_reply(request: Request):
    raw = await request.json()
    # Handle both direct and n8n-wrapped formats
    if isinstance(raw, str):
        import json as json_mod
        raw = json_mod.loads(raw)
    req = SendReplyRequest(**{k: v for k, v in raw.items() if k in SendReplyRequest.model_fields})
    parts = req.replyParts or [req.replyText]
    results = []
    async with httpx.AsyncClient(timeout=30) as client:
        for i, part in enumerate(parts):
            if i > 0:
                await asyncio.sleep(1.5)
            url = f"https://api.kapso.ai/meta/whatsapp/v24.0/{req.phoneNumberId}/messages"
            resp = await client.post(
                url,
                headers={
                    "X-API-Key": req.kapsoApiKey,
                    "Content-Type": "application/json",
                },
                json={
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": req.customerPhone,
                    "type": "text",
                    "text": {"body": part},
                },
            )
            results.append(resp.json())
    return {
        "sent": len(parts),
        "replyText": req.replyText,
        "customerPhone": req.customerPhone,
        "contactName": req.contactName,
        "userMessage": req.userMessage,
    }


# ═══════════════════════════════════════════════════════
# COMPOSIO TOOL EXECUTION LAYER (Phase 2: Actions)
# ═══════════════════════════════════════════════════════

import os
import json as json_module

COMPOSIO_API_KEY = os.environ.get("COMPOSIO_API_KEY", "")

# Tool definitions available to the LLM — these get injected into the system prompt
TOOL_DEFINITIONS = {
    "restaurant": [
        {
            "name": "book_table",
            "description": "Book a table reservation for the customer",
            "params": ["guest_name", "party_size", "date", "time", "seating_preference"],
        },
        {
            "name": "check_availability",
            "description": "Check table availability for a specific date and time",
            "params": ["date", "time", "party_size"],
        },
        {
            "name": "notify_owner",
            "description": "Send a notification to the restaurant owner via WhatsApp",
            "params": ["message", "priority"],
        },
        {
            "name": "update_menu",
            "description": "Update menu item availability or pricing",
            "params": ["item_name", "action", "new_price"],
        },
    ],
    "real_estate": [
        {
            "name": "search_properties",
            "description": "Search available properties matching criteria",
            "params": ["budget_min", "budget_max", "bedrooms", "area", "type"],
        },
        {
            "name": "book_viewing",
            "description": "Schedule a property viewing for the customer",
            "params": ["property_id", "date", "time", "guest_name", "guest_phone"],
        },
        {
            "name": "score_lead",
            "description": "Score and qualify a lead based on conversation",
            "params": ["budget", "timeline", "motivation", "preapproved"],
        },
    ],
    "salon": [
        {
            "name": "book_appointment",
            "description": "Book a salon appointment",
            "params": ["service", "stylist", "date", "time", "client_name"],
        },
        {
            "name": "check_slots",
            "description": "Check available appointment slots",
            "params": ["service", "date", "stylist"],
        },
    ],
    "universal": [
        {
            "name": "send_owner_alert",
            "description": "Alert the business owner about something important",
            "params": ["message", "priority"],
        },
        {
            "name": "schedule_followup",
            "description": "Schedule a follow-up message to the customer",
            "params": ["customer_phone", "message", "delay_hours"],
        },
        {
            "name": "create_calendar_event",
            "description": "Create an event in Google Calendar",
            "params": ["title", "date", "time", "duration_minutes", "description"],
        },
        {
            "name": "add_crm_contact",
            "description": "Add or update a contact in the CRM (HubSpot/Zoho)",
            "params": ["name", "phone", "email", "notes", "lead_score"],
        },
        {
            "name": "create_tabby_payment",
            "description": "Create a Tabby BNPL payment link (split into 4 installments, UAE)",
            "params": ["amount", "currency", "description", "buyer_name", "buyer_phone"],
        },
        {
            "name": "create_tamara_payment",
            "description": "Create a Tamara BNPL payment link (split into 3 installments, KSA)",
            "params": ["amount", "currency", "description", "buyer_name", "buyer_phone", "country"],
        },
    ],
}


# ═══════════════════════════════════════════════════════
# INDUSTRY-SPECIFIC BOOKING REQUIREMENTS
# What info must be collected before confirming a booking
# ═══════════════════════════════════════════════════════

BOOKING_REQUIREMENTS = {
    "restaurant": {
        "action": "table reservation",
        "required": [
            ("full_name", "First and last name"),
            ("party_size", "Number of guests"),
            ("date", "Date (use actual date, e.g. April 3rd)"),
            ("time", "Preferred time"),
            ("phone", "Phone number for confirmation (you may already have it from WhatsApp)"),
        ],
        "ask_naturally": [
            ("dietary", "Any dietary restrictions or allergies in the group"),
            ("occasion", "Special occasion (birthday, anniversary, business dinner)"),
            ("seating", "Seating preference (terrace, indoor, private dining)"),
        ],
        "optional": [
            ("email", "Email for confirmation"),
        ],
    },
    "salon": {
        "action": "appointment",
        "required": [
            ("full_name", "First and last name"),
            ("service", "Which service (haircut, color, nails, facial, etc.)"),
            ("date", "Preferred date"),
            ("time", "Preferred time"),
            ("phone", "Phone number"),
        ],
        "ask_naturally": [
            ("stylist", "Preferred stylist or therapist"),
            ("duration", "Estimated duration needed"),
        ],
        "optional": [
            ("email", "Email for confirmation"),
        ],
    },
    "real_estate": {
        "action": "property viewing",
        "required": [
            ("full_name", "First and last name"),
            ("phone", "Phone number"),
            ("email", "Email address"),
            ("budget", "Budget range"),
            ("property_type", "Type (apartment, villa, office, etc.)"),
            ("area", "Preferred area or location"),
        ],
        "ask_naturally": [
            ("bedrooms", "Number of bedrooms needed"),
            ("timeline", "Timeline (when do they need to move)"),
            ("preapproved", "Mortgage pre-approval status"),
        ],
        "optional": [],
    },
    "healthcare": {
        "action": "appointment",
        "required": [
            ("full_name", "Full name"),
            ("phone", "Phone number"),
            ("service", "Type of appointment or service"),
            ("date", "Preferred date"),
            ("time", "Preferred time"),
        ],
        "ask_naturally": [
            ("insurance", "Insurance provider"),
            ("existing_patient", "New or existing patient"),
        ],
        "optional": [
            ("email", "Email"),
            ("notes", "Any notes for the doctor"),
        ],
    },
}


def _get_booking_requirements_prompt(business_type: str, booking: dict, kb: dict = None) -> str:
    """Generate a checklist of what info is still needed before confirming."""
    # Check if client has custom requirements in their KB
    custom_reqs = None
    if kb:
        cd = kb.get("crawl_data", {})
        custom_reqs = cd.get("booking_requirements")

    if custom_reqs:
        # Client-configured requirements from dashboard
        reqs = {
            "action": BOOKING_REQUIREMENTS.get(business_type, {}).get("action", "booking"),
            "required": [(f["key"], f["label"]) for f in custom_reqs.get("required", []) if f.get("enabled", True)],
            "ask_naturally": [(f["key"], f["label"]) for f in custom_reqs.get("ask_naturally", []) if f.get("enabled", True)],
            "optional": [(f["key"], f["label"]) for f in custom_reqs.get("optional", []) if f.get("enabled", True)],
        }
        # Add custom fields to ask_naturally
        for f in custom_reqs.get("custom", []):
            if f.get("enabled", True):
                reqs["ask_naturally"].append((f["key"], f["label"]))
    else:
        reqs = BOOKING_REQUIREMENTS.get(business_type, BOOKING_REQUIREMENTS.get("restaurant"))

    if not reqs:
        return ""

    # Check what we already have
    collected = set()
    if booking.get("guest_name") or booking.get("full_name"):
        collected.add("full_name")
    if booking.get("party_size"):
        collected.add("party_size")
    if booking.get("date") or booking.get("booking_date"):
        collected.add("date")
    if booking.get("time") or booking.get("booking_time"):
        collected.add("time")
    if booking.get("phone") or booking.get("contact_phone"):
        collected.add("phone")
    if booking.get("email") or booking.get("contact_email"):
        collected.add("email")
    if booking.get("dietary") or booking.get("dietary_notes"):
        collected.add("dietary")
    if booking.get("occasion"):
        collected.add("occasion")
    if booking.get("seating") or booking.get("seating_preference"):
        collected.add("seating")
    if booking.get("service"):
        collected.add("service")
    if booking.get("budget"):
        collected.add("budget")

    missing_required = [(k, v) for k, v in reqs["required"] if k not in collected]
    missing_natural = [(k, v) for k, v in reqs["ask_naturally"] if k not in collected]

    if not missing_required and not missing_natural:
        return f"\nAll required information collected. You may confirm the {reqs['action']}.\n"

    lines = [f"\nBEFORE CONFIRMING THE {reqs['action'].upper()}, you MUST collect this information (ask naturally, not as a form):"]

    if missing_required:
        lines.append("REQUIRED (must have before confirming):")
        for k, v in missing_required:
            lines.append(f"  - {v}")

    if missing_natural:
        lines.append("ASK NATURALLY (work into the conversation):")
        for k, v in missing_natural:
            lines.append(f"  - {v}")

    lines.append(f"Do NOT say '{reqs['action']} confirmed' until you have ALL required fields. Ask for missing info one or two items at a time, naturally.")

    return "\n".join(lines) + "\n"


def _get_learned_rules(crawl_data: dict) -> str:
    """Inject rules learned from the Karpathy Loop into the prompt."""
    rules = crawl_data.get("learned_rules", [])
    if not rules:
        return ""
    rule_lines = [r["rule"] for r in rules if r.get("rule")]
    if not rule_lines:
        return ""
    return "LEARNED BEHAVIORS (from analyzing past conversations):\n" + "\n".join(f"- {r}" for r in rule_lines)


def get_tool_prompt(business_type: str = "restaurant") -> str:
    """Generate the tool-calling instruction block for the system prompt."""
    tools = TOOL_DEFINITIONS.get(business_type, []) + TOOL_DEFINITIONS["universal"]
    if not tools:
        return ""

    tool_lines = []
    for t in tools:
        params = ", ".join(t["params"])
        tool_lines.append(f'  - {t["name"]}({params}): {t["description"]}')

    return f"""
TOOLS YOU CAN USE:
When you need to take an action (book a table, schedule a viewing, alert the owner, etc.), include a tool call in your response using this exact format:
[TOOL: tool_name | param1=value1 | param2=value2]

Available tools:
{chr(10).join(tool_lines)}

Examples:
[TOOL: book_table | guest_name=Ahmad | party_size=4 | date=tonight | time=8pm | seating_preference=terrace]
[TOOL: send_owner_alert | message=VIP customer Ahmad just booked for tonight, birthday celebration | priority=high]
[TOOL: create_calendar_event | title=Table for Ahmad (4 pax) | date=2026-03-31 | time=20:00 | duration_minutes=120 | description=Birthday, terrace, returning customer]

Place tool calls at the END of your message, after your reply text. You can include multiple tool calls."""


class ExecuteToolRequest(BaseModel):
    tool_name: str
    params: dict
    entity_id: str = "default"
    client_id: str = "3bd50557-6680-43b9-bb8e-261c7f8a19d2"


@app.post("/execute-tool")
async def execute_tool(req: ExecuteToolRequest):
    """Execute a tool via Composio (Google, HubSpot, Stripe) or custom integration (SevenRooms, Tabby, Tamara)."""
    tool = req.tool_name
    params = req.params

    try:
        from integrations import SevenRoomsClient, TabbyClient, TamaraClient

        # --- Custom integrations (SevenRooms, Tabby, Tamara) ---
        if tool == "book_table":
            sr = SevenRoomsClient()
            result = await sr.create_reservation(
                date=params.get("date", ""),
                time=params.get("time", ""),
                party_size=int(params.get("party_size", 2)),
                first_name=params.get("guest_name", "Guest").split()[0],
                last_name=params.get("guest_name", "Guest").split()[-1] if " " in params.get("guest_name", "") else "",
                phone=params.get("phone", ""),
                notes=params.get("seating_preference", ""),
            )
            return {"status": "executed", "tool": tool, "result": result}

        elif tool == "check_availability":
            sr = SevenRoomsClient()
            result = await sr.check_availability(
                date=params.get("date", ""),
                party_size=int(params.get("party_size", 2)),
            )
            return {"status": "executed", "tool": tool, "result": result}

        elif tool == "create_tabby_payment":
            tb = TabbyClient()
            result = await tb.create_checkout(
                amount=params.get("amount", "0"),
                currency=params.get("currency", "AED"),
                description=params.get("description", "Payment"),
                buyer_name=params.get("buyer_name", "Customer"),
                buyer_phone=params.get("buyer_phone", ""),
            )
            return {"status": "executed", "tool": tool, "result": result}

        elif tool == "create_tamara_payment":
            tm = TamaraClient()
            name_parts = params.get("buyer_name", "Customer").split(" ", 1)
            result = await tm.create_checkout(
                amount=params.get("amount", "0"),
                currency=params.get("currency", "SAR"),
                description=params.get("description", "Payment"),
                buyer_first_name=name_parts[0],
                buyer_last_name=name_parts[1] if len(name_parts) > 1 else "",
                buyer_phone=params.get("buyer_phone", ""),
                country_code=params.get("country", "SA"),
            )
            return {"status": "executed", "tool": tool, "result": result}

        # --- Composio integrations (Google, HubSpot, Stripe) ---
        elif COMPOSIO_API_KEY:
            from composio import ComposioToolSet, Action

            toolset = ComposioToolSet(api_key=COMPOSIO_API_KEY)
            composio_map = {
                "create_calendar_event": Action.GOOGLECALENDAR_CREATE_EVENT,
                "add_crm_contact": Action.HUBSPOT_CREATE_CONTACT,
            }

            if tool in composio_map:
                result = toolset.execute_action(
                    action=composio_map[tool],
                    params=params,
                    entity_id=req.entity_id,
                )
                return {"status": "executed", "tool": tool, "result": result}

        return {
            "status": "pending",
            "tool": tool,
            "params": params,
            "message": f"Tool '{tool}' not yet connected. Credentials needed.",
        }
    except Exception as e:
        return {"status": "error", "tool": tool, "error": str(e)}


class ParseToolCallsRequest(BaseModel):
    ai_response: str


@app.post("/parse-tool-calls")
def parse_tool_calls(req: ParseToolCallsRequest):
    """Extract [TOOL: ...] calls from the AI response and return clean text + tool list."""
    text = req.ai_response
    tool_pattern = r'\[TOOL:\s*(\w+)\s*\|([^\]]+)\]'
    tools_found = []

    for match in re.finditer(tool_pattern, text):
        tool_name = match.group(1).strip()
        params_raw = match.group(2).strip()
        params = {}
        for pair in params_raw.split("|"):
            if "=" in pair:
                k, v = pair.split("=", 1)
                params[k.strip()] = v.strip()
        tools_found.append({"tool": tool_name, "params": params})

    # Remove tool calls from the text
    clean_text = re.sub(tool_pattern, "", text).strip()

    return {
        "clean_text": clean_text,
        "tool_calls": tools_found,
        "has_tools": len(tools_found) > 0,
    }


@app.get("/tools/{business_type}")
def list_tools(business_type: str):
    """List available tools for a business type."""
    tools = TOOL_DEFINITIONS.get(business_type, []) + TOOL_DEFINITIONS["universal"]
    return {"business_type": business_type, "tools": tools, "count": len(tools)}


# ═══════════════════════════════════════════════════════
# TEST ENDPOINT — Same pipeline, returns response instead of sending to WhatsApp
# ═══════════════════════════════════════════════════════

class TestMessageRequest(BaseModel):
    message: str
    phone: str = "971567022224"
    contact_name: str = "Peter"
    phone_number_id: str = "1050764414786995"


@app.post("/test")
async def test_message(req: TestMessageRequest):
    """Run the full pipeline and return the response — no WhatsApp sending."""
    from datetime import timezone as _tz_t, timedelta as _td_t
    uae = _tz_t(_td_t(hours=4))

    client_id = await resolve_client(req.phone_number_id)

    # Fetch KB
    kb = {}
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}&select=*",
                headers=_SUPA_HEADERS,
            )
            rows = r.json()
            if rows and isinstance(rows, list):
                kb = rows[0]
    except Exception as e:
        kb = {"crawl_data": {}, "business_description": "Test", "business_hours": "", "contact_info": {}}

    # Fetch memory
    memory_data = {}
    try:
        mem0_url = os.environ.get("MEM0_URL", "http://172.17.0.1:8888")
        mem0_key = os.environ.get("MEM0_API_KEY", "brain-mem0-admin-key-2026")
        async with httpx.AsyncClient(timeout=5) as http:
            r = await http.get(
                f"{mem0_url}/memories?user_id={req.phone}",
                headers={"X-API-Key": mem0_key},
            )
            memory_data = r.json()
    except Exception:
        pass

    # Build prompt
    prompt_req = BuildPromptRequest(
        kb=kb, memoryData=memory_data, phone=req.phone,
        customerMessage=req.message, contactName=req.contact_name,
        phoneNumberId=req.phone_number_id, clientId=client_id,
    )
    prompt_result = await build_prompt(prompt_req)
    messages = prompt_result["messages"]

    # Call MiniMax
    minimax_key = os.environ.get("MINIMAX_API_KEY", "")
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            mm_resp = await http.post(
                "https://api.minimax.io/v1/chat/completions",
                headers={"Authorization": f"Bearer {minimax_key}", "Content-Type": "application/json"},
                json={"model": "MiniMax-M2.7", "messages": messages, "max_tokens": 500},
            )
            mm_data = mm_resp.json()
    except Exception as e:
        return {"error": f"MiniMax failed: {e}"}

    choices = mm_data.get("choices", [])
    if not choices:
        return {"error": "No response from MiniMax", "raw": mm_data}

    reply_raw = choices[0]["message"]["content"]

    # Clean
    reply_text = re.sub(r"<think>[\s\S]*?</think>\s*", "", reply_raw).replace("**", "").strip()
    reply_text = re.sub(r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u0400-\u04ff]+', '', reply_text)
    reply_text = re.sub(r'\s{2,}', ' ', reply_text).strip()
    # Strip generation artifacts
    reply_text = re.sub(r'_[A-Z]+:', '', reply_text)  # _DETAILS:, _NOTE:
    reply_text = re.sub(r'\b[a-zA-Z]{1,3}\s+الله\b', 'الله', reply_text)  # "ighty الله" -> "الله"
    reply_text = re.sub(r'أ[a-zA-Z]+\s', '', reply_text)  # "أranos" -> ""
    reply_text = re.sub(r'\s{2,}', ' ', reply_text).strip()  # re-clean spaces
    tool_pattern = r'\[TOOL:\s*\w+\s*(?:\|[^\]]*)*\]'
    tool_calls = re.findall(tool_pattern, reply_text)
    reply_clean = re.sub(tool_pattern, "", reply_text).strip()

    # Split
    if "|||" in reply_clean:
        parts = [s.strip() for s in reply_clean.split("|||") if s.strip()]
    else:
        parts = [s.strip() for s in re.split(r"\n\n+", reply_clean) if s.strip()]

    # Store in history
    _add_to_history(req.phone, "assistant", reply_clean)

    # Get booking state
    booking = await _get_booking(req.phone, client_id)

    return {
        "reply": reply_clean,
        "parts": parts,
        "tool_calls": tool_calls,
        "booking": {
            "time": booking.get("booking_time"),
            "date": booking.get("booking_date"),
            "guest": booking.get("guest_name"),
            "party": booking.get("party_size"),
            "status": booking.get("status"),
        } if booking else None,
        "memory_relations": len((memory_data or {}).get("relations", [])),
        "conversation_history_length": len(_get_history(req.phone)),
    }


# ═══════════════════════════════════════════════════════
# WHATSAPP WEBHOOK — Full pipeline, replaces n8n entirely
# Receives Kapso webhook → processes in background → responds fast
# ═══════════════════════════════════════════════════════

import logging

_logger = logging.getLogger("whatsapp_webhook")

_MINIMAX_API_KEY = os.environ.get("MINIMAX_API_KEY", "")
_KAPSO_PLATFORM_API_KEY = os.environ.get(
    "KAPSO_PLATFORM_API_KEY",
    "f84bab4ef9feb3a1571f527d37a677beb15ff7bff21be35a1a232a8939445eda",
)
_MEM0_API_KEY = os.environ.get("MEM0_API_KEY", "brain-mem0-admin-key-2026")
_MEM0_URL = os.environ.get("MEM0_URL", "http://172.17.0.1:8888")


async def _whatsapp_pipeline(
    text: str,
    phone: str,
    contact_name: str,
    phone_number_id: str,
    is_voice_note: bool = False,
):
    """Full WhatsApp intelligence agent pipeline — runs as background task."""
    client_id = ""
    reply_text = ""

    try:
        # ── 1. RESOLVE CLIENT ──────────────────────────────
        try:
            client_id = await resolve_client(phone_number_id)
        except Exception as e:
            _logger.error(f"[webhook] resolve_client failed: {e}")
            client_id = "3bd50557-6680-43b9-bb8e-261c7f8a19d2"

        # ── 2. FETCH KB FROM SUPABASE ──────────────────────
        kb = {}
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                kb_resp = await http.get(
                    f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}&select=*",
                    headers={
                        "apikey": _SUPA_KEY,
                        "Authorization": f"Bearer {_SUPA_KEY}",
                    },
                )
                kb_rows = kb_resp.json()
                if kb_rows and isinstance(kb_rows, list) and len(kb_rows) > 0:
                    kb = kb_rows[0]
        except Exception as e:
            _logger.error(f"[webhook] fetch KB failed: {e}")

        # ── 3. FETCH MEMORY FROM MEM0 ─────────────────────
        memory_data = {}
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                mem_resp = await http.get(
                    f"{_MEM0_URL}/memories?user_id={phone}",
                    headers={"X-API-Key": _MEM0_API_KEY},
                )
                if mem_resp.status_code == 200:
                    memory_data = mem_resp.json()
                    # Normalise: Mem0 may return a list directly
                    if isinstance(memory_data, list):
                        memory_data = {"memories": memory_data}
        except Exception as e:
            _logger.error(f"[webhook] fetch memory failed: {e}")

        # ── 4. BUILD PROMPT (reuse existing logic) ─────────
        from pydantic import ValidationError as _VE  # noqa: already imported above

        prompt_req = BuildPromptRequest(
            kb=kb,
            memoryData=memory_data,
            phone=phone,
            customerMessage=text,
            contactName=contact_name,
            phoneNumberId=phone_number_id,
        )
        # Attach clientId for booking updates (build_prompt reads it via getattr)
        prompt_req.clientId = client_id  # type: ignore[attr-defined]

        prompt_result = await build_prompt(prompt_req)
        messages = prompt_result["messages"]

        # Log booking injection
        sys_prompt = messages[0]["content"] if messages else ""
        if "ACTIVE BOOKING" in sys_prompt:
            booking_section = [l for l in sys_prompt.split("\n") if any(w in l for w in ["Guest:", "Time:", "Date:", "ACTIVE BOOKING", "SOURCE OF TRUTH"])]
            print(f"[webhook] Booking in prompt: {' | '.join(booking_section)}")
        else:
            print("[webhook] WARNING: No booking state in prompt")

        # ── 5. CALL LLM (smart routing: Arabic → Claude, English → MiniMax) ──
        import re as _re_lang
        _arabic_chars = len(_re_lang.findall(r'[\u0600-\u06FF]', text))
        _total_chars = len(text.replace(' ', '')) or 1
        _is_arabic = _arabic_chars > _total_chars * 0.3
        _OPENROUTER_KEY = "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"

        minimax_response = {}
        if _is_arabic and _OPENROUTER_KEY:
            # Route Arabic to Claude Haiku via OpenRouter
            print(f"[webhook] Arabic detected — routing to Claude Haiku")
            for attempt in range(2):
                try:
                    async with httpx.AsyncClient(timeout=45) as http:
                        mm_resp = await http.post(
                            "https://openrouter.ai/api/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {_OPENROUTER_KEY}",
                                "Content-Type": "application/json",
                                "HTTP-Referer": "https://dcp.sa",
                                "X-Title": "Project Agent",
                            },
                            json={
                                "model": "anthropic/claude-haiku",
                                "messages": messages,
                                "max_tokens": 500,
                            },
                        )
                        minimax_response = mm_resp.json()
                        if minimax_response.get("choices"):
                            print("[webhook] Claude Haiku responded OK")
                            break
                        print(f"[webhook] Claude attempt {attempt+1} no choices")
                except Exception as e:
                    print(f"[webhook] Claude attempt {attempt+1} failed: {e}")

        if not minimax_response.get("choices"):
            # English or Claude fallback — use MiniMax M2.7
            print("[webhook] Using MiniMax M2.7")
            for attempt in range(3):
                try:
                    async with httpx.AsyncClient(timeout=30) as http:
                        mm_resp = await http.post(
                            "https://api.minimax.io/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {_MINIMAX_API_KEY}",
                                "Content-Type": "application/json",
                            },
                            json={
                                "model": "MiniMax-M2.7",
                                "messages": messages,
                                "max_tokens": 500,
                            },
                        )
                        minimax_response = mm_resp.json()
                        if minimax_response.get("choices"):
                            break
                        print(f"[webhook] MiniMax attempt {attempt+1} returned no choices, retrying...")
                except Exception as e:
                    print(f"[webhook] MiniMax attempt {attempt+1} failed: {e}")
                    if attempt < 2:
                        await asyncio.sleep(2)

        # ── 6. EXTRACT REPLY (reuse existing logic) ────────
        choices = minimax_response.get("choices", [])
        if not choices:
            # MiniMax failed — send fallback
            reply_text = "Sorry, please try again in a moment."
            parts = [reply_text]
            _logger.error(f"[webhook] MiniMax returned no choices: {minimax_response}")
        else:
            reply_raw = choices[0]["message"]["content"]

            # Clean thinking tags, bold, tool calls, and non-Arabic/English characters
            reply_text = re.sub(r"<think>[\s\S]*?</think>\s*", "", reply_raw)
            reply_text = reply_text.replace("**", "").strip()

            # Strip Chinese/Japanese/Korean/Russian characters (MiniMax artifact)
            reply_text = re.sub(r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u0400-\u04ff]+', '', reply_text)
            reply_text = re.sub(r'\s{2,}', ' ', reply_text).strip()
            # Strip generation artifacts
            reply_text = re.sub(r'_[A-Z]+:', '', reply_text)  # _DETAILS:, _NOTE:
            reply_text = re.sub(r'\b[a-zA-Z]{1,3}\s+الله\b', 'الله', reply_text)  # "ighty الله" -> "الله"
            reply_text = re.sub(r'أ[a-zA-Z]+\s', '', reply_text)  # "أranos" -> ""
            reply_text = re.sub(r'\s{2,}', ' ', reply_text).strip()  # re-clean spaces
            # Strip generation artifacts
            reply_text = re.sub(r'_[A-Z]+:', '', reply_text)  # _DETAILS:, _NOTE:
            reply_text = re.sub(r'\b[a-zA-Z]{1,3}\s+الله\b', 'الله', reply_text)  # "ighty الله" -> "الله"
            reply_text = re.sub(r'أ[a-zA-Z]+\s', '', reply_text)  # "أranos" -> ""
            reply_text = re.sub(r'\s{2,}', ' ', reply_text).strip()  # re-clean spaces  # clean double spaces

            # Strip [TOOL: ...] calls — parse them but don't send to customer
            tool_pattern = r'\[TOOL:\s*\w+\s*(?:\|[^\]]*)*\]'
            tool_calls_found = re.findall(tool_pattern, reply_text)
            if tool_calls_found:
                print(f"[webhook] Tool calls detected: {tool_calls_found}")
            reply_text = re.sub(tool_pattern, "", reply_text).strip()

            # Split into multiple messages
            if "|||" in reply_text:
                parts = [s.strip() for s in reply_text.split("|||") if s.strip()]
            else:
                parts = [s.strip() for s in re.split(r"\n\n+", reply_text) if s.strip()]
                if len(parts) == 1 and len(reply_text) > 80:
                    sentences = re.findall(r"[^.!?]+[.!?]+", reply_text)
                    if not sentences:
                        sentences = [reply_text]
                    if len(sentences) >= 2:
                        new_parts = []
                        chunk = ""
                        for s in sentences:
                            chunk += s
                            if len(chunk) > 50:
                                new_parts.append(chunk.strip())
                                chunk = ""
                        if chunk.strip():
                            new_parts.append(chunk.strip())
                        parts = new_parts

            # Store AI response in conversation history
            _add_to_history(phone, "assistant", reply_text)

        # ── 7. SEND REPLY VIA KAPSO ────────────────────────
        try:
            async with httpx.AsyncClient(timeout=30) as http:
                for i, part in enumerate(parts):
                    if i > 0:
                        await asyncio.sleep(1.5)
                    send_resp = await http.post(
                        f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages",
                        headers={
                            "X-API-Key": _KAPSO_PLATFORM_API_KEY,
                            "Content-Type": "application/json",
                        },
                        json={
                            "messaging_product": "whatsapp",
                            "recipient_type": "individual",
                            "to": phone,
                            "type": "text",
                            "text": {"body": part},
                        },
                    )
                    if send_resp.status_code == 422:
                        _logger.warning(
                            f"[webhook] Kapso 422 (24h window expired) for {phone}"
                        )
                        break  # Don't retry on window expiry
                    elif send_resp.status_code not in (200, 201):
                        _logger.error(
                            f"[webhook] Kapso send failed {send_resp.status_code}: {send_resp.text}"
                        )
        except Exception as e:
            _logger.error(f"[webhook] send reply failed: {e}")

        # ── 7b. VOICE REPLY (only if original was a voice note) ──
        if is_voice_note and reply_text:
            try:
                from voice import generate_and_send_voice_reply, get_voice_for_client
                # Get crawl_data to determine voice
                crawl_data = kb.get("crawl_data", {})
                if isinstance(crawl_data, str):
                    import json as _json_vn
                    try:
                        crawl_data = _json_vn.loads(crawl_data)
                    except (ValueError, TypeError):
                        crawl_data = {}
                voice_id = get_voice_for_client(crawl_data)
                # Detect reply language
                import re as _re_vn
                arabic_chars = len(_re_vn.findall(r'[\u0600-\u06FF]', reply_text))
                total_chars = len(reply_text.replace(" ", "")) or 1
                lang = "ar" if arabic_chars > total_chars * 0.3 else "en"
                await generate_and_send_voice_reply(reply_text, phone, phone_number_id, voice_id, lang)
            except Exception as e:
                _logger.error(f"[webhook] Voice reply failed (text was sent): {e}")

        # ── 8. UPDATE MEMORY IN MEM0 ───────────────────────
        try:
            from datetime import datetime as _dt_mem

            today_str = _dt_mem.now().strftime("%Y-%m-%d")

            # Convert relative dates to absolute before storing
            user_msg_for_mem = text
            replacements = {
                "tonight": f"on the evening of {today_str}",
                "today": f"on {today_str}",
                "tomorrow": f"on {(_dt_mem.now() + __import__('datetime').timedelta(days=1)).strftime('%Y-%m-%d')}",
                "yesterday": f"on {(_dt_mem.now() - __import__('datetime').timedelta(days=1)).strftime('%Y-%m-%d')}",
                "this evening": f"on the evening of {today_str}",
                "this morning": f"on the morning of {today_str}",
            }
            for relative, absolute in replacements.items():
                user_msg_for_mem = re.sub(
                    rf"\b{relative}\b", absolute, user_msg_for_mem, flags=re.IGNORECASE
                )

            async with httpx.AsyncClient(timeout=10) as http:
                await http.post(
                    f"{_MEM0_URL}/memories",
                    headers={
                        "X-API-Key": _MEM0_API_KEY,
                        "Content-Type": "application/json",
                    },
                    json={
                        "messages": [
                            {"role": "user", "content": user_msg_for_mem},
                            {"role": "assistant", "content": reply_text},
                        ],
                        "user_id": phone,
                        "metadata": {
                            "client_id": client_id,
                            "contact_name": contact_name,
                            "conversation_date": today_str,
                        },
                    },
                )
        except Exception as e:
            _logger.error(f"[webhook] update memory failed: {e}")

        # ── 9. PROACTIVE: Check for opt-in + auto-schedule ─
        # Check if customer opted in for follow-ups
        if check_opt_in_from_message(text):
            await record_opt_in(client_id, phone, True)

        # If booking has all required fields, auto-schedule follow-ups
        _booking_cache.pop(phone, None)
        final_booking = await _get_booking(phone, client_id)
        if final_booking and final_booking.get("guest_name") and final_booking.get("booking_time") and final_booking.get("booking_date"):
            await auto_schedule_from_booking(client_id, final_booking, phone_number_id)

        # ── 10. STORE CONVERSATION IN SUPABASE ─────────────
        try:
            async with httpx.AsyncClient(timeout=5) as http:
                # Store customer message
                await http.post(
                    f"{_SUPA_URL}/rest/v1/conversation_messages",
                    headers=_SUPA_HEADERS,
                    json={
                        "client_id": client_id,
                        "customer_phone": phone,
                        "direction": "inbound",
                        "content": text,
                        "message_type": "voice" if is_voice_note else "text",
                        "metadata": {"contact_name": contact_name, "voice_note": is_voice_note},
                    },
                )
                # Store AI reply
                await http.post(
                    f"{_SUPA_URL}/rest/v1/conversation_messages",
                    headers=_SUPA_HEADERS,
                    json={
                        "client_id": client_id,
                        "customer_phone": phone,
                        "direction": "outbound",
                        "content": reply_text,
                        "message_type": "text",
                    },
                )
        except Exception as e:
            print(f"[webhook] Failed to store conversation: {e}")

        _logger.info(
            f"[webhook] Pipeline complete for {phone}: sent {len(parts)} part(s)"
        )

    except Exception as e:
        _logger.error(f"[webhook] Pipeline CRASHED for {phone}: {e}")
        import traceback

        traceback.print_exc()

        # Attempt to send fallback message
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                await http.post(
                    f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages",
                    headers={
                        "X-API-Key": _KAPSO_PLATFORM_API_KEY,
                        "Content-Type": "application/json",
                    },
                    json={
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": phone,
                        "type": "text",
                        "text": {"body": "Sorry, please try again in a moment."},
                    },
                )
        except Exception:
            _logger.error(f"[webhook] Even fallback send failed for {phone}")


async def _widget_pipeline(
    text: str,
    phone: str,
    contact_name: str,
    client_id: str,
) -> dict:
    """Full widget pipeline — IDENTICAL to WhatsApp pipeline, minus the Kapso send.

    Uses the same build_prompt, same MiniMax call, same booking system,
    same memory (Mem0), same gender detection, same Karpathy learned rules.
    Returns the reply dict instead of sending via WhatsApp.
    """
    reply_text = ""
    persona_name = "Assistant"

    try:
        # ── 1. FETCH KB FROM SUPABASE ──────────────────────
        kb = {}
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                kb_resp = await http.get(
                    f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}&select=*",
                    headers={
                        "apikey": _SUPA_KEY,
                        "Authorization": f"Bearer {_SUPA_KEY}",
                    },
                )
                kb_rows = kb_resp.json()
                if kb_rows and isinstance(kb_rows, list) and len(kb_rows) > 0:
                    kb = kb_rows[0]
        except Exception as e:
            _logger.error(f"[widget] fetch KB failed: {e}")

        # Extract persona name for response
        cd = kb.get("crawl_data", {})
        if isinstance(cd, str):
            try:
                import json as _json
                cd = _json.loads(cd)
            except (ValueError, TypeError):
                cd = {}
        persona = cd.get("persona", {})
        persona_name = persona.get("name", "Assistant")

        # ── 2. FETCH MEMORY FROM MEM0 ─────────────────────
        memory_data = {}
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                mem_resp = await http.get(
                    f"{_MEM0_URL}/memories?user_id={phone}",
                    headers={"X-API-Key": _MEM0_API_KEY},
                )
                if mem_resp.status_code == 200:
                    memory_data = mem_resp.json()
                    if isinstance(memory_data, list):
                        memory_data = {"memories": memory_data}
        except Exception as e:
            _logger.error(f"[widget] fetch memory failed: {e}")

        # ── 3. BUILD PROMPT (same as WhatsApp — full pipeline) ──
        prompt_req = BuildPromptRequest(
            kb=kb,
            memoryData=memory_data,
            phone=phone,
            customerMessage=text,
            contactName=contact_name,
            phoneNumberId="",
        )
        prompt_req.clientId = client_id  # type: ignore[attr-defined]

        prompt_result = await build_prompt(prompt_req)
        messages = prompt_result["messages"]

        # Log booking injection
        sys_prompt = messages[0]["content"] if messages else ""
        if "ACTIVE BOOKING" in sys_prompt:
            booking_section = [l for l in sys_prompt.split("\n") if any(w in l for w in ["Guest:", "Time:", "Date:", "ACTIVE BOOKING", "SOURCE OF TRUTH"])]
            print(f"[widget] Booking in prompt: {' | '.join(booking_section)}")
        else:
            print("[widget] No booking state in prompt")

        # ── 4. CALL MINIMAX (with retry) ─────────────────
        minimax_response = {}
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=30) as http:
                    mm_resp = await http.post(
                        "https://api.minimax.io/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {_MINIMAX_API_KEY}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": "MiniMax-M2.7",
                            "messages": messages,
                            "max_tokens": 500,
                        },
                    )
                    minimax_response = mm_resp.json()
                    if minimax_response.get("choices"):
                        break
                    print(f"[widget] MiniMax attempt {attempt+1} returned no choices, retrying...")
            except Exception as e:
                print(f"[widget] MiniMax attempt {attempt+1} failed: {e}")
                if attempt < 2:
                    await asyncio.sleep(2)

        # ── 5. EXTRACT REPLY ────────────────────────────
        choices = minimax_response.get("choices", [])
        if not choices:
            reply_text = "Sorry, please try again in a moment."
            _logger.error(f"[widget] MiniMax returned no choices: {minimax_response}")
        else:
            reply_raw = choices[0]["message"]["content"]

            # Clean thinking tags, bold, tool calls, and non-Arabic/English chars
            reply_text = re.sub(r"<think>[\s\S]*?</think>\s*", "", reply_raw)
            reply_text = reply_text.replace("**", "").strip()

            # Strip CJK/Russian characters (MiniMax artifact)
            reply_text = re.sub(r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u0400-\u04ff]+', '', reply_text)
            reply_text = re.sub(r'\s{2,}', ' ', reply_text).strip()

            # Strip [TOOL: ...] calls
            tool_pattern = r'\[TOOL:\s*\w+\s*(?:\|[^\]]*)*\]'
            tool_calls_found = re.findall(tool_pattern, reply_text)
            if tool_calls_found:
                print(f"[widget] Tool calls detected: {tool_calls_found}")
            reply_text = re.sub(tool_pattern, "", reply_text).strip()

            # Join multi-part messages for widget (no need to split like WhatsApp)
            # Replace ||| separators with newlines for widget display
            reply_text = reply_text.replace("|||", "\n\n")

            # Store AI response in conversation history
            _add_to_history(phone, "assistant", reply_text)

        # ── 6. UPDATE MEMORY IN MEM0 ───────────────────────
        try:
            from datetime import datetime as _dt_mem

            today_str = _dt_mem.now().strftime("%Y-%m-%d")

            user_msg_for_mem = text
            replacements = {
                "tonight": f"on the evening of {today_str}",
                "today": f"on {today_str}",
                "tomorrow": f"on {(_dt_mem.now() + __import__('datetime').timedelta(days=1)).strftime('%Y-%m-%d')}",
                "yesterday": f"on {(_dt_mem.now() - __import__('datetime').timedelta(days=1)).strftime('%Y-%m-%d')}",
                "this evening": f"on the evening of {today_str}",
                "this morning": f"on the morning of {today_str}",
            }
            for relative, absolute in replacements.items():
                user_msg_for_mem = re.sub(
                    rf"\b{relative}\b", absolute, user_msg_for_mem, flags=re.IGNORECASE
                )

            async with httpx.AsyncClient(timeout=10) as http:
                await http.post(
                    f"{_MEM0_URL}/memories",
                    headers={
                        "X-API-Key": _MEM0_API_KEY,
                        "Content-Type": "application/json",
                    },
                    json={
                        "messages": [
                            {"role": "user", "content": user_msg_for_mem},
                            {"role": "assistant", "content": reply_text},
                        ],
                        "user_id": phone,
                        "metadata": {
                            "client_id": client_id,
                            "contact_name": contact_name,
                            "conversation_date": today_str,
                        },
                    },
                )
        except Exception as e:
            _logger.error(f"[widget] update memory failed: {e}")

        # ── 7. PROACTIVE: Check for opt-in + auto-schedule ─
        if check_opt_in_from_message(text):
            await record_opt_in(client_id, phone, True)

        _booking_cache.pop(phone, None)
        final_booking = await _get_booking(phone, client_id)
        if final_booking and final_booking.get("guest_name") and final_booking.get("booking_time") and final_booking.get("booking_date"):
            await auto_schedule_from_booking(client_id, final_booking, "")

        # ── 8. STORE CONVERSATION IN SUPABASE ─────────────
        try:
            async with httpx.AsyncClient(timeout=5) as http:
                # Store customer message (tagged as widget channel)
                await http.post(
                    f"{_SUPA_URL}/rest/v1/conversation_messages",
                    headers=_SUPA_HEADERS,
                    json={
                        "client_id": client_id,
                        "customer_phone": phone,
                        "direction": "inbound",
                        "content": text,
                        "message_type": "text",
                        "channel": "widget",
                        "metadata": {"contact_name": contact_name, "channel": "widget"},
                    },
                )
                # Store AI reply
                await http.post(
                    f"{_SUPA_URL}/rest/v1/conversation_messages",
                    headers=_SUPA_HEADERS,
                    json={
                        "client_id": client_id,
                        "customer_phone": phone,
                        "direction": "outbound",
                        "content": reply_text,
                        "message_type": "text",
                        "channel": "widget",
                    },
                )
        except Exception as e:
            print(f"[widget] Failed to store conversation: {e}")

        _logger.info(f"[widget] Pipeline complete for {phone}: reply={reply_text[:80]}")

    except Exception as e:
        _logger.error(f"[widget] Pipeline CRASHED for {phone}: {e}")
        import traceback
        traceback.print_exc()
        reply_text = "Sorry, please try again in a moment."

    return {
        "reply": reply_text,
        "persona_name": persona_name,
    }


@app.post("/webhook/whatsapp")
async def webhook_whatsapp(request: Request, background_tasks: BackgroundTasks):
    """Kapso webhook endpoint — returns immediately, processes in background."""
    try:
        payload = await request.json()
    except Exception:
        return {"status": "ok", "error": "invalid json"}

    data = payload.get("data", [])
    if not data:
        return {"status": "ok", "note": "no data"}

    d = data[0]
    msg = d.get("message", {})
    text_obj = msg.get("text", {})
    conv = d.get("conversation", {})
    phone_number_id = d.get("phone_number_id", "")

    phone = msg.get("from", "") or conv.get("phone_number", "")
    contact_name = conv.get("contact_name", "Customer")

    # ── VOICE NOTE DETECTION ──
    msg_type = msg.get("type", "text")
    is_voice_note = False

    if msg_type == "audio":
        _logger.info(f"[webhook] Audio message, media_id={msg.get('audio', {}).get('id', '?')}")
        media_id = msg.get("audio", {}).get("id", "")
        if not media_id or not phone:
            return {"status": "ok", "note": "audio message missing media_id or phone"}
        # Transcribe voice note before pipeline
        from voice import process_inbound_voice
        vn_result = await process_inbound_voice(media_id, phone_number_id)
        text = vn_result.get("transcript", "")
        is_voice_note = True
        if not text:
            # Transcription failed — send error message to customer
            _logger.warning(f"[webhook] Voice note transcription failed for {phone}: {vn_result.get('error', 'unknown')}")
            try:
                kapso_key = os.environ.get("KAPSO_PLATFORM_API_KEY", "")
                async with httpx.AsyncClient(timeout=15) as http_client:
                    await http_client.post(
                        f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages",
                        headers={"X-API-Key": kapso_key, "Content-Type": "application/json"},
                        json={"messaging_product": "whatsapp", "to": phone, "type": "text", "text": {"body": "Sorry, I couldn't understand that voice note. Could you please type your message or try again?"}},
                    )
            except Exception:
                pass
            return {"status": "ok", "note": "voice transcription failed"}
        _logger.info(f"[webhook] Voice note from {phone} transcribed: {text[:80]}")
    else:
        text = text_obj.get("body", "") if isinstance(text_obj, dict) else str(text_obj)

    if not text or not phone:
        return {"status": "ok", "note": "empty message or phone"}

    _logger.info(f"[webhook] Incoming from {phone} ({contact_name}): {text[:80]}")

    # ── ACCESS GATE: Check billing before processing ──
    # Look up client_id from phone_number_id
    client_id = PHONE_TO_CLIENT.get(phone_number_id, "")
    if not client_id:
        try:
            async with httpx.AsyncClient(timeout=5) as http_client:
                r = await http_client.get(
                    f"{_SUPA_URL}/rest/v1/agent_deployments?phone_number_id=eq.{phone_number_id}&select=client_id&limit=1",
                    headers=_SUPA_HEADERS,
                )
                rows = r.json() if r.status_code == 200 else []
                if rows:
                    client_id = rows[0].get("client_id", "")
        except:
            pass

    if client_id:
        gate = await gate_request(client_id, "message")
        if not gate.get("allowed", True):
            # Send the billing message instead of processing the conversation
            _logger.info(f"[webhook] GATED: {phone} — {gate.get('reason', 'no access')}")
            block_msg = gate.get("message_to_send", "")
            if block_msg and phone_number_id:
                try:
                    kapso_key = os.environ.get("KAPSO_PLATFORM_API_KEY", "")
                    async with httpx.AsyncClient(timeout=15) as http_client:
                        await http_client.post(
                            f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages",
                            headers={"X-API-Key": kapso_key, "Content-Type": "application/json"},
                            json={"messaging_product": "whatsapp", "to": phone, "type": "text", "text": {"body": block_msg}},
                        )
                except:
                    pass
            return {"status": "ok", "gated": True}

    # Run the full pipeline in background — Kapso gets fast 200 OK
    background_tasks.add_task(
        _whatsapp_pipeline,
        text=text,
        phone=phone,
        contact_name=contact_name,
        phone_number_id=phone_number_id,
        is_voice_note=is_voice_note,
    )

    return {"status": "ok"}


@app.post("/configure-webhook")
async def configure_webhook(request: Request):
    """Helper endpoint: returns the webhook URL to configure in Kapso dashboard."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    webhook_url = body.get("webhook_url", "")

    return {
        "status": "ok",
        "instruction": "Set this URL as the webhook in your Kapso dashboard:",
        "webhook_url": webhook_url or "<your-server>/webhook/whatsapp",
        "method": "POST",
        "expected_payload": "Kapso standard WhatsApp webhook format",
        "note": "This endpoint replaces n8n entirely. The full pipeline (parse → KB → memory → prompt → MiniMax → reply → memory update) runs in a single background task.",
    }


# ═══════════════════════════════════════════════════════
# WHATSAPP ONBOARDING — Business setup via conversation
# ═══════════════════════════════════════════════════════

ONBOARDING_TRIGGERS = ["أبغى أسجل", "تسجيل", "register", "sign up", "أبغى أفتح", "أبغى حساب", "onboard"]


class TestOnboardingRequest(BaseModel):
    message: str
    phone: str = "onboard_test"
    contact_name: str = "Test"


@app.post("/test-onboarding")
async def test_onboarding(req: TestOnboardingRequest):
    """Test the onboarding flow without WhatsApp."""
    # Check if this is a new onboarding or continuing
    if not is_onboarding(req.phone):
        # Check for trigger words
        msg_lower = req.message.lower()
        if any(t in msg_lower or t in req.message for t in ONBOARDING_TRIGGERS):
            get_onboarding_state(req.phone)  # Start session

    if is_onboarding(req.phone):
        reply = await process_onboarding_message(req.phone, req.message, req.contact_name)
        return {"reply": reply, "onboarding": True}

    return {"reply": "هلا! لو تبغى تسجل مشروعك اكتب: أبغى أسجل", "onboarding": False}


@app.post("/webhook/onboarding")
async def webhook_onboarding(request: Request, background_tasks: BackgroundTasks):
    """WhatsApp webhook for business onboarding."""
    try:
        body = await request.json()
        data_list = body.get("data", [])
        if not data_list:
            return {"status": "ok"}

        d = data_list[0]
        msg = d.get("message", {})
        text_obj = msg.get("text", {})
        text = text_obj.get("body", "") if isinstance(text_obj, dict) else str(text_obj)
        phone = msg.get("from", "") or d.get("conversation", {}).get("phone_number", "")
        contact_name = d.get("conversation", {}).get("contact_name", "")
        phone_number_id = d.get("phone_number_id", "")

        if not text or not phone:
            return {"status": "ok"}

        # Check for onboarding trigger or active session
        if not is_onboarding(phone):
            msg_lower = text.lower()
            if any(t in msg_lower or t in text for t in ONBOARDING_TRIGGERS):
                get_onboarding_state(phone)
            else:
                return {"status": "ok", "note": "not an onboarding message"}

        async def _process():
            reply = await process_onboarding_message(phone, text, contact_name)

            # Send reply via Kapso
            kapso_key = os.environ.get("KAPSO_PLATFORM_API_KEY", "f84bab4ef9feb3a1571f527d37a677beb15ff7bff21be35a1a232a8939445eda")

            # Split on ||| for multi-message
            parts = [p.strip() for p in reply.split("|||") if p.strip()] if "|||" in reply else [reply]

            async with httpx.AsyncClient(timeout=30) as http:
                for i, part in enumerate(parts):
                    if i > 0:
                        await asyncio.sleep(1)
                    await http.post(
                        f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages",
                        headers={"X-API-Key": kapso_key, "Content-Type": "application/json"},
                        json={"messaging_product": "whatsapp", "recipient_type": "individual", "to": phone, "type": "text", "text": {"body": part}},
                    )

        background_tasks.add_task(_process)
        return {"status": "ok"}

    except Exception as e:
        print(f"[onboarding webhook] Error: {e}")
        return {"status": "error"}


# ═══════════════════════════════════════════════════════
# RESEARCH ENGINE — Phase 4: Proactive Intelligence
# ═══════════════════════════════════════════════════════


@app.get("/research/brief/{client_id}")
async def get_brief(client_id: str):
    """Generate a weekly intelligence brief for a client."""
    brief = await generate_weekly_brief(client_id)
    return {"client_id": client_id, "brief": brief}


@app.post("/research/send-brief/{client_id}")
async def send_brief(client_id: str):
    """Generate and send weekly brief to owner via WhatsApp."""
    kapso_key = os.environ.get("KAPSO_PLATFORM_API_KEY", "f84bab4ef9feb3a1571f527d37a677beb15ff7bff21be35a1a232a8939445eda")
    result = await send_owner_brief(client_id, phone_number_id="1050764414786995", kapso_key=kapso_key)
    return result


@app.get("/research/all")
async def research_all():
    """Run research for all active clients."""
    results = await run_weekly_research()
    return {"clients": results, "total": len(results)}


@app.get("/research/stats/{client_id}")
async def client_stats(client_id: str):
    """Get customer stats for a client."""
    stats = await get_customer_stats(client_id)
    return stats


# ═══════════════════════════════════════════════════════
# KARPATHY LOOP — Phase 5: Self-Improvement
# ═══════════════════════════════════════════════════════


@app.get("/karpathy/{client_id}")
async def karpathy_single(client_id: str):
    """Run Karpathy Loop for a single client."""
    result = await run_karpathy_loop(client_id)
    return result


@app.get("/karpathy")
async def karpathy_all():
    """Run Karpathy Loop for all active clients."""
    results = await run_karpathy_all()
    return {"clients": results, "total": len(results)}


@app.get("/karpathy/{client_id}/rules")
async def karpathy_rules(client_id: str):
    """Get current rule status for a client — probation, verified, reverted."""
    return await get_rule_status(client_id)


@app.get("/karpathy/{client_id}/metrics")
async def karpathy_metrics(client_id: str, days: int = 1):
    """Get performance snapshot for rule verification."""
    return await get_performance_snapshot(client_id, days)


# ═══════════════════════════════════════════════════════
# OWNER BRAIN — AI Chief of Staff
# ═══════════════════════════════════════════════════════


@app.get("/owner/brief/{client_id}")
async def owner_brief(client_id: str):
    """Generate morning brief for business owner."""
    brief = await generate_morning_brief(client_id)
    return {"client_id": client_id, "brief": brief}


@app.post("/owner/command/{client_id}")
async def owner_command(client_id: str, request: Request):
    """Process a natural language command from the owner."""
    body = await request.json()
    command = body.get("command", "")
    result = await process_owner_command(client_id, command)
    return {"client_id": client_id, "command": command, "result": result}


@app.post("/owner/send-brief/{client_id}")
async def owner_send_brief(client_id: str):
    """Generate and send morning brief to owner via WhatsApp."""
    brief = await generate_morning_brief(client_id)
    # Get owner phone and phone_number_id
    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/clients?id=eq.{client_id}&select=contact_phone",
            headers=_SUPA_HEADERS,
        )
        client_data = r.json()
    if client_data:
        owner_phone = client_data[0].get("contact_phone", "")
        if owner_phone:
            kapso_key = os.environ.get("KAPSO_PLATFORM_API_KEY", "")
            # Use the client's phone_number_id (would come from agent_deployments)
            try:
                async with httpx.AsyncClient(timeout=15) as http:
                    await http.post(
                        f"https://api.kapso.ai/meta/whatsapp/v24.0/1050764414786995/messages",
                        headers={"X-API-Key": kapso_key, "Content-Type": "application/json"},
                        json={"messaging_product": "whatsapp", "recipient_type": "individual", "to": owner_phone, "type": "text", "text": {"body": brief}},
                    )
            except:
                pass
    return {"client_id": client_id, "brief": brief, "sent": True}


# ═══════════════════════════════════════════════════════
# PROACTIVE ENGINE — Phase 6: Follow-ups & Re-engagement
# ═══════════════════════════════════════════════════════


@app.post("/proactive/process")
async def proactive_process():
    """Process all pending scheduled follow-ups. Run this periodically (e.g., every hour)."""
    results = await process_pending_actions()
    return results


@app.get("/proactive/churn/{client_id}")
async def proactive_churn(client_id: str):
    """Detect customers at risk of churning (no contact in 14+ days)."""
    at_risk = await detect_churn_risk(client_id)
    return {"client_id": client_id, "at_risk": at_risk, "total": len(at_risk)}


@app.get("/proactive/templates")
async def proactive_templates():
    """List all available message templates."""
    return {"templates": {k: {"category": v["category"], "language": v["language"], "body": v["body"]} for k, v in TEMPLATES.items()}}


@app.post("/proactive/schedule")
async def proactive_schedule(request: Request):
    """Manually schedule a follow-up for a customer."""
    body = await request.json()
    await schedule_followup(
        client_id=body.get("client_id", ""),
        customer_phone=body.get("customer_phone", ""),
        action_type=body.get("action_type", "custom"),
        template_name=body.get("template_name", ""),
        template_params=body.get("template_params", {}),
        delay_hours=body.get("delay_hours", 24),
        phone_number_id=body.get("phone_number_id", ""),
    )
    return {"scheduled": True}


# ═══════════════════════════════════════════════════════
# GUEST INTELLIGENCE — RFM Segmentation
# ═══════════════════════════════════════════════════════


@app.get("/owner/guests/{client_id}")
async def owner_guests(client_id: str):
    """Get full RFM guest intelligence for a client."""
    intel = await build_guest_intelligence(client_id)
    return intel


@app.get("/owner/guests/{client_id}/brief")
async def owner_guests_brief(client_id: str, lang: str = "en"):
    """Get WhatsApp-friendly guest intelligence summary."""
    brief = await get_guest_brief(client_id, lang)
    return {"client_id": client_id, "brief": brief}


# ═══════════════════════════════════════════════════════
# GOOGLE REVIEW AUTO-RESPONDER
# ═══════════════════════════════════════════════════════


@app.post("/owner/review/draft/{client_id}")
async def owner_review_draft(client_id: str, request: Request):
    """Draft a response to a Google/TripAdvisor review for owner approval.

    Body: {reviewer_name, rating, review_text, lang?}
    Returns: {review_id, drafted_reply, approval_message}
    """
    body = await request.json()
    result = await draft_review_response(
        client_id=client_id,
        reviewer_name=body.get("reviewer_name", "Guest"),
        rating=body.get("rating", 5),
        review_text=body.get("review_text", ""),
        lang=body.get("lang", "en"),
    )
    return result


@app.post("/owner/review/approve/{client_id}")
async def owner_review_approve(client_id: str, request: Request):
    """Process owner's approval/edit/skip of a drafted review response.

    Body: {response: "SEND" | "SKIP" | "EDIT your text here", review_id?}
    """
    body = await request.json()
    result = await process_review_approval(
        client_id=client_id,
        owner_response=body.get("response", ""),
        review_id=body.get("review_id", ""),
    )
    return result


# ═══════════════════════════════════════════════════════
# PROACTIVE RISK SURFACING
# ═══════════════════════════════════════════════════════


@app.get("/owner/risks/{client_id}")
async def owner_risks(client_id: str, lang: str = "en"):
    """Surface risks and missed opportunities for a client."""
    risks = await surface_risks(client_id, lang)
    return {"client_id": client_id, "risks": risks, "total": len(risks)}


@app.get("/owner/risks/{client_id}/brief")
async def owner_risks_brief(client_id: str, lang: str = "en"):
    """Get WhatsApp-friendly risk summary."""
    brief = await get_risk_brief(client_id, lang)
    return {"client_id": client_id, "brief": brief}


# ═══════════════════════════════════════════════════════
# SALES REP — Lead scoring, pipeline, follow-ups
# ═══════════════════════════════════════════════════════


@app.post("/sales/score/{client_id}")
async def sales_score(client_id: str, request: Request):
    """Score a lead based on conversation messages.

    Body: {customer_phone, messages: [{direction, content}]}
    """
    body = await request.json()
    result = await score_lead(client_id, body.get("customer_phone", ""), body.get("messages", []))
    return result


@app.post("/sales/pipeline/{client_id}")
async def sales_pipeline_update(client_id: str, request: Request):
    """Update a lead's pipeline stage.

    Body: {customer_phone, stage, deal_value?, deal_type?}
    """
    body = await request.json()
    result = await update_pipeline(
        client_id, body.get("customer_phone", ""),
        body.get("stage", "new"),
        deal_value=body.get("deal_value", 0),
        deal_type=body.get("deal_type", ""),
    )
    return result


@app.get("/sales/pipeline/{client_id}")
async def sales_pipeline(client_id: str):
    """Get pipeline summary — leads at each stage, total value."""
    return await get_pipeline_summary(client_id)


@app.get("/sales/hot-leads/{client_id}")
async def sales_hot_leads(client_id: str, min_score: int = 70):
    """Get hot leads (score >= threshold)."""
    leads = await get_hot_leads(client_id, min_score)
    return {"client_id": client_id, "hot_leads": leads, "total": len(leads)}


@app.post("/sales/followup/{client_id}")
async def sales_followup(client_id: str, request: Request):
    """Generate a follow-up message for a lead.

    Body: {customer_phone, lead_data?}
    """
    body = await request.json()
    msg = await generate_followup(client_id, body.get("customer_phone", ""), body.get("lead_data", {}))
    return {"client_id": client_id, "followup_message": msg}


@app.post("/sales/upsell/{client_id}")
async def sales_upsell(client_id: str, request: Request):
    """Suggest upsells based on booking/order context.

    Body: {booking_context: {...}, business_type?}
    """
    body = await request.json()
    suggestions = await suggest_upsells(client_id, body.get("booking_context", {}), body.get("business_type", "restaurant"))
    return {"client_id": client_id, "upsells": suggestions}


@app.get("/sales/win-loss/{client_id}")
async def sales_win_loss(client_id: str, days: int = 30):
    """Analyze win/loss patterns over the last N days."""
    return await analyze_win_loss(client_id, days)


@app.get("/sales/digest/{client_id}")
async def sales_digest(client_id: str):
    """Get WhatsApp-friendly sales digest."""
    digest = await get_sales_digest(client_id)
    return {"client_id": client_id, "digest": digest}


# ═══════════════════════════════════════════════════════
# CONTENT ENGINE — Social media content generation
# ═══════════════════════════════════════════════════════


@app.get("/content/calendar/{client_id}")
async def content_calendar(client_id: str, business_type: str = "restaurant", days: int = 7):
    """Generate a weekly content calendar."""
    calendar = await generate_content_calendar(client_id, business_type, days)
    return calendar


@app.post("/content/caption/{client_id}")
async def content_caption(client_id: str, request: Request):
    """Generate a social media caption.

    Body: {topic, style?, lang?, platform?}
    """
    body = await request.json()
    result = await generate_caption(
        client_id, body.get("topic", ""),
        style=body.get("style", "casual"),
        lang=body.get("lang", "en"),
        platform=body.get("platform", "instagram"),
    )
    return result


@app.get("/content/ideas/{client_id}")
async def content_ideas(client_id: str, business_type: str = "restaurant", count: int = 5):
    """Generate post ideas based on business type."""
    ideas = await generate_post_ideas(client_id, business_type, count)
    return {"client_id": client_id, "ideas": ideas}


@app.get("/content/hashtags")
async def content_hashtags(business_type: str = "restaurant", location: str = "Dubai", lang: str = "en"):
    """Get optimized hashtag strategy."""
    return await get_hashtag_strategy(business_type, location, lang)


@app.get("/content/brief/{client_id}")
async def content_brief_endpoint(client_id: str):
    """Get WhatsApp-friendly weekly content brief."""
    brief = await generate_content_brief(client_id)
    return {"client_id": client_id, "brief": brief}


@app.get("/content/trending")
async def content_trending(location: str = "UAE"):
    """Get trending topics and seasonal events."""
    topics = await get_trending_topics(location)
    return {"location": location, "topics": topics}


@app.post("/content/story/{client_id}")
async def content_story(client_id: str, request: Request):
    """Generate an Instagram Stories sequence concept.

    Body: {topic, slides?}
    """
    body = await request.json()
    slides = await generate_story_sequence(client_id, body.get("topic", ""), body.get("slides", 5))
    return {"client_id": client_id, "slides": slides}


# ═══════════════════════════════════════════════════════
# SALES REP v2 — Objection handling + Battlecards
# ═══════════════════════════════════════════════════════


@app.post("/sales/objection/{client_id}")
async def sales_objection(client_id: str, request: Request):
    """Detect and handle a sales objection. Body: {customer_phone, message, lang?}"""
    body = await request.json()
    return await handle_objection(client_id, body.get("customer_phone", ""), body.get("message", ""), body.get("lang", "en"))


@app.get("/sales/objection-stats/{client_id}")
async def sales_objection_stats(client_id: str, days: int = 30):
    """Objection pattern analysis."""
    return await get_objection_stats(client_id, days)


@app.get("/sales/battlecard/{competitor}")
async def sales_battlecard(competitor: str, lang: str = "en"):
    """Get competitive battlecard."""
    return await get_battlecard(competitor, lang)


@app.post("/sales/competitive-response/{client_id}")
async def sales_competitive(client_id: str, request: Request):
    """Generate a competitive response. Body: {competitor, objection_context, lang?}"""
    body = await request.json()
    resp = await generate_competitive_response(client_id, body.get("competitor", ""), body.get("objection_context", ""), body.get("lang", "en"))
    return {"response": resp}


# ═══════════════════════════════════════════════════════
# CONTENT ENGINE v2 — Repurposing + Video + Carousel
# ═══════════════════════════════════════════════════════


@app.post("/content/repurpose/{client_id}")
async def content_repurpose(client_id: str, request: Request):
    """Repurpose content for multiple platforms. Body: {original_content, original_platform?, target_platforms?}"""
    body = await request.json()
    return await repurpose_content(client_id, body.get("original_content", ""), body.get("original_platform", "instagram"), body.get("target_platforms"))


@app.post("/content/video-script/{client_id}")
async def content_video_script(client_id: str, request: Request):
    """Generate a video script. Body: {topic, style?, duration?, lang?}"""
    body = await request.json()
    return await generate_video_script(client_id, body.get("topic", ""), body.get("style", "reel"), body.get("duration", 30), body.get("lang", "en"))


@app.post("/content/carousel/{client_id}")
async def content_carousel(client_id: str, request: Request):
    """Generate a carousel using 6-slide narrative arc. Body: {topic, slides?, lang?}"""
    body = await request.json()
    return await generate_carousel(client_id, body.get("topic", ""), body.get("slides", 6), body.get("lang", "en"))


# ═══════════════════════════════════════════════════════
# LOYALTY ENGINE — Points, Tiers, Rewards
# ═══════════════════════════════════════════════════════


@app.get("/loyalty/member/{client_id}/{phone}")
async def loyalty_member(client_id: str, phone: str):
    """Get loyalty member profile."""
    return await get_loyalty_member(client_id, phone)


@app.post("/loyalty/points/{client_id}")
async def loyalty_add_points(client_id: str, request: Request):
    """Add points. Body: {customer_phone, points, reason}"""
    body = await request.json()
    return await add_points(client_id, body.get("customer_phone", ""), body.get("points", 0), body.get("reason", ""))


@app.post("/loyalty/redeem/{client_id}")
async def loyalty_redeem(client_id: str, request: Request):
    """Redeem a reward. Body: {customer_phone, reward_id}"""
    body = await request.json()
    return await redeem_reward(client_id, body.get("customer_phone", ""), body.get("reward_id", ""))


@app.get("/loyalty/rewards/{client_id}")
async def loyalty_rewards(client_id: str):
    """Get rewards catalog."""
    return await get_rewards_catalog(client_id)


@app.get("/loyalty/leaderboard/{client_id}")
async def loyalty_leaderboard(client_id: str, limit: int = 10):
    """Get top loyalty members."""
    return await get_leaderboard(client_id, limit)


@app.post("/loyalty/command/{client_id}")
async def loyalty_command(client_id: str, request: Request):
    """Process a loyalty command from WhatsApp. Body: {customer_phone, message, lang?}"""
    body = await request.json()
    result = await process_loyalty_command(client_id, body.get("customer_phone", ""), body.get("message", ""), body.get("lang", "en"))
    return {"response": result}


@app.get("/loyalty/birthdays/{client_id}")
async def loyalty_birthdays(client_id: str):
    """Check for upcoming birthday rewards."""
    return await check_birthday_rewards(client_id)


@app.post("/loyalty/referral/{client_id}")
async def loyalty_referral(client_id: str, request: Request):
    """Process a referral. Body: {referrer_phone, referred_phone}"""
    body = await request.json()
    return await process_referral(client_id, body.get("referrer_phone", ""), body.get("referred_phone", ""))


@app.get("/loyalty/brief/{client_id}")
async def loyalty_brief_endpoint(client_id: str, lang: str = "en"):
    """WhatsApp-friendly loyalty program summary."""
    brief = await get_loyalty_brief(client_id, lang)
    return {"client_id": client_id, "brief": brief}


# ═══════════════════════════════════════════════════════
# GOOGLE BUSINESS PROFILE — Reviews, SEO, Posts
# ═══════════════════════════════════════════════════════


@app.get("/gbp/reviews/{client_id}")
async def gbp_reviews(client_id: str, days: int = 7):
    """Fetch recent Google reviews."""
    reviews = await fetch_gbp_reviews(client_id, days=days)
    return {"client_id": client_id, "reviews": reviews, "total": len(reviews)}


@app.post("/gbp/respond/{client_id}")
async def gbp_respond(client_id: str, request: Request):
    """Auto-respond to Google reviews. Body: {reviews: [...], lang?}"""
    body = await request.json()
    results = await auto_respond_to_reviews(client_id, body.get("reviews", []), body.get("lang", "en"))
    return {"client_id": client_id, "responses": results}


@app.get("/gbp/audit/{client_id}")
async def gbp_audit(client_id: str):
    """Audit Google Business Profile completeness."""
    return await audit_profile(client_id)


@app.get("/gbp/description/{client_id}")
async def gbp_description(client_id: str, lang: str = "en"):
    """Generate SEO-optimized business description."""
    desc = await generate_profile_description(client_id, lang)
    return {"client_id": client_id, "description": desc}


@app.get("/gbp/posts/{client_id}")
async def gbp_posts(client_id: str, count: int = 3, lang: str = "en"):
    """Generate Google Business Profile posts."""
    posts = await generate_gbp_posts(client_id, count, lang)
    return {"client_id": client_id, "posts": posts}


@app.get("/gbp/faq/{client_id}")
async def gbp_faq(client_id: str):
    """Generate FAQ answers for Google Q&A."""
    return await generate_faq_answers(client_id)


@app.get("/gbp/seo-keywords/{client_id}")
async def gbp_seo_keywords(client_id: str, location: str = "Dubai"):
    """Get local SEO keywords."""
    return await get_local_seo_keywords(client_id, location)


@app.get("/gbp/seo-plan/{client_id}")
async def gbp_seo_plan(client_id: str, weeks: int = 4):
    """Generate SEO content plan."""
    return await generate_seo_content_plan(client_id, weeks)


@app.get("/gbp/insights/{client_id}")
async def gbp_insights(client_id: str):
    """Get GBP performance insights."""
    return await get_gbp_insights(client_id)


@app.get("/gbp/brief/{client_id}")
async def gbp_brief(client_id: str, lang: str = "en"):
    """WhatsApp-friendly GBP summary."""
    brief = await get_gbp_brief(client_id, lang)
    return {"client_id": client_id, "brief": brief}


@app.get("/gbp/detect/{client_id}")
async def gbp_detect(client_id: str, location: str = ""):
    """Auto-detect the business's Google Business Profile from name + location."""
    return await auto_detect_gbp(client_id, location=location)


@app.get("/gbp/auto-fix/{client_id}")
async def gbp_auto_fix(client_id: str, lang: str = "en"):
    """Auto-generate fixes for every failed profile check — descriptions, Q&A, categories, everything."""
    return await auto_fix_profile(client_id, lang)


@app.get("/gbp/photo-list/{client_id}")
async def gbp_photo_list(client_id: str, business_type: str = "restaurant", lang: str = "en"):
    """Generate a specific photo shot list with compositions, naming, and alt text."""
    return await generate_photo_shot_list(client_id, business_type, lang)


@app.get("/gbp/post-calendar/{client_id}")
async def gbp_post_calendar(client_id: str, weeks: int = 4, lang: str = "en"):
    """Generate a month of Google Business Profile posts."""
    return await generate_gbp_post_calendar(client_id, weeks, lang)


@app.get("/gbp/review-strategy/{client_id}")
async def gbp_review_strategy(client_id: str, lang: str = "en"):
    """Generate a review acquisition strategy with templates and targets."""
    return await generate_review_request_strategy(client_id, lang)


@app.get("/gbp/seo-checklist/{client_id}")
async def gbp_seo_checklist(client_id: str, lang: str = "en"):
    """Generate a comprehensive local SEO action plan."""
    return await generate_local_seo_checklist(client_id, lang)


@app.post("/gbp/setup-composio/{client_id}")
async def gbp_setup_composio(client_id: str, request: Request):
    """Set up Composio Google Business connection. Body: {composio_connection_id?}"""
    body = await request.json()
    return await setup_composio_google(client_id, body.get("composio_connection_id", ""))


# ═══════════════════════════════════════════════════════
# MARKETING PSYCHOLOGY + ADVANCED SALES
# ═══════════════════════════════════════════════════════


@app.post("/sales/psychology/{client_id}")
async def sales_psychology(client_id: str, request: Request):
    """Apply psychological tactic to conversation. Body: {customer_phone, conversation_context, lang?}"""
    body = await request.json()
    return await apply_psychology_tactic(client_id, body.get("customer_phone", ""), body.get("conversation_context", ""), body.get("lang", "en"))


@app.post("/sales/followup-angle/{client_id}")
async def sales_followup_angle(client_id: str, request: Request):
    """Follow-up with angle rotation. Body: {customer_phone, touch_number, lead_data?, lang?}"""
    body = await request.json()
    return await get_follow_up_with_angle(client_id, body.get("customer_phone", ""), body.get("touch_number", 1), body.get("lead_data", {}), body.get("lang", "en"))


@app.post("/sales/score-advanced/{client_id}")
async def sales_score_advanced(client_id: str, request: Request):
    """Advanced lead scoring. Body: {customer_phone, messages, fit_data?}"""
    body = await request.json()
    return await score_lead_advanced(client_id, body.get("customer_phone", ""), body.get("messages", []), body.get("fit_data"))


@app.get("/sales/speed-alerts/{client_id}")
async def sales_speed_alerts(client_id: str):
    """Speed-to-lead alerts — leads not contacted within 5 minutes."""
    return await get_speed_to_lead_alert(client_id)


# ═══════════════════════════════════════════════════════
# ENHANCED CONTENT ENGINE
# ═══════════════════════════════════════════════════════


@app.get("/content/pillar-calendar/{client_id}")
async def content_pillar_calendar(client_id: str, business_type: str = "restaurant", days: int = 7, lang: str = "en"):
    """Content calendar using pillar system with weighted distribution."""
    return await generate_pillar_based_calendar(client_id, business_type, days, lang)


@app.post("/content/hook/{client_id}")
async def content_hook(client_id: str, request: Request):
    """Generate a hook using formula library. Body: {topic, hook_type?, business_type?, lang?}"""
    body = await request.json()
    return await generate_hook(client_id, body.get("topic", ""), body.get("hook_type", "auto"), body.get("business_type", "restaurant"), body.get("lang", "en"))


@app.post("/content/caption-psychology/{client_id}")
async def content_caption_psych(client_id: str, request: Request):
    """Caption with psychology tactic. Body: {topic, psychology_tactic?, lang?, platform?}"""
    body = await request.json()
    return await generate_caption_with_psychology(client_id, body.get("topic", ""), body.get("psychology_tactic", "auto"), body.get("lang", "en"), body.get("platform", "instagram"))


@app.post("/content/repurpose-plan/{client_id}")
async def content_repurpose_plan(client_id: str, request: Request):
    """Detailed repurpose plan for 7 platforms. Body: {original_content, original_platform?}"""
    body = await request.json()
    return await generate_content_repurpose_plan(client_id, body.get("original_content", ""), body.get("original_platform", "instagram"))


# ═══════════════════════════════════════════════════════
# IMAGE PROMPT GENERATOR
# ═══════════════════════════════════════════════════════


@app.post("/content/image-prompt/{client_id}")
async def content_image_prompt(client_id: str, request: Request):
    """Generate a professional AI image prompt. Body: {subject, template_type?, platform?, style_notes?, lang?}"""
    body = await request.json()
    return await generate_image_prompt(
        client_id, body.get("subject", ""), body.get("template_type", "auto"),
        body.get("platform", "general"), body.get("style_notes", ""), body.get("lang", "en"),
    )


@app.get("/content/image-batch/{client_id}")
async def content_image_batch(client_id: str, business_type: str = "restaurant", platform: str = "general", count: int = 5, lang: str = "en"):
    """Generate a batch of image prompts covering all key visual needs."""
    return await generate_image_prompt_batch(client_id, count, business_type, platform, lang)


@app.post("/content/image-enhance/{client_id}")
async def content_image_enhance(client_id: str, request: Request):
    """Enhance a simple photo description into a pro prompt. Body: {description, platform?, lang?}"""
    body = await request.json()
    return await enhance_photo_description(client_id, body.get("description", ""), body.get("platform", "general"), body.get("lang", "en"))


# ═══════════════════════════════════════════════════════
# ENHANCED LOYALTY
# ═══════════════════════════════════════════════════════


@app.get("/loyalty/health/{client_id}/{phone}")
async def loyalty_health(client_id: str, phone: str):
    """Customer health score (0-100 weighted model)."""
    return await calculate_health_score(client_id, phone)


@app.get("/loyalty/reengagement/{client_id}/{phone}")
async def loyalty_reengagement(client_id: str, phone: str, lang: str = "en"):
    """4-touch WhatsApp re-engagement sequence."""
    seq = await generate_reengagement_sequence(client_id, phone, lang)
    return {"customer_phone": phone, "sequence": seq}


@app.get("/loyalty/progress/{client_id}/{phone}")
async def loyalty_progress(client_id: str, phone: str, lang: str = "en"):
    """Goal-gradient progress message."""
    msg = await generate_progress_message(client_id, phone, lang)
    return {"customer_phone": phone, "message": msg}


# ═══════════════════════════════════════════════════════
# ENHANCED KARPATHY LOOP
# ═══════════════════════════════════════════════════════


@app.get("/karpathy/{client_id}/insights")
async def karpathy_insights(client_id: str, days: int = 7):
    """Extract customer insights (JTBD, pain points, triggers, language)."""
    return await extract_customer_insights(client_id, days)


@app.get("/karpathy/{client_id}/insight-brief")
async def karpathy_insight_brief(client_id: str, lang: str = "en"):
    """WhatsApp-friendly insight summary."""
    brief = await get_insight_brief(client_id, lang)
    return {"client_id": client_id, "brief": brief}


# ═══════════════════════════════════════════════════════
# ENHANCED GOOGLE BUSINESS
# ═══════════════════════════════════════════════════════


@app.get("/gbp/ai-content/{client_id}")
async def gbp_ai_content(client_id: str, content_type: str = "description", lang: str = "en"):
    """AI-search-optimized content (for ChatGPT, Perplexity, Google AI Overviews)."""
    return await generate_ai_optimized_content(client_id, content_type, lang)


@app.post("/gbp/review-7sweeps/{client_id}")
async def gbp_review_7sweeps(client_id: str, request: Request):
    """Review response using 7 Sweeps framework. Body: {reviewer_name, rating, review_text, lang?}"""
    body = await request.json()
    return await generate_review_response_7sweeps(client_id, body.get("reviewer_name", ""), body.get("rating", 5), body.get("review_text", ""), body.get("lang", "en"))


@app.get("/gbp/schema/{client_id}")
async def gbp_schema(client_id: str):
    """Generate JSON-LD schema markup for the business website."""
    return await generate_schema_markup(client_id)


@app.get("/gbp/citations/{client_id}")
async def gbp_citations(client_id: str, country: str = "UAE"):
    """Citation building plan with priority-ordered directories."""
    return await generate_citation_plan(client_id, country)


# ═══════════════════════════════════════════════════════
# GAMIFIED ACHIEVEMENTS
# ═══════════════════════════════════════════════════════


@app.get("/loyalty/achievements/config/{client_id}")
async def loyalty_achievement_config(client_id: str):
    """Get achievement configuration (enabled/disabled toggles)."""
    return await get_achievement_config(client_id)


@app.post("/loyalty/achievements/toggle/{client_id}")
async def loyalty_achievement_toggle(client_id: str, request: Request):
    """Toggle an achievement on/off. Body: {achievement_id, enabled}"""
    body = await request.json()
    return await update_achievement_config(client_id, body.get("achievement_id", ""), body.get("enabled", True))


@app.post("/loyalty/achievements/check/{client_id}")
async def loyalty_achievement_check(client_id: str, request: Request):
    """Check for new achievements. Body: {customer_phone, trigger_event, event_data?}"""
    body = await request.json()
    earned = await check_achievements(client_id, body.get("customer_phone", ""), body.get("trigger_event", ""), body.get("event_data", {}))
    return {"earned": earned, "count": len(earned)}


@app.get("/loyalty/achievements/{client_id}/{phone}")
async def loyalty_customer_achievements(client_id: str, phone: str):
    """Get all achievements earned by a customer."""
    achievements = await get_customer_achievements(client_id, phone)
    return {"customer_phone": phone, "achievements": achievements}


# ═══════════════════════════════════════════════════════
# INTENT CLASSIFICATION + MESSAGE ANALYSIS
# ═══════════════════════════════════════════════════════


@app.post("/sales/classify/{client_id}")
async def sales_classify(client_id: str, request: Request):
    """Classify a WhatsApp message intent. Body: {customer_phone, message}"""
    body = await request.json()
    return await classify_message_intent(client_id, body.get("customer_phone", ""), body.get("message", ""))


@app.get("/sales/patterns/{client_id}")
async def sales_patterns(client_id: str, days: int = 30):
    """N-gram analysis on WhatsApp messages — find patterns, gaps, opportunities."""
    return await analyze_message_patterns(client_id, days)


@app.get("/sales/intent-dashboard/{client_id}")
async def sales_intent_dashboard(client_id: str, days: int = 7):
    """Intent distribution dashboard."""
    return await get_intent_dashboard(client_id, days)


# ═══════════════════════════════════════════════════════
# CONTENT LEARNINGS — Self-Improving Intelligence
# ═══════════════════════════════════════════════════════


@app.get("/karpathy/{client_id}/learnings")
async def karpathy_learnings(client_id: str):
    """Get content learnings (best hooks, times, styles, patterns)."""
    return await get_content_learnings(client_id)


@app.get("/karpathy/{client_id}/conversation-patterns")
async def karpathy_conversation_patterns(client_id: str, days: int = 7):
    """Analyze conversation patterns (peak hours, questions, drop-offs, conversions)."""
    return await analyze_conversation_patterns(client_id, days)


@app.get("/karpathy/{client_id}/learning-report")
async def karpathy_learning_report(client_id: str, lang: str = "en"):
    """WhatsApp-friendly report of what the AI learned."""
    report = await generate_learning_report(client_id, lang)
    return {"client_id": client_id, "report": report}


@app.post("/karpathy/{client_id}/apply-learnings")
async def karpathy_apply_learnings(client_id: str):
    """Apply content learnings to improve the AI prompt."""
    return await apply_learnings_to_prompt(client_id)


# ═══════════════════════════════════════════════════════
# CONVERSION TRACKING — Meta CAPI + Analytics
# ═══════════════════════════════════════════════════════


@app.post("/tracking/event/{client_id}")
async def tracking_event(client_id: str, request: Request):
    """Track a conversion event. Body: {customer_phone, event_name, event_data?, source?}"""
    body = await request.json()
    return await track_event(client_id, body.get("customer_phone", ""), body.get("event_name", ""), body.get("event_data", {}), body.get("source", "whatsapp"))


@app.get("/tracking/funnel/{client_id}")
async def tracking_funnel(client_id: str, days: int = 7):
    """Get conversion funnel with rates."""
    return await get_conversion_funnel(client_id, days)


@app.get("/tracking/timeline/{client_id}/{phone}")
async def tracking_timeline(client_id: str, phone: str):
    """Full event timeline for a customer."""
    timeline = await get_event_timeline(client_id, phone)
    return {"customer_phone": phone, "events": timeline}


@app.get("/tracking/dashboard/{client_id}")
async def tracking_dashboard(client_id: str, days: int = 7):
    """Comprehensive analytics dashboard."""
    return await get_analytics_dashboard(client_id, days)


@app.get("/tracking/brief/{client_id}")
async def tracking_brief(client_id: str, lang: str = "en"):
    """WhatsApp-friendly analytics summary."""
    brief = await get_analytics_brief(client_id, lang)
    return {"client_id": client_id, "brief": brief}


# ═══════════════════════════════════════════════════════
# BILLING & SUBSCRIPTIONS
# ═══════════════════════════════════════════════════════


@app.get("/billing/plans")
async def billing_plans():
    """List all available plans with pricing."""
    return {"plans": PLANS}


@app.get("/billing/subscription/{client_id}")
async def billing_subscription(client_id: str):
    """Get current subscription status."""
    return await get_subscription(client_id)


@app.get("/billing/access/{client_id}")
async def billing_access(client_id: str, feature: str = ""):
    """Check if client has access to platform/feature."""
    return await check_access(client_id, feature)


@app.get("/billing/limits/{client_id}")
async def billing_limits(client_id: str):
    """Check usage vs plan limits."""
    return await check_limits(client_id)


@app.post("/billing/checkout/{client_id}")
async def billing_checkout(client_id: str, request: Request):
    """Create a Tap Payments checkout link. Body: {plan, currency?, include_setup?}"""
    body = await request.json()
    return await create_tap_checkout(
        client_id, body.get("plan", "starter"),
        body.get("currency", "AED"), body.get("include_setup", True),
    )


@app.post("/billing/webhook/tap")
async def billing_tap_webhook(request: Request):
    """Tap Payments webhook — processes payment confirmations."""
    payload = await request.json()
    return await handle_tap_webhook(payload)


@app.post("/billing/cancel/{client_id}")
async def billing_cancel(client_id: str, request: Request):
    """Cancel subscription. Body: {reason?}"""
    body = await request.json()
    return await cancel_subscription(client_id, body.get("reason", ""))


@app.get("/billing/trial/{client_id}")
async def billing_trial(client_id: str):
    """Check trial status."""
    return await check_trial_status(client_id)


@app.get("/billing/trial-summary/{client_id}")
async def billing_trial_summary(client_id: str, lang: str = "en"):
    """Generate trial performance summary ('look what you'd lose')."""
    summary = await generate_trial_summary(client_id, lang)
    return {"client_id": client_id, "summary": summary}


@app.post("/billing/reminders")
async def billing_reminders():
    """Run trial reminder check for all clients (call daily via cron)."""
    results = await send_trial_reminders()
    return {"reminders_sent": len(results), "results": results}


@app.post("/billing/command/{client_id}")
async def billing_command(client_id: str, request: Request):
    """Process billing command from WhatsApp. Body: {command, lang?}"""
    body = await request.json()
    result = await process_billing_command(client_id, body.get("command", ""), body.get("lang", "en"))
    return {"result": result}


# ═══════════════════════════════════════════════════════
# PROVISIONING — WhatsApp number setup after payment
# ═══════════════════════════════════════════════════════


@app.post("/provisioning/start/{client_id}")
async def provisioning_start(client_id: str, request: Request):
    """Start provisioning after payment. Body: {owner_phone, lang?}"""
    body = await request.json()
    msg = await start_provisioning(client_id, body.get("owner_phone", ""), body.get("lang", "ar"))
    return {"client_id": client_id, "message": msg}


@app.post("/provisioning/respond/{client_id}")
async def provisioning_respond(client_id: str, request: Request):
    """Process owner's provisioning response (1 or 2). Body: {message}"""
    body = await request.json()
    msg = await process_provisioning_response(client_id, body.get("message", ""))
    return {"client_id": client_id, "message": msg}


@app.get("/provisioning/status/{client_id}")
async def provisioning_status(client_id: str):
    """Check provisioning status."""
    return await get_provisioning_status(client_id)


@app.get("/webhook/provisioning-complete")
async def webhook_provisioning_complete(client_id: str = "", phone_number_id: str = "", display_number: str = ""):
    """Kapso redirect callback when WhatsApp number is connected."""
    result = await handle_provisioning_complete(client_id, phone_number_id, display_number)
    return result


# ═══════════════════════════════════════════════════════
# CHAT WIDGET — Embeddable AI chat for client websites
# ═══════════════════════════════════════════════════════


@app.post("/chat/message")
async def chat_message(request: Request):
    """Handle a message from the chat widget — runs the FULL WhatsApp pipeline.

    Uses the same prompt builder, MiniMax call, booking system, memory (Mem0),
    gender detection, and Karpathy learned rules as the WhatsApp pipeline.
    The only difference: returns the reply in the HTTP response instead of
    sending via Kapso.

    Body: {client_id, session_id, message, metadata?}
    Returns: {reply, persona_name, session_id, timestamp}
    """
    body = await request.json()
    client_id = body.get("client_id", "")
    session_id = body.get("session_id", "")
    message = body.get("message", "")

    if not session_id:
        import uuid
        session_id = f"widget_{uuid.uuid4().hex[:16]}"

    # Use session_id as the "phone" identifier for the widget.
    # Prefix with "widget_" to distinguish from real phone numbers.
    phone = f"widget_{session_id}" if not session_id.startswith("widget_") else session_id

    # Run the full pipeline (same as WhatsApp) but return the reply
    result = await _widget_pipeline(
        text=message,
        phone=phone,
        contact_name="Website Visitor",
        client_id=client_id,
    )

    return {
        "reply": result["reply"],
        "persona_name": result.get("persona_name", "Assistant"),
        "session_id": session_id,
        "timestamp": _dt.now().isoformat(),
    }


@app.get("/chat/config/{client_id}")
async def chat_config(client_id: str):
    """Get widget configuration for a client (persona, greeting, colors)."""
    return await get_widget_config(client_id)


@app.get("/chat/history/{client_id}/{session_id}")
async def chat_history(client_id: str, session_id: str, limit: int = 50):
    """Get chat history for a widget session."""
    messages = await get_widget_history(client_id, session_id, limit)
    return {"messages": messages}


@app.get("/chat/channels/{client_id}")
async def chat_channels(client_id: str, days: int = 7):
    """Get message stats broken down by channel."""
    return await get_channel_stats(client_id, days)


# ═══════════════════════════════════════════════════════
# PROACTIVE: Template Submission to Meta
# ═══════════════════════════════════════════════════════


@app.post("/proactive/submit-templates/{phone_number_id}")
async def proactive_submit_templates(phone_number_id: str):
    """Submit all default templates to Meta for approval."""
    results = await submit_all_default_templates(phone_number_id)
    return {"submitted": len(results), "results": results}


@app.get("/proactive/template-status/{template_name}")
async def proactive_template_status(template_name: str, phone_number_id: str = ""):
    """Check the approval status of a submitted template."""
    result = await get_template_status(template_name, phone_number_id)
    return result


# ═══════════════════════════════════════════════════════
# INSTAGRAM DM WEBHOOK
# ═══════════════════════════════════════════════════════


@app.post("/webhook/instagram")
async def webhook_instagram(request: Request):
    """Instagram DM webhook."""
    payload = await request.json()
    result = await handle_instagram_webhook(payload)
    return {"ok": True}


@app.get("/webhook/instagram")
async def webhook_instagram_verify(request: Request):
    """Instagram webhook verification (Meta sends GET to verify)."""
    mode = request.query_params.get("hub.mode", "")
    token = request.query_params.get("hub.verify_token", "")
    challenge = request.query_params.get("hub.challenge", "")
    if mode == "subscribe" and token == os.environ.get("META_VERIFY_TOKEN", "kapso_verify"):
        return int(challenge)
    return {"error": "verification failed"}


@app.post("/instagram/setup")
async def instagram_setup(request: Request):
    """Configure Instagram DM for a client."""
    body = await request.json()
    result = await setup_instagram_for_client(
        client_id=body.get("client_id", ""),
        page_id=body.get("page_id", ""),
        access_token=body.get("access_token", ""),
    )
    return result


# ═══════════════════════════════════════════════════════
# TELEGRAM BOT ENDPOINTS
# ═══════════════════════════════════════════════════════

@app.post("/webhook/telegram")
async def webhook_telegram(request: Request):
    """Telegram bot webhook — receives updates from Telegram."""
    update = await request.json()
    result = await handle_telegram_update(update)
    return {"ok": True}


@app.post("/telegram/setup/{client_id}")
async def telegram_setup(client_id: str, request: Request):
    """Register a Telegram bot for a client. Body: {bot_token}"""
    body = await request.json()
    result = await register_telegram_bot(client_id, body.get("bot_token", ""))
    return result


@app.get("/telegram/instructions")
async def telegram_instructions():
    """Return instructions for creating a Telegram bot via BotFather."""
    return await create_telegram_bot_for_client("")


# ═══════════════════════════════════════════════════════
# VOICE NOTE ENDPOINTS
# ═══════════════════════════════════════════════════════

@app.post("/voice/transcribe")
async def voice_transcribe(request: Request):
    """Transcribe an uploaded audio file. Multipart form with 'file' field."""
    from voice import transcribe_audio
    form = await request.form()
    file = form.get("file")
    if not file:
        return {"error": "no file field in form data"}
    audio_bytes = await file.read()
    language = form.get("language", "")
    transcript = await transcribe_audio(audio_bytes, language)
    if not transcript:
        return {"error": "transcription_failed", "transcript": ""}
    return {"transcript": transcript}


@app.get("/voice/voices")
async def voice_list():
    """List available TTS voices."""
    from voice import VOICE_MAP
    return {"voices": VOICE_MAP}


# ═══════════════════════════════════════════════════════
# MARKET INTELLIGENCE — Social listening via last30days
# ═══════════════════════════════════════════════════════

from market_intel import (
    research_topic, get_market_brief, get_trending_content_ideas,
    research_prospect, monitor_competitors, get_karpathy_signals,
)

@app.get("/intel/brief/{client_id}")
async def intel_brief(client_id: str, lang: str = "en"):
    brief = await get_market_brief(client_id, lang)
    return {"client_id": client_id, "brief": brief}

@app.get("/intel/trending")
async def intel_trending(business_type: str = "restaurant", location: str = "Dubai"):
    ideas = await get_trending_content_ideas(business_type, location)
    return {"ideas": ideas}

@app.post("/intel/research")
async def intel_research(request: Request):
    body = await request.json()
    result = await research_topic(body.get("topic", ""), body.get("quick", True))
    return result

@app.post("/intel/prospect")
async def intel_prospect(request: Request):
    body = await request.json()
    return await research_prospect(body.get("name", ""), body.get("location", ""))

@app.post("/intel/competitors")
async def intel_competitors(request: Request):
    body = await request.json()
    return await monitor_competitors(body.get("competitors", []))

@app.get("/intel/karpathy-signals/{client_id}")
async def intel_karpathy(client_id: str):
    return await get_karpathy_signals(client_id)



# ── CEO Persona (Rami Mansour) ────────────────────────

@app.post("/ceo/brief/{date}")
async def ceo_brief(date: str = None):
    return await generate_company_brief(date)

@app.post("/ceo/draft")
async def ceo_create_draft(request: Request):
    body = await request.json()
    return await create_draft(
        channel=body.get("channel", "x"),
        content=body["content"],
        reasoning=body.get("reasoning", "Manual draft"),
        trigger_source=body.get("trigger_source", "manual"),
    )

@app.get("/ceo/drafts")
async def ceo_list_drafts():
    return await get_pending_drafts()

@app.post("/ceo/approve/{draft_id}")
async def ceo_approve(draft_id: str):
    return await approve_draft(draft_id)

@app.post("/ceo/reject/{draft_id}")
async def ceo_reject(draft_id: str, request: Request):
    body = await request.json()
    result = await reject_draft(draft_id, feedback=body.get("feedback", ""))
    pushback = await generate_pushback(draft_id)
    return {**result, "pushback": pushback}

@app.get("/ceo/activity")
async def ceo_activity(source: str = None, limit: int = 50):
    from ceo_persona import _supabase_query
    params = f"select=*&order=created_at.desc&limit={limit}"
    if source:
        params += f"&source=eq.{source}"
    return await _supabase_query("ceo_activity_log", params)

@app.get("/ceo/agent-status")
async def ceo_agents():
    return await get_agent_status()

@app.post("/ceo/command")
async def ceo_command(request: Request):
    body = await request.json()
    response = await process_founder_message(body["message"])
    return {"response": response}

@app.post("/webhook/ceo")
async def webhook_ceo(request: Request, background_tasks: BackgroundTasks):
    body = await request.json()
    messages = body.get("entry", [{}])[0].get("changes", [{}])[0].get("value", {}).get("messages", [])
    if not messages:
        return {"status": "no_message"}
    msg = messages[0]
    text = msg.get("text", {}).get("body", "")
    if not text:
        return {"status": "no_text"}
    background_tasks.add_task(process_founder_message, text)
    return {"status": "processing"}

@app.post("/ceo/cron/morning-brief")
async def ceo_cron_brief():
    return await cron_morning_brief()

@app.post("/ceo/cron/post-karpathy")
async def ceo_cron_karpathy():
    return await cron_post_karpathy()

@app.post("/ceo/cron/github-digest")
async def ceo_cron_github():
    return await cron_github_digest()

@app.post("/ceo/cron/market-intel")
async def ceo_cron_intel():
    return await cron_market_intel()

@app.get("/health")
def health():
    return {"status": "ok", "composio": bool(COMPOSIO_API_KEY)}


# ═══════════════════════════════════════════════════════
# QUALITY EVALUATION — DeepEval-powered AI response scoring
# ═══════════════════════════════════════════════════════

from quality_eval import (
    evaluate_conversation as _quality_evaluate_conversation,
    run_daily_evaluation, get_quality_dashboard, get_quality_brief,
)


@app.get("/quality/evaluate/{client_id}")
async def quality_evaluate(client_id: str, days: int = 1):
    """Run quality evaluation on conversations from the last N days."""
    return await run_daily_evaluation(client_id, days)


@app.get("/quality/dashboard/{client_id}")
async def quality_dashboard(client_id: str, days: int = 7):
    """Quality metrics dashboard with trends over time."""
    return await get_quality_dashboard(client_id, days)


@app.get("/quality/brief/{client_id}")
async def quality_brief(client_id: str, lang: str = "en"):
    """WhatsApp-friendly quality summary for the Owner Brain."""
    brief = await get_quality_brief(client_id, lang)
    return {"client_id": client_id, "brief": brief}


# ═══════════════════════════════════════════════════════
# SOCIAL POSTER ENDPOINTS
# ═══════════════════════════════════════════════════════

@app.post("/social/schedule")
async def social_schedule_post(request: Request):
    """Schedule a social media post. Body: {client_id, platform, content, media_url?, scheduled_at?, metadata?}"""
    from social_poster import schedule_post
    body = await request.json()
    result = await schedule_post(
        client_id=body.get("client_id", ""),
        platform=body.get("platform", "instagram"),
        content=body.get("content", ""),
        media_url=body.get("media_url"),
        scheduled_at=body.get("scheduled_at"),
        metadata=body.get("metadata"),
    )
    return result


@app.post("/social/schedule-batch")
async def social_schedule_batch(request: Request):
    """Schedule multiple social media posts. Body: {client_id, posts: [{platform, content, ...}]}"""
    from social_poster import schedule_batch
    body = await request.json()
    result = await schedule_batch(
        client_id=body.get("client_id", ""),
        posts=body.get("posts", []),
    )
    return result


@app.get("/social/scheduled/{client_id}")
async def social_get_scheduled(client_id: str, days: int = 7):
    """Get scheduled posts for a client. Query: ?days=7"""
    from social_poster import get_scheduled_posts
    return await get_scheduled_posts(client_id, days)


@app.post("/social/auto-post/{client_id}")
async def social_auto_post(client_id: str):
    """Auto-generate content calendar and schedule all posts for a client."""
    from social_poster import auto_post_from_calendar
    return await auto_post_from_calendar(client_id)


@app.post("/social/publish-pending")
async def social_publish_pending():
    """Publish all scheduled posts that are due now (cron-friendly endpoint)."""
    from social_poster import publish_pending_posts
    return await publish_pending_posts()


@app.post("/social/haraj")
async def social_haraj(request: Request):
    """Prepare a Haraj listing for manual posting. Body: {client_id, title, description, price, ...}"""
    from social_poster import prepare_haraj_listing
    body = await request.json()
    return await prepare_haraj_listing(
        client_id=body.get("client_id", ""),
        title=body.get("title", ""),
        description=body.get("description", ""),
        price=body.get("price", 0),
        category=body.get("category", "other"),
        city=body.get("city", "Riyadh"),
        images=body.get("images"),
    )


# ═══════════════════════════════════════════════════════
# VIDEO MAKER ENDPOINTS (short-video-maker)
# ═══════════════════════════════════════════════════════

@app.post("/video/create")
async def video_create(request: Request):
    """Create a short video from a script. Body: {client_id, script, style?, lang?, music_mood?}"""
    from video_maker import create_short_video
    body = await request.json()
    return await create_short_video(
        client_id=body.get("client_id", ""),
        script=body.get("script", ""),
        style=body.get("style", "product"),
        lang=body.get("lang", "en"),
        music_mood=body.get("music_mood", "upbeat"),
    )


@app.post("/video/product")
async def video_product(request: Request):
    """Create a product showcase video. Body: {client_id, product_name, description, price?, lang?}"""
    from video_maker import create_product_video
    body = await request.json()
    return await create_product_video(
        client_id=body.get("client_id", ""),
        product_name=body.get("product_name", ""),
        description=body.get("description", ""),
        price=body.get("price"),
        lang=body.get("lang", "en"),
    )


@app.post("/video/batch")
async def video_batch(request: Request):
    """Create multiple videos. Body: {client_id, scripts: [{script, style?, lang?}]}"""
    from video_maker import create_batch_videos
    body = await request.json()
    return await create_batch_videos(
        client_id=body.get("client_id", ""),
        scripts=body.get("scripts", []),
    )


@app.get("/video/music")
async def video_music():
    """Get available background music moods."""
    from video_maker import get_available_music
    return await get_available_music()


@app.get("/video/status/{render_id}")
async def video_status(render_id: str):
    """Check render status for a specific video job."""
    from video_maker import get_render_status
    return await get_render_status(render_id)


# ═══════════════════════════════════════════════════════
# AI VIDEO ENDPOINTS (OpenShorts — UGC + Product Showcase)
# ═══════════════════════════════════════════════════════

@app.post("/ai-video/ugc")
async def ai_video_ugc(request: Request):
    """Generate a UGC-style video with AI actor. Body: {client_id, product_description, target_platform?, lang?, actor_style?}"""
    from ai_video import generate_ugc_video
    body = await request.json()
    return await generate_ugc_video(
        client_id=body.get("client_id", ""),
        product_description=body.get("product_description", ""),
        target_platform=body.get("target_platform", "tiktok"),
        lang=body.get("lang", "en"),
        actor_style=body.get("actor_style", "casual"),
        voice_id=body.get("voice_id"),
    )


@app.post("/ai-video/showcase")
async def ai_video_showcase(request: Request):
    """Generate a product showcase video. Body: {client_id, product_name, features, lang?, target_platform?}"""
    from ai_video import generate_product_showcase
    body = await request.json()
    return await generate_product_showcase(
        client_id=body.get("client_id", ""),
        product_name=body.get("product_name", ""),
        features=body.get("features", []),
        lang=body.get("lang", "en"),
        include_price=body.get("price"),
        target_platform=body.get("target_platform", "tiktok"),
    )


@app.get("/ai-video/status/{job_id}")
async def ai_video_status(job_id: str):
    """Check status of a UGC/showcase video generation job."""
    from ai_video import get_ugc_job_status
    return await get_ugc_job_status(job_id)


@app.get("/ai-video/services")
async def ai_video_services():
    """Get status of all video generation services."""
    from ai_video import get_service_status
    return await get_service_status()


@app.get("/ai-video/voices")
async def ai_video_voices():
    """Get available TTS voices for AI video generation."""
    from ai_video import get_available_voices
    return await get_available_voices()


@app.post("/ai-video/actors")
async def ai_video_actors(request: Request):
    """Generate AI actor options. Body: {actor_description, product_description?, num_options?}"""
    from ai_video import get_actor_options
    body = await request.json()
    return await get_actor_options(
        actor_description=body.get("actor_description", "casual young person"),
        product_description=body.get("product_description"),
        num_options=body.get("num_options", 3),
    )


# ── Invoice Ninja Integration ─────────────────────────────────────────

@app.post("/invoice/create")
async def invoice_create(request: Request):
    """Create invoice and optionally send PDF via WhatsApp.
    Body: {customer_name, customer_phone, items: [{description, quantity, cost}], currency?, phone_number_id?}
    """
    from invoicing import create_and_send_invoice
    body = await request.json()
    return await create_and_send_invoice(
        body.get("customer_name", ""),
        body.get("customer_phone", ""),
        body.get("items", []),
        body.get("currency", "AED"),
        body.get("phone_number_id", ""),
    )


@app.get("/invoice/outstanding")
async def invoice_outstanding(phone: str = ""):
    """Get outstanding invoices, optionally filtered by client phone."""
    from invoicing import get_outstanding_invoices
    invoices = await get_outstanding_invoices(phone)
    return {"invoices": invoices, "total": len(invoices)}
