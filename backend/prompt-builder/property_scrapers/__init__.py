"""Property-scraper service — registry + orchestrator.

How to add a new scraper:
1. Subclass Scraper in a new module under this package.
2. Set `source`, `display_name`, `auth_basis_level`.
3. Implement `async def fetch(query) -> AsyncIterator[ListingRecord]`.
4. Register it in REGISTRY below.

What's intentionally NOT here:
- Bayut.com scraper. Bayut Terms §8 explicitly prohibits bots/crawlers,
  UAE Federal Decree-Law 34/2021 makes unauthorized data extraction
  a criminal offense. We only ship a Bayut module under one of:
    (a) the broker explicitly uploaded their own Bayut Pro export
        (handled separately via the broker-csv flow); or
    (b) we have a written data-feed partnership with Bayut.
- Property Finder scraper. Same legal posture.

If a future scraper module wants to target a non-public source, it
MUST declare `auth_basis_level = "partner_api"` or
`auth_basis_level = "broker_authorized"`, and the orchestrator
will refuse to run it without a matching contract/upload record.
"""

from __future__ import annotations

import logging
from typing import AsyncIterator

from .base import ListingRecord, ScrapeQuery, Scraper, AuthBasisLevel
from .dld_public import DLDPublicScraper

logger = logging.getLogger("property_scrapers")

# Registry: source-id → Scraper instance. Everything here is
# auth_basis_level=public or has its own auth gate.
REGISTRY: dict[str, Scraper] = {
    "dld_public": DLDPublicScraper(),
    # TODO when partnership lands:
    # "bayut_partner": BayutPartnerScraper(),       # auth_basis_level = "partner_api"
    # "propertyfinder_partner": PFPartnerScraper(),
    # TODO when broker-csv flow exists:
    # "broker_csv": BrokerCsvImporter(),            # auth_basis_level = "broker_authorized"
}


def available_sources() -> list[dict[str, str]]:
    """List every registered scraper. Powers the dashboard UI dropdown."""
    return [
        {
            "source": s.source,
            "display_name": s.display_name,
            "auth_basis_level": s.auth_basis_level,
        }
        for s in REGISTRY.values()
    ]


async def fetch_one(source: str, query: ScrapeQuery) -> AsyncIterator[ListingRecord]:
    """Run a single scraper. Raises KeyError on unknown source."""
    scraper = REGISTRY[source]
    async for rec in scraper.fetch(query):
        yield rec


async def fetch_all(query: ScrapeQuery) -> AsyncIterator[tuple[str, ListingRecord]]:
    """Fan out to every registered scraper concurrently. Yields
    (source, record) pairs as they arrive — used by the SSE endpoint
    so the dashboard renders results live instead of waiting for the
    slowest source.
    """
    import asyncio

    async def _drain(scraper: Scraper, queue: asyncio.Queue) -> None:
        try:
            async for rec in scraper.fetch(query):
                await queue.put((scraper.source, rec))
        except Exception as e:
            logger.warning("scraper %s failed: %s", scraper.source, e)
        finally:
            await queue.put((scraper.source, None))  # sentinel

    queue: asyncio.Queue = asyncio.Queue()
    workers = [asyncio.create_task(_drain(s, queue)) for s in REGISTRY.values()]
    pending_sentinels = len(workers)

    while pending_sentinels > 0:
        source, rec = await queue.get()
        if rec is None:
            pending_sentinels -= 1
            continue
        yield source, rec

    await asyncio.gather(*workers, return_exceptions=True)


__all__ = [
    "ListingRecord",
    "ScrapeQuery",
    "Scraper",
    "AuthBasisLevel",
    "REGISTRY",
    "available_sources",
    "fetch_one",
    "fetch_all",
]
