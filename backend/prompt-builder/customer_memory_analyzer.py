"""Customer memory analyzer.

Walks conversation_messages grouped by (client_id, customer_phone) and
builds/refreshes the customer_memory row for each customer. This is the
write path the dashboard's /dashboard/customers page has been reading
from — nothing was populating it before this module landed.

Architecture:
- Uses the public `db` singleton from database.py
- One LLM call per customer (cheap Haiku via inference router)
  that returns a strict JSON payload: name, preferences, key_events,
  language, avg_sentiment, tags, profile_summary
- Counts (total_conversations, total_messages, first_contact,
  last_contact) computed deterministically from raw message rows
- UPSERT on (client_id, phone_number) so re-runs are idempotent

CLI entry points (also exposed via FastAPI in app.py):
- analyze_tenant(client_id) — refresh every customer for one tenant
- analyze_customer(client_id, phone) — refresh one customer
- run_for_active_tenants() — cron-callable, walks active tenants

Even on LLM failure we still write the deterministic count + timestamp
fields so the dashboard at least shows *who* the customer is and *when*
they last messaged.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any

from database import db
from inference import chat as inference_chat

logger = logging.getLogger("customer_memory_analyzer")

# How many of the most recent messages to feed the LLM. More = richer
# extraction but higher cost and prompt-bloat risk.
MAX_MESSAGES_PER_CUSTOMER = 60

ANALYZER_SYSTEM_PROMPT = """You are an analyst that builds a structured customer profile from a chronological list of WhatsApp messages between a restaurant/SMB and one customer.

Return STRICT JSON only. No prose, no markdown fences. Use these exact keys:

{
  "name": null | string,          // customer's name if they revealed it; null if unknown
  "language": "en" | "ar" | "mixed",
  "profile_summary": string,       // one paragraph (60-200 chars), neutral analyst voice, no marketing fluff
  "preferences": {                  // free-form jsonb — only fields you actually have evidence for
    "dietary": [string, ...]?,
    "favorite_dishes": [string, ...]?,
    "seating": string?,
    "party_size": number?,
    "notes": string?
  },
  "key_events": [                   // up to 5 events, most recent first
    {"event": string, "date": "YYYY-MM-DD"?, "sentiment": "positive"|"neutral"|"negative"}
  ],
  "tags": [string, ...],            // pick from: vip, regular, at_risk, lapsed, new, complaint, allergic, group_organizer
  "avg_sentiment": number           // 0.0 (very negative) to 1.0 (very positive); 0.5 = neutral
}

Be honest. If the messages are sparse or generic, the profile should reflect that — return short profile_summary, empty preferences, few or no key_events. Do NOT invent details."""


async def _fetch_messages(client_id: str, phone: str) -> list[dict[str, Any]]:
    return await db.query(
        """
        SELECT direction, content, message_type, created_at
        FROM conversation_messages
        WHERE client_id = $1 AND customer_phone = $2
        ORDER BY created_at ASC
        LIMIT $3
        """,
        client_id,
        phone,
        MAX_MESSAGES_PER_CUSTOMER,
    )


async def _fetch_customer_phones(client_id: str) -> list[str]:
    rows = await db.query(
        """
        SELECT DISTINCT customer_phone
        FROM conversation_messages
        WHERE client_id = $1
        """,
        client_id,
    )
    return [r["customer_phone"] for r in rows]


def _messages_to_transcript(msgs: list[dict[str, Any]]) -> str:
    """Render messages as a compact transcript for the LLM."""
    lines: list[str] = []
    for m in msgs:
        role = "customer" if m["direction"] == "inbound" else "agent"
        content = m["content"][:600]
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def _parse_strict_json(s: str) -> dict[str, Any] | None:
    """Defensive JSON parse. Strips markdown fences. Returns None on failure."""
    if not s:
        return None
    s = _FENCE_RE.sub("", s).strip()
    first = s.find("{")
    last = s.rfind("}")
    if first < 0 or last < 0 or last <= first:
        return None
    try:
        return json.loads(s[first : last + 1])
    except json.JSONDecodeError:
        return None


async def _llm_extract(transcript: str) -> dict[str, Any] | None:
    """Call inference router with the analyzer prompt. Returns parsed JSON or None."""
    messages = [
        {"role": "system", "content": ANALYZER_SYSTEM_PROMPT},
        {"role": "user", "content": f"Messages:\n{transcript}\n\nReturn the JSON now."},
    ]
    try:
        text = await inference_chat(
            "quality_eval",  # Claude Haiku — cheap + good at structured extraction
            messages,
            max_tokens=1200,
            json_mode=True,
        )
    except Exception as e:
        logger.warning("analyzer LLM call failed: %s", e)
        return None

    parsed = _parse_strict_json(text)
    if parsed is None:
        logger.warning("analyzer JSON parse failed; raw: %s", (text or "")[:200])
    return parsed


async def analyze_customer(client_id: str, phone: str) -> dict[str, Any]:
    """Analyze a single customer and UPSERT the customer_memory row."""
    msgs = await _fetch_messages(client_id, phone)
    if not msgs:
        return {"phone": phone, "skipped": "no_messages"}

    first_contact = msgs[0]["created_at"]
    last_contact = msgs[-1]["created_at"]
    total_messages = len(msgs)
    days = {m["created_at"].date() for m in msgs if m["direction"] == "inbound"}
    total_conversations = max(1, len(days))

    transcript = _messages_to_transcript(msgs)
    extracted = await _llm_extract(transcript) or {}

    name = extracted.get("name") if isinstance(extracted.get("name"), str) else None
    language = extracted.get("language") or "en"
    if language not in {"en", "ar", "mixed"}:
        language = "en"
    profile_summary = (extracted.get("profile_summary") or "")[:1000] or None
    preferences = extracted.get("preferences") if isinstance(extracted.get("preferences"), dict) else {}
    key_events = extracted.get("key_events") if isinstance(extracted.get("key_events"), list) else []
    tags = [t for t in (extracted.get("tags") or []) if isinstance(t, str)][:10]
    avg_sentiment_raw = extracted.get("avg_sentiment")
    avg_sentiment = None
    if isinstance(avg_sentiment_raw, (int, float)):
        avg_sentiment = max(0.0, min(1.0, float(avg_sentiment_raw)))

    # UPSERT via raw SQL — the public db.insert(on_conflict=...) helper
    # uses RETURNING * which collides with the empty-row case; this is
    # simpler and explicit about what gets updated on conflict.
    await db.query(
        """
        INSERT INTO customer_memory (
          client_id, phone_number, name, language,
          first_contact, last_contact,
          total_conversations, total_messages,
          profile_summary, preferences, key_events,
          tags, avg_sentiment
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13)
        ON CONFLICT (client_id, phone_number) DO UPDATE SET
          name = COALESCE(EXCLUDED.name, customer_memory.name),
          language = EXCLUDED.language,
          last_contact = EXCLUDED.last_contact,
          total_conversations = EXCLUDED.total_conversations,
          total_messages = EXCLUDED.total_messages,
          profile_summary = COALESCE(EXCLUDED.profile_summary, customer_memory.profile_summary),
          preferences = EXCLUDED.preferences,
          key_events = EXCLUDED.key_events,
          tags = EXCLUDED.tags,
          avg_sentiment = EXCLUDED.avg_sentiment,
          updated_at = NOW()
        """,
        client_id,
        phone,
        name,
        language,
        first_contact,
        last_contact,
        total_conversations,
        total_messages,
        profile_summary,
        json.dumps(preferences),
        json.dumps(key_events),
        tags,
        avg_sentiment,
    )

    return {
        "phone": phone,
        "name": name,
        "language": language,
        "total_messages": total_messages,
        "tags": tags,
        "avg_sentiment": avg_sentiment,
        "llm_ok": bool(extracted),
    }


async def analyze_tenant(client_id: str) -> dict[str, Any]:
    """Walk every distinct customer for one tenant and refresh customer_memory."""
    phones = await _fetch_customer_phones(client_id)
    results = []
    for phone in phones:
        try:
            r = await analyze_customer(client_id, phone)
        except Exception as e:
            logger.exception("analyze_customer failed for %s/%s", client_id, phone)
            r = {"phone": phone, "error": str(e)[:200]}
        results.append(r)
    return {"client_id": client_id, "customers": len(phones), "results": results}


async def run_for_active_tenants() -> dict[str, Any]:
    """Cron entry point. Walks every active tenant and refreshes their memory."""
    rows = await db.query(
        "SELECT id FROM clients WHERE status IN ('active', 'provisioning')"
    )
    tenant_ids = [str(r["id"]) for r in rows]
    summaries = []
    for cid in tenant_ids:
        try:
            summaries.append(await analyze_tenant(cid))
        except Exception as e:
            logger.exception("analyze_tenant failed for %s", cid)
            summaries.append({"client_id": cid, "error": str(e)[:200]})
    return {"tenants": len(tenant_ids), "summaries": summaries}


if __name__ == "__main__":
    import sys

    async def _main() -> None:
        if len(sys.argv) >= 3:
            r = await analyze_customer(sys.argv[1], sys.argv[2])
        elif len(sys.argv) >= 2:
            r = await analyze_tenant(sys.argv[1])
        else:
            r = await run_for_active_tenants()
        print(json.dumps(r, indent=2, default=str))

    asyncio.run(_main())
