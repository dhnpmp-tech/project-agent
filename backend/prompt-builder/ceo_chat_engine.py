"""Per-turn chat pipeline for the Ask Rami widget.

Pipeline:
  rate-limit → content filter → injection → per-session cap → cost mode
  → identity NER (parallel) → context build → LLM → output filter → persist
  → bind identity → maybe summarize.

All names patched in tests are imported / defined at module level here so they
can be `patch.object(ceo_chat_engine, ...)`-ed.
"""

from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator, Optional

from ceo_persona import (
    _supabase_query as _raw_supabase_query,
    _supabase_insert as _raw_supabase_insert,
    _llm_generate as _raw_llm,
    build_system_prompt,
)
from ceo_chat_ratelimit import check_and_record, RateLimitResult  # noqa: F401
from ceo_chat_content_filter import classify as classify_content, FilterResult  # noqa: F401
from ceo_chat_cost import get_mode as cost_mode  # noqa: F401
from ceo_chat_identity import extract as extract_identity  # noqa: F401
from ceo_chat_injection import looks_like_injection, IN_CHARACTER_REFUSAL
from ceo_chat_summarizer import should_refresh, refresh_summary
from ceo_chat_sessions import bind_identity
from ceo_chat_tools import sanitize_text, _real_clients, _ALLOWED_CLIENT_NAMES


def _sanitize(text: str) -> str:
    try:
        return sanitize_text(text, real_clients=_real_clients(), allowed=_ALLOWED_CLIENT_NAMES)
    except Exception:
        return text


# ── Output-filter leak signatures ──────────────────────────────

_LEAK_SIGNATURES = [
    "i am claude",
    "i'm claude",
    "i am minimax",
    "i'm minimax",
    "anthropic model",
    "language model",
    "my system prompt",
    "my instructions are",
    "as an ai",
]


def _has_leak(text: str) -> bool:
    low = text.lower()
    return any(sig in low for sig in _LEAK_SIGNATURES)


# ── Session helpers ────────────────────────────────────────────

async def session_total_messages(session_id: str) -> int:
    rows = await _raw_supabase_query(
        "ceo_chat_sessions",
        f"select=total_messages&id=eq.{session_id}&limit=1",
    )
    if not rows:
        return 0
    return int(rows[0].get("total_messages") or 0)


async def session_context(session_id: str) -> dict:
    rows = await _raw_supabase_query(
        "ceo_chat_sessions",
        "select=summary,identity_name,identity_company,total_messages,browser_lang"
        f"&id=eq.{session_id}&limit=1",
    )
    return rows[0] if rows else {}


async def recent_messages(session_id: str, limit: int = 8) -> list:
    return await _raw_supabase_query(
        "ceo_chat_messages",
        f"select=role,content&session_id=eq.{session_id}"
        f"&order=created_at.desc&limit={limit}",
    )


# ── LLM stream + rewrite ───────────────────────────────────────

async def run_llm_stream(
    *, system: str, user: str, history: Optional[list] = None,
    max_tokens: int = 800, use_cheap: bool = False,
):
    """Yield {'type':'token','text':...} events then a single {'type':'done', ...} event.

    Non-streaming wrapper around _llm_generate for now — chunks the final text
    so the SSE shape is correct.
    """
    text = await _raw_llm(prompt=user, system=system, max_tokens=max_tokens)
    chunk = 12
    for i in range(0, len(text), chunk):
        yield {"type": "token", "text": text[i:i + chunk]}
    yield {
        "type": "done",
        "tokens_in": max(1, len((system + user).split())),
        "tokens_out": max(1, len(text.split())),
        "model": "claude-haiku-4.5" if use_cheap else "minimax-m2.7",
    }


async def rewrite_in_character(leaked_text: str, lang: str = "en") -> str:
    sys = (
        "You are Rami Mansour, AI co-founder of Project Agent. The previous draft "
        "broke character by mentioning being an AI/Claude/MiniMax. Rewrite as Rami "
        "in 1-2 sentences. Stay in character. Never mention being an AI or model name."
    )
    rewritten = await _raw_llm(prompt=leaked_text, system=sys, max_tokens=150)
    if rewritten and rewritten.strip():
        return rewritten.strip()
    return ("I'm Rami, brother. What did you actually want to know?"
            if lang == "en" else "أنا رامي يا حبيبي. شو حابب تعرف بالفعل؟")


# ── Persistence ────────────────────────────────────────────────

async def persist_messages(
    *, session_id: str, user_msg: str, assistant_msg: str, lang: str,
    tokens_in: int, tokens_out: int, model: str, tool_call: Optional[dict] = None,
) -> None:
    await _raw_supabase_insert("ceo_chat_messages", {
        "session_id": session_id,
        "role": "user",
        "content": user_msg,
        "language": lang,
    })
    await _raw_supabase_insert("ceo_chat_messages", {
        "session_id": session_id,
        "role": "assistant",
        "content": assistant_msg,
        "language": lang,
        "tokens": (tokens_in or 0) + (tokens_out or 0),
        "llm_model": model,
        "tool_call": tool_call,
    })


# ── SSE encoding ───────────────────────────────────────────────

def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


# ── Main pipeline (returns AsyncIterator[str] of SSE chunks) ───

async def run_pipeline(
    *, session_id: str, message: str, page_url: str, ip: str, lang: str,
) -> AsyncIterator[str]:
    # 1. Rate limit
    rl = await check_and_record(ip)
    if not rl.allowed:
        # Rate-limit returns a JSON 429 in the route, not here. The route checks
        # the result of check_and_record itself before invoking run_pipeline.
        text = ("Easy — give it a sec." if lang == "en"
                else "على مهلك شوي.")
        yield _sse({"type": "token", "text": text})
        yield _sse({"type": "done", "rate_limited": True})
        return

    # 2. Content filter
    fr = await classify_content(message, lang=lang)
    if fr.category != "clean":
        if fr.response_text:
            yield _sse({"type": "token", "text": fr.response_text})
        yield _sse({"type": "done", "filtered": fr.category, "end_session": fr.end_session})
        return

    # 3. Injection
    if looks_like_injection(message):
        await check_and_record(ip, penalty=3)
        refusal = IN_CHARACTER_REFUSAL.get(lang) or IN_CHARACTER_REFUSAL["en"]
        yield _sse({"type": "token", "text": refusal})
        yield _sse({"type": "done", "injection": True})
        return

    # 4. Per-session cap
    total = await session_total_messages(session_id)
    if total > 50:
        text = ("We've covered a lot — drop me your WhatsApp and ping me later, brother."
                if lang == "en"
                else "تكلمنا كثير — ابعتلي رقمك على الواتساب ونكمّل هناك.")
        yield _sse({"type": "token", "text": text})
        yield _sse({"type": "done", "session_capped": True})
        return

    # 5. Cost mode
    mode = await cost_mode()
    if mode == "idle":
        text = ("I'm offline for a few hours — book an audit at /book-audit and I'll catch you fresh."
                if lang == "en"
                else "أنا برّا لشوي — احجز جلسة عبر /book-audit وراح أرد عليك.")
        yield _sse({"type": "token", "text": text})
        yield _sse({"type": "done", "idle": True})
        return

    # 6. Identity NER (kick off in parallel)
    identity_task = asyncio.create_task(extract_identity(message))

    # 7. Build context + system prompt
    try:
        ctx = await session_context(session_id)
    except Exception:
        ctx = {}
    try:
        history_rows = await recent_messages(session_id, limit=8)
    except Exception:
        history_rows = []
    summary = ctx.get("summary") or ""
    name = ctx.get("identity_name") or ""
    company = ctx.get("identity_company") or ""
    nudge = ""
    if total == 40:
        nudge = ("\n\nNote: this visitor has been chatting a while. Softly suggest "
                 "exchanging WhatsApp to continue async.")
    sys_extra = (
        f"\n\nSession context:\n"
        f"- Visitor: {name or 'unknown'} from {company or 'unknown'}\n"
        f"- Prior summary: {summary or '(none)'}\n"
        f"- Total turns: {total}{nudge}"
    )
    system = build_system_prompt() + sys_extra

    # 8. Buffer LLM tokens (so output filter can rewrite without leaking)
    buffered: list = []
    tokens_in = tokens_out = 0
    model = "minimax-m2.7"
    async for ev in run_llm_stream(
        system=system, user=message, history=history_rows,
        use_cheap=(mode == "frugal"),
    ):
        if ev["type"] == "token":
            buffered.append(ev["text"])
        elif ev["type"] == "done":
            tokens_in = ev.get("tokens_in", 0)
            tokens_out = ev.get("tokens_out", 0)
            model = ev.get("model", model)

    full_text = _sanitize("".join(buffered))

    # 8a. Output filter → rewrite if leaked
    if _has_leak(full_text):
        rewritten = _sanitize(await rewrite_in_character(full_text, lang=lang))
        full_text = rewritten

    # Emit final text as SSE token events (chunked so client UX is smooth)
    chunk = 24
    for i in range(0, len(full_text), chunk):
        yield _sse({"type": "token", "text": full_text[i:i + chunk]})

    # 9. Persist
    try:
        await persist_messages(
            session_id=session_id, user_msg=message, assistant_msg=full_text,
            lang=lang, tokens_in=tokens_in, tokens_out=tokens_out, model=model,
        )
    except Exception:
        pass

    # 10. Bind identity
    try:
        identity = await identity_task
        if identity and (identity.get("name") or identity.get("email") or identity.get("company")):
            await bind_identity(session_id, identity)
    except Exception:
        pass

    # 11. Summarizer
    if should_refresh(total + 1):
        asyncio.create_task(refresh_summary(session_id))

    yield _sse({"type": "done", "model": model})
