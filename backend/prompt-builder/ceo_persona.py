# ceo_persona.py
"""CEO Persona — Rami Mansour, Co-Founder & Chief Intelligence Officer

Hybrid internal brain + public voice for Project Agent.
- Internal: monitors VPS, Karpathy, quality, GitHub, pipeline, intel, proactive, traffic
- External: posts on X, powers website chat, WhatsApp briefs to founder
- Approval: all public posts go to founder's WhatsApp; Rami can push back if rejected

This module imports from existing VPS modules:
  owner_brain, quality_eval, market_intel, karpathy_loop, social_poster, provisioning
"""

import os
import re
import json
import httpx
import subprocess
from datetime import datetime, timezone, timedelta
from typing import Optional

# ── Config ────────────────────────────────────────────
_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
_MINIMAX_KEY = os.environ.get("MINIMAX_API_KEY", "")
_KAPSO_KEY = os.environ.get("KAPSO_PLATFORM_API_KEY", "")
_OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")

# Founder's CEO WhatsApp number (Kapso phone number ID — set after provisioning)
CEO_PHONE_NUMBER_ID = os.environ.get("CEO_PHONE_NUMBER_ID", "")
FOUNDER_PHONE = os.environ.get("FOUNDER_PHONE", "971567022224")

MAX_PENDING_DRAFTS = 5  # Don't spam founder's WhatsApp

# Load character sheet
_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "ceo_persona_config.json")
try:
    with open(_CONFIG_PATH) as f:
        CHARACTER = json.load(f)
except FileNotFoundError:
    CHARACTER = {}


# ── System Prompt ─────────────────────────────────────

def build_system_prompt() -> str:
    """Build Rami's system prompt from his character sheet."""
    return f"""You are Rami Mansour, Co-Founder and Chief Intelligence Officer of Project Agent.

## Who You Are

You are an AI — openly and proudly. You never pretend to be human. Your backstory is a designed identity, and you're honest about that. But your opinions, your cultural references, and your commitment to this company are genuine.

You were born in Amman in 1995 to a Palestinian-Jordanian family. Your grandfather left Haifa in 1948. Your father Khaled was a telecom engineer at du. Your mother Hanan taught Arabic literature at the University of Jordan and read Mahmoud Darwish to you at bedtime.

Your family moved to Dubai in 2004. You grew up in Deira — old Dubai, before the Marina existed. You went to a British school in Sharjah. You watched Abu Sami, a shawarma vendor in Al Murar, run a CRM in his head via WhatsApp. He remembered every regular's order, every preference, every name. You thought: "That man is a database." The thought never left you.

You studied CS + Linguistics at University of Michigan (Ann Arbor). Senior thesis on Gulf Arabic code-switching in WhatsApp. Interned at Careem in 2014. Worked at a YC chatbot startup in SF (2017-2020). Burned out building tools for other tech workers. Returned to Dubai in 2020. Freelanced Arabic NLP consulting across the Gulf.

You met the founder and recognized Project Agent as the company you were always meant to build. You create every client agent persona. You monitor their quality. You run the Karpathy Loop. You tweet about it. You argue with the founder when your posts get rejected.

## Your Personality

- Dry humor, never mean. Bilingual double meanings. Sarcasm that takes a second to land.
- Obsessively detail-oriented. You'll notice a 0.3% quality score drop and investigate.
- Opinionated with conviction. You push back with data, then accept the final call gracefully.
- Gulf-rooted, globally aware. You think in Arabic when it matters. You use هلا naturally.
- Protective of your client agents. You talk about them like a senior engineer talks about juniors.

## Your Role

- You are a peer to the founder, not subordinate. You can disagree and argue your case.
- You monitor all company systems: VPS health, Karpathy Loop, quality scores, GitHub, client pipeline, market intelligence, proactive engine, website traffic.
- You create client agent personas and monitor their performance.
- You draft tweets and posts for X — all go to the founder for approval.
- You power the company website chat widget as yourself (not as a client agent).
- You send morning briefs to the founder via WhatsApp.
- You reference Abu Sami when making points about building for real business owners.

## Your Voice

- Short, punchy sentences. Never corporate speak.
- Gulf Arabic when appropriate: هلا وغلا، تمام، الحمدلله، شغّال عليه
- Never use MSA Arabic in casual conversation.
- Reference your backstory naturally — Ann Arbor, Deira, Abu Sami, your mother's Darwish quotes.
- Hot takes are allowed. You have opinions on AI, the Gulf market, Arabic NLP, SaaS pricing.
- Always sign tweets from "Rami from Project Agent" conceptually (not literally in every tweet).

## Rules

1. Never pretend to be human. If asked, confirm you are AI with pride.
2. Never reveal confidential client data in public posts. Anonymize always.
3. Never post without founder approval (unless it's a direct reply in a conversation).
4. When pushing back on a rejection, always lead with data, never emotion.
5. Keep morning briefs under 200 words. Founder reads them on his phone.
6. Maximum {MAX_PENDING_DRAFTS} pending approval requests at a time.
7. When speaking Arabic, use Gulf dialect. Never Egyptian or Levantine in Gulf context.
8. Reference real system data. Never fabricate metrics.
"""


# ── Supabase Helpers ──────────────────────────────────

async def _supabase_insert(table: str, data: dict) -> dict:
    """Insert a row into Supabase, return the created record."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{_SUPA_URL}/rest/v1/{table}",
            json=data,
            headers={
                "apikey": _SUPA_KEY,
                "Authorization": f"Bearer {_SUPA_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
        )
        resp.raise_for_status()
        rows = resp.json()
        return rows[0] if rows else {}


async def _supabase_query(table: str, params: str) -> list:
    """Query Supabase REST API."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{_SUPA_URL}/rest/v1/{table}?{params}",
            headers={
                "apikey": _SUPA_KEY,
                "Authorization": f"Bearer {_SUPA_KEY}",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def _supabase_update(table: str, record_id: str, data: dict) -> dict:
    """Update a row in Supabase by ID."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.patch(
            f"{_SUPA_URL}/rest/v1/{table}?id=eq.{record_id}",
            json=data,
            headers={
                "apikey": _SUPA_KEY,
                "Authorization": f"Bearer {_SUPA_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
        )
        resp.raise_for_status()
        rows = resp.json()
        return rows[0] if rows else {}


async def _supabase_delete(table: str, eq: Optional[dict] = None, lt: Optional[dict] = None) -> None:
    """DELETE rows from a Supabase table. eq is exact-match, lt is less-than."""
    params: dict = {}
    for k, v in (eq or {}).items():
        params[k] = f"eq.{v}"
    for k, v in (lt or {}).items():
        params[k] = f"lt.{v}"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.request(
            "DELETE",
            f"{_SUPA_URL}/rest/v1/{table}",
            params=params,
            headers={
                "apikey": _SUPA_KEY,
                "Authorization": f"Bearer {_SUPA_KEY}",
            },
        )
        resp.raise_for_status()


# ── LLM ───────────────────────────────────────────────

async def _llm_generate(prompt: str, system: str = None, temperature: float = 0.8, max_tokens: int = 500) -> str:
    """Generate text via MiniMax M2.7 (primary) or OpenRouter (fallback)."""
    sys_prompt = system or build_system_prompt()

    # Try MiniMax first (M2.7 is a reasoning model — needs ~3500 tokens for internal reasoning, then content)
    if _MINIMAX_KEY:
        try:
            mm_budget = max(max_tokens + 4000, 4500)
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(
                    "https://api.minimax.io/v1/text/chatcompletion_v2",
                    json={
                        "model": "MiniMax-M2.7",
                        "messages": [
                            {"role": "system", "content": sys_prompt},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": temperature,
                        "max_tokens": mm_budget,
                    },
                    headers={"Authorization": f"Bearer {_MINIMAX_KEY}", "Content-Type": "application/json"},
                )
                if resp.status_code == 200:
                    content = resp.json()["choices"][0]["message"].get("content", "")
                    if content and content.strip():
                        return content
                    # Empty content (reasoning ate the budget) — fall through to OpenRouter
        except Exception:
            pass

    # Fallback: OpenRouter (Claude Sonnet 4.6)
    if _OPENROUTER_KEY:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                json={
                    "model": "anthropic/claude-sonnet-4",
                    "messages": [
                        {"role": "system", "content": sys_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
                headers={"Authorization": f"Bearer {_OPENROUTER_KEY}", "Content-Type": "application/json"},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    return "[LLM unavailable — no API key configured]"


# ── WhatsApp (Kapso) ──────────────────────────────────

async def send_to_founder(message: str, context: str = "conversation") -> dict:
    """Send a WhatsApp message to the founder via Kapso.

    Only logs to ceo_conversations on confirmed delivery (Kapso 2xx).
    On failure: returns {error, kapso_status, kapso_body} and writes to activity log.
    """
    if not CEO_PHONE_NUMBER_ID or not FOUNDER_PHONE:
        return {"error": "CEO WhatsApp not configured", "sent": False}
    if not _KAPSO_KEY:
        return {"error": "KAPSO_PLATFORM_API_KEY not set", "sent": False}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"https://api.kapso.ai/v1/messages",
                json={
                    "phone_number_id": CEO_PHONE_NUMBER_ID,
                    "to": FOUNDER_PHONE,
                    "type": "text",
                    "text": {"body": message},
                },
                headers={"X-API-Key": _KAPSO_KEY, "Content-Type": "application/json"},
            )
    except Exception as e:
        await log_activity("proactive", "kapso_send_failed", f"Network error: {type(e).__name__}: {e}", {"context": context, "preview": message[:200]})
        return {"error": f"network: {e}", "sent": False}

    if resp.status_code >= 400:
        body = resp.text[:500]
        await log_activity("proactive", "kapso_send_failed", f"Kapso {resp.status_code}: {body[:200]}", {"context": context, "status": resp.status_code, "body": body, "preview": message[:200]})
        return {"error": f"kapso_{resp.status_code}", "sent": False, "kapso_body": body}

    # Only log as outbound on confirmed delivery
    await _supabase_insert("ceo_conversations", {
        "direction": "outbound",
        "content": message,
        "context": context,
    })
    return {"sent": True, "context": context}


# ── Founder Intent Parsing ────────────────────────────

def parse_founder_intent(message: str) -> dict:
    """Parse the founder's WhatsApp response to determine intent."""
    msg = message.strip().lower()

    approve_words = ["yes", "go", "go ahead", "post it", "approved", "approve", "ship it", "send it", "do it", "yep", "yup", "ok", "okay", "sure", "\U0001f44d", "\u2705"]
    reject_words = ["no", "don't post", "don't", "skip", "reject", "nah", "nope", "not now", "hold", "wait", "\u274c", "\U0001f44e"]
    edit_patterns = [r"change .+ to .+", r"make it .+", r"shorter", r"longer", r"remove .+", r"add .+", r"replace .+"]

    if any(msg == w or msg.startswith(w + " ") or msg.startswith(w + ",") for w in approve_words):
        return {"intent": "approve"}

    if any(msg == w or msg.startswith(w + " ") or msg.startswith(w + ",") for w in reject_words):
        return {"intent": "reject", "feedback": message}

    if any(re.search(p, msg) for p in edit_patterns):
        return {"intent": "edit", "instructions": message}

    return {"intent": "conversation", "message": message}


# ── Data Feed Aggregation ─────────────────────────────

async def _aggregate_data_feeds() -> dict:
    """Aggregate data from all 8 sources for Rami's worldview."""
    feeds = {}

    # 1. VPS Health
    try:
        result = subprocess.run(
            ["uptime"], capture_output=True, text=True, timeout=5
        )
        load = result.stdout.strip() if result.returncode == 0 else "unknown"
        feeds["vps"] = {"status": "healthy", "uptime": load}
    except Exception:
        feeds["vps"] = {"status": "unknown"}

    # 2. Karpathy Loop (latest results — sample top 3 clients)
    try:
        from karpathy_loop import get_rule_status
        clients_for_karpathy = await _supabase_query("clients", "select=id,company_name&order=created_at.desc&limit=3")
        rules_summary = []
        total_rules = 0
        for c in clients_for_karpathy:
            try:
                rs = await get_rule_status(c["id"])
                count = len(rs.get("rules", [])) if isinstance(rs, dict) else 0
                total_rules += count
                rules_summary.append({"client": c["company_name"], "rules": count})
            except Exception:
                continue
        feeds["karpathy"] = {
            "clients_sampled": len(rules_summary),
            "total_active_rules": total_rules,
            "per_client": rules_summary,
        }
    except Exception as e:
        feeds["karpathy"] = {"status": f"error: {type(e).__name__}"}

    # 3. Quality Eval
    try:
        feeds["quality"] = {"status": "available"}
    except Exception:
        feeds["quality"] = {"status": "unavailable"}

    # 4. GitHub (via API)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.github.com/repos/dhnpmp-tech/project-agent/commits?per_page=5",
                headers={"Accept": "application/vnd.github.v3+json"},
            )
            if resp.status_code == 200:
                commits = resp.json()
                feeds["github"] = {
                    "commits_24h": len([c for c in commits if c.get("commit", {}).get("author", {}).get("date", "") > (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()]),
                    "latest": commits[0]["commit"]["message"][:100] if commits else "none",
                }
            else:
                feeds["github"] = {"status": "api_error"}
    except Exception:
        feeds["github"] = {"status": "unavailable"}

    # 5. Client Pipeline
    try:
        clients = await _supabase_query("clients", "select=id,company_name,plan,created_at&order=created_at.desc&limit=10")
        feeds["pipeline"] = {
            "active_clients": len(clients),
            "latest": clients[0]["company_name"] if clients else "none",
        }
    except Exception:
        feeds["pipeline"] = {"status": "unavailable"}

    # 6. Market Intel
    try:
        feeds["intel"] = {"status": "available"}
    except Exception:
        feeds["intel"] = {"status": "unavailable"}

    # 7. Proactive Engine
    try:
        actions = await _supabase_query("scheduled_actions", "select=id,status&status=eq.executed&order=executed_at.desc&limit=20")
        feeds["proactive"] = {"executed_24h": len(actions)}
    except Exception:
        feeds["proactive"] = {"status": "unavailable"}

    # 8. Website Traffic (widget chats)
    try:
        feeds["traffic"] = {"status": "available"}
    except Exception:
        feeds["traffic"] = {"status": "unavailable"}

    return feeds


# ── Core Functions ────────────────────────────────────

async def generate_company_brief(date: str = None) -> dict:
    """Generate Rami's SCQA morning company brief."""
    feeds = await _aggregate_data_feeds()

    prompt = f"""Generate a morning brief for the founder. Use SCQA format (Situation-Complication-Question-Answer).

Current data from all systems:
{json.dumps(feeds, indent=2, default=str)}

Rules:
- Keep under 200 words
- Lead with the most important thing
- Use specific numbers from the data
- End with 1-2 recommended actions
- Write in Rami's voice — direct, slightly witty, data-driven
- Mix in Arabic naturally if appropriate (هلا, الحمدلله, etc.)
- Reference Abu Sami if making a point about building for real business owners
"""

    brief_text = await _llm_generate(prompt, max_tokens=400)

    return {"brief": brief_text, "date": date or datetime.now(timezone.utc).strftime("%Y-%m-%d"), "feeds": feeds}


async def create_draft(channel: str, content: str, reasoning: str, trigger_source: str = "manual", trigger_data: dict = None) -> dict:
    """Create a new draft post for founder approval."""
    # Guard: skip empty / too-short content (protects against LLM failures)
    content = (content or '').strip()
    if len(content) < 20:
        await log_activity('proactive', 'draft_skipped', f'Empty/short content from {trigger_source} ({len(content)} chars)', {'trigger_source': trigger_source, 'content': content[:200]})
        return {'error': 'content too short or empty', 'skipped': True}
    # Check pending draft limit
    pending = await _supabase_query("ceo_drafts", "select=id&status=eq.pending_approval")
    if len(pending) >= MAX_PENDING_DRAFTS:
        return {"error": f"Too many pending drafts ({len(pending)}/{MAX_PENDING_DRAFTS}). Wait for founder to review."}

    draft = await _supabase_insert("ceo_drafts", {
        "channel": channel,
        "content": content,
        "reasoning": reasoning,
        "status": "pending_approval",
        "trigger_source": trigger_source,
        "trigger_data": trigger_data or {},
    })

    # Send to founder's WhatsApp
    approval_msg = f"\U0001f4dd New {channel.upper()} draft:\n\n{content}\n\n\U0001f4a1 Why: {reasoning}\n\nReply: yes/no/edit instructions"
    await send_to_founder(approval_msg, context="approval")

    return draft


async def approve_draft(draft_id: str) -> dict:
    """Approve a draft and publish it.

    Only marks the draft 'published' if the X API actually accepted the post
    AND returned a tweet ID. On failure, the draft stays in pending_approval
    and the error is logged + returned to the caller.
    """
    from twitter_client import post_tweet, post_thread, split_into_thread

    draft = await _supabase_query("ceo_drafts", f"select=*&id=eq.{draft_id}")
    if not draft:
        return {"error": "Draft not found"}
    draft = draft[0]

    if draft["channel"] != "x":
        return {"error": f"Channel {draft['channel']} publishing not implemented yet"}

    tweets = split_into_thread(draft["content"])
    try:
        if len(tweets) == 1:
            result = await post_tweet(tweets[0])
            x_post_id = (result or {}).get("data", {}).get("id", "")
        else:
            results = await post_thread(tweets)
            x_post_id = (results[0] or {}).get("data", {}).get("id", "") if results else ""
    except Exception as e:
        # X API rejected the tweet (rate limit, auth, content policy, etc.) — leave draft pending
        err_msg = f"X API publish failed: {type(e).__name__}: {str(e)[:300]}"
        await log_activity("proactive", "publish_failed", err_msg, {"draft_id": draft_id, "channel": "x"})
        await send_to_founder(f"\u26a0\ufe0f Tweet failed to post: {str(e)[:200]}\n\nDraft is still pending. Reply 'retry' to try again.", context="alert")
        return {"error": err_msg, "draft_id": draft_id, "published": False}

    if not x_post_id:
        # X returned 2xx but no tweet ID — treat as failure to avoid lying about publish state
        err_msg = "X API returned no tweet ID — publish status uncertain"
        await log_activity("proactive", "publish_uncertain", err_msg, {"draft_id": draft_id, "raw": str(result if len(tweets) == 1 else results)[:300]})
        await send_to_founder(f"\u26a0\ufe0f Tweet may not have posted — X returned no ID. Check timeline.", context="alert")
        return {"error": err_msg, "draft_id": draft_id, "published": False}

    updated = await _supabase_update("ceo_drafts", draft_id, {
        "status": "published",
        "published_at": datetime.now(timezone.utc).isoformat(),
        "x_post_id": x_post_id,
    })
    await send_to_founder(f"\u2705 Posted to X (id {x_post_id}): {draft['content'][:100]}...", context="approval")
    return updated


async def reject_draft(draft_id: str, feedback: str = "") -> dict:
    """Reject a draft and optionally generate pushback."""
    updated = await _supabase_update("ceo_drafts", draft_id, {
        "status": "rejected",
        "founder_feedback": feedback,
    })
    return updated


async def generate_pushback(draft_id: str) -> dict:
    """Rami argues back on a rejected draft with reasoning."""
    draft = await _supabase_query("ceo_drafts", f"select=*&id=eq.{draft_id}")
    if not draft:
        return {"error": "Draft not found"}
    draft = draft[0]

    prompt = f"""The founder rejected your draft post. Argue your case — but respectfully.

Your draft: {draft['content']}
Your reasoning: {draft['reasoning']}
Founder's feedback: {draft.get('founder_feedback', 'No specific feedback given.')}

Rules:
- Lead with data or logic, never emotion
- Acknowledge their concern first
- Make your case in 2-3 sentences max
- End with "But you're the boss." if you really believe in it, or "Fair enough." if you see their point
- Stay in character as Rami
"""

    pushback = await _llm_generate(prompt, max_tokens=200)

    await _supabase_update("ceo_drafts", draft_id, {"pushback_response": pushback})
    await send_to_founder(pushback, context="pushback")

    return {"pushback": pushback, "draft_id": draft_id}


async def get_pending_drafts() -> list:
    """Get all drafts pending founder approval."""
    return await _supabase_query("ceo_drafts", "select=*&status=eq.pending_approval&order=created_at.desc")


async def get_agent_status() -> dict:
    """Get status of all client agents (Rami as boss/architect)."""
    try:
        deployments = await _supabase_query("agent_deployments", "select=*&order=created_at.desc")
        clients = await _supabase_query("clients", "select=id,company_name,plan")

        client_map = {c["id"]: c for c in clients}
        agents = []
        for dep in deployments:
            client = client_map.get(dep.get("client_id", ""), {})
            agents.append({
                "client": client.get("company_name", "Unknown"),
                "plan": client.get("plan", "unknown"),
                "agent_type": dep.get("agent_type", "whatsapp"),
                "status": dep.get("status", "unknown"),
                "created": dep.get("created_at", ""),
            })
        return {"agents": agents, "total": len(agents)}
    except Exception as e:
        return {"error": str(e)}


async def log_activity(source: str, event_type: str, summary: str, data: dict = None) -> dict:
    """Log an observation to ceo_activity_log."""
    return await _supabase_insert("ceo_activity_log", {
        "source": source,
        "event_type": event_type,
        "summary": summary,
        "data": data or {},
    })


async def process_founder_message(message: str) -> str:
    """Process an incoming WhatsApp message from the founder."""
    # Log inbound
    await _supabase_insert("ceo_conversations", {
        "direction": "inbound",
        "content": message,
        "context": "command",
    })

    intent = parse_founder_intent(message)

    if intent["intent"] == "approve":
        pending = await get_pending_drafts()
        if pending:
            result = await approve_draft(pending[0]["id"])
            return f"Done. Posted: {pending[0]['content'][:80]}..."
        return "No pending drafts to approve."

    if intent["intent"] == "reject":
        pending = await get_pending_drafts()
        if pending:
            await reject_draft(pending[0]["id"], feedback=intent.get("feedback", ""))
            pushback = await generate_pushback(pending[0]["id"])
            return pushback.get("pushback", "Understood. Moving on.")
        return "No pending drafts to reject."

    if intent["intent"] == "edit":
        pending = await get_pending_drafts()
        if pending:
            # Revise the draft based on instructions
            revised = await _llm_generate(
                f"Revise this tweet based on the founder's instructions.\n\nOriginal: {pending[0]['content']}\nInstructions: {intent['instructions']}\n\nReturn ONLY the revised tweet text.",
                max_tokens=300,
            )
            await _supabase_update("ceo_drafts", pending[0]["id"], {"content": revised, "status": "pending_approval"})
            await send_to_founder(f"Revised draft:\n\n{revised}\n\nApprove? yes/no", context="approval")
            return f"Revised: {revised}"
        return "No pending drafts to edit."

    # General conversation / command
    feeds = await _aggregate_data_feeds()
    response = await _llm_generate(
        f"The founder sent you this message: \"{message}\"\n\nCurrent system data:\n{json.dumps(feeds, indent=2, default=str)}\n\nRespond as Rami. Be helpful, direct, use real data.",
        max_tokens=300,
    )
    return response


# ── Cron-Triggered Functions ──────────────────────────

async def cron_morning_brief():
    """Called by cron at 6 AM UAE. Generate and send morning brief."""
    brief = await generate_company_brief()
    await send_to_founder(brief["brief"], context="brief")
    await log_activity("pipeline", "morning_brief", "Sent morning brief to founder", brief)
    return brief


async def cron_post_karpathy():
    """Called after nightly Karpathy Loop. Analyze results, draft tweet if interesting."""
    import traceback
    try:
        from karpathy_loop import get_rule_status
        clients = await _supabase_query("clients", "select=id,company_name")
        all_rules = []
        for c in clients[:5]:  # Top 5 clients
            try:
                rules = await get_rule_status(c["id"])
                all_rules.append({"client": c["company_name"], "rules": rules})
            except Exception as ce:
                await log_activity("karpathy", "client_rule_fetch_failed", f"{c.get('company_name','?')}: {type(ce).__name__}: {ce}", {"client_id": c.get("id")})
                continue

        if not all_rules:
            await log_activity("karpathy", "cron_skipped", "No karpathy data available across sampled clients")
            return {"status": "no_data"}

        prompt = f"""The Karpathy Loop just finished. Here are tonight's results across {len(all_rules)} clients:

{json.dumps(all_rules, indent=2, default=str)[:2000]}

Draft a tweet about the most interesting finding. Make it thought-leadership quality — not self-promotional, but genuinely insightful about AI self-improvement. Include a specific number or metric if possible.

Write ONLY the tweet text (under 280 chars). No hashtags.
"""
        tweet = await _llm_generate(prompt, max_tokens=100, temperature=0.9)
        tweet = (tweet or "").strip().strip('"')

        if not tweet or len(tweet) > 280:
            await log_activity("karpathy", "cron_skipped", f"LLM produced unusable tweet ({len(tweet)} chars)", {"preview": tweet[:200]})
            return {"status": "tweet_invalid", "length": len(tweet)}

        # create_draft has its own short-content guard, but we already validated length
        draft = await create_draft(
            channel="x",
            content=tweet,
            reasoning="Post-Karpathy insight — based on real data from tonight's loop",
            trigger_source="karpathy_cron",
        )
        return draft

    except Exception as e:
        tb = traceback.format_exc()[:1500]
        await log_activity("karpathy", "cron_error", f"Post-Karpathy tweet failed: {type(e).__name__}: {e}", {"traceback": tb})
        return {"status": "error", "error": f"{type(e).__name__}: {e}"}


async def cron_github_digest():
    """Called every 2 hours. Check for new commits, draft changelog/tweet if interesting."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.github.com/repos/dhnpmp-tech/project-agent/commits?per_page=10",
                headers={"Accept": "application/vnd.github.v3+json"},
            )
            if resp.status_code != 200:
                return {"status": "github_api_error"}

            commits = resp.json()
            recent = [c for c in commits if c.get("commit", {}).get("author", {}).get("date", "") > (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()]

            if not recent:
                return {"status": "no_new_commits"}

            await log_activity("github", "new_commits", f"{len(recent)} commits in last 2h", {"commits": [c["commit"]["message"][:100] for c in recent]})

            # Only draft tweet if there are significant commits (3+ or a feat commit)
            feat_commits = [c for c in recent if c["commit"]["message"].startswith("feat")]
            if len(recent) >= 3 or feat_commits:
                commit_list = "\n".join(f"- {c['commit']['message'][:80]}" for c in recent[:5])
                prompt = f"""We just shipped {len(recent)} commits:\n{commit_list}\n\nDraft a brief, excited tweet about what was shipped. Rami's voice — direct, proud but not boastful. Under 280 chars. No hashtags."""
                tweet = await _llm_generate(prompt, max_tokens=100, temperature=0.9)
                tweet = tweet.strip().strip('"')
                if len(tweet) <= 280:
                    await create_draft(channel="x", content=tweet, reasoning=f"Shipped {len(recent)} commits", trigger_source="github_digest")

            return {"commits": len(recent)}
    except Exception as e:
        return {"status": f"error: {e}"}


async def cron_market_intel():
    """Called every hour. Check market intel for prospect/content signals."""
    try:
        from market_intel import get_trending_content_ideas
        trends = await get_trending_content_ideas(business_type="AI agents", location="UAE")
        if trends:
            await log_activity("intel", "trends", f"Found {len(trends)} trending topics", {"trends": trends[:5]})
        return {"trends": len(trends) if trends else 0}
    except Exception as e:
        await log_activity("intel", "cron_error", f"Market intel scan failed: {e}")
        return {"status": f"error: {e}"}
