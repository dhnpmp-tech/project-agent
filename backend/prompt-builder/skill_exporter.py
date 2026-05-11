"""SKILL.md exporter — Hermes-style serialization of karpathy rules.

Each verified rule from karpathy_loop becomes a SKILL.md file with YAML
frontmatter + markdown body. Owners can read, edit, version, and share
these as plain text — same pattern as Anthropic Skills and Hermes Agent.

This sits *on top of* karpathy_loop. We don't change rule storage in
business_knowledge — we just project it into a portable plain-text format.
"""

from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from typing import Any

import httpx
import supa  # post-Supabase shim (routes _SUPA_URL → asyncpg)

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
}

# Statuses we expose as skills (probation rules are still earning trust).
EXPORTABLE_STATUSES = {"verified", "active"}


# ─── Public API ──────────────────────────────────────────────────────────

async def export_skills_for_client(client_id: str) -> list[dict[str, str]]:
    """Pull verified rules from business_knowledge.crawl_data.learned_rules and
    serialize each as SKILL.md.

    Returns: [{"filename": "...", "content": "..."}, ...]
    """
    rules = await _fetch_learned_rules(client_id)
    skills = []
    for rule in rules:
        if rule.get("status") not in EXPORTABLE_STATUSES:
            continue
        skill_md = serialize_rule(rule)
        if skill_md:
            skills.append(skill_md)
    return skills


def serialize_rule(rule: dict) -> dict[str, str] | None:
    """Pure: take a karpathy rule dict → SKILL.md content + filename.

    Format mirrors Anthropic Skills / Hermes SKILL.md:
        ---
        name: short-slug
        description: what this skill does
        status: verified
        added: YYYY-MM-DD
        ---

        # Rule body
        ...
    """
    rule_text = (rule.get("rule") or "").strip()
    if not rule_text:
        return None

    slug = _slugify(rule_text)
    description = _short_desc(rule_text)
    body_lines = [
        f"# {description}",
        "",
        "**Rule:**",
        f"> {rule_text}",
        "",
    ]

    reason = (rule.get("reason") or "").strip()
    if reason:
        body_lines.extend(["**Why:**", reason, ""])

    metrics = rule.get("metrics_at_add")
    if metrics:
        body_lines.append("**Baseline metrics when added:**")
        for k, v in metrics.items():
            body_lines.append(f"- {k}: {v}")
        body_lines.append("")

    after = rule.get("metrics_after")
    if after:
        body_lines.append("**Verified-state metrics:**")
        for k, v in after.items():
            body_lines.append(f"- {k}: {v}")
        body_lines.append("")

    parents = rule.get("parent_rules")
    if parents:
        body_lines.append("**Replaces:**")
        for p in parents:
            body_lines.append(f"- {p}")
        body_lines.append("")

    frontmatter_lines = [
        "---",
        f"name: {slug}",
        f"description: {description}",
        f"status: {rule.get('status', 'verified')}",
        f"added: {rule.get('added', '')}",
    ]
    expires = rule.get("expires_at")
    if expires:
        frontmatter_lines.append(f"expires: {expires}")
    frontmatter_lines.append("---")
    frontmatter_lines.append("")

    content = "\n".join(frontmatter_lines + body_lines).rstrip() + "\n"
    return {"filename": f"{slug}.md", "content": content}


def parse_skill_md(content: str) -> dict[str, Any]:
    """Reverse: parse SKILL.md content → karpathy rule dict.

    Owners may hand-edit a SKILL.md and re-import it. We accept whatever's
    there — incomplete metadata is fine, body becomes the rule text fallback.
    """
    if not content:
        return {}
    fm, body = _split_frontmatter(content)
    rule_text = _extract_rule_block(body) or _first_nonblank(body)
    return {
        "rule": rule_text,
        "reason": _extract_section(body, "Why"),
        "status": fm.get("status", "verified"),
        "added": fm.get("added") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "metrics_at_add": None,
        "metrics_after": None,
        "expires_at": fm.get("expires"),
        "parent_rules": None,
    }


# ─── Pure helpers ────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    base = text.lower()
    base = re.sub(r"[^a-z0-9\s-]+", "", base)
    base = re.sub(r"\s+", "-", base).strip("-")
    return (base[:60] or "rule").strip("-")


def _short_desc(rule_text: str) -> str:
    """First clause of the rule, capped — used as both description and H1."""
    head = re.split(r"[.!?]", rule_text)[0]
    return head.strip()[:120]


def _split_frontmatter(content: str) -> tuple[dict[str, str], str]:
    """Pull a `---\\nkey: val\\n---` block off the top, if present."""
    if not content.startswith("---"):
        return {}, content
    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content
    fm_block = parts[1].strip()
    body = parts[2].lstrip("\n")
    fm: dict[str, str] = {}
    for line in fm_block.splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            fm[k.strip()] = v.strip()
    return fm, body


def _extract_rule_block(body: str) -> str:
    """Find the `> ...` line under **Rule:** if present."""
    m = re.search(r"\*\*Rule:\*\*\s*\n>\s*(.+)", body)
    return m.group(1).strip() if m else ""


def _extract_section(body: str, section: str) -> str:
    """Pull the line(s) under a `**Section:**` heading until the next blank line."""
    pattern = rf"\*\*{re.escape(section)}:\*\*\s*\n((?:.+\n?)+?)(?:\n\*\*|\Z)"
    m = re.search(pattern, body)
    return m.group(1).strip() if m else ""


def _first_nonblank(body: str) -> str:
    for line in body.splitlines():
        s = line.strip().lstrip("#").strip()
        if s:
            return s
    return ""


# ─── Supabase ────────────────────────────────────────────────────────────

async def _fetch_learned_rules(client_id: str) -> list[dict]:
    if not _SUPA_KEY:
        return []
    try:
        async with supa.client(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/business_knowledge"
                f"?client_id=eq.{client_id}&select=crawl_data",
                headers=_SUPA_HEADERS,
            )
            rows = r.json() if r.status_code == 200 else []
            if not rows:
                return []
            crawl = rows[0].get("crawl_data") or {}
            return crawl.get("learned_rules") or []
    except httpx.HTTPError:
        return []
