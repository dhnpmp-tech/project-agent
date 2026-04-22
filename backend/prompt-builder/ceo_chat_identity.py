"""Identity NER pass — runs on every user message via cheap Haiku call.

Returns a normalized dict; failures degrade gracefully to an empty inferred result.
"""

from __future__ import annotations

import json

from ceo_persona import _llm_generate as _raw_llm


async def _llm_generate(system: str, user: str, max_tokens: int = 200, prefer_cheap: bool = True) -> str:
    return await _raw_llm(prompt=user, system=system, max_tokens=max_tokens)


_SYSTEM = """Extract identifying details from a single chat message.
Return STRICT JSON with these keys:
  name (string|null), company (string|null), email (string|null),
  whatsapp (E.164 string|null), confidence ("confirmed"|"inferred"),
  inferred_tags (array of strings, optional).

"confirmed" means the user explicitly stated it ("I'm X", "we're Y", "my email is Z").
"inferred" means implicit ("we run a salon in Jeddah" → tags: ["salon_owner","jeddah"]).
Never hallucinate. If absent, use null.
Output JSON only, no prose."""


def _empty() -> dict:
    return {
        "name": None,
        "company": None,
        "email": None,
        "whatsapp": None,
        "confidence": "inferred",
        "inferred_tags": [],
    }


async def extract(message: str) -> dict:
    raw = await _llm_generate(
        system=_SYSTEM,
        user=message,
        max_tokens=200,
        prefer_cheap=True,
    )
    try:
        parsed = json.loads(raw.strip())
    except (json.JSONDecodeError, AttributeError):
        return _empty()
    out = _empty()
    out.update({k: parsed.get(k) for k in ("name", "company", "email", "whatsapp")})
    if parsed.get("confidence") in ("confirmed", "inferred"):
        out["confidence"] = parsed["confidence"]
    if isinstance(parsed.get("inferred_tags"), list):
        out["inferred_tags"] = [str(t) for t in parsed["inferred_tags"]]
    return out
