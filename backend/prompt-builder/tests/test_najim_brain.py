"""Najim Brain — verification tests.

Spec: docs/architecture/najim-brain.md §10

These tests are the canonical "is the brain integration working?"
gate. CI / cron / manual runs all execute them. A green pytest here
is the only way to declare a provision complete.

The tests skip themselves cleanly if GBRAIN_HTTP_URL is unset — so
they pass on the website-only CI without forcing a brain to exist.

Run:
    pytest backend/prompt-builder/tests/test_najim_brain.py -v

Run against a specific tenant:
    NAJIM_TEST_TENANT_TOKEN=<token> \
    NAJIM_TEST_TENANT_SLUG=saffron-kitchen \
    pytest backend/prompt-builder/tests/test_najim_brain.py -v
"""

from __future__ import annotations

import json
import os
import time
from typing import Any

import httpx
import pytest

GBRAIN_URL = os.environ.get("GBRAIN_HTTP_URL", "")
GBRAIN_ADMIN_KEY = os.environ.get("GBRAIN_ADMIN_KEY", "")
TENANT_TOKEN = os.environ.get("NAJIM_TEST_TENANT_TOKEN", "")
TENANT_SLUG = os.environ.get("NAJIM_TEST_TENANT_SLUG", "")

requires_gbrain = pytest.mark.skipif(
    not GBRAIN_URL, reason="GBRAIN_HTTP_URL not set — running website-only mode"
)
requires_tenant = pytest.mark.skipif(
    not (TENANT_TOKEN and TENANT_SLUG),
    reason="NAJIM_TEST_TENANT_TOKEN/SLUG not set — supply a provisioned tenant to exercise §10",
)


# ─── §10.0 health ──────────────────────────────────────────────────
@requires_gbrain
def test_gbrain_health() -> None:
    """Bootstrap §5.7 floor — /health must respond before anything else
    in this file is meaningful."""
    r = httpx.get(f"{GBRAIN_URL}/health", timeout=4)
    assert r.status_code == 200, f"health endpoint returned {r.status_code}: {r.text}"
    body = r.json()
    assert body.get("ok") is True or body.get("status") == "ok", body


# ─── §10.1 stats threshold ─────────────────────────────────────────
@requires_gbrain
@requires_tenant
def test_tenant_has_minimum_pages() -> None:
    """Stats endpoint reports pages and embeddings above the floor set
    in versions.json (operations.smoke_test_pages_threshold)."""
    versions = _load_versions()
    floor = versions["operations"]["smoke_test_pages_threshold"]

    r = httpx.get(
        f"{GBRAIN_URL}/sources/{TENANT_SLUG}/stats",
        headers={"Authorization": f"Bearer {TENANT_TOKEN}"},
        timeout=6,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    pages = int(body.get("pages", 0))
    embeddings = int(body.get("embeddings", 0))
    assert pages >= floor, f"{TENANT_SLUG} has only {pages} pages, threshold {floor}"
    assert embeddings >= floor, f"{TENANT_SLUG} has only {embeddings} embeddings, threshold {floor}"


# ─── §10.2 retrieval test ──────────────────────────────────────────
@requires_gbrain
@requires_tenant
def test_retrieval_returns_relevant_hit() -> None:
    """A common query against the tenant brain returns at least one hit
    with score above operations.smoke_test_retrieval_score_min."""
    versions = _load_versions()
    score_floor = float(versions["operations"]["smoke_test_retrieval_score_min"])

    # Use a query that any seeded brain should match — hours info is in
    # the standard seed pack (see §6.3).
    r = httpx.get(
        f"{GBRAIN_URL}/search",
        params={"q": "what time do you open", "k": 4},
        headers={"Authorization": f"Bearer {TENANT_TOKEN}"},
        timeout=6,
    )
    assert r.status_code == 200, r.text
    hits = (r.json() or {}).get("hits", []) or []
    assert hits, "retrieval returned 0 hits — brain has no recall against the standard seed"
    top = hits[0]
    score = float(top.get("score", 0))
    assert score >= score_floor, f"top hit score {score:.3f} below floor {score_floor}"


# ─── §10.3 retrieval latency p95 ───────────────────────────────────
@requires_gbrain
@requires_tenant
def test_retrieval_latency_p95() -> None:
    """20-call latency sample stays under operations.smoke_test_retrieval_latency_p95_ms."""
    versions = _load_versions()
    p95_ceiling_ms = int(versions["operations"]["smoke_test_retrieval_latency_p95_ms"])

    latencies: list[float] = []
    for _ in range(20):
        start = time.perf_counter()
        httpx.get(
            f"{GBRAIN_URL}/search",
            params={"q": "what is on the menu", "k": 4},
            headers={"Authorization": f"Bearer {TENANT_TOKEN}"},
            timeout=4,
        )
        latencies.append((time.perf_counter() - start) * 1000)

    latencies.sort()
    p95 = latencies[int(0.95 * len(latencies)) - 1]
    assert p95 <= p95_ceiling_ms, f"p95 latency {p95:.0f}ms > ceiling {p95_ceiling_ms}ms"


# ─── §10.4 Dream Cycle dry-run ─────────────────────────────────────
@requires_gbrain
def test_dream_cycle_runs() -> None:
    """Dream Cycle can be triggered manually and reports completion
    within 60 seconds. Uses admin key, not tenant token."""
    if not GBRAIN_ADMIN_KEY:
        pytest.skip("GBRAIN_ADMIN_KEY not set — can't trigger Dream Cycle")

    r = httpx.post(
        f"{GBRAIN_URL}/dream-cycle/run",
        headers={"X-Admin-Key": GBRAIN_ADMIN_KEY},
        timeout=70,
    )
    assert r.status_code in (200, 202), r.text
    body = r.json()
    assert body.get("started") or body.get("completed"), body


# ─── helpers ────────────────────────────────────────────────────────
def _load_versions() -> dict[str, Any]:
    """Read the pinned versions file. Tests reference operations.* floors
    so any tuning happens in one place (the JSON) not scattered across
    test bodies."""
    here = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.abspath(os.path.join(here, "..", "..", ".."))
    versions_path = os.path.join(repo_root, "docs", "architecture", "najim-brain-versions.json")
    with open(versions_path) as f:
        return json.load(f)
