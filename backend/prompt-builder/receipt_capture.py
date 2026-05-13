"""Receipt → Expense via WhatsApp.

Owner sends a receipt image to the owner-channel WhatsApp number.
We:
  1. Pull the media URL from the Kapso webhook payload
  2. Route the image through `inference.chat("receipt_ocr", …)` with a
     strict JSON schema — provider/model chosen by the inference router.
  3. Parse vendor / amount / currency / VAT / category / date
  4. Write to `expenses` (status=pending_review)
  5. Reply to the owner with a one-tap confirm/edit message

Multi-currency: AED + SAR detected from the receipt itself, fallback to client default.
"""

from __future__ import annotations

import base64
import json
import os
import re
from datetime import datetime, timezone
from typing import Any

import httpx
import supa  # post-Supabase shim (routes _SUPA_URL → asyncpg)
import inference  # central role-to-model router (DCP-first when models served)

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
_KAPSO_KEY = os.environ.get("KAPSO_PLATFORM_API_KEY", "")

_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

VAT_RATES = {"AED": 0.05, "SAR": 0.15}
CATEGORIES = ("inventory", "utilities", "salaries", "marketing", "rent", "misc")

EXTRACTION_PROMPT = """You extract structured expense data from a receipt photo.
Return ONLY a JSON object matching this exact schema (no prose, no markdown fence):

{
  "vendor": "string (merchant name, max 80 chars)",
  "currency": "AED | SAR | USD | EUR | OTHER",
  "amount_total": number,        // grand total, decimal in major units
  "vat_amount": number,          // VAT line, 0 if not shown
  "receipt_date": "YYYY-MM-DD",  // best guess from receipt; null if unreadable
  "category": "inventory | utilities | salaries | marketing | rent | misc",
  "line_items_summary": "string (e.g. '3× Coffee, 1× Pastry')",
  "confidence": number           // 0..1
}

Rules:
- If a field is unreadable, set it to null (or 0 for numbers).
- Pick category by best guess from vendor + line items.
- Numbers in MAJOR units (not cents).
- No commentary outside the JSON."""


# ─── Public API ──────────────────────────────────────────────────────────

async def handle_receipt(
    client_id: str,
    owner_phone: str,
    media_url: str,
    media_bytes: bytes | None = None,
    default_currency: str = "AED",
) -> dict[str, Any]:
    """Process one receipt image. Returns the persisted expense row.

    `media_bytes` is optional — if not provided, we download from `media_url`.
    """
    if media_bytes is None:
        media_bytes = await _download(media_url)
    if not media_bytes:
        return {"error": "media_unavailable"}

    extracted = await _extract_with_vision(media_bytes)
    expense = _build_expense_record(
        extracted=extracted,
        client_id=client_id,
        owner_phone=owner_phone,
        media_url=media_url,
        default_currency=default_currency,
    )
    saved = await _insert("expenses", expense)
    await _send_confirm_message(owner_phone, expense, client_id)
    return saved


def _build_expense_record(
    extracted: dict,
    client_id: str,
    owner_phone: str,
    media_url: str,
    default_currency: str,
) -> dict:
    """Map vision output → expenses row. Pure, easy to unit-test."""
    currency = (extracted.get("currency") or default_currency).upper()
    if currency not in {"AED", "SAR", "USD", "EUR"}:
        currency = default_currency

    amount = _to_minor(extracted.get("amount_total"))
    vat = _to_minor(extracted.get("vat_amount"))

    if amount and not vat and currency in VAT_RATES:
        rate = VAT_RATES[currency]
        vat = int(round(amount * rate / (1 + rate)))

    category = (extracted.get("category") or "misc").lower()
    if category not in CATEGORIES:
        category = "misc"

    return {
        "client_id": client_id,
        "source": "whatsapp_receipt",
        "vendor": (extracted.get("vendor") or "").strip()[:80] or None,
        "category": category,
        "amount_minor": amount,
        "currency": currency,
        "vat_minor": vat,
        "receipt_date": extracted.get("receipt_date"),
        "receipt_url": media_url,
        "raw_text": extracted.get("line_items_summary"),
        "extracted_meta": {
            "confidence": extracted.get("confidence"),
            # Inference router decides the model — record the role here so
            # we don't have to update this column when routing changes.
            "role": "receipt_ocr",
        },
        "status": "pending_review",
        "created_by_phone": owner_phone,
    }


# ─── Vision call ─────────────────────────────────────────────────────────

async def _extract_with_vision(image_bytes: bytes) -> dict[str, Any]:
    """Route the receipt image through the central inference router.

    Uses the `receipt_ocr` role — see `inference.ROUTING` for the model
    in production. Image content is encoded as an OpenAI-format
    `image_url` data URI so the same call works against any of the
    OpenAI-compatible providers (OpenRouter, DCP gateway when it adds
    vision, etc.) and the call site stops caring about which vendor
    serves vision in the future.
    """
    encoded = base64.standard_b64encode(image_bytes).decode("ascii")
    media_type = _guess_media_type(image_bytes)
    messages: list[dict[str, Any]] = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": EXTRACTION_PROMPT},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{media_type};base64,{encoded}",
                    },
                },
            ],
        },
    ]
    try:
        text = await inference.chat(
            role="receipt_ocr",
            messages=messages,
            # Vision needs more room than the 600-token role default.
            max_tokens=800,
            temperature=0.0,
        )
        return _parse_json_response(text)
    except (inference.InferenceError, httpx.HTTPError, json.JSONDecodeError):
        return {}


def _parse_json_response(text: str) -> dict[str, Any]:
    """Find the first {...} block in the response and parse it."""
    if not text:
        return {}
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return {}


def _guess_media_type(b: bytes) -> str:
    if b[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if b[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if b[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


# ─── Helpers ─────────────────────────────────────────────────────────────

def _to_minor(value: Any) -> int:
    """Convert decimal major units → integer minor units (e.g. 12.50 → 1250)."""
    if value is None:
        return 0
    try:
        return int(round(float(value) * 100))
    except (TypeError, ValueError):
        return 0


async def _download(url: str) -> bytes:
    if not url:
        return b""
    try:
        async with supa.client(timeout=20) as http:
            r = await http.get(
                url,
                headers={"X-API-Key": _KAPSO_KEY} if _KAPSO_KEY else {},
            )
            return r.content if r.status_code == 200 else b""
    except httpx.HTTPError:
        return b""


async def _insert(table: str, payload: dict) -> dict:
    if not _SUPA_KEY:
        return payload
    try:
        async with supa.client(timeout=10) as http:
            r = await http.post(
                f"{_SUPA_URL}/rest/v1/{table}", headers=_SUPA_HEADERS, json=payload
            )
            if r.status_code in (200, 201):
                data = r.json()
                return data[0] if isinstance(data, list) and data else payload
            return payload
    except httpx.HTTPError:
        return payload


async def _send_confirm_message(owner_phone: str, expense: dict, client_id: str) -> bool:
    if not _KAPSO_KEY:
        return False
    body = _format_confirm(expense)
    try:
        async with supa.client(timeout=10) as http:
            r = await http.post(
                "https://app.kapso.ai/api/v1/whatsapp/messages",
                headers={"X-API-Key": _KAPSO_KEY, "Content-Type": "application/json"},
                json={
                    "to": owner_phone,
                    "type": "text",
                    "text": {"body": body},
                    "client_ref": client_id,
                },
            )
            return r.status_code in (200, 201)
    except httpx.HTTPError:
        return False


def _format_confirm(expense: dict) -> str:
    vendor = expense.get("vendor") or "Unknown vendor"
    amount = (expense.get("amount_minor") or 0) / 100
    currency = expense.get("currency") or "AED"
    category = expense.get("category") or "misc"
    return (
        f"📸 Got it — logged a receipt:\n\n"
        f"• Vendor: {vendor}\n"
        f"• Amount: {amount:.2f} {currency}\n"
        f"• Category: {category}\n\n"
        f"Reply *ok* to confirm, *edit* to fix, or *delete* to remove."
    )
