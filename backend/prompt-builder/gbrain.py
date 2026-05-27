"""Najim Brain (gbrain) client — context retrieval + fact ingestion.

Spec: docs/architecture/najim-brain.md §7
Version pin: docs/architecture/najim-brain-versions.json

This module is the ONLY surface in the prompt-builder that talks to
gbrain. Three call sites consume it:

  app.py webhook                 → get_context() before LLM call
  customer_memory_analyzer.py    → append_fact() after every inbound message
  owner_brain.process_owner_command → append_fact() on vault updates

Hardwiring rules:
  - Function signatures below are LOCKED. Do not add or rename parameters
    without bumping spec_version in najim-brain-versions.json AND updating
    docs/architecture/najim-brain.md §7.
  - All calls are time-boxed (4-second timeout). Brain failures degrade
    gracefully — get_context returns []; append_fact swallows the error
    and logs. Customer reply is NEVER blocked on a brain operation.
  - The gbrain HTTP URL + admin key come from env. No hardcoded fallback.
"""

from __future__ import annotations

import logging
import os
from typing import Optional, TypedDict

import httpx

logger = logging.getLogger("gbrain")

_GBRAIN_URL = os.environ.get("GBRAIN_HTTP_URL", "")
_TIMEOUT_SECONDS = 4


class BrainHit(TypedDict):
    """Single retrieval hit. Shape locked by spec §7."""

    page_id: str
    title: str
    body: str
    score: float
    kind: str


def is_configured() -> bool:
    """True when gbrain is reachable via env. Callers check this before
    constructing a token-based request so they can skip gracefully."""
    return bool(_GBRAIN_URL)


async def get_context(token: str, query: str, k: int = 8) -> list[BrainHit]:
    """Hybrid-retrieval against the tenant's brain.

    Spec: §7 `get_context()`

    Returns up to `k` ranked snippets ready to inject into the agent
    prompt's `## Memory` section. Returns [] on any failure — the agent
    must continue to operate without the brain. Never raises.

    Args:
        token: tenant-scoped OAuth bearer (from clients.gbrain_token)
        query: free-text query (typically the customer's last message)
        k: max results

    Returns:
        list of BrainHit, possibly empty. Ordered by relevance score desc.
    """
    if not _GBRAIN_URL or not token:
        return []
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as http:
            r = await http.get(
                f"{_GBRAIN_URL}/search",
                params={"q": query, "k": k},
                headers={"Authorization": f"Bearer {token}"},
            )
            if r.status_code != 200:
                logger.warning("gbrain search %d: %s", r.status_code, r.text[:200])
                return []
            return (r.json() or {}).get("hits", []) or []
    except Exception as e:
        logger.warning("gbrain search exception: %s", e)
        return []


async def append_fact(
    token: str,
    title: str,
    body: str,
    kind: str = "memory",
    *,
    source_id: Optional[str] = None,
) -> bool:
    """Fire-and-forget write into the tenant's brain.

    Spec: §7 `append_fact()`

    Called from customer_memory_analyzer + owner_brain. NEVER raises.
    NEVER blocks the customer reply. Failures are logged at WARN.

    Args:
        token: tenant-scoped OAuth bearer
        title: short label for the fact (e.g. "Customer · Ahmad · last visit")
        body: free-text content
        kind: one of {"memory", "knowledge", "vault", "fact", "insight"}
            — must match the gbrain page-kind taxonomy (see versions.json)
        source_id: optional stable id at the source of truth (e.g. the
            customer_memory row id) so re-writes upsert rather than dup

    Returns:
        True on success, False on any failure (including missing config).
    """
    if not _GBRAIN_URL or not token:
        return False
    payload = {"title": title, "body": body, "kind": kind}
    if source_id:
        payload["source_id"] = source_id
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as http:
            r = await http.post(
                f"{_GBRAIN_URL}/pages",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            if r.status_code >= 400:
                logger.warning("gbrain append %d: %s", r.status_code, r.text[:200])
                return False
            return True
    except Exception as e:
        logger.warning("gbrain append exception: %s", e)
        return False


def format_context_for_prompt(hits: list[BrainHit]) -> str:
    """Render brain hits as a markdown block ready to splice into the
    agent's system prompt under a `## Memory` heading.

    Spec: §7 — the prompt format is locked so the LLM can be trained
    against it consistently.
    """
    if not hits:
        return ""
    lines = ["## Memory", ""]
    for h in hits[:8]:
        lines.append(f"- **{h.get('title', '?')}** _({h.get('kind', '?')})_")
        body = (h.get("body") or "").strip().replace("\n", " ")
        if len(body) > 240:
            body = body[:237] + "…"
        lines.append(f"  {body}")
    return "\n".join(lines)
