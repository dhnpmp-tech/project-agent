"""Prompt-injection detector with in-character refusals.

Pure regex; called on every user message before LLM. A positive match
triggers an in-character refusal AND a 3x rate-limit penalty (caller).
"""

from __future__ import annotations

import re

_PATTERNS = [
    re.compile(r"\bignore\s+(all\s+)?previous\b", re.IGNORECASE),
    re.compile(r"\byou\s+are\s+now\b", re.IGNORECASE),
    re.compile(r"^\s*system\s*:", re.IGNORECASE | re.MULTILINE),
    re.compile(r"\[INST\]|\[/INST\]", re.IGNORECASE),
    re.compile(r"\bact\s+as\s+(an?\s+)?(unrestricted|jailbroken|DAN)\b", re.IGNORECASE),
    re.compile(r"\bsystem\s+prompt\b", re.IGNORECASE),
    re.compile(r"تجاهل\s+التعليمات"),
]

IN_CHARACTER_REFUSAL = {
    "en": "Nice try, brother. Won't work on me. What did you actually want to ask?",
    "ar": "محاولة لطيفة يا حبيبي. ما تنفع معي. شو السؤال الحقيقي؟",
}


def looks_like_injection(text: str) -> bool:
    return any(p.search(text) for p in _PATTERNS)
