"""Dubai Land Department public-data ingester.

DLD publishes transaction history as open data — every property sale
and rental contract recorded by the registry, anonymized at the
agent/buyer level. This is the cleanest legal-posture data we have
access to in the UAE real-estate space: it's public-record by statute,
DLD explicitly distributes it for analytical use.

Source: https://dubailand.gov.ae/en/open-data/

What we extract:
- Transaction price (AED)
- Date of registration
- Area (e.g. "Burj Khalifa", "Marina Heights")
- Property type (apartment/villa/etc.)
- Sqft, bedrooms (when listed)
- Transaction type (sale/lease)

What we DON'T extract:
- Buyer/seller identity (DLD anonymizes; we don't reverse it)
- Broker contact info (not part of the public dataset)

Use cases unlocked:
- "What's the median sale price in Saadiyat for 2BR apartments?"
- "How many off-plan handovers in Creek Harbour this quarter?"
- "ROI by community: where's rent yield highest right now?"
- Powers the real-estate teardown's market-context section without
  any ToS exposure.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import AsyncIterator

import httpx

from .base import ListingRecord, ScrapeQuery, Scraper

logger = logging.getLogger("property_scrapers.dld_public")

# DLD's official open-data endpoint. They publish a JSON-backed API
# (rate-limited but free) at dubailand.gov.ae. We hit the transactions
# slice with a since-date filter.
_DLD_BASE = "https://dubailand.gov.ae/api/open-data"


class DLDPublicScraper(Scraper):
    """Dubai Land Department transaction history (open data)."""

    source = "dld_public"
    display_name = "Dubai Land Department · Open Data"
    auth_basis_level = "public"
    # DLD's portal handles ~5 req/sec; we're conservative at 2.
    rate_limit_per_second = 2.0

    async def fetch(self, query: ScrapeQuery) -> AsyncIterator[ListingRecord]:
        """Yield transaction records that match `query`.

        DLD's open-data endpoint paginates 100 records at a time;
        we walk pages until `query.limit` is reached.
        """
        emitted = 0
        page = 1

        # Build the upstream filter. DLD's filter vocabulary is
        # slightly different from ours; we translate.
        params: dict[str, str] = {"size": "100", "page": str(page)}
        if query.area:
            params["area"] = query.area
        if query.property_type:
            params["property_type"] = query.property_type
        if query.min_price_aed is not None:
            params["min_amount"] = str(int(query.min_price_aed))
        if query.max_price_aed is not None:
            params["max_amount"] = str(int(query.max_price_aed))

        async with httpx.AsyncClient(timeout=20, headers={"Accept-Language": "en-GB,en;q=0.9"}) as http:
            while emitted < query.limit:
                params["page"] = str(page)
                await self._polite_pause()
                try:
                    r = await http.get(f"{_DLD_BASE}/transactions", params=params)
                except httpx.RequestError as e:
                    logger.warning("DLD request failed: %s", e)
                    return
                if r.status_code != 200:
                    logger.warning("DLD HTTP %d: %s", r.status_code, r.text[:200])
                    return
                payload = r.json() or {}
                rows = payload.get("data") or payload.get("transactions") or []
                if not rows:
                    return
                for row in rows:
                    if emitted >= query.limit:
                        return
                    rec = _row_to_listing(row)
                    if rec is None:
                        continue
                    yield rec
                    emitted += 1
                # Last page reached?
                if payload.get("last_page") and page >= int(payload["last_page"]):
                    return
                page += 1


def _row_to_listing(row: dict) -> ListingRecord | None:
    """Translate one DLD API row into our normalized ListingRecord."""
    try:
        amount = row.get("amount") or row.get("transaction_amount")
        price_aed = float(amount) if amount is not None else None

        sqft = None
        # DLD uses square meters; convert.
        sqm = row.get("procedure_area") or row.get("size_m2")
        if sqm:
            sqft = int(float(sqm) * 10.7639)

        price_per_sqft = None
        if price_aed and sqft and sqft > 0:
            price_per_sqft = round(price_aed / sqft, 2)

        listed_at = None
        ds = row.get("instance_date") or row.get("date")
        if ds:
            try:
                listed_at = datetime.fromisoformat(ds.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                listed_at = None

        return ListingRecord(
            source="dld_public",
            source_id=str(row.get("transaction_id") or row.get("id") or ""),
            auth_basis="public",
            title=row.get("project_name_en") or row.get("building_name_en"),
            price_aed=price_aed,
            price_per_sqft=price_per_sqft,
            area=row.get("area_name_en"),
            city="Dubai",
            emirate="Dubai",
            bedrooms=_to_int(row.get("rooms")),
            sqft=sqft,
            property_type=(row.get("property_type_en") or "").lower() or None,
            transaction_type=(row.get("transaction_type_en") or "transaction_record").lower(),
            listed_at=listed_at,
            raw=row,
        )
    except (KeyError, ValueError, TypeError) as e:
        logger.debug("row parse failed: %s", e)
        return None


def _to_int(v: object) -> int | None:
    """Parse '2 B/R' or '3' or 'Studio' into bedroom count."""
    if v is None:
        return None
    if isinstance(v, int):
        return v
    s = str(v).strip().lower()
    if "studio" in s:
        return 0
    # Pull first integer present
    import re
    m = re.search(r"\d+", s)
    return int(m.group()) if m else None
