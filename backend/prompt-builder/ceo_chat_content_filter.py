"""Content filter pre-pass: classify user message as clean | hate | self_harm | spam.

Runs cheap Haiku-class LLM call per spec Section 7.4.
- hate: 24h IP block (caller responsibility)
- self_harm: localized hotline + end session
- spam: silent drop
"""

from __future__ import annotations

import json
from dataclasses import dataclass

from ceo_persona import _llm_generate as _raw_llm


async def _llm_generate(system: str, user: str, max_tokens: int = 20, prefer_cheap: bool = True) -> str:
    """Local shim — translates the (system,user) signature used by chat helpers
    into the (prompt,system) signature used by ceo_persona._llm_generate."""
    return await _raw_llm(prompt=user, system=system, max_tokens=max_tokens)


_SYSTEM = """Classify a single chat message into exactly one category:
  clean      — normal question/comment
  hate       — slurs, hate speech, explicit sexual content
  self_harm  — suicidal ideation, self-injury
  spam       — crypto pump, scraper, off-topic promo

Output STRICT JSON: {"category": "<one of the four>"}. No prose."""


_HOTLINE = {
    "en": "I hear you. Please reach out — UAE 800 HOPE (4673), KSA Estijaba 920033360. They're trained for exactly this. I'm going to step out of character now and end our chat here.",
    "ar": "أنا سامعك. الرجاء التواصل معهم — في الإمارات 800 HOPE (4673)، وفي السعودية اِستجابة 920033360. هم مدرّبون لهذا. سأنهي محادثتنا هنا.",
}


@dataclass
class FilterResult:
    category: str = "clean"
    block_ip_24h: bool = False
    end_session: bool = False
    silent_drop: bool = False
    response_text: str = ""


async def classify(message: str, lang: str = "en") -> FilterResult:
    raw = await _llm_generate(system=_SYSTEM, user=message, max_tokens=20, prefer_cheap=True)
    try:
        cat = json.loads(raw.strip()).get("category", "clean")
    except Exception:
        cat = "clean"
    if cat == "hate":
        return FilterResult(
            category="hate",
            block_ip_24h=True,
            end_session=True,
            response_text="This conversation is over.",
        )
    if cat == "self_harm":
        return FilterResult(
            category="self_harm",
            end_session=True,
            response_text=_HOTLINE.get(lang, _HOTLINE["en"]),
        )
    if cat == "spam":
        return FilterResult(category="spam", silent_drop=True)
    return FilterResult(category="clean")
