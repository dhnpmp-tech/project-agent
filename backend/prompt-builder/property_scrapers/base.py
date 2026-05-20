"""Base abstractions for the property-scraper service.

Defines:
- ListingRecord: the normalized Pydantic schema every scraper emits
- Scraper: the abstract base every platform module subclasses
- AUTHORIZATION_LEVELS: governance tags ("public" / "broker_authorized" /
  "partner_api") that get persisted with every row so a future audit
  can answer "where did this data come from and who said we could
  have it?" without ambiguity.

Architectural intent lifted from DeveloperSarim/Properties-Scraper-Api
(FastAPI + curl_cffi + async fan-out), then constrained: this service
only ingests data where we have a legitimate basis. Every Scraper
subclass MUST declare its auth_basis_level — sources that lack one
do not get a module here.
"""

from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import AsyncIterator, Literal

from pydantic import BaseModel, Field

logger = logging.getLogger("property_scrapers")

# AuthBasis tags persisted on every scraped_listings row.
#
# - "public": the data is in the public record (DLD transaction
#   history, RERA broker registry, ZONES open data portal).
# - "broker_authorized": the tenant uploaded their own listings
#   (CSV from Bayut Pro, JSON export from Propspace, etc.) — they
#   own the data, we ingest it on their behalf.
# - "partner_api": we have a contractual data feed (future state —
#   Bayut/PF partnerships, DXBLive, etc.).
#
# Sources without one of these tags don't ship as a module.
AuthBasisLevel = Literal["public", "broker_authorized", "partner_api"]


class ListingRecord(BaseModel):
    """Normalized output schema. One row per property listing or
    transaction record. Every Scraper.fetch() emits this shape."""

    # Provenance
    source: str = Field(..., description="Stable id of the source module, e.g. 'dld_public'")
    source_url: str | None = None
    source_id: str | None = Field(None, description="Stable id at the source — DLD txn id, broker id, etc.")
    auth_basis: AuthBasisLevel

    # Listing facts
    title: str | None = None
    price_aed: float | None = None
    price_per_sqft: float | None = None
    area: str | None = None
    city: str | None = None
    emirate: str | None = None
    bedrooms: int | None = None
    bathrooms: int | None = None
    sqft: int | None = None
    property_type: str | None = None
    transaction_type: str | None = None

    # Geo
    latitude: float | None = None
    longitude: float | None = None

    # Contacts (only where legitimate — public broker registry, broker self-upload)
    agent_name: str | None = None
    agent_company: str | None = None
    agent_phone: str | None = None
    agent_email: str | None = None

    # Extras
    amenities: list[str] = Field(default_factory=list)
    images: list[str] = Field(default_factory=list)
    raw: dict = Field(default_factory=dict)

    listed_at: datetime | None = None


class ScrapeQuery(BaseModel):
    """Filter spec passed to Scraper.fetch().

    Optional everywhere. None means "no filter on this dimension".
    """
    city: str | None = None
    area: str | None = None
    min_price_aed: float | None = None
    max_price_aed: float | None = None
    bedrooms: int | None = None
    property_type: str | None = None
    transaction_type: str | None = None
    limit: int = 50


class Scraper(ABC):
    """Abstract base every platform module subclasses.

    Subclass contract:
    - `source` (class attr): stable id, becomes the `source` column.
    - `auth_basis_level` (class attr): one of AuthBasisLevel.
    - `display_name` (class attr): human label for logging + UI.
    - `fetch(query)`: yields ListingRecord, one per match. Async
      generator so the FastAPI SSE endpoint can stream as results
      arrive.

    Reusable defaults baked into the class:
    - `_http()` constructs an httpx/curl_cffi async client with sane
      retries and the Accept-Language header set to en-GB,en;q=0.9.
    """

    source: str = "base"
    display_name: str = "Base scraper"
    auth_basis_level: AuthBasisLevel = "public"

    # Per-class rate limit. Subclasses MAY override. The default of 1
    # request/second matches what most public-data portals expect.
    rate_limit_per_second: float = 1.0

    def __init__(self) -> None:
        self._semaphore = asyncio.Semaphore(1)
        self._last_request_ts: float | None = None

    @abstractmethod
    async def fetch(self, query: ScrapeQuery) -> AsyncIterator[ListingRecord]:
        """Yield ListingRecord matches for the query.

        Implementations MUST NOT swallow exceptions silently — let
        the orchestrator decide retry policy. They MUST set
        `auth_basis` on every emitted record to the same value as
        the class's `auth_basis_level`.
        """
        if False:
            yield ListingRecord(source=self.source, auth_basis=self.auth_basis_level)
        raise NotImplementedError

    async def _polite_pause(self) -> None:
        """Token-bucket rate limiter. Call before each outbound HTTP
        request inside fetch(). Cooperative — not enforced for malicious
        bypass, just keeps us polite with public-data hosts."""
        import time
        async with self._semaphore:
            now = time.monotonic()
            if self._last_request_ts is not None:
                gap = now - self._last_request_ts
                min_gap = 1.0 / max(self.rate_limit_per_second, 0.001)
                if gap < min_gap:
                    await asyncio.sleep(min_gap - gap)
            self._last_request_ts = time.monotonic()
