"""Cron health monitor — heartbeat + watchdog.

Karpathy was silently dead for 5 days post-cutover because nothing was
watching cron exit codes. This module is the alarm system.

Flow:
  1. Each cron run wraps its command in cron_wrap.sh, which POSTs a
     heartbeat to /cron/heartbeat at start (status='running') and end
     (status='success' | 'failed'). The cron_runs table receives one
     row per run.
  2. A separate watchdog cron hits /cron/health every 15 minutes.
     The watchdog scans for:
       (a) Runs that finished 'failed' in the last hour without an
           alert_sent_at — page founder via Kapso, mark alert_sent.
       (b) Critical crons (nightly, daily) that haven't logged a
           'success' in their expected window — page founder.
     Each failure is alerted at most once.

The watchdog uses ceo_persona.send_to_founder() which writes via Kapso
to the founder's WhatsApp.
"""

from __future__ import annotations
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import supa


_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_HEADERS = {
    "apikey": os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
    "Authorization": f"Bearer {os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# Critical crons + the maximum gap before we page. A cron that should
# run every 24h gets 30h grace; hourly crons get 90 min.
CRITICAL_CRONS: dict[str, int] = {
    "nightly": 30 * 60,        # nightly self-improvement, 24h expected
    "daily": 30 * 60,          # daily summary, 24h expected
    "ceo_market_intel": 90,    # hourly intel scan
    "ceo_morning_brief": 30 * 60,  # 24h
}


async def heartbeat_start(cron_name: str, notes: Optional[str] = None) -> Optional[int]:
    """Insert a 'running' row, return its id (used by heartbeat_finish)."""
    payload = {
        "cron_name": cron_name,
        "status": "running",
        "notes": notes,
    }
    async with supa.client(timeout=10) as http:
        r = await http.post(
            f"{_SUPA_URL}/rest/v1/cron_runs",
            headers={**_SUPA_HEADERS, "Prefer": "return=representation"},
            json=payload,
        )
    if r.status_code >= 400:
        return None
    try:
        rows = r.json()
        if isinstance(rows, list) and rows:
            return rows[0].get("id")
    except Exception:
        return None
    return None


async def heartbeat_finish(
    run_id: Optional[int],
    cron_name: str,
    status: str,
    exit_code: Optional[int] = None,
    duration_ms: Optional[int] = None,
    http_codes: Optional[str] = None,
    notes: Optional[str] = None,
) -> bool:
    """Update an existing run row OR insert a new 'final' row if run_id
    is unknown (heartbeat_start failed for some reason).
    """
    if status not in ("success", "failed", "timeout"):
        status = "failed"
    payload = {
        "status": status,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "exit_code": exit_code,
        "duration_ms": duration_ms,
        "http_codes": http_codes,
        "notes": (notes or "")[:2000] or None,
    }
    payload = {k: v for k, v in payload.items() if v is not None}

    async with supa.client(timeout=10) as http:
        if run_id is not None:
            r = await http.patch(
                f"{_SUPA_URL}/rest/v1/cron_runs?id=eq.{run_id}",
                headers=_SUPA_HEADERS,
                json=payload,
            )
        else:
            payload["cron_name"] = cron_name
            r = await http.post(
                f"{_SUPA_URL}/rest/v1/cron_runs",
                headers=_SUPA_HEADERS,
                json=payload,
            )
    return r.status_code < 400


async def scan_failures(window_minutes: int = 60) -> list[dict]:
    """Return failed runs in the last `window_minutes` without alert_sent_at."""
    cutoff = (
        datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
    ).isoformat()
    async with supa.client(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/cron_runs"
            f"?status=eq.failed"
            f"&alert_sent_at=is.null"
            f"&started_at=gte.{cutoff}"
            f"&order=started_at.desc"
            f"&select=id,cron_name,started_at,finished_at,exit_code,http_codes,notes",
            headers=_SUPA_HEADERS,
        )
    if r.status_code != 200:
        return []
    try:
        return r.json() or []
    except Exception:
        return []


async def scan_missing(now: Optional[datetime] = None) -> list[dict]:
    """Return critical crons that haven't logged a 'success' within their
    expected window. Returns one entry per stale cron with last_success_at.
    """
    now = now or datetime.now(timezone.utc)
    stale: list[dict] = []
    async with supa.client(timeout=10) as http:
        for cron_name, grace_min in CRITICAL_CRONS.items():
            cutoff = (now - timedelta(minutes=grace_min)).isoformat()
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/cron_runs"
                f"?cron_name=eq.{cron_name}"
                f"&status=eq.success"
                f"&started_at=gte.{cutoff}"
                f"&select=id,started_at"
                f"&order=started_at.desc"
                f"&limit=1",
                headers=_SUPA_HEADERS,
            )
            try:
                rows = r.json() if r.status_code == 200 else []
            except Exception:
                rows = []
            if not rows:
                # Find the last successful run regardless of window for context
                r2 = await http.get(
                    f"{_SUPA_URL}/rest/v1/cron_runs"
                    f"?cron_name=eq.{cron_name}"
                    f"&status=eq.success"
                    f"&select=started_at"
                    f"&order=started_at.desc"
                    f"&limit=1",
                    headers=_SUPA_HEADERS,
                )
                try:
                    last = (r2.json() or [{}])[0].get("started_at") if r2.status_code == 200 else None
                except Exception:
                    last = None
                stale.append({
                    "cron_name": cron_name,
                    "grace_minutes": grace_min,
                    "last_success_at": last,
                })
    return stale


async def mark_alerted(run_id: int, channel: str = "whatsapp") -> bool:
    payload = {
        "alert_sent_at": datetime.now(timezone.utc).isoformat(),
        "alert_channel": channel,
    }
    async with supa.client(timeout=10) as http:
        r = await http.patch(
            f"{_SUPA_URL}/rest/v1/cron_runs?id=eq.{run_id}",
            headers=_SUPA_HEADERS,
            json=payload,
        )
    return r.status_code < 400


def format_failure_brief(failures: list[dict], missing: list[dict]) -> str:
    """Compose a one-message WhatsApp brief for the founder."""
    parts: list[str] = ["🚨 *Cron health — failures detected*"]
    if failures:
        parts.append("")
        parts.append(f"*{len(failures)} cron failure(s) in last hour:*")
        for f in failures[:6]:
            name = f.get("cron_name", "?")
            ts = (f.get("started_at") or "")[:16].replace("T", " ")
            exit_code = f.get("exit_code")
            http = f.get("http_codes") or ""
            tail = f.get("notes") or ""
            tail = tail.strip().splitlines()[-1] if tail else ""
            parts.append(
                f"• {name} @ {ts} · exit={exit_code} · http={http or '—'}"
                + (f"\n   ↳ {tail[:140]}" if tail else "")
            )
    if missing:
        parts.append("")
        parts.append(f"*{len(missing)} critical cron(s) missing recent success:*")
        for m in missing[:6]:
            name = m["cron_name"]
            last = (m.get("last_success_at") or "—")[:16].replace("T", " ")
            grace = m.get("grace_minutes", 0)
            parts.append(f"• {name} · grace={grace}min · last_ok={last}")
    parts.append("")
    parts.append("Check `journalctl -u prompt-builder --since '2 hours ago'` on the VPS.")
    return "\n".join(parts)
