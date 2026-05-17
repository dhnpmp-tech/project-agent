"""Owner-brief fan-out · the per-tenant 9am brief the teardown promises.

Cron runs hourly:
    */60 * * * * cron_wrap.sh owner_brief curl /owner-brief/run

This walks active tenants, computes each one's local hour from
owner_timezone, and fires generate_morning_brief() + send_to_owner()
for any tenant whose local_hour == owner_brief_hour AND who hasn't
received a brief on their local-date yet.

Idempotency: owner_briefings has UNIQUE(client_id, local_date). The
INSERT happens before the Kapso send, so a duplicate cron call
returns "already_sent" without re-paying for the brief.
"""

from __future__ import annotations
import os
from datetime import datetime, timezone
from typing import Optional
from zoneinfo import ZoneInfo

import supa

# Reuse the brief generator + Kapso sender that already exist.
from owner_brain import generate_morning_brief

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_HEADERS = {
    "apikey": os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
    "Authorization": f"Bearer {os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

_KAPSO_KEY = os.environ.get("KAPSO_PLATFORM_API_KEY", "")
_DEFAULT_PHONE_NUMBER_ID = os.environ.get("CEO_PHONE_NUMBER_ID", "")


async def _fetch_active_tenants() -> list[dict]:
    """Active tenants with a configured owner WhatsApp number."""
    async with supa.client(timeout=15) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/clients"
            f"?status=eq.active"
            f"&owner_whatsapp_number=not.is.null"
            f"&select=id,slug,company_name,owner_name,owner_whatsapp_number,"
            f"owner_phone_number_id,owner_timezone,owner_brief_hour",
            headers=_SUPA_HEADERS,
        )
    return r.json() if r.status_code == 200 else []


def _local_now(tz_name: str) -> datetime:
    try:
        return datetime.now(ZoneInfo(tz_name))
    except Exception:
        return datetime.now(ZoneInfo("Asia/Dubai"))


async def _has_brief_today(client_id: str, local_date: str) -> bool:
    async with supa.client(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/owner_briefings"
            f"?client_id=eq.{client_id}"
            f"&local_date=eq.{local_date}"
            f"&select=id"
            f"&limit=1",
            headers=_SUPA_HEADERS,
        )
    try:
        return bool(r.json()) if r.status_code == 200 else False
    except Exception:
        return False


async def _record_brief(
    client_id: str,
    local_date: str,
    body: str,
    kapso_status_code: Optional[int],
    kapso_message_id: Optional[str],
    error: Optional[str],
) -> None:
    """Upsert by (client_id, local_date). Force-reruns (e.g. ops smoke
    tests) replace the existing row rather than failing on the unique
    constraint. The cron's idempotency gate prevents duplicate sends
    earlier in the call path — this is a safety net.
    """
    payload = {
        "body": body[:6000],
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "channel": "whatsapp",
        "kapso_status_code": kapso_status_code,
        "kapso_message_id": kapso_message_id,
        "error": (error or "")[:1000] or None,
    }
    payload = {k: v for k, v in payload.items() if v is not None}

    async with supa.client(timeout=10) as http:
        # Try PATCH first (existing row); if no row updated, INSERT.
        r = await http.patch(
            f"{_SUPA_URL}/rest/v1/owner_briefings"
            f"?client_id=eq.{client_id}&local_date=eq.{local_date}",
            headers=_SUPA_HEADERS,
            json=payload,
        )
        # PATCH returns 200 with rows; if empty list, the row didn't exist.
        rows = r.json() if r.status_code < 400 else []
        if rows:
            return
        # No existing row — insert.
        insert_payload = {
            "client_id": client_id,
            "local_date": local_date,
            **payload,
        }
        await http.post(
            f"{_SUPA_URL}/rest/v1/owner_briefings",
            headers=_SUPA_HEADERS,
            json=insert_payload,
        )


async def _send_via_kapso(
    phone_number_id: str, to: str, message: str
) -> tuple[int, Optional[str], Optional[str]]:
    """Returns (status_code, message_id, error_text)."""
    if not _KAPSO_KEY:
        return 0, None, "KAPSO_PLATFORM_API_KEY not set"
    if not phone_number_id:
        return 0, None, "no phone_number_id configured"
    import httpx
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                "https://api.kapso.ai/v1/messages",
                json={
                    "phone_number_id": phone_number_id,
                    "to": to,
                    "type": "text",
                    "text": {"body": message},
                },
                headers={"X-API-Key": _KAPSO_KEY, "Content-Type": "application/json"},
            )
    except Exception as e:
        return 0, None, f"network: {type(e).__name__}: {e}"
    if r.status_code >= 400:
        return r.status_code, None, r.text[:500]
    try:
        msg_id = (r.json() or {}).get("id")
    except Exception:
        msg_id = None
    return r.status_code, msg_id, None


async def run_fanout(force: bool = False) -> dict:
    """Walk active tenants, send brief to those whose local time matches.

    `force=True` bypasses the time-of-day gate AND the idempotency gate
    (used for manual smoke tests). The local_date is still computed
    from the tenant's tz so the row still lands in the right calendar
    day.
    """
    tenants = await _fetch_active_tenants()
    results: list[dict] = []

    for t in tenants:
        client_id = t["id"]
        slug = t.get("slug")
        tz_name = t.get("owner_timezone") or "Asia/Dubai"
        brief_hour = t.get("owner_brief_hour") or 9
        owner_phone = t.get("owner_whatsapp_number")
        phone_number_id = t.get("owner_phone_number_id") or _DEFAULT_PHONE_NUMBER_ID

        local_now = _local_now(tz_name)
        local_hour = local_now.hour
        local_date = local_now.date().isoformat()

        skip_reason: Optional[str] = None
        if not force and local_hour != brief_hour:
            skip_reason = f"local_hour={local_hour} ≠ brief_hour={brief_hour}"
        elif not force and await _has_brief_today(client_id, local_date):
            skip_reason = "already_sent_today"

        if skip_reason:
            results.append({"client_id": client_id, "slug": slug, "skipped": skip_reason})
            continue

        if not owner_phone:
            results.append({"client_id": client_id, "slug": slug, "skipped": "no_owner_phone"})
            continue

        try:
            body = await generate_morning_brief(client_id)
            brief_text_only = body  # text without the approval block — used for audio
        except Exception as e:
            await _record_brief(
                client_id=client_id,
                local_date=local_date,
                body="",
                kapso_status_code=None,
                kapso_message_id=None,
                error=f"brief_generation_failed: {type(e).__name__}: {e}",
            )
            results.append({"client_id": client_id, "slug": slug, "error": "brief_generation_failed"})
            continue

        # Append today's approval block (actions queued for today that
        # are still pending the owner's nod). Empty string when there
        # are no pending actions, so the brief reads cleanly either way.
        try:
            from daily_action_planner import (
                pending_approval_for_date,
                format_approval_block,
            )
            pending = await pending_approval_for_date(client_id, local_date)
            block = format_approval_block(pending)
            if block:
                body = body + "\n" + block
        except Exception:
            # Approval block is a nice-to-have — never block the brief.
            pass

        status, msg_id, err = await _send_via_kapso(phone_number_id, owner_phone, body)
        await _record_brief(
            client_id=client_id,
            local_date=local_date,
            body=body,
            kapso_status_code=status or None,
            kapso_message_id=msg_id,
            error=err,
        )

        # ── Audio version of the brief ──
        # Reads only the daily summary (brief_text_only, without the
        # approval block — TTS reading "reply A C E" is robotic and
        # confusing). Failure here never blocks the text brief which
        # has already been recorded and sent.
        voice_err: Optional[str] = None
        voice_sent = False
        try:
            from tts import synthesize as _tts_synth
            from voice import send_voice_note as _send_voice_note
            audio_text = (brief_text_only or "").strip()[:1800]
            if audio_text and phone_number_id:
                tts_result = await _tts_synth(
                    text=audio_text,
                    lang="en",  # tenant language detection — future
                    voice="F1",
                    format="ogg",
                )
                voice_sent = await _send_voice_note(
                    phone_number_id, owner_phone, tts_result["audio_bytes"]
                )
                if not voice_sent:
                    voice_err = "send_voice_note_returned_false"
        except Exception as _ve:
            voice_err = f"{type(_ve).__name__}: {str(_ve)[:100]}"

        results.append({
            "client_id": client_id,
            "slug": slug,
            "sent": err is None,
            "kapso_status": status,
            "kapso_message_id": msg_id,
            "error": err,
        })

    return {
        "ran_at": datetime.now(timezone.utc).isoformat(),
        "tenants_considered": len(tenants),
        "results": results,
    }
