"""Meta Ad Library lookups for the teardown + Sales Rep agent.

Uses Meta's public Graph API (`ads_archive`) — the same data anyone can
browse at facebook.com/ads/library. Returns the active ads a business is
currently running on Facebook + Instagram, with sample creative copy,
launch dates, and platform distribution.

Why this matters in the teardown:
  - Prospects who already run Meta ads see them surfaced ("wait, you
    saw THAT?")
  - Prospects who don't run ads see the gap framed concretely ("0 active
    ads — your top competitors run 7-12")
  - Feeds the Sales Rep agent's competitor monitoring loop

Requires `META_AD_LIBRARY_TOKEN` env var — a Facebook app access token
with `ads_read` permission. Without it, the helper returns None and the
teardown gracefully omits the section.

Public reference: https://www.facebook.com/ads/library/api
"""

from __future__ import annotations
import os
from typing import Optional

import httpx

_META_AD_LIBRARY_TOKEN = os.environ.get("META_AD_LIBRARY_TOKEN", "")
_META_GRAPH_VERSION = os.environ.get("META_GRAPH_VERSION", "v19.0")
_META_GRAPH_BASE = "https://graph.facebook.com"


# Fields we ask Meta for. Selected for what the teardown card actually
# renders — id (for the snapshot URL), page name (relevance filter), body
# + link title (preview), snapshot URL (clickable), delivery dates,
# platforms, active status.
_AD_FIELDS = ",".join([
    "id",
    "page_name",
    "ad_creative_bodies",
    "ad_creative_link_titles",
    "ad_snapshot_url",
    "ad_creation_time",
    "ad_delivery_start_time",
    "ad_delivery_stop_time",
    "publisher_platforms",
    "ad_active_status",
])


async def search_active_ads(
    brand_name: str,
    country: str = "AE",
    limit: int = 25,
) -> Optional[dict]:
    """Return active Meta ads for the given brand in the given country.

    Returns None when the token isn't configured (caller treats as
    "signal unavailable, hide the section"). Returns a populated dict —
    possibly with active_count=0 — when the lookup succeeded but no
    relevant ads were found.

    Args:
      brand_name: The brand to search for (e.g. "Blume Dubai").
      country: ISO-3166-1 alpha-2 code Meta knows ("AE", "SA", "GB").
      limit: Cap on results pulled from Meta (max 50; capped internally).

    Shape:
      {
        "active_count": int,
        "samples": [<ad>...],  # up to 5
        "platforms_distribution": {"facebook": int, "instagram": int, ...},
        "earliest_launch": "YYYY-MM-DD" | None,
        "latest_launch": "YYYY-MM-DD" | None,
        "creative_types": {"video": int, "image": int, "carousel": int}
      }
    """
    if not _META_AD_LIBRARY_TOKEN:
        return None
    brand = (brand_name or "").strip()
    if not brand:
        return {"active_count": 0, "samples": [], "platforms_distribution": {}, "earliest_launch": None, "latest_launch": None, "creative_types": {}}

    params = {
        "search_terms": brand,
        "ad_active_status": "ACTIVE",
        "ad_reached_countries": f'["{country.upper()}"]',
        "ad_type": "ALL",
        "fields": _AD_FIELDS,
        "limit": min(max(1, limit), 50),
        "access_token": _META_AD_LIBRARY_TOKEN,
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(
                f"{_META_GRAPH_BASE}/{_META_GRAPH_VERSION}/ads_archive",
                params=params,
            )
            if r.status_code != 200:
                # Meta returns 400 with a meaningful error for permission
                # issues — surface a clean None so the section hides.
                return None
            payload = r.json()
    except Exception:
        return None

    raw_ads = payload.get("data") or []

    # Meta's search is fuzzy — it will return ads for any page whose name
    # contains any of the brand tokens. Tighten by requiring the brand
    # seed (first 4 chars normalised) to appear in the page name.
    brand_seed = "".join(c for c in brand.lower() if c.isalnum())[:4]
    if not brand_seed:
        return {"active_count": 0, "samples": [], "platforms_distribution": {}, "earliest_launch": None, "latest_launch": None, "creative_types": {}}

    relevant: list[dict] = []
    for ad in raw_ads:
        page_name = (ad.get("page_name") or "").lower()
        page_normalised = "".join(c for c in page_name if c.isalnum())
        if brand_seed in page_normalised:
            relevant.append(ad)

    platforms_dist: dict[str, int] = {}
    launches: list[str] = []
    creative_types: dict[str, int] = {"video": 0, "image": 0, "carousel": 0, "other": 0}

    for ad in relevant:
        for p in ad.get("publisher_platforms") or []:
            platforms_dist[p] = platforms_dist.get(p, 0) + 1
        start = ad.get("ad_delivery_start_time") or ad.get("ad_creation_time")
        if start:
            # Trim to date for display.
            launches.append(start[:10])
        # Best-effort creative type from URL hints (Meta doesn't return
        # type in `ads_archive` directly).
        snap = (ad.get("ad_snapshot_url") or "").lower()
        if "video" in snap:
            creative_types["video"] += 1
        elif "carousel" in snap:
            creative_types["carousel"] += 1
        elif "image" in snap or len(ad.get("ad_creative_bodies") or []) == 1:
            creative_types["image"] += 1
        else:
            creative_types["other"] += 1

    return {
        "active_count": len(relevant),
        "samples": relevant[:5],
        "platforms_distribution": platforms_dist,
        "earliest_launch": min(launches) if launches else None,
        "latest_launch": max(launches) if launches else None,
        "creative_types": creative_types,
        "query": {"brand": brand, "country": country.upper()},
    }
