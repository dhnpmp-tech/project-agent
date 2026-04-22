"""Ask Rami chat widget — public HTTP surface."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Cookie, HTTPException, Query, Response
from pydantic import BaseModel

from ceo_persona import _supabase_query
from ceo_chat_sessions import bind_identity, forget, history

router = APIRouter(prefix="/ceo/chat")


# Page-aware greeting templates (no LLM call — pure templated hooks).
_GREETINGS: dict[tuple[str, str], dict] = {
    ("/pricing", "en"): {
        "greeting": "AED 3K setup, 1.5–8K/mo. Want me to walk you through what fits your industry?",
        "chips": ["What does setup include?", "Restaurant pricing?", "Show me the stack"],
    },
    ("/pricing", "ar"): {
        "greeting": "الإعداد ٣ آلاف، والشهري بين ١٫٥ و٨ آلاف. تحب أوريك إيش يناسب قطاعك؟",
        "chips": ["إيش يشمل الإعداد؟", "أسعار المطاعم؟", "وريني التقنية"],
    },
    ("/services", "en"): {
        "greeting": "Five agents, one brain that learns across the fleet. Want a demo of any in particular?",
        "chips": ["Customer service", "Content engine", "Sales rep"],
    },
    ("/services", "ar"): {
        "greeting": "هلا. شفت الـcontent engine؟ يكتب ٣٠ بوست بالشهر لمطعمكم بالعربي. تحب أوريك؟",
        "chips": ["خدمة العملاء", "محرّك المحتوى", "مندوب المبيعات"],
    },
}

_DEFAULT_GREETING_EN = {
    "greeting": "I'm Rami, the AI co-founder. Ask me anything about Project Agent — I'll show you live data while we talk.",
    "chips": ["What do you build?", "Pricing?", "Show me a real client"],
}
_DEFAULT_GREETING_AR = {
    "greeting": "أنا رامي، الـco-founder الذكي. اسألني أي شي عن Project Agent — راح أوريك بيانات حيّة وإحنا نتكلّم.",
    "chips": ["إيش تبنون؟", "الأسعار؟", "وريني عميل حقيقي"],
}


@router.get("/greeting")
async def greeting(
    path: str = Query("/"),
    lang: str = Query("en"),
    ceo_session_id: Optional[str] = Cookie(default=None),
) -> dict:
    if lang not in ("en", "ar"):
        lang = "en"

    # Returning-visitor branch (spec Section 4.5).
    if ceo_session_id:
        params = (
            "select=identity_name,identity_company,summary"
            f"&id=eq.{ceo_session_id}"
            "&limit=1"
        )
        rows = await _supabase_query("ceo_chat_sessions", params)
        if rows and (rows[0].get("identity_name") or rows[0].get("summary")):
            row = rows[0]
            name = row.get("identity_name") or ("there" if lang == "en" else "")
            summary = row.get("summary") or ""
            if lang == "en":
                text = f"Welcome back, {name}." + (f" Last we talked: {summary} Anything change?" if summary else "")
            else:
                text = f"حيّاك يا {name}." + (f" آخر مرة تكلّمنا عن: {summary}. شي تغيّر؟" if summary else "")
            return {
                "greeting": text.strip(),
                "chips": ["Pick up where we left off", "Something new"] if lang == "en"
                         else ["نكمل من وين وقفنا", "شي جديد"],
            }

    key = (path, lang)
    if key in _GREETINGS:
        return _GREETINGS[key]
    return _DEFAULT_GREETING_EN if lang == "en" else _DEFAULT_GREETING_AR


# ── Identify / forget / history ──────────────────────────────────────

class IdentifyBody(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    confidence: str = "confirmed"


@router.post("/identify")
async def identify(
    body: IdentifyBody,
    response: Response,
    ceo_session_id: Optional[str] = Cookie(default=None),
):
    if not ceo_session_id:
        raise HTTPException(status_code=400, detail="missing session cookie")
    new_id = await bind_identity(ceo_session_id, body.model_dump())
    if new_id != ceo_session_id:
        # Merge happened — re-issue cookie pointing at the older session.
        response.set_cookie(
            "ceo_session_id", new_id, httponly=True, samesite="lax",
            secure=True, max_age=60 * 60 * 24 * 365,
        )
    return {"session_id": new_id, "merged": new_id != ceo_session_id}


@router.post("/forget/{session_id}")
async def forget_route(
    session_id: str,
    response: Response,
    ceo_session_id: Optional[str] = Cookie(default=None),
):
    if ceo_session_id != session_id:
        raise HTTPException(status_code=403, detail="cookie/session mismatch")
    await forget(session_id)
    response.delete_cookie("ceo_session_id")
    return {"ok": True}


@router.get("/history/{session_id}")
async def history_route(
    session_id: str,
    ceo_session_id: Optional[str] = Cookie(default=None),
):
    if ceo_session_id != session_id:
        raise HTTPException(status_code=403, detail="cookie/session mismatch")
    return {"messages": await history(session_id)}
