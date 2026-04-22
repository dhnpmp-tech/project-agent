#!/usr/bin/env python3
"""Multi-Channel Adapter — One brain, every channel.

Routes messages from any channel through the same AI pipeline.
Each channel is just a different transport — the brain, memory,
persona, and rules are identical regardless of how the customer
reaches the business.

Supported channels:
- whatsapp: via Kapso API
- widget: via WebSocket/REST (our embedded chat widget)
- telegram: via Telegram Bot API
- instagram: via Instagram Graph API (future)
- sms: via Twilio/similar (future)
"""

import os
import re
import json
import uuid
import asyncio
import logging
import httpx
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from typing import Optional

_logger = logging.getLogger("channels")

# ═══════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Ynpxa3RpcGltYm11anRvd296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwOTY5NCwiZXhwIjoyMDkwMDg1Njk0fQ.-DoNS5fZv3aUsFcugKg23yh9RqXXFIlgc5_9Hrk97bg",
)
_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

_MINIMAX_API_KEY = os.environ.get("MINIMAX_API_KEY", "")
_KAPSO_PLATFORM_API_KEY = os.environ.get(
    "KAPSO_PLATFORM_API_KEY",
    "f84bab4ef9feb3a1571f527d37a677beb15ff7bff21be35a1a232a8939445eda",
)
_MEM0_API_KEY = os.environ.get("MEM0_API_KEY", "brain-mem0-admin-key-2026")
_MEM0_URL = os.environ.get("MEM0_URL", "http://172.17.0.1:8888")
_TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")

# ═══════════════════════════════════════════════════════
# CHANNEL REGISTRY
# ═══════════════════════════════════════════════════════

CHANNELS = {
    "whatsapp": {
        "name": "WhatsApp",
        "inbound": "webhook",
        "outbound": "kapso_api",
        "supports": ["text", "image", "audio", "location", "buttons", "list"],
    },
    "widget": {
        "name": "Website Chat",
        "inbound": "api",
        "outbound": "api",
        "supports": ["text", "image", "buttons", "carousel", "calendar", "rich_card"],
    },
    "telegram": {
        "name": "Telegram",
        "inbound": "webhook",
        "outbound": "telegram_api",
        "supports": ["text", "image", "audio", "buttons", "inline_keyboard"],
    },
    "instagram": {
        "name": "Instagram",
        "inbound": "webhook",
        "outbound": "instagram_api",
        "supports": ["text", "image", "quick_replies"],
    },
    "sms": {
        "name": "SMS",
        "inbound": "webhook",
        "outbound": "twilio_api",
        "supports": ["text"],
    },
}

# ═══════════════════════════════════════════════════════
# CONVERSATION HISTORY — channel-agnostic, keyed by customer
# ═══════════════════════════════════════════════════════

MAX_HISTORY = 20
HISTORY_TTL_HOURS = 24

_conversation_history: dict[str, list[dict]] = defaultdict(list)
_last_activity: dict[str, float] = {}


def _add_to_history(customer_key: str, role: str, content: str, channel: str = ""):
    """Add a message to the conversation buffer, tagged with channel."""
    now = datetime.now().timestamp()
    if customer_key in _last_activity and (now - _last_activity[customer_key]) > HISTORY_TTL_HOURS * 3600:
        _conversation_history[customer_key] = []
    _last_activity[customer_key] = now
    _conversation_history[customer_key].append({
        "role": role,
        "content": content,
        "channel": channel,
        "ts": now,
    })
    if len(_conversation_history[customer_key]) > MAX_HISTORY:
        _conversation_history[customer_key] = _conversation_history[customer_key][-MAX_HISTORY:]


def _get_history(customer_key: str) -> list[dict]:
    """Get conversation history for a customer (all channels merged)."""
    now = datetime.now().timestamp()
    if customer_key in _last_activity and (now - _last_activity[customer_key]) > HISTORY_TTL_HOURS * 3600:
        _conversation_history[customer_key] = []
        return []
    return _conversation_history.get(customer_key, [])


# ═══════════════════════════════════════════════════════
# TELEGRAM BOT TOKEN MAPPING
# Maps client_id -> telegram bot token, loaded from Supabase
# ═══════════════════════════════════════════════════════

_telegram_bot_map: dict[str, str] = {}  # client_id -> bot_token
_telegram_bot_reverse: dict[str, str] = {}  # bot_id -> client_id


async def _load_telegram_bots():
    """Load Telegram bot token mappings from Supabase."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.get(
                f"{_SUPA_URL}/rest/v1/channel_configs?channel=eq.telegram&select=*",
                headers=_SUPA_HEADERS,
            )
            if resp.status_code == 200:
                rows = resp.json()
                for row in rows:
                    cid = row.get("client_id", "")
                    config = row.get("config", {})
                    if isinstance(config, str):
                        config = json.loads(config)
                    token = config.get("bot_token", "")
                    if cid and token:
                        _telegram_bot_map[cid] = token
                        # Extract bot_id from token (format: 123456:ABC-DEF)
                        bot_id = token.split(":")[0] if ":" in token else ""
                        if bot_id:
                            _telegram_bot_reverse[bot_id] = cid
    except Exception as e:
        _logger.error(f"[telegram] Failed to load bot mappings: {e}")


# ═══════════════════════════════════════════════════════
# CUSTOMER IDENTIFICATION — Cross-channel identity resolution
# ═══════════════════════════════════════════════════════

async def identify_customer(channel: str, customer_id: str, client_id: str) -> dict:
    """Try to identify a customer across channels.

    If someone chatted on WhatsApp as +971501234567 and now uses the widget,
    can we link them? Check by: phone match, email match, name match.

    Returns: {customer_phone, name, is_returning, cross_channel: bool}
    """
    result = {
        "customer_phone": customer_id if channel == "whatsapp" else "",
        "customer_id": customer_id,
        "name": "",
        "is_returning": False,
        "cross_channel": False,
        "channel": channel,
        "linked_channels": [channel],
    }

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            # Strategy 1: Direct phone match (WhatsApp, Telegram, SMS)
            if channel in ("whatsapp", "sms"):
                result["customer_phone"] = customer_id

            # Strategy 2: Check customer_identities table for cross-channel links
            resp = await http.get(
                f"{_SUPA_URL}/rest/v1/customer_identities"
                f"?client_id=eq.{client_id}"
                f"&or=(channel_id.eq.{customer_id},phone.eq.{customer_id})"
                f"&select=*&limit=5",
                headers=_SUPA_HEADERS,
            )
            if resp.status_code == 200:
                rows = resp.json()
                if rows and isinstance(rows, list) and len(rows) > 0:
                    # Found existing identity
                    primary = rows[0]
                    result["customer_phone"] = primary.get("phone", customer_id)
                    result["name"] = primary.get("name", "")
                    result["is_returning"] = True
                    # Gather all channels this customer has used
                    channels_seen = {r.get("channel", "") for r in rows if r.get("channel")}
                    result["linked_channels"] = list(channels_seen | {channel})
                    result["cross_channel"] = len(result["linked_channels"]) > 1
                else:
                    # New customer — create identity record
                    identity_data = {
                        "client_id": client_id,
                        "channel": channel,
                        "channel_id": customer_id,
                        "phone": customer_id if channel in ("whatsapp", "sms") else "",
                        "first_seen": datetime.now(timezone.utc).isoformat(),
                        "last_seen": datetime.now(timezone.utc).isoformat(),
                    }
                    await http.post(
                        f"{_SUPA_URL}/rest/v1/customer_identities",
                        headers=_SUPA_HEADERS,
                        json=identity_data,
                    )

            # Strategy 3: Check conversation_logs for past interactions
            if not result["is_returning"]:
                log_resp = await http.get(
                    f"{_SUPA_URL}/rest/v1/conversation_logs"
                    f"?client_id=eq.{client_id}"
                    f"&customer_id=eq.{customer_id}"
                    f"&select=id&limit=1",
                    headers=_SUPA_HEADERS,
                )
                if log_resp.status_code == 200:
                    log_rows = log_resp.json()
                    if log_rows and isinstance(log_rows, list) and len(log_rows) > 0:
                        result["is_returning"] = True

    except Exception as e:
        _logger.error(f"[identify] Error identifying customer: {e}")

    return result


# ═══════════════════════════════════════════════════════
# KB + MEMORY + PERSONA LOADING (shared across channels)
# ═══════════════════════════════════════════════════════

async def _fetch_kb(client_id: str) -> dict:
    """Fetch knowledge base from Supabase."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.get(
                f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}&select=*",
                headers={"apikey": _SUPA_KEY, "Authorization": f"Bearer {_SUPA_KEY}"},
            )
            rows = resp.json()
            if rows and isinstance(rows, list) and len(rows) > 0:
                return rows[0]
    except Exception as e:
        _logger.error(f"[kb] fetch failed: {e}")
    return {}


async def _fetch_memory(customer_key: str) -> dict:
    """Fetch customer memory from Mem0."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.get(
                f"{_MEM0_URL}/memories?user_id={customer_key}",
                headers={"X-API-Key": _MEM0_API_KEY},
            )
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    return {"memories": data}
                return data
    except Exception as e:
        _logger.error(f"[memory] fetch failed: {e}")
    return {}


async def _update_memory(customer_key: str, user_msg: str, reply_text: str, client_id: str, contact_name: str = ""):
    """Store conversation turn in Mem0."""
    try:
        today_str = datetime.now().strftime("%Y-%m-%d")

        # Convert relative dates to absolute before storing
        user_msg_for_mem = user_msg
        replacements = {
            "tonight": f"on the evening of {today_str}",
            "today": f"on {today_str}",
            "tomorrow": f"on {(datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')}",
            "yesterday": f"on {(datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')}",
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
                headers={"X-API-Key": _MEM0_API_KEY, "Content-Type": "application/json"},
                json={
                    "messages": [
                        {"role": "user", "content": user_msg_for_mem},
                        {"role": "assistant", "content": reply_text},
                    ],
                    "user_id": customer_key,
                    "metadata": {
                        "client_id": client_id,
                        "contact_name": contact_name,
                        "conversation_date": today_str,
                    },
                },
            )
    except Exception as e:
        _logger.error(f"[memory] update failed: {e}")


async def _fetch_booking(customer_key: str, client_id: str) -> dict:
    """Fetch active booking from Supabase."""
    try:
        async with httpx.AsyncClient(timeout=5) as http:
            url = (
                f"{_SUPA_URL}/rest/v1/active_bookings"
                f"?customer_phone=eq.{customer_key}"
                f"&status=in.(collecting,confirming)"
                f"&order=created_at.desc&limit=1"
            )
            if client_id:
                url += f"&client_id=eq.{client_id}"
            resp = await http.get(url, headers=_SUPA_HEADERS)
            rows = resp.json()
            if rows and isinstance(rows, list) and len(rows) > 0:
                return rows[0]
    except Exception:
        pass
    return {}


def _build_booking_summary(booking: dict) -> str:
    """Human-readable booking state for prompt injection."""
    if not booking or booking.get("status") == "cancelled":
        return ""
    parts = []
    if booking.get("guest_name"):
        parts.append(f"Guest: {booking['guest_name']}")
    if booking.get("booking_date") or booking.get("date"):
        parts.append(f"Date: {booking.get('booking_date') or booking.get('date')}")
    if booking.get("booking_time") or booking.get("time"):
        parts.append(f"Time: {booking.get('booking_time') or booking.get('time')}")
    if booking.get("party_size"):
        parts.append(f"Party: {booking['party_size']}")
    if booking.get("seating_preference") or booking.get("seating"):
        parts.append(f"Seating: {booking.get('seating_preference') or booking.get('seating')}")
    if booking.get("dietary_notes"):
        parts.append(f"Dietary: {booking['dietary_notes']}")
    if booking.get("occasion"):
        parts.append(f"Occasion: {booking['occasion']}")
    if booking.get("notes"):
        parts.append(f"Notes: {booking['notes']}")
    if not parts:
        return ""
    return (
        ">>> ACTIVE BOOKING (SOURCE OF TRUTH) <<<\n"
        + " | ".join(parts)
        + "\nWhen confirming booking details, ONLY use the values shown above.\n"
    )


# ═══════════════════════════════════════════════════════
# PROMPT BUILDING — shared across all channels
# ═══════════════════════════════════════════════════════

def _build_system_prompt(kb: dict, memory_data: dict, booking_summary: str, channel: str, customer_info: dict) -> str:
    """Build the system prompt from KB, memory, booking state, and channel context."""
    cd = kb.get("crawl_data", {})
    if isinstance(cd, str):
        try:
            cd = json.loads(cd)
        except (json.JSONDecodeError, TypeError):
            cd = {}

    persona = cd.get("persona", {})
    goals = cd.get("conversation_goals", {})

    # Business info
    business_name = cd.get("business_name") or kb.get("business_name", "")
    persona_name = persona.get("name", "Nadia")
    persona_role = persona.get("role", "virtual host")
    tone = persona.get("tone", "warm, friendly, professional")
    lang = persona.get("language", "match the customer's language")

    # Menu/products
    specials = "\n".join(
        f"{s['name']} ({s['price']}) - {s['description']}"
        for s in cd.get("daily_specials", [])
    ) if cd.get("daily_specials") else ""

    menu = "\n".join(
        f"{c['category']}: {', '.join(c['items'])}"
        for c in cd.get("menu_highlights", [])
    ) if cd.get("menu_highlights") else ""

    hours = kb.get("business_hours", "")
    contact = kb.get("contact_info", {})
    if isinstance(contact, str):
        try:
            contact = json.loads(contact)
        except (json.JSONDecodeError, TypeError):
            contact = {}

    # Memory extraction
    memories = memory_data.get("memories", []) or memory_data.get("results", [])
    memory_lines = []
    for m in memories[:10]:
        mem_text = m.get("memory", "") if isinstance(m, dict) else str(m)
        if mem_text:
            memory_lines.append(f"- {mem_text}")
    memory_block = "\n".join(memory_lines) if memory_lines else "(no prior memories)"

    # Channel-specific instructions
    channel_info = CHANNELS.get(channel, {})
    channel_name = channel_info.get("name", channel)
    supported_features = channel_info.get("supports", ["text"])

    channel_instructions = ""
    if channel == "widget":
        channel_instructions = (
            "\n[CHANNEL: Website Chat Widget]\n"
            "- Customer is browsing the website right now — they may be in buying mode\n"
            "- You can use rich elements: buttons, carousels, quick replies\n"
            "- Keep responses concise — widget has limited screen space\n"
            "- Proactively offer help: menu links, booking, directions\n"
        )
    elif channel == "telegram":
        channel_instructions = (
            "\n[CHANNEL: Telegram]\n"
            "- You can use inline keyboard buttons for options\n"
            "- Markdown formatting is supported (bold, italic, links)\n"
            "- Keep messages concise\n"
        )
    elif channel == "whatsapp":
        channel_instructions = (
            "\n[CHANNEL: WhatsApp]\n"
            "- Customer is on WhatsApp — keep it conversational\n"
            "- You can use emojis naturally\n"
            "- Split long responses into multiple short messages using |||\n"
        )

    # Customer context
    customer_context = ""
    if customer_info.get("is_returning"):
        customer_context = f"\n[RETURNING CUSTOMER: {customer_info.get('name', 'returning guest')}]"
    if customer_info.get("cross_channel"):
        linked = ", ".join(customer_info.get("linked_channels", []))
        customer_context += f"\n[CROSS-CHANNEL: This customer has also chatted via {linked}]"

    # Primary goal
    primary_goal = goals.get("primary", "help customers and drive bookings/orders")

    prompt = f"""You are {persona_name}, {persona_role} at {business_name}.

TONE: {tone}
LANGUAGE: {lang}
PRIMARY GOAL: {primary_goal}

{channel_instructions}
{customer_context}

=== BUSINESS KNOWLEDGE ===
{f"Hours: {hours}" if hours else ""}
{f"Contact: {json.dumps(contact)}" if contact else ""}
{f"Menu highlights:{chr(10)}{menu}" if menu else ""}
{f"Today specials:{chr(10)}{specials}" if specials else ""}

=== CUSTOMER MEMORY ===
{memory_block}

{booking_summary}

RULES:
- Be warm, helpful, and on-brand
- Never make up information not in the knowledge base
- If you don't know something, say so honestly and offer to find out
- When collecting booking details, extract: name, date, time, party size, seating preference
- Match the customer's language (English/Arabic)
- Keep responses concise and natural
"""
    return prompt.strip()


# ═══════════════════════════════════════════════════════
# MINIMAX LLM CALL — shared across all channels
# ═══════════════════════════════════════════════════════

async def _call_llm(messages: list[dict], max_tokens: int = 500) -> str:
    """Call MiniMax and return the cleaned response text."""
    response_text = ""

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=30) as http:
                resp = await http.post(
                    "https://api.minimax.io/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {_MINIMAX_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "MiniMax-M2.7",
                        "messages": messages,
                        "max_tokens": max_tokens,
                    },
                )
                data = resp.json()
                choices = data.get("choices", [])
                if choices:
                    response_text = choices[0]["message"]["content"]
                    break
                _logger.warning(f"[llm] Attempt {attempt + 1} returned no choices")
        except Exception as e:
            _logger.error(f"[llm] Attempt {attempt + 1} failed: {e}")
            if attempt < 2:
                await asyncio.sleep(2)

    if not response_text:
        return "Sorry, please try again in a moment."

    # Clean response — same logic as WhatsApp pipeline
    response_text = re.sub(r"<think>[\s\S]*?</think>\s*", "", response_text)
    response_text = response_text.replace("**", "").strip()

    # Strip CJK/Russian artifacts (MiniMax quirk)
    response_text = re.sub(
        r"[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u0400-\u04ff]+",
        "", response_text,
    )
    response_text = re.sub(r"\s{2,}", " ", response_text).strip()

    # Strip tool calls
    tool_pattern = r"\[TOOL:\s*\w+\s*(?:\|[^\]]*)*\]"
    tool_calls = re.findall(tool_pattern, response_text)
    if tool_calls:
        _logger.info(f"[llm] Tool calls detected: {tool_calls}")
    response_text = re.sub(tool_pattern, "", response_text).strip()

    return response_text


# ═══════════════════════════════════════════════════════
# RICH ELEMENT EXTRACTION
# ═══════════════════════════════════════════════════════

def _extract_rich_elements(reply: str, channel: str) -> tuple[str, list[dict]]:
    """Extract rich UI elements from reply text.

    The LLM can embed structured elements like:
    [BUTTONS: Option A | Option B | Option C]
    [QUICK_REPLIES: Yes | No | Maybe later]
    [LINK: https://... | Link text]

    Returns: (cleaned_text, list_of_rich_elements)
    """
    supported = CHANNELS.get(channel, {}).get("supports", ["text"])
    elements = []

    # Extract button patterns
    if "buttons" in supported:
        button_matches = re.findall(r"\[BUTTONS?:\s*([^\]]+)\]", reply, re.IGNORECASE)
        for match in button_matches:
            options = [o.strip() for o in match.split("|") if o.strip()]
            elements.append({
                "type": "buttons",
                "options": options,
            })
        reply = re.sub(r"\[BUTTONS?:\s*[^\]]+\]", "", reply, flags=re.IGNORECASE)

    # Extract quick reply patterns
    if "buttons" in supported or "quick_replies" in supported:
        qr_matches = re.findall(r"\[QUICK_REPLIES?:\s*([^\]]+)\]", reply, re.IGNORECASE)
        for match in qr_matches:
            options = [o.strip() for o in match.split("|") if o.strip()]
            elements.append({
                "type": "quick_replies",
                "options": options,
            })
        reply = re.sub(r"\[QUICK_REPLIES?:\s*[^\]]+\]", "", reply, flags=re.IGNORECASE)

    # Extract link patterns
    link_matches = re.findall(r"\[LINK:\s*([^\]]+)\]", reply, re.IGNORECASE)
    for match in link_matches:
        parts = [p.strip() for p in match.split("|")]
        elements.append({
            "type": "link",
            "url": parts[0],
            "text": parts[1] if len(parts) > 1 else parts[0],
        })
    reply = re.sub(r"\[LINK:\s*[^\]]+\]", "", reply, flags=re.IGNORECASE)

    return reply.strip(), elements


# ═══════════════════════════════════════════════════════
# CONVERSATION LOGGING — persistent, all channels
# ═══════════════════════════════════════════════════════

async def _log_conversation(
    client_id: str,
    customer_id: str,
    channel: str,
    user_message: str,
    ai_reply: str,
    metadata: dict = None,
):
    """Log conversation turn to Supabase for analytics and history."""
    try:
        log_entry = {
            "client_id": client_id,
            "customer_id": customer_id,
            "channel": channel,
            "user_message": user_message,
            "ai_reply": ai_reply,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "metadata": json.dumps(metadata or {}),
        }
        async with httpx.AsyncClient(timeout=5) as http:
            await http.post(
                f"{_SUPA_URL}/rest/v1/conversation_logs",
                headers=_SUPA_HEADERS,
                json=log_entry,
            )
    except Exception as e:
        _logger.error(f"[log] Failed to log conversation: {e}")


# ═══════════════════════════════════════════════════════
# THE UNIVERSAL PIPELINE — Every channel calls this
# ═══════════════════════════════════════════════════════

async def process_message(
    channel: str,
    client_id: str,
    customer_id: str,
    message: str,
    message_type: str = "text",
    metadata: dict = None,
) -> dict:
    """THE UNIVERSAL PIPELINE. Every channel calls this.

    1. Identify customer (same person across channels? merge if possible)
    2. Load conversation history (channel-agnostic)
    3. Load KB + memory + persona (same for all channels)
    4. Build prompt (same pipeline as WhatsApp)
    5. Generate reply via MiniMax
    6. Store conversation (tagged with channel)
    7. Return reply (channel-specific formatting)

    Returns: {
        reply: str,
        channel: str,
        rich_elements: [...],
        customer_recognized: bool,
        booking_updated: bool,
    }
    """
    metadata = metadata or {}
    _logger.info(f"[pipeline] {channel} | client={client_id} | customer={customer_id} | msg={message[:80]}")

    # ── 1. IDENTIFY CUSTOMER ──────────────────────────────
    customer_info = await identify_customer(channel, customer_id, client_id)
    customer_key = customer_info.get("customer_phone") or customer_id

    # ── 2. LOAD CONVERSATION HISTORY ──────────────────────
    history = _get_history(customer_key)
    _add_to_history(customer_key, "user", message, channel)

    # ── 3. LOAD KB + MEMORY + BOOKING (parallel) ─────────
    kb, memory_data, booking = await asyncio.gather(
        _fetch_kb(client_id),
        _fetch_memory(customer_key),
        _fetch_booking(customer_key, client_id),
    )

    booking_summary = _build_booking_summary(booking)

    # ── 4. BUILD PROMPT ───────────────────────────────────
    system_prompt = _build_system_prompt(
        kb=kb,
        memory_data=memory_data,
        booking_summary=booking_summary,
        channel=channel,
        customer_info=customer_info,
    )

    # Build messages array with history
    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-10:]:  # Last 10 turns for context
        messages.append({
            "role": h["role"],
            "content": h["content"],
        })
    messages.append({"role": "user", "content": message})

    # ── 5. GENERATE REPLY VIA MINIMAX ─────────────────────
    reply_text = await _call_llm(messages)

    # ── 6. EXTRACT RICH ELEMENTS ──────────────────────────
    reply_text, rich_elements = _extract_rich_elements(reply_text, channel)

    # ── 7. STORE CONVERSATION + MEMORY (parallel) ─────────
    _add_to_history(customer_key, "assistant", reply_text, channel)

    asyncio.create_task(_log_conversation(
        client_id=client_id,
        customer_id=customer_id,
        channel=channel,
        user_message=message,
        ai_reply=reply_text,
        metadata={**metadata, "customer_key": customer_key},
    ))

    asyncio.create_task(_update_memory(
        customer_key=customer_key,
        user_msg=message,
        reply_text=reply_text,
        client_id=client_id,
        contact_name=customer_info.get("name", ""),
    ))

    # ── 8. CHECK IF BOOKING WAS UPDATED ───────────────────
    booking_after = await _fetch_booking(customer_key, client_id)
    booking_updated = bool(booking_after) and booking_after != booking

    return {
        "reply": reply_text,
        "channel": channel,
        "rich_elements": rich_elements,
        "customer_recognized": customer_info.get("is_returning", False),
        "booking_updated": booking_updated,
        "customer_key": customer_key,
        "cross_channel": customer_info.get("cross_channel", False),
    }


# ═══════════════════════════════════════════════════════
# OUTBOUND — Send reply through the specified channel
# ═══════════════════════════════════════════════════════

async def send_reply(
    channel: str,
    recipient: str,
    message: str,
    rich_elements: list = None,
    client_id: str = "",
    phone_number_id: str = "",
) -> bool:
    """Send a reply through the specified channel."""
    rich_elements = rich_elements or []

    if channel == "whatsapp":
        return await send_via_whatsapp(phone_number_id, recipient, message)
    elif channel == "telegram":
        buttons = None
        for el in rich_elements:
            if el.get("type") in ("buttons", "inline_keyboard"):
                buttons = el.get("options", [])
                break
        return await send_via_telegram(recipient, message, buttons)
    elif channel == "widget":
        # Widget responses are returned via API, not pushed
        return True
    else:
        _logger.warning(f"[send] Unsupported channel: {channel}")
        return False


async def send_via_whatsapp(phone_number_id: str, to_phone: str, message: str) -> bool:
    """Send via Kapso WhatsApp API."""
    if not phone_number_id:
        _logger.error("[whatsapp] No phone_number_id provided")
        return False

    # Split long messages
    if "|||" in message:
        parts = [s.strip() for s in message.split("|||") if s.strip()]
    else:
        parts = [message]

    try:
        async with httpx.AsyncClient(timeout=30) as http:
            for i, part in enumerate(parts):
                if i > 0:
                    await asyncio.sleep(1.5)
                resp = await http.post(
                    f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages",
                    headers={
                        "X-API-Key": _KAPSO_PLATFORM_API_KEY,
                        "Content-Type": "application/json",
                    },
                    json={
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": to_phone,
                        "type": "text",
                        "text": {"body": part},
                    },
                )
                if resp.status_code == 422:
                    _logger.warning(f"[whatsapp] 422 (24h window expired) for {to_phone}")
                    return False
                elif resp.status_code not in (200, 201):
                    _logger.error(f"[whatsapp] Send failed {resp.status_code}: {resp.text}")
                    return False
        return True
    except Exception as e:
        _logger.error(f"[whatsapp] Send error: {e}")
        return False


async def send_via_telegram(chat_id: str, message: str, buttons: list = None) -> bool:
    """Send via Telegram Bot API."""
    if not _TELEGRAM_BOT_TOKEN:
        _logger.error("[telegram] No bot token configured")
        return False

    try:
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "Markdown",
        }

        # Add inline keyboard if buttons provided
        if buttons:
            keyboard = []
            for btn in buttons:
                if isinstance(btn, str):
                    keyboard.append([{"text": btn, "callback_data": btn[:64]}])
                elif isinstance(btn, dict):
                    keyboard.append([{
                        "text": btn.get("text", ""),
                        "callback_data": btn.get("data", btn.get("text", ""))[:64],
                    }])
            payload["reply_markup"] = json.dumps({"inline_keyboard": keyboard})

        async with httpx.AsyncClient(timeout=15) as http:
            resp = await http.post(
                f"https://api.telegram.org/bot{_TELEGRAM_BOT_TOKEN}/sendMessage",
                json=payload,
            )
            if resp.status_code == 200:
                return True
            else:
                _logger.error(f"[telegram] Send failed {resp.status_code}: {resp.text}")
                return False
    except Exception as e:
        _logger.error(f"[telegram] Send error: {e}")
        return False


# ═══════════════════════════════════════════════════════
# WIDGET-SPECIFIC HANDLERS
# ═══════════════════════════════════════════════════════

async def handle_widget_message(
    client_id: str,
    session_id: str,
    message: str,
    metadata: dict = None,
) -> dict:
    """Handle a message from the chat widget.
    Returns: {reply, persona_name, rich_elements, session_id}

    NOTE: This is the LEGACY widget handler using the simplified channel pipeline.
    The /chat/message endpoint in app.py now calls _widget_pipeline() directly,
    which uses the FULL WhatsApp pipeline (build_prompt, booking detection,
    gender detection, Karpathy rules, etc.). This function is kept for
    backward compatibility only.
    """
    # Ensure session_id exists
    if not session_id:
        session_id = f"widget_{uuid.uuid4().hex[:16]}"

    # Process through universal pipeline
    result = await process_message(
        channel="widget",
        client_id=client_id,
        customer_id=session_id,
        message=message,
        message_type="text",
        metadata={**(metadata or {}), "session_id": session_id},
    )

    # Get persona name from KB
    kb = await _fetch_kb(client_id)
    cd = kb.get("crawl_data", {})
    if isinstance(cd, str):
        try:
            cd = json.loads(cd)
        except (json.JSONDecodeError, TypeError):
            cd = {}
    persona = cd.get("persona", {})
    persona_name = persona.get("name", "Assistant")

    return {
        "reply": result["reply"],
        "persona_name": persona_name,
        "rich_elements": result.get("rich_elements", []),
        "session_id": session_id,
        "customer_recognized": result.get("customer_recognized", False),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def get_widget_config(client_id: str) -> dict:
    """Get widget configuration for a client.
    Returns: {persona_name, greeting, color, avatar_url, business_name, lang}
    """
    # Fetch KB for persona info
    kb = await _fetch_kb(client_id)
    cd = kb.get("crawl_data", {})
    if isinstance(cd, str):
        try:
            cd = json.loads(cd)
        except (json.JSONDecodeError, TypeError):
            cd = {}

    persona = cd.get("persona", {})
    business_name = cd.get("business_name") or kb.get("business_name", "")

    # Check for custom widget config in Supabase
    widget_config = {}
    try:
        async with httpx.AsyncClient(timeout=5) as http:
            resp = await http.get(
                f"{_SUPA_URL}/rest/v1/channel_configs"
                f"?client_id=eq.{client_id}&channel=eq.widget&select=config&limit=1",
                headers=_SUPA_HEADERS,
            )
            if resp.status_code == 200:
                rows = resp.json()
                if rows and isinstance(rows, list) and len(rows) > 0:
                    cfg = rows[0].get("config", {})
                    if isinstance(cfg, str):
                        cfg = json.loads(cfg)
                    widget_config = cfg
    except Exception:
        pass

    return {
        "persona_name": widget_config.get("persona_name") or persona.get("name", "Assistant"),
        "greeting": widget_config.get("greeting") or persona.get("greeting", f"Welcome! How can I help you today?"),
        "color": widget_config.get("color", "#10b981"),
        "avatar_url": widget_config.get("avatar_url", ""),
        "business_name": widget_config.get("business_name") or business_name,
        "lang": widget_config.get("lang", "en"),
        "position": widget_config.get("position", "bottom-right"),
        "theme": widget_config.get("theme", "light"),
        "show_powered_by": widget_config.get("show_powered_by", True),
    }


async def get_widget_history(client_id: str, session_id: str, limit: int = 50) -> list:
    """Get chat history for a widget session."""
    # First check in-memory history
    history = _get_history(session_id)
    if history:
        return [
            {
                "role": h["role"],
                "content": h["content"],
                "channel": h.get("channel", "widget"),
                "timestamp": datetime.fromtimestamp(h.get("ts", 0), tz=timezone.utc).isoformat() if h.get("ts") else None,
            }
            for h in history[-limit:]
        ]

    # Fallback: check Supabase conversation_logs
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.get(
                f"{_SUPA_URL}/rest/v1/conversation_logs"
                f"?client_id=eq.{client_id}"
                f"&customer_id=eq.{session_id}"
                f"&channel=eq.widget"
                f"&select=user_message,ai_reply,created_at"
                f"&order=created_at.asc"
                f"&limit={limit}",
                headers=_SUPA_HEADERS,
            )
            if resp.status_code == 200:
                rows = resp.json()
                result = []
                for row in rows:
                    result.append({
                        "role": "user",
                        "content": row.get("user_message", ""),
                        "timestamp": row.get("created_at"),
                    })
                    result.append({
                        "role": "assistant",
                        "content": row.get("ai_reply", ""),
                        "timestamp": row.get("created_at"),
                    })
                return result
    except Exception as e:
        _logger.error(f"[widget] History fetch error: {e}")

    return []


# ═══════════════════════════════════════════════════════
# TELEGRAM-SPECIFIC HANDLERS
# ═══════════════════════════════════════════════════════

async def handle_telegram_update(update: dict) -> dict:
    """Process a Telegram bot update (webhook).

    Extracts message, identifies client from bot token mapping,
    processes through universal pipeline, sends reply via Telegram API.
    """
    result = {"ok": False, "error": ""}

    # Extract message from update
    message_obj = update.get("message") or update.get("callback_query", {}).get("message")
    if not message_obj:
        result["error"] = "No message in update"
        return result

    chat_id = str(message_obj.get("chat", {}).get("id", ""))
    text = ""

    # Handle callback query (button press)
    if update.get("callback_query"):
        text = update["callback_query"].get("data", "")
        # Acknowledge the callback
        callback_id = update["callback_query"].get("id", "")
        if callback_id and _TELEGRAM_BOT_TOKEN:
            try:
                async with httpx.AsyncClient(timeout=5) as http:
                    await http.post(
                        f"https://api.telegram.org/bot{_TELEGRAM_BOT_TOKEN}/answerCallbackQuery",
                        json={"callback_query_id": callback_id},
                    )
            except Exception:
                pass
    else:
        text = message_obj.get("text", "")

    if not text or not chat_id:
        result["error"] = "Empty message or chat_id"
        return result

    # Get user info
    user = message_obj.get("from", {})
    contact_name = user.get("first_name", "")
    if user.get("last_name"):
        contact_name += f" {user['last_name']}"
    username = user.get("username", "")

    # Resolve client_id from bot token
    # For now use the update's bot info or fall back to default
    bot_info = update.get("_bot_info", {})
    bot_id = str(bot_info.get("id", ""))

    client_id = _telegram_bot_reverse.get(bot_id, "")
    if not client_id:
        # Try to resolve from Supabase
        await _load_telegram_bots()
        client_id = _telegram_bot_reverse.get(bot_id, "3bd50557-6680-43b9-bb8e-261c7f8a19d2")

    # Process through universal pipeline
    pipeline_result = await process_message(
        channel="telegram",
        client_id=client_id,
        customer_id=chat_id,
        message=text,
        message_type="text",
        metadata={
            "username": username,
            "contact_name": contact_name,
            "chat_id": chat_id,
        },
    )

    # Send reply via Telegram
    buttons = None
    for el in pipeline_result.get("rich_elements", []):
        if el.get("type") in ("buttons", "quick_replies"):
            buttons = el.get("options", [])
            break

    sent = await send_via_telegram(chat_id, pipeline_result["reply"], buttons)

    result["ok"] = sent
    result["reply"] = pipeline_result["reply"]
    result["chat_id"] = chat_id
    return result


async def setup_telegram_webhook(bot_token: str, webhook_url: str) -> dict:
    """Set up Telegram webhook for a bot.

    Calls Telegram's setWebhook API to register our endpoint.
    """
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            resp = await http.post(
                f"https://api.telegram.org/bot{bot_token}/setWebhook",
                json={
                    "url": webhook_url,
                    "allowed_updates": ["message", "callback_query"],
                    "drop_pending_updates": True,
                },
            )
            data = resp.json()
            if data.get("ok"):
                return {
                    "ok": True,
                    "description": data.get("description", "Webhook set"),
                    "webhook_url": webhook_url,
                }
            else:
                return {
                    "ok": False,
                    "error": data.get("description", "Unknown error"),
                }
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def create_telegram_bot_for_client(client_id: str) -> dict:
    """Instructions for creating a Telegram bot via BotFather.

    Returns the steps and what we need (the bot token).
    """
    return {
        "client_id": client_id,
        "steps": [
            "1. Open Telegram and search for @BotFather",
            "2. Send /newbot",
            "3. Choose a display name for your bot (e.g., 'Saffron Kitchen')",
            "4. Choose a username (must end in 'bot', e.g., 'saffron_kitchen_bot')",
            "5. BotFather will give you an API token — copy it",
            "6. Send us the token and we'll connect it to your AI assistant",
        ],
        "what_we_need": {
            "bot_token": "The API token from BotFather (looks like 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ)",
        },
        "optional_customization": [
            "Set a profile picture: send /setuserpic to BotFather",
            "Set a description: send /setdescription to BotFather",
            "Set about text: send /setabouttext to BotFather",
        ],
        "webhook_url": f"https://n8n.srv1328172.hstgr.cloud/webhook/telegram/{client_id}",
    }


async def register_telegram_bot(client_id: str, bot_token: str) -> dict:
    """Register a Telegram bot token for a client and set up the webhook."""
    # Save to Supabase
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            # Upsert channel config
            config_data = {
                "client_id": client_id,
                "channel": "telegram",
                "config": json.dumps({
                    "bot_token": bot_token,
                    "setup_at": datetime.now(timezone.utc).isoformat(),
                }),
                "active": True,
            }
            resp = await http.post(
                f"{_SUPA_URL}/rest/v1/channel_configs",
                headers={**_SUPA_HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"},
                json=config_data,
            )

            # Update local cache
            bot_id = bot_token.split(":")[0] if ":" in bot_token else ""
            _telegram_bot_map[client_id] = bot_token
            if bot_id:
                _telegram_bot_reverse[bot_id] = client_id

    except Exception as e:
        _logger.error(f"[telegram] Failed to save bot config: {e}")
        return {"ok": False, "error": str(e)}

    # Set up webhook
    webhook_url = f"https://n8n.srv1328172.hstgr.cloud/webhook/telegram/{client_id}"
    webhook_result = await setup_telegram_webhook(bot_token, webhook_url)

    # Verify bot info
    bot_info = {}
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.get(f"https://api.telegram.org/bot{bot_token}/getMe")
            if resp.status_code == 200:
                data = resp.json()
                if data.get("ok"):
                    bot_info = data.get("result", {})
    except Exception:
        pass

    return {
        "ok": webhook_result.get("ok", False),
        "bot_info": bot_info,
        "webhook": webhook_result,
        "client_id": client_id,
    }


# ═══════════════════════════════════════════════════════
# CHANNEL ANALYTICS
# ═══════════════════════════════════════════════════════

async def get_channel_stats(client_id: str, days: int = 7) -> dict:
    """Stats broken down by channel: messages, bookings, conversion per channel."""
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    stats = {
        "client_id": client_id,
        "period_days": days,
        "channels": {},
        "total_messages": 0,
        "total_conversations": 0,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as http:
            # Get conversation counts by channel
            resp = await http.get(
                f"{_SUPA_URL}/rest/v1/conversation_logs"
                f"?client_id=eq.{client_id}"
                f"&created_at=gte.{since}"
                f"&select=channel,customer_id,created_at",
                headers=_SUPA_HEADERS,
            )

            if resp.status_code == 200:
                rows = resp.json()
                channel_data: dict[str, dict] = {}

                for row in rows:
                    ch = row.get("channel", "unknown")
                    if ch not in channel_data:
                        channel_data[ch] = {
                            "messages": 0,
                            "unique_customers": set(),
                            "channel_name": CHANNELS.get(ch, {}).get("name", ch),
                        }
                    channel_data[ch]["messages"] += 1
                    channel_data[ch]["unique_customers"].add(row.get("customer_id", ""))

                for ch, data in channel_data.items():
                    stats["channels"][ch] = {
                        "name": data["channel_name"],
                        "messages": data["messages"],
                        "unique_customers": len(data["unique_customers"]),
                    }
                    stats["total_messages"] += data["messages"]
                    stats["total_conversations"] += len(data["unique_customers"])

            # Get booking counts by channel (from metadata)
            booking_resp = await http.get(
                f"{_SUPA_URL}/rest/v1/active_bookings"
                f"?client_id=eq.{client_id}"
                f"&created_at=gte.{since}"
                f"&select=status,metadata",
                headers=_SUPA_HEADERS,
            )
            if booking_resp.status_code == 200:
                bookings = booking_resp.json()
                for b in bookings:
                    meta = b.get("metadata", {})
                    if isinstance(meta, str):
                        try:
                            meta = json.loads(meta)
                        except (json.JSONDecodeError, TypeError):
                            meta = {}
                    ch = meta.get("channel", "whatsapp")
                    if ch in stats["channels"]:
                        stats["channels"][ch].setdefault("bookings", 0)
                        stats["channels"][ch]["bookings"] += 1
                        if b.get("status") == "confirmed":
                            stats["channels"][ch].setdefault("confirmed_bookings", 0)
                            stats["channels"][ch]["confirmed_bookings"] += 1

    except Exception as e:
        _logger.error(f"[stats] Failed to fetch channel stats: {e}")
        stats["error"] = str(e)

    return stats


# ═══════════════════════════════════════════════════════
# CHANNEL MANAGEMENT
# ═══════════════════════════════════════════════════════

async def get_active_channels(client_id: str) -> list[dict]:
    """Get all active channels for a client."""
    active = []
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.get(
                f"{_SUPA_URL}/rest/v1/channel_configs"
                f"?client_id=eq.{client_id}&active=eq.true&select=*",
                headers=_SUPA_HEADERS,
            )
            if resp.status_code == 200:
                rows = resp.json()
                for row in rows:
                    ch = row.get("channel", "")
                    config = row.get("config", {})
                    if isinstance(config, str):
                        try:
                            config = json.loads(config)
                        except (json.JSONDecodeError, TypeError):
                            config = {}
                    active.append({
                        "channel": ch,
                        "name": CHANNELS.get(ch, {}).get("name", ch),
                        "supports": CHANNELS.get(ch, {}).get("supports", []),
                        "config": {k: v for k, v in config.items() if k != "bot_token"},  # mask secrets
                        "active": True,
                    })
    except Exception as e:
        _logger.error(f"[channels] Failed to fetch active channels: {e}")

    # WhatsApp is always active (connected via Kapso)
    if not any(c["channel"] == "whatsapp" for c in active):
        active.insert(0, {
            "channel": "whatsapp",
            "name": "WhatsApp",
            "supports": CHANNELS["whatsapp"]["supports"],
            "config": {},
            "active": True,
        })

    return active


async def enable_channel(client_id: str, channel: str, config: dict) -> dict:
    """Enable a channel for a client."""
    if channel not in CHANNELS:
        return {"ok": False, "error": f"Unknown channel: {channel}"}

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.post(
                f"{_SUPA_URL}/rest/v1/channel_configs",
                headers={**_SUPA_HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"},
                json={
                    "client_id": client_id,
                    "channel": channel,
                    "config": json.dumps(config),
                    "active": True,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            if resp.status_code in (200, 201):
                return {"ok": True, "channel": channel, "name": CHANNELS[channel]["name"]}
            else:
                return {"ok": False, "error": f"Supabase error: {resp.status_code}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def disable_channel(client_id: str, channel: str) -> dict:
    """Disable a channel for a client."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.patch(
                f"{_SUPA_URL}/rest/v1/channel_configs"
                f"?client_id=eq.{client_id}&channel=eq.{channel}",
                headers=_SUPA_HEADERS,
                json={"active": False},
            )
            if resp.status_code in (200, 204):
                return {"ok": True, "channel": channel, "disabled": True}
            else:
                return {"ok": False, "error": f"Supabase error: {resp.status_code}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ═══════════════════════════════════════════════════════
# INSTAGRAM DM CHANNEL
# ═══════════════════════════════════════════════════════

async def handle_instagram_webhook(payload: dict) -> dict:
    """Process Instagram webhook (messaging events).

    Instagram uses the same Meta Graph API as WhatsApp.
    Webhook events: messages, message_reactions, message_reads

    Flow:
    1. Extract sender ID and message text
    2. Look up client from Instagram page ID
    3. Route through universal pipeline (process_message)
    4. Send reply via Instagram Send API
    """
    results = []

    for entry in payload.get("entry", []):
        page_id = entry.get("id", "")

        for messaging_event in entry.get("messaging", []):
            sender_id = messaging_event.get("sender", {}).get("id", "")
            recipient_id = messaging_event.get("recipient", {}).get("id", "")
            message = messaging_event.get("message", {})
            message_text = message.get("text", "")

            if not message_text or not sender_id:
                continue

            # Skip echo messages (sent by the page itself)
            if message.get("is_echo"):
                continue

            # Look up client from page ID
            client_id = ""
            access_token = ""
            try:
                async with httpx.AsyncClient(timeout=5) as http:
                    resp = await http.get(
                        f"{_SUPA_URL}/rest/v1/channel_configs"
                        f"?channel=eq.instagram&config->>page_id=eq.{page_id}"
                        f"&active=eq.true&select=client_id,config&limit=1",
                        headers=_SUPA_HEADERS,
                    )
                    rows = resp.json() if resp.status_code == 200 else []
                    if rows and isinstance(rows, list) and len(rows) > 0:
                        client_id = rows[0].get("client_id", "")
                        config = rows[0].get("config", {})
                        if isinstance(config, str):
                            config = json.loads(config)
                        access_token = config.get("access_token", "")
            except Exception as e:
                _logger.error(f"[instagram] Client lookup failed: {e}")
                continue

            if not client_id:
                _logger.warning(f"[instagram] No client found for page_id={page_id}")
                continue

            # Route through universal pipeline
            try:
                result = await process_message(
                    client_id=client_id,
                    channel="instagram",
                    customer_key=f"ig_{sender_id}",
                    message_text=message_text,
                    contact_name=f"Instagram User {sender_id[-4:]}",
                    raw_payload=messaging_event,
                )

                reply = result.get("reply", "")
                if reply and access_token:
                    sent = await send_via_instagram(
                        page_id=page_id,
                        recipient_id=sender_id,
                        message=reply,
                        access_token=access_token,
                    )
                    result["sent"] = sent

                results.append(result)
            except Exception as e:
                _logger.error(f"[instagram] Processing error: {e}")
                results.append({"error": str(e), "sender_id": sender_id})

    return {"processed": len(results), "results": results}


async def send_via_instagram(page_id: str, recipient_id: str, message: str, access_token: str) -> bool:
    """Send a message via Instagram Messaging API.
    POST https://graph.facebook.com/v19.0/{page_id}/messages
    """
    try:
        # Split long messages (Instagram has a 1000 char limit per message)
        parts = [message[i:i + 1000] for i in range(0, len(message), 1000)] if len(message) > 1000 else [message]

        async with httpx.AsyncClient(timeout=15) as http:
            for part in parts:
                r = await http.post(
                    f"https://graph.facebook.com/v19.0/{page_id}/messages",
                    headers={"Content-Type": "application/json"},
                    params={"access_token": access_token},
                    json={
                        "recipient": {"id": recipient_id},
                        "message": {"text": part},
                    },
                )
                if r.status_code not in (200, 201):
                    _logger.error(f"[instagram] Send failed: {r.status_code} {r.text[:200]}")
                    return False

        return True
    except Exception as e:
        _logger.error(f"[instagram] Send error: {e}")
        return False


async def setup_instagram_for_client(client_id: str, page_id: str, access_token: str) -> dict:
    """Configure Instagram DM for a client.
    Stores credentials, sets up webhook subscription.
    """
    config = {
        "page_id": page_id,
        "access_token": access_token,
        "setup_at": datetime.now(timezone.utc).isoformat(),
    }

    # Store in channel_configs via the existing enable_channel function
    result = await enable_channel(client_id, "instagram", config)

    if result.get("ok"):
        _logger.info(f"[instagram] Configured for client {client_id}, page {page_id}")

        # Subscribe to Instagram webhook fields
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                r = await http.post(
                    f"https://graph.facebook.com/v19.0/{page_id}/subscribed_apps",
                    params={
                        "access_token": access_token,
                        "subscribed_fields": "messages,messaging_postbacks,messaging_optins",
                    },
                )
                if r.status_code == 200:
                    _logger.info(f"[instagram] Webhook subscription active for page {page_id}")
                else:
                    _logger.warning(f"[instagram] Webhook subscription issue: {r.text[:200]}")
        except Exception as e:
            _logger.warning(f"[instagram] Webhook subscription failed: {e}")

    return result
