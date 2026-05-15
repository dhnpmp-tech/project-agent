"""Daily action planner · nightly per-tenant action queue generator.

Runs ~22:00 tenant-local for each active tenant:
  - LLM-generate 5-8 plausible actions for tomorrow based on the
    tenant's KB + recent conversation/booking signal.
  - Insert each as a row in agent_action_queue with:
      status         = 'pending_approval'
      for_date       = tomorrow (in tenant tz)
      approval_token = 'A', 'B', 'C', ... per row
      description    = one-line summary the owner sees in the brief.
  - Idempotent per (client_id, for_date) — re-running on the same
    tenant-local date skips if rows already exist.

The morning brief fan-out picks up pending_approval rows and appends
the approval block to the brief.
"""

from __future__ import annotations
import json
import os
import re
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

import supa
import inference


_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_HEADERS = {
    "apikey": os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
    "Authorization": f"Bearer {os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


async def _fetch_active_tenants() -> list[dict]:
    async with supa.client(timeout=15) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/clients"
            f"?status=eq.active"
            f"&select=id,slug,company_name,country,owner_name,owner_timezone",
            headers=_SUPA_HEADERS,
        )
    return r.json() if r.status_code == 200 else []


async def _fetch_kb(client_id: str) -> dict:
    async with supa.client(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/business_knowledge"
            f"?client_id=eq.{client_id}&select=*&limit=1",
            headers=_SUPA_HEADERS,
        )
    try:
        rows = r.json() if r.status_code == 200 else []
        return rows[0] if rows else {}
    except Exception:
        return {}


async def _existing_plan_count(client_id: str, for_date: str) -> int:
    """How many pending_approval / approved rows already exist for this
    tenant on this date? Skip generation if > 0 — we don't double-plan.
    """
    async with supa.client(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/agent_action_queue"
            f"?client_id=eq.{client_id}"
            f"&for_date=eq.{for_date}"
            f"&status=in.(pending_approval,approved,executed)"
            f"&select=id",
            headers=_SUPA_HEADERS,
        )
    try:
        return len(r.json()) if r.status_code == 200 else 0
    except Exception:
        return 0


_ACTION_RE = re.compile(r"[A-J]", re.IGNORECASE)


def _strip_to_json(raw: str) -> Optional[str]:
    """Extract the first [ ... ] JSON array from a raw LLM string."""
    start = raw.find("[")
    end = raw.rfind("]")
    if start < 0 or end <= start:
        return None
    return raw[start : end + 1]


async def _generate_actions(
    company_name: str,
    country: str,
    owner_name: Optional[str],
    kb: dict,
    for_date: str,
) -> list[dict]:
    """LLM call · returns a list of 5-8 action dicts with type+description."""
    crawl = kb.get("crawl_data") or {}
    voice = (kb.get("brand_voice") or "")[:600]
    services = ", ".join((crawl.get("services") or [])[:6])
    industry = crawl.get("industry") or "hospitality"
    weekday = datetime.fromisoformat(for_date).strftime("%A")

    prompt = f"""You are the operations brain for {company_name}, a {industry} business in {"the UAE" if country == "AE" else "Saudi Arabia"}.

OWNER: {owner_name or "the founder"}
BRAND VOICE: {voice or "(not captured)"}
SERVICES: {services or "(not captured)"}

TASK · plan tomorrow ({weekday}, {for_date}) for the AI agent. Output
5 to 7 concrete actions the agent will run with the owner's one-tap
approval. EACH action must be specific enough that an operator could
execute it manually if the AI failed.

JSON array of objects with EXACT keys:
  category      · "inbound" | "proactive" | "outbound"
  action_type   · short snake_case verb (e.g. "review_reply_draft",
                  "ig_post_draft", "reengagement_dm", "b2b_outreach",
                  "morning_kb_refresh", "no_show_followup")
  description   · ONE plain-English sentence the owner reads in the
                  morning brief (max 140 chars). NO emojis. Concrete.
  target        · short string identifying the recipient or asset
                  (e.g. "all lapsed VIPs", "review #847", "Tokyo-Dubai
                  Business Network", "Friday brunch IG draft")
  payload       · object with operational hints (max 4 keys) — date,
                  audience, count, offer, etc.

Mix: at least 1 inbound, at least 2 proactive, at least 2 outbound.
No filler. Only actions that produce a measurable outcome.

Output JSON only. No preamble. No markdown fences."""

    try:
        raw = await inference.chat(
            "rami_research",
            [{"role": "user", "content": prompt}],
            max_tokens=3500,
            json_mode=True,
        )
    except Exception as e:
        print(f"[planner] inference.chat failed: {type(e).__name__}: {e}")
        return []

    # Retry once if the slicer misses — common when the model wraps JSON
    # in markdown fences or adds a one-line preamble.
    sliced = _strip_to_json(raw or "")
    if not sliced:
        print(f"[planner] no JSON in LLM output (first 300): {(raw or '')[:300]!r}")
        try:
            raw2 = await inference.chat(
                "rami_research",
                [
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": raw or ""},
                    {"role": "user", "content": "That wasn't parseable as JSON. Output ONLY the JSON array. No preamble, no markdown fence."},
                ],
                max_tokens=1500,
                json_mode=True,
            )
        except Exception as e:
            print(f"[planner] inference retry failed: {type(e).__name__}: {e}")
            return []
        sliced = _strip_to_json(raw2 or "")
        if not sliced:
            print(f"[planner] retry also unparseable: {(raw2 or '')[:300]!r}")
            return []
    try:
        actions = json.loads(sliced)
    except Exception as e:
        print(f"[planner] json.loads failed: {e}; slice={sliced[:200]!r}")
        return []
    if not isinstance(actions, list):
        print(f"[planner] expected list, got {type(actions).__name__}")
        return []

    cleaned: list[dict] = []
    for a in actions[:8]:
        if not isinstance(a, dict):
            continue
        cat = (a.get("category") or "").lower()
        if cat not in ("inbound", "proactive", "outbound"):
            continue
        desc = (a.get("description") or "").strip()[:200]
        if not desc:
            continue
        cleaned.append({
            "category": cat,
            "action_type": (a.get("action_type") or "action")[:48],
            "description": desc,
            "target": (a.get("target") or "")[:120],
            "payload": a.get("payload") or {},
        })
    return cleaned[:7]


async def _insert_plan(
    client_id: str, for_date: str, actions: list[dict]
) -> list[dict]:
    """Insert each action with status=pending_approval + approval_token
    A/B/C/... in the order returned."""
    tokens = ["A", "B", "C", "D", "E", "F", "G", "H"]
    payload_rows: list[dict] = []
    for i, a in enumerate(actions):
        payload_rows.append({
            "client_id": client_id,
            "agent": a["category"],
            "action_type": a["action_type"],
            "target": a["target"] or "—",
            "payload": a["payload"],
            "description": a["description"],
            "for_date": for_date,
            "approval_token": tokens[i] if i < len(tokens) else f"R{i+1}",
            "status": "pending_approval",
        })
    if not payload_rows:
        return []
    async with supa.client(timeout=10) as http:
        r = await http.post(
            f"{_SUPA_URL}/rest/v1/agent_action_queue",
            headers={**_SUPA_HEADERS, "Prefer": "return=representation"},
            json=payload_rows,
        )
    try:
        return r.json() if r.status_code < 300 else []
    except Exception:
        return []


async def plan_one_tenant(client_id: str, force: bool = False) -> dict:
    """Run the planner for a single tenant. Returns the plan summary."""
    async with supa.client(timeout=15) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/clients"
            f"?id=eq.{client_id}"
            f"&select=id,company_name,country,owner_name,owner_timezone,owner_brief_hour"
            f"&limit=1",
            headers=_SUPA_HEADERS,
        )
    rows = r.json() if r.status_code == 200 else []
    if not rows:
        return {"client_id": client_id, "skipped": "tenant_not_found"}
    t = rows[0]
    tz_name = t.get("owner_timezone") or "Asia/Dubai"
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("Asia/Dubai")
    tomorrow = (datetime.now(tz).date() + timedelta(days=1)).isoformat()

    if not force:
        existing = await _existing_plan_count(client_id, tomorrow)
        if existing > 0:
            return {
                "client_id": client_id,
                "for_date": tomorrow,
                "skipped": f"already_planned ({existing} rows)",
            }

    kb = await _fetch_kb(client_id)
    actions = await _generate_actions(
        company_name=t.get("company_name", ""),
        country=t.get("country", "AE"),
        owner_name=t.get("owner_name"),
        kb=kb,
        for_date=tomorrow,
    )
    if not actions:
        return {
            "client_id": client_id,
            "for_date": tomorrow,
            "error": "no_actions_generated",
        }
    inserted = await _insert_plan(client_id, tomorrow, actions)
    return {
        "client_id": client_id,
        "for_date": tomorrow,
        "actions_planned": len(actions),
        "actions_inserted": len(inserted),
    }


async def plan_all_tenants(force: bool = False) -> dict:
    """Loop active tenants, plan tomorrow for each. Called by the
    nightly cron hitting /daily-plan/generate.
    """
    tenants = await _fetch_active_tenants()
    results: list[dict] = []
    for t in tenants:
        try:
            res = await plan_one_tenant(t["id"], force=force)
            res["slug"] = t.get("slug")
            results.append(res)
        except Exception as e:
            results.append({
                "client_id": t["id"],
                "slug": t.get("slug"),
                "error": f"{type(e).__name__}: {e}",
            })
    return {
        "ran_at": datetime.now().astimezone().isoformat(),
        "tenants": len(tenants),
        "results": results,
    }


async def pending_approval_for_date(
    client_id: str, for_date: str
) -> list[dict]:
    """Used by the morning brief fan-out to append the approval block."""
    async with supa.client(timeout=10) as http:
        r = await http.get(
            f"{_SUPA_URL}/rest/v1/agent_action_queue"
            f"?client_id=eq.{client_id}"
            f"&for_date=eq.{for_date}"
            f"&status=eq.pending_approval"
            f"&select=id,approval_token,description,agent,action_type,target"
            f"&order=approval_token.asc",
            headers=_SUPA_HEADERS,
        )
    try:
        return r.json() if r.status_code == 200 else []
    except Exception:
        return []


def format_approval_block(actions: list[dict]) -> str:
    """One Whatsapp-friendly block listing pending actions + how to reply."""
    if not actions:
        return ""
    lines = ["", "📋 *Today's plan — needs your nod:*"]
    for a in actions:
        token = a.get("approval_token") or "?"
        cat = (a.get("agent") or "").upper()
        desc = a.get("description") or a.get("action_type") or "action"
        lines.append(f"  {token}. [{cat}] {desc}")
    lines.append("")
    lines.append("Reply *YES* to approve all · *NO* to skip all · or list letters (e.g. *A C E*) to approve a subset.")
    return "\n".join(lines)
