"""Google Business Profile — Auto-optimization for SMBs in UAE/KSA

Handles Google Business Profile management for restaurants, cafes, and salons:
1. Review Monitoring & Auto-Response (draft-and-approve pattern for negative reviews)
2. Profile Audit & SEO Optimization (completeness score + recommendations)
3. Q&A Management (generate FAQ answers from knowledge base)
4. Local SEO Keyword Strategy (bilingual, location-aware)
5. Content Plan Generation (GBP posts, offers, events)
6. Performance Dashboard (insights + WhatsApp-friendly brief)
7. Composio Integration (Google API bridge, graceful fallback to manual mode)

Storage: Supabase (activity_logs + business_knowledge).
AI generation: MiniMax M2.7 with think-tag cleanup + CJK artifact filter.
Bilingual: English + Gulf Arabic.
"""

from __future__ import annotations

import os
import json
import re
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional

# ═══════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Ynpxa3RpcGltYm11anRvd296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwOTY5NCwiZXhwIjoyMDkwMDg1Njk0fQ.-DoNS5fZv3aUsFcugKg23yh9RqXXFIlgc5_9Hrk97bg")
_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}
_MINIMAX_KEY = os.environ.get("MINIMAX_API_KEY", "")
_COMPOSIO_KEY = os.environ.get("COMPOSIO_API_KEY", "")


# ═══════════════════════════════════════════════════════
# AI HELPERS — MiniMax M2.7 integration
# ═══════════════════════════════════════════════════════

def _clean_ai_output(raw: str) -> str:
    """Clean MiniMax M2.7 output: strip think tags, CJK artifacts, bold markers."""
    content = re.sub(r"<think>[\s\S]*?</think>\s*", "", raw).strip()
    if not content:
        content = re.sub(r"</?think>", "", raw).strip()
    # Strip Chinese/Japanese/Korean/Russian characters (MiniMax artifact)
    content = re.sub(
        r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\u0400-\u04ff]+',
        '', content,
    ).strip()
    content = content.replace("**", "")
    content = re.sub(r'\s{2,}', ' ', content).strip()
    return content


async def _minimax_chat(
    system: str,
    user: str,
    max_tokens: int = 2000,
    temperature: float = 0.8,
) -> str:
    """Call MiniMax M2.7 chat completion. Returns cleaned text."""
    if not _MINIMAX_KEY:
        return "[AI key not configured — set MINIMAX_API_KEY]"
    try:
        async with httpx.AsyncClient(timeout=90) as http:
            r = await http.post(
                "https://api.minimax.io/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {_MINIMAX_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "MiniMax-M2.7",
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                },
            )
            raw = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            return _clean_ai_output(raw)
    except Exception as e:
        return f"[AI error: {e}]"


async def _minimax_json(
    system: str,
    user: str,
    max_tokens: int = 3000,
    temperature: float = 0.7,
) -> list | dict:
    """Call MiniMax and parse JSON from the response.

    Handles markdown fences, trailing commas, think tags.
    Returns parsed JSON or a fallback error dict.
    """
    raw = await _minimax_chat(system, user, max_tokens, temperature)
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    text = fence_match.group(1).strip() if fence_match else raw.strip()
    # Find the first [ or { and match to its closing bracket
    start = None
    for i, ch in enumerate(text):
        if ch in ("[", "{"):
            start = i
            break
    if start is not None:
        bracket = text[start]
        close = "]" if bracket == "[" else "}"
        depth = 0
        for i in range(start, len(text)):
            if text[i] == bracket:
                depth += 1
            elif text[i] == close:
                depth -= 1
                if depth == 0:
                    text = text[start:i + 1]
                    break
    # Remove trailing commas before ] or }
    text = re.sub(r",\s*([}\]])", r"\1", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"error": "Failed to parse AI response", "raw": raw[:500]}


# ═══════════════════════════════════════════════════════
# SUPABASE HELPERS
# ═══════════════════════════════════════════════════════

async def _fetch_knowledge(client_id: str) -> dict:
    """Fetch business_knowledge for a client."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/business_knowledge"
                f"?client_id=eq.{client_id}&select=*",
                headers=_SUPA_HEADERS,
            )
            rows = r.json() if r.status_code == 200 else []
            return rows[0] if rows else {}
    except Exception:
        return {}


async def _fetch_client(client_id: str) -> dict:
    """Fetch client row (company_name, country, plan, etc.)."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/clients"
                f"?id=eq.{client_id}&select=company_name,country,plan,contact_email,contact_phone",
                headers=_SUPA_HEADERS,
            )
            rows = r.json() if r.status_code == 200 else []
            return rows[0] if rows else {}
    except Exception:
        return {}


async def _log_activity(
    client_id: str,
    event_type: str,
    summary: str = "",
    payload: dict | None = None,
) -> None:
    """Write to activity_logs (append-only event stream)."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            await http.post(
                f"{_SUPA_URL}/rest/v1/activity_logs",
                headers=_SUPA_HEADERS,
                json={
                    "client_id": client_id,
                    "event_type": event_type,
                    "summary": summary[:500] if summary else "",
                    "payload": payload or {},
                },
            )
    except Exception:
        pass


def _detect_location(kb: dict, client: dict) -> str:
    """Detect the business location from KB or client data."""
    crawl = kb.get("crawl_data", {}) or {}
    for field in ("city", "location", "area"):
        val = crawl.get(field)
        if val and isinstance(val, str):
            return val
    address = crawl.get("address", "")
    if address:
        for city in ("Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Riyadh", "Jeddah", "Doha", "Muscat"):
            if city.lower() in address.lower():
                return city
    country = client.get("country", "")
    if country and "saudi" in country.lower():
        return "Riyadh"
    return "Dubai"


def _detect_business_type(kb: dict) -> str:
    """Detect business type from KB."""
    crawl = kb.get("crawl_data", {}) or {}
    industry = crawl.get("industry", "").lower()
    if "salon" in industry or "beauty" in industry or "spa" in industry:
        return "salon"
    if "cafe" in industry or "coffee" in industry:
        return "cafe"
    if "real_estate" in industry or "property" in industry:
        return "real_estate"
    return "restaurant"


# ═══════════════════════════════════════════════════════
# COMPOSIO HELPERS — Google Business API bridge
# ═══════════════════════════════════════════════════════

_COMPOSIO_BASE = "https://backend.composio.dev/api/v1"

_COMPOSIO_ACTIONS = {
    "GOOGLEBUSINESS_CREATE_POST": "Create a Google Business Profile post/update",
    "GOOGLEBUSINESS_REPLY_REVIEW": "Reply to a Google review",
    "GOOGLEBUSINESS_GET_REVIEWS": "Fetch recent reviews",
    "GOOGLEBUSINESS_GET_LOCATIONS": "List business locations",
    "GOOGLEBUSINESS_UPDATE_PROFILE": "Update business profile information",
    "GOOGLEBUSINESS_GET_INSIGHTS": "Fetch performance insights",
    "GOOGLEBUSINESS_CREATE_QA": "Create a Q&A entry",
}


async def _composio_available(client_id: str) -> bool:
    """Check if Composio is configured and the Google Business connection is active."""
    if not _COMPOSIO_KEY:
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_COMPOSIO_BASE}/connectedAccounts",
                headers={"x-api-key": _COMPOSIO_KEY},
                params={"integration_id": "googlebusiness", "status": "active"},
            )
            accounts = r.json() if r.status_code == 200 else {}
            items = accounts.get("items", [])
            return len(items) > 0
    except Exception:
        return False


async def auto_detect_gbp(client_id: str, business_name: str = "", location: str = "") -> dict:
    """Auto-detect a business's Google Business Profile from name + location.

    Searches Google Places API (via Composio or direct) to find the business,
    pulls key data (rating, reviews count, hours, address, photos), and stores
    it in crawl_data.gbp for use by audit_profile and the morning brief.

    Args:
        client_id: UUID of the tenant.
        business_name: Business name to search for.
        location: City/area hint (e.g., "Dubai", "Riyadh").

    Returns:
        dict with found (bool), profile data, and score.
    """
    # Get business info from KB if not provided
    if not business_name:
        kb = await _fetch_knowledge(client_id)
        client_info = await _fetch_client(client_id)
        business_name = client_info.get("company_name", "")
        crawl = kb.get("crawl_data", {}) or {}
        location = location or crawl.get("location", "") or crawl.get("city", "")

    if not business_name:
        return {"found": False, "reason": "No business name available"}

    search_query = f"{business_name} {location}".strip()
    gbp_data = {}

    # Method 1: Try Composio Google Places
    if _COMPOSIO_KEY:
        try:
            result = await execute_composio_action("GOOGLEBUSINESS_GET_LOCATIONS", {"query": search_query})
            if result.get("success"):
                locations = result.get("data", {}).get("locations", [])
                if locations:
                    loc = locations[0] if isinstance(locations[0], dict) else {}
                    gbp_data = {
                        "source": "composio",
                        "name": loc.get("title", business_name),
                        "address": loc.get("storefrontAddress", {}).get("addressLines", [""])[0] if loc.get("storefrontAddress") else "",
                        "phone": loc.get("phoneNumbers", {}).get("primaryPhone", ""),
                        "website": loc.get("websiteUri", ""),
                        "rating": loc.get("averageRating", 0),
                        "reviews_count": loc.get("metadata", {}).get("totalReviewCount", 0),
                        "photos_count": loc.get("metadata", {}).get("mapsPhotosCount", 0),
                        "hours": loc.get("regularHours", {}),
                        "category": loc.get("categories", {}).get("primaryCategory", {}).get("displayName", ""),
                        "place_id": loc.get("name", ""),  # Google place resource name
                    }
        except Exception as e:
            print(f"[gbp] Composio search failed: {e}")

    # Method 2: Fallback — use Google Places Text Search (free tier, no key needed for basic)
    if not gbp_data:
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                # Use Nominatim (OpenStreetMap) as free fallback for basic location data
                r = await http.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"q": search_query, "format": "json", "limit": 1, "addressdetails": 1},
                    headers={"User-Agent": "ProjectAgent/1.0"},
                )
                if r.status_code == 200 and r.json():
                    place = r.json()[0]
                    addr = place.get("address", {})
                    gbp_data = {
                        "source": "openstreetmap",
                        "name": place.get("display_name", business_name).split(",")[0],
                        "address": place.get("display_name", ""),
                        "phone": "",
                        "website": "",
                        "rating": 0,
                        "reviews_count": 0,
                        "photos_count": 0,
                        "hours": {},
                        "category": place.get("type", ""),
                        "lat": place.get("lat", ""),
                        "lon": place.get("lon", ""),
                    }
        except Exception as e:
            print(f"[gbp] Fallback search failed: {e}")

    if not gbp_data:
        return {"found": False, "reason": f"Could not find '{search_query}' on Google or OpenStreetMap"}

    # Store in crawl_data.gbp
    try:
        kb = await _fetch_knowledge(client_id)
        crawl = kb.get("crawl_data", {}) or {}
        crawl["gbp"] = {
            **gbp_data,
            "detected_at": datetime.now(timezone.utc).isoformat(),
            "auto_detected": True,
        }
        async with httpx.AsyncClient(timeout=10) as http:
            await http.patch(
                f"{_SUPA_URL}/rest/v1/business_knowledge?client_id=eq.{client_id}",
                headers=_SUPA_HEADERS,
                json={"crawl_data": crawl},
            )
        print(f"[gbp] Auto-detected profile for '{business_name}': rating={gbp_data.get('rating')}, reviews={gbp_data.get('reviews_count')}")
    except Exception as e:
        print(f"[gbp] Failed to save GBP data: {e}")

    # Run a quick audit score
    audit = await audit_profile(client_id)

    return {
        "found": True,
        "profile": gbp_data,
        "audit_score": audit.get("score", audit.get("overall_score", 0)),
        "top_recommendations": audit.get("recommendations", audit.get("recommendations_en", []))[:3],
    }


async def setup_composio_google(client_id: str, composio_connection_id: str = "") -> dict:
    """Set up the Composio connection for Google Business Profile.

    If composio_connection_id is provided, validates the existing connection.
    Otherwise, returns setup instructions for the owner.

    Returns:
        dict with 'status' ('connected'|'pending'|'error'), 'message', and
        optionally 'setup_url' for OAuth flow.
    """
    if not _COMPOSIO_KEY:
        return {
            "status": "not_configured",
            "message": "Composio API key not set. Google Business features will run in manual mode.",
            "manual_mode": True,
        }

    # If a connection ID was provided, validate it
    if composio_connection_id:
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                r = await http.get(
                    f"{_COMPOSIO_BASE}/connectedAccounts/{composio_connection_id}",
                    headers={"x-api-key": _COMPOSIO_KEY},
                )
                if r.status_code == 200:
                    data = r.json()
                    if data.get("status") == "active":
                        # Store the connection ID in activity_logs for this client
                        await _log_activity(
                            client_id=client_id,
                            event_type="gbp_composio_connected",
                            summary="Google Business Profile connected via Composio",
                            payload={"connection_id": composio_connection_id},
                        )
                        return {
                            "status": "connected",
                            "message": "Google Business Profile connected successfully.",
                            "connection_id": composio_connection_id,
                        }
        except Exception as e:
            return {"status": "error", "message": f"Failed to validate connection: {e}"}

    # Initiate a new connection
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.post(
                f"{_COMPOSIO_BASE}/connectedAccounts",
                headers={
                    "x-api-key": _COMPOSIO_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "integrationId": "googlebusiness",
                    "redirectUri": f"https://project-agent-chi.vercel.app/dashboard/integrations?client_id={client_id}",
                },
            )
            if r.status_code in (200, 201):
                data = r.json()
                return {
                    "status": "pending",
                    "message": "Click the link below to connect your Google Business Profile:",
                    "setup_url": data.get("redirectUrl", data.get("connectionUrl", "")),
                    "connection_id": data.get("id", ""),
                }
            return {"status": "error", "message": f"Composio returned {r.status_code}"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to create connection: {e}"}


async def execute_composio_action(action_name: str, params: dict) -> dict:
    """Execute a Composio action for Google Business operations.

    Supported actions:
        GOOGLEBUSINESS_CREATE_POST — publish a GBP post
        GOOGLEBUSINESS_REPLY_REVIEW — post a reply to a review
        GOOGLEBUSINESS_GET_REVIEWS — fetch recent reviews
        GOOGLEBUSINESS_GET_LOCATIONS — list business locations
        GOOGLEBUSINESS_UPDATE_PROFILE — update profile fields
        GOOGLEBUSINESS_GET_INSIGHTS — fetch performance metrics
        GOOGLEBUSINESS_CREATE_QA — add a Q&A entry

    Args:
        action_name: One of the supported Composio action names.
        params: Action-specific parameters (varies by action).

    Returns:
        dict with 'success' (bool), 'data' (response payload or error).
    """
    if not _COMPOSIO_KEY:
        return {"success": False, "data": {"error": "Composio not configured"}}

    if action_name not in _COMPOSIO_ACTIONS:
        return {"success": False, "data": {"error": f"Unknown action: {action_name}", "supported": list(_COMPOSIO_ACTIONS.keys())}}

    try:
        async with httpx.AsyncClient(timeout=30) as http:
            r = await http.post(
                f"{_COMPOSIO_BASE}/actions/{action_name}/execute",
                headers={
                    "x-api-key": _COMPOSIO_KEY,
                    "Content-Type": "application/json",
                },
                json={"input": params},
            )
            if r.status_code in (200, 201):
                return {"success": True, "data": r.json()}
            return {"success": False, "data": {"error": f"Composio {r.status_code}", "body": r.text[:500]}}
    except Exception as e:
        return {"success": False, "data": {"error": str(e)}}


# ═══════════════════════════════════════════════════════
# 1. REVIEW MONITORING & RESPONSE
# ═══════════════════════════════════════════════════════

async def fetch_reviews(client_id: str, location_id: str = "", days: int = 7) -> list:
    """Fetch recent Google reviews.

    Uses Composio Google Business integration if available. Falls back to
    stored reviews in activity_logs (manually entered or previously fetched).

    Args:
        client_id: UUID of the tenant.
        location_id: Google Business location ID (optional, for multi-location).
        days: Number of days to look back (default 7).

    Returns:
        list of review dicts: {review_id, reviewer_name, rating, text, created_at, source}.
    """
    reviews: list[dict] = []
    composio_ok = await _composio_available(client_id)

    # Try Composio first
    if composio_ok:
        params = {"days": days}
        if location_id:
            params["locationId"] = location_id
        result = await execute_composio_action("GOOGLEBUSINESS_GET_REVIEWS", params)
        if result["success"]:
            raw_reviews = result["data"].get("reviews", result["data"].get("items", []))
            for rv in raw_reviews:
                reviews.append({
                    "review_id": rv.get("reviewId", rv.get("name", "")),
                    "reviewer_name": rv.get("reviewer", {}).get("displayName", rv.get("reviewer_name", "Guest")),
                    "rating": rv.get("starRating", rv.get("rating", 0)),
                    "text": rv.get("comment", rv.get("text", "")),
                    "created_at": rv.get("createTime", rv.get("created_at", "")),
                    "source": "google_api",
                    "reply_exists": bool(rv.get("reviewReply")),
                })

    # Fallback: fetch from activity_logs (stored reviews)
    if not reviews:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                r = await http.get(
                    f"{_SUPA_URL}/rest/v1/activity_logs"
                    f"?client_id=eq.{client_id}"
                    f"&event_type=in.(google_review,review_received,review_draft)"
                    f"&created_at=gte.{cutoff}"
                    f"&select=payload,created_at"
                    f"&order=created_at.desc&limit=50",
                    headers=_SUPA_HEADERS,
                )
                logs = r.json() if r.status_code == 200 else []
                for log in logs:
                    p = log.get("payload", {})
                    if not p:
                        continue
                    reviews.append({
                        "review_id": p.get("review_id", f"log_{log.get('created_at', '')}"),
                        "reviewer_name": p.get("reviewer_name", "Guest"),
                        "rating": p.get("rating", 0),
                        "text": p.get("review_text", p.get("text", "")),
                        "created_at": log.get("created_at", ""),
                        "source": "activity_logs",
                        "reply_exists": p.get("status") in ("sent", "approved"),
                    })
        except Exception:
            pass

    return reviews


async def auto_respond_to_reviews(
    client_id: str,
    reviews: list,
    lang: str = "en",
) -> list:
    """Auto-draft responses to reviews using MiniMax.

    4-5 stars: auto-respond with a warm, personalized thank you.
    1-3 stars: draft for owner approval (via Owner Brain).

    Args:
        client_id: UUID of the tenant.
        reviews: List of review dicts from fetch_reviews().
        lang: "en" or "ar" for response language.

    Returns:
        list of {review_id, rating, response, status: 'sent'|'pending_approval'}.
    """
    if not reviews:
        return []

    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client_info.get("company_name", "our business")
    composio_ok = await _composio_available(client_id)

    results = []

    for review in reviews:
        # Skip already-replied reviews
        if review.get("reply_exists"):
            continue

        rating = review.get("rating", 0)
        # Normalize star rating (Google uses FIVE, FOUR, etc. sometimes)
        if isinstance(rating, str):
            rating_map = {"FIVE": 5, "FOUR": 4, "THREE": 3, "TWO": 2, "ONE": 1}
            rating = rating_map.get(rating.upper(), 0)

        reviewer_name = review.get("reviewer_name", "Guest")
        review_text = review.get("text", "")

        if not review_text and rating >= 4:
            # Rating-only positive review (no text) — short generic thank you
            if lang == "ar":
                response = f"شكرا لك {reviewer_name} على تقييمك الرائع! نتشرف بزيارتك دائما."
            else:
                response = f"Thank you so much, {reviewer_name}! We're glad you enjoyed your experience. Hope to see you again soon!"
            status = "sent"
        else:
            # Generate AI response
            if rating >= 4:
                tone = "warm, grateful, personal"
                strategy = "Thank them specifically for what they mentioned. Invite them back."
                auto_send = True
            elif rating == 3:
                tone = "appreciative, acknowledging room for improvement"
                strategy = "Thank them, acknowledge their feedback constructively, promise to improve."
                auto_send = False
            else:
                tone = "empathetic, professional, solution-oriented"
                strategy = "Apologize sincerely, address the specific complaint, offer to make it right. Never be defensive."
                auto_send = False

            lang_instruction = "Gulf Arabic (not formal MSA)" if lang == "ar" else "English"

            prompt = f"""You are the owner of {company_name}. Write a short, genuine reply to this Google review.

Rating: {rating}/5 stars
Reviewer: {reviewer_name}
Review: "{review_text}"

Tone: {tone}
Strategy: {strategy}
Language: {lang_instruction}

Rules:
- Max 3 sentences. Keep it human and warm.
- Mention something specific from their review (not generic).
- {"End with an invitation to return." if rating >= 3 else "End by offering to discuss privately."}
- Do NOT use corporate-speak or marketing language.
- Output ONLY the reply text. Nothing else."""

            response = await _minimax_chat(prompt, "Write the review response now.", max_tokens=300, temperature=0.7)

            # Sanitize leaked reasoning chains
            if len(response) > 400 or "Let me" in response or "I need to" in response:
                quoted = re.findall(r'"([^"]{20,})"', response)
                if quoted:
                    response = quoted[-1]
                else:
                    paragraphs = [p.strip() for p in response.split("\n\n") if len(p.strip()) > 30]
                    for p in reversed(paragraphs):
                        if not any(p.lower().startswith(w) for w in ["the user", "let me", "i need", "rating", "- "]):
                            response = p
                            break

            status = "sent" if auto_send else "pending_approval"

        # If Composio is connected and we auto-send, post the reply
        if status == "sent" and composio_ok and review.get("source") == "google_api":
            post_result = await execute_composio_action(
                "GOOGLEBUSINESS_REPLY_REVIEW",
                {"reviewId": review.get("review_id", ""), "replyText": response},
            )
            if not post_result["success"]:
                status = "pending_approval"  # Downgrade to manual if API failed

        # Log to activity_logs
        await _log_activity(
            client_id=client_id,
            event_type="gbp_review_response",
            summary=f"{'Auto-replied' if status == 'sent' else 'Drafted reply'} for {reviewer_name} ({rating} stars)",
            payload={
                "review_id": review.get("review_id", ""),
                "reviewer_name": reviewer_name,
                "rating": rating,
                "review_text": review_text[:300],
                "response": response,
                "status": status,
                "lang": lang,
            },
        )

        results.append({
            "review_id": review.get("review_id", ""),
            "rating": rating,
            "reviewer_name": reviewer_name,
            "response": response,
            "status": status,
        })

    return results


# ═══════════════════════════════════════════════════════
# 2. PROFILE OPTIMIZATION
# ═══════════════════════════════════════════════════════

# Profile completeness checklist with weights
_PROFILE_CHECKS = {
    "business_name":    {"weight": 10, "label_en": "Business Name",    "label_ar": "اسم النشاط"},
    "description":      {"weight": 15, "label_en": "Description",      "label_ar": "الوصف"},
    "categories":       {"weight": 10, "label_en": "Categories",       "label_ar": "التصنيفات"},
    "hours":            {"weight": 10, "label_en": "Business Hours",   "label_ar": "ساعات العمل"},
    "phone":            {"weight": 8,  "label_en": "Phone Number",     "label_ar": "رقم الهاتف"},
    "website":          {"weight": 8,  "label_en": "Website Link",     "label_ar": "رابط الموقع"},
    "address":          {"weight": 8,  "label_en": "Address",          "label_ar": "العنوان"},
    "photos":           {"weight": 12, "label_en": "Photos (10+)",     "label_ar": "صور (10+)"},
    "menu_services":    {"weight": 10, "label_en": "Menu / Services",  "label_ar": "القائمة / الخدمات"},
    "attributes":       {"weight": 5,  "label_en": "Attributes",       "label_ar": "المميزات"},
    "qa_coverage":      {"weight": 4,  "label_en": "Q&A Coverage",     "label_ar": "الأسئلة والأجوبة"},
}


async def audit_profile(client_id: str) -> dict:
    """Audit the Google Business Profile for completeness and SEO optimization.

    Checks business description, categories, hours, photos count, Q&A coverage,
    menu/services, attributes, website link, and phone number. Data is pulled
    from the knowledge base (KB) and, if available, from Composio/Google API.

    Returns:
        dict with 'score' (0-100), 'checks' (per-field pass/fail),
        'recommendations' (prioritized list), and 'profile_data'.
    """
    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    crawl = kb.get("crawl_data", {}) or {}
    company_name = kb.get("company_name") or client_info.get("company_name", "")

    # Try to get live profile data via Composio
    live_profile: dict = {}
    composio_ok = await _composio_available(client_id)
    if composio_ok:
        result = await execute_composio_action("GOOGLEBUSINESS_GET_LOCATIONS", {})
        if result["success"]:
            locations = result["data"].get("locations", result["data"].get("items", []))
            if locations:
                live_profile = locations[0] if isinstance(locations[0], dict) else {}

    # Merge KB + live data for auditing
    profile_data = {
        "business_name": live_profile.get("title") or company_name,
        "description": live_profile.get("profile", {}).get("description", "") or crawl.get("description", "") or kb.get("faq_data", {}).get("about", ""),
        "categories": live_profile.get("categories", {}).get("primaryCategory", {}).get("displayName", "") or crawl.get("category", ""),
        "hours": live_profile.get("regularHours") or crawl.get("operating_hours", "") or kb.get("operating_hours", ""),
        "phone": live_profile.get("phoneNumbers", {}).get("primaryPhone", "") or client_info.get("contact_phone", ""),
        "website": live_profile.get("websiteUri", "") or crawl.get("website", "") or crawl.get("url", ""),
        "address": live_profile.get("storefrontAddress", {}).get("addressLines", [""])[0] if live_profile.get("storefrontAddress") else crawl.get("address", ""),
        "photos": live_profile.get("metadata", {}).get("mapsPhotosCount", 0),
        "menu_services": crawl.get("menu", []) or crawl.get("services", []) or kb.get("services", []),
        "attributes": live_profile.get("attributes", []),
        "qa_coverage": 0,  # Will estimate below
    }

    # Estimate photo count from KB if not from API
    if not profile_data["photos"]:
        photos_from_crawl = crawl.get("photos", [])
        profile_data["photos"] = len(photos_from_crawl) if isinstance(photos_from_crawl, list) else 0

    # Q&A coverage: check if we have FAQ content
    faq = kb.get("faq_data", {})
    if isinstance(faq, dict):
        qa_count = sum(1 for v in faq.values() if v and isinstance(v, str) and len(v) > 10)
        profile_data["qa_coverage"] = qa_count

    # Score each check
    checks: dict[str, dict] = {}
    total_score = 0

    for field, config in _PROFILE_CHECKS.items():
        value = profile_data.get(field)
        passed = False

        if field == "photos":
            passed = isinstance(value, int) and value >= 10
        elif field == "description":
            passed = isinstance(value, str) and len(value) >= 50
        elif field == "menu_services":
            passed = bool(value) and (isinstance(value, list) and len(value) >= 3 or isinstance(value, str) and len(value) > 20)
        elif field == "attributes":
            passed = bool(value) and isinstance(value, list) and len(value) >= 2
        elif field == "qa_coverage":
            passed = isinstance(value, int) and value >= 5
        elif field == "hours":
            passed = bool(value)
        else:
            passed = bool(value) and isinstance(value, str) and len(value.strip()) > 2

        score_contribution = config["weight"] if passed else 0
        total_score += score_contribution

        checks[field] = {
            "passed": passed,
            "weight": config["weight"],
            "score": score_contribution,
            "label_en": config["label_en"],
            "label_ar": config["label_ar"],
            "current_value": str(value)[:100] if value else "(missing)",
        }

    # Generate recommendations for failed checks, prioritized by weight
    failed = sorted(
        [(f, c) for f, c in checks.items() if not c["passed"]],
        key=lambda x: -x[1]["weight"],
    )

    recommendations_en = []
    recommendations_ar = []

    rec_map = {
        "description": (
            "Write a compelling business description (150-300 chars) with local keywords and your unique selling points.",
            "اكتب وصف جذاب للنشاط (150-300 حرف) مع كلمات محلية ونقاط القوة.",
        ),
        "categories": (
            "Set your primary and secondary Google Business categories to match your business type.",
            "حدد التصنيفات الأساسية والفرعية لنشاطك في قوقل.",
        ),
        "hours": (
            "Add your complete business hours including Friday/Saturday (GCC weekend) hours.",
            "أضف ساعات العمل كاملة بما فيها الجمعة والسبت.",
        ),
        "photos": (
            "Upload at least 10 high-quality photos: exterior, interior, menu items, team, ambiance.",
            "ارفع 10 صور عالية الجودة على الأقل: واجهة، داخلي، أطباق، فريق، أجواء.",
        ),
        "phone": (
            "Add your primary phone number so customers can call directly from Google.",
            "أضف رقم الهاتف الأساسي عشان العملاء يقدرون يتصلون من قوقل.",
        ),
        "website": (
            "Link your website to drive traffic and improve local SEO rankings.",
            "اربط موقعك الإلكتروني لتحسين الزيارات والظهور في البحث المحلي.",
        ),
        "address": (
            "Verify your complete address with Google to appear in local map results.",
            "تأكد من عنوانك الكامل عشان تظهر في نتائج الخريطة.",
        ),
        "menu_services": (
            "Add your full menu or service list to help customers decide before visiting.",
            "أضف القائمة الكاملة أو قائمة الخدمات عشان العملاء يقررون قبل الزيارة.",
        ),
        "attributes": (
            "Set business attributes: Wi-Fi, parking, outdoor seating, payment methods, accessibility.",
            "حدد مميزات النشاط: واي فاي، مواقف، جلسات خارجية، طرق الدفع.",
        ),
        "qa_coverage": (
            "Add answers to the top 10 most common questions customers ask about your business.",
            "أضف إجابات لأكثر 10 أسئلة شائعة يسألها العملاء عن نشاطك.",
        ),
        "business_name": (
            "Ensure your business name matches your official signage exactly (Google guideline).",
            "تأكد أن اسم النشاط مطابق للافتة الرسمية (شرط قوقل).",
        ),
    }

    for field, check in failed:
        en, ar = rec_map.get(field, (
            f"Complete your {check['label_en']} to improve your profile score.",
            f"أكمل {check['label_ar']} لتحسين تقييم ملفك.",
        ))
        recommendations_en.append({"field": field, "priority": check["weight"], "recommendation": en})
        recommendations_ar.append({"field": field, "priority": check["weight"], "recommendation": ar})

    await _log_activity(
        client_id=client_id,
        event_type="gbp_audit",
        summary=f"GBP audit score: {total_score}/100 for {company_name}",
        payload={"score": total_score, "failed_fields": [f for f, _ in failed]},
    )

    return {
        "client_id": client_id,
        "company_name": company_name,
        "score": total_score,
        "max_score": 100,
        "grade": "A" if total_score >= 85 else "B" if total_score >= 70 else "C" if total_score >= 50 else "D",
        "checks": checks,
        "recommendations_en": recommendations_en,
        "recommendations_ar": recommendations_ar,
        "profile_data": profile_data,
        "composio_connected": composio_ok,
        "audited_at": datetime.now(timezone.utc).isoformat(),
    }


async def generate_profile_description(client_id: str, lang: str = "en") -> str:
    """Generate an SEO-optimized business description using MiniMax + KB data.

    Includes local keywords, business type, location, and key offerings.
    Max 750 characters (Google Business Profile limit).

    Args:
        client_id: UUID of the tenant.
        lang: "en" for English, "ar" for Gulf Arabic.

    Returns:
        Optimized description string.
    """
    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client_info.get("company_name", "")
    location = _detect_location(kb, client_info)
    business_type = _detect_business_type(kb)
    crawl = kb.get("crawl_data", {}) or {}
    services = kb.get("services", []) or crawl.get("services", [])
    specials = crawl.get("daily_specials", crawl.get("specials", []))
    cuisine = crawl.get("cuisine_type", crawl.get("cuisine", ""))

    services_text = ", ".join(services[:8]) if isinstance(services, list) else str(services)
    specials_text = ", ".join(s.get("name", str(s)) for s in specials[:4]) if isinstance(specials, list) else ""

    lang_instruction = "Gulf Arabic (not formal MSA). Natural, conversational." if lang == "ar" else "English."

    system = f"""You are an SEO copywriter specializing in Google Business Profile optimization for {location} businesses.

Write an SEO-optimized business description for {company_name} ({business_type} in {location}).

Key info:
- Services/offerings: {services_text or 'various'}
- Cuisine/specialty: {cuisine or 'not specified'}
- Specials: {specials_text or 'not specified'}
- Location: {location}

Rules:
- MUST be under 750 characters (Google limit).
- Include 3-5 local SEO keywords naturally (e.g. "{business_type} in {location}", "best {business_type} {location}").
- Mention the specific area/neighborhood if known.
- Highlight unique selling points and atmosphere.
- Include a call-to-action (book, visit, order).
- Language: {lang_instruction}
- Do NOT use hashtags or emojis.
- Output ONLY the description. No explanation, no quotes."""

    description = await _minimax_chat(system, "Write the Google Business Profile description now.", max_tokens=400, temperature=0.7)

    # Enforce 750 char limit
    if len(description) > 750:
        # Truncate at the last sentence boundary within limit
        truncated = description[:750]
        last_period = max(truncated.rfind("."), truncated.rfind("!"), truncated.rfind("?"))
        if last_period > 500:
            description = truncated[:last_period + 1]
        else:
            description = truncated.rsplit(" ", 1)[0] + "..."

    await _log_activity(
        client_id=client_id,
        event_type="gbp_description_generated",
        summary=f"GBP description for {company_name} ({lang}, {len(description)} chars)",
        payload={"description": description, "lang": lang, "location": location},
    )

    return description


async def generate_gbp_posts(
    client_id: str,
    count: int = 3,
    lang: str = "en",
) -> list:
    """Generate Google Business Profile posts (updates, offers, events).

    Each post includes a title, body, CTA type, and image suggestion. Posts
    are formatted for the GBP post format (1500 char limit for body).

    Args:
        client_id: UUID of the tenant.
        count: Number of posts to generate (default 3).
        lang: "en" or "ar".

    Returns:
        list of {title, body, cta_type, cta_url, image_suggestion, post_type}.
    """
    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client_info.get("company_name", "")
    location = _detect_location(kb, client_info)
    business_type = _detect_business_type(kb)
    crawl = kb.get("crawl_data", {}) or {}
    services = kb.get("services", [])
    specials = crawl.get("daily_specials", [])
    website = crawl.get("website", "")

    services_text = ", ".join(services[:6]) if isinstance(services, list) else ""
    specials_text = ""
    if isinstance(specials, list):
        specials_text = "\n".join(f"- {s.get('name', '')}: {s.get('description', '')}" for s in specials[:4])

    lang_instruction = "Gulf Arabic (not formal MSA)" if lang == "ar" else "English"

    system = f"""You are a Google Business Profile content strategist for {company_name}, a {business_type} in {location}.

Generate {count} Google Business Profile posts. Mix these post types:
- UPDATE: general business update, news, behind-the-scenes
- OFFER: special deal, discount, limited-time promotion
- EVENT: upcoming event, seasonal special, celebration

For EACH post provide (as JSON):
- title: concise headline (max 60 chars)
- body: post content (max 300 words, engaging, includes local keywords)
- cta_type: one of "BOOK", "ORDER", "LEARN_MORE", "CALL", "SIGN_UP"
- post_type: "UPDATE", "OFFER", or "EVENT"
- image_suggestion: detailed description of ideal photo/visual for this post
- target_day: suggested day of week to publish (consider GCC weekend Thu-Sat)

Language: {lang_instruction}

Business details:
- Services: {services_text or 'various'}
- Current specials: {specials_text or 'none'}
- Website: {website or 'not set'}

Rules:
- Each post should target different local SEO keywords.
- Include location references naturally ("{location}", neighborhood, area).
- Make the CTA clear and compelling.
- GBP posts are professional — no excessive emojis, no hashtags.
- Output ONLY a JSON array of {count} objects. No markdown."""

    result = await _minimax_json(system, f"Generate {count} Google Business Profile posts now.", max_tokens=3000)

    if isinstance(result, dict) and "error" in result:
        return [result]

    posts = result if isinstance(result, list) else [result]

    # Add CTA URLs and validate
    for post in posts:
        if isinstance(post, dict):
            cta = post.get("cta_type", "LEARN_MORE")
            if cta not in ("BOOK", "ORDER", "LEARN_MORE", "CALL", "SIGN_UP"):
                post["cta_type"] = "LEARN_MORE"
            post["cta_url"] = website or ""
            # Enforce body length
            body = post.get("body", "")
            if len(body) > 1500:
                last_sentence = body[:1500].rfind(".")
                post["body"] = body[:last_sentence + 1] if last_sentence > 1000 else body[:1500]

    await _log_activity(
        client_id=client_id,
        event_type="gbp_posts_generated",
        summary=f"Generated {len(posts)} GBP posts for {company_name} ({lang})",
        payload={"posts": posts, "lang": lang},
    )

    return posts


# ═══════════════════════════════════════════════════════
# 3. Q&A MANAGEMENT
# ═══════════════════════════════════════════════════════

# Default questions by business type (most commonly asked on Google)
_DEFAULT_QUESTIONS = {
    "restaurant": [
        "Do you take reservations?",
        "Is there parking available?",
        "Do you have outdoor seating?",
        "What are your opening hours during Ramadan?",
        "Do you have a kids menu?",
        "Is the food halal?",
        "Do you deliver?",
        "Can you accommodate large groups?",
        "Do you have vegetarian/vegan options?",
        "What payment methods do you accept?",
    ],
    "cafe": [
        "Do you have Wi-Fi?",
        "Is there outdoor seating?",
        "Do you serve food or just drinks?",
        "What are your opening hours?",
        "Can I work from your cafe?",
        "Do you have decaf options?",
        "Is parking available?",
        "Do you do catering for offices?",
        "Are dogs/pets allowed?",
        "Do you have plant-based milk?",
    ],
    "salon": [
        "Do I need an appointment or can I walk in?",
        "What are your prices for [service]?",
        "Do you have female-only staff?",
        "Is parking available?",
        "Do you offer bridal packages?",
        "What brands do you use?",
        "Do you have a loyalty program?",
        "Can I book online?",
        "What are your hours during Eid?",
        "Do you do home service?",
    ],
    "real_estate": [
        "What areas do you cover?",
        "Do you handle rentals or just sales?",
        "What documents do I need to rent/buy?",
        "Do you offer property management?",
        "Can I schedule a viewing?",
        "What are current market prices in [area]?",
        "Do you work with off-plan properties?",
        "What are your commission rates?",
        "Do you help with mortgages?",
        "Can foreigners buy property?",
    ],
}

_DEFAULT_QUESTIONS_AR = {
    "restaurant": [
        "هل عندكم حجز طاولات؟",
        "هل في مواقف سيارات؟",
        "هل عندكم جلسات خارجية؟",
        "ايش أوقات العمل في رمضان؟",
        "هل عندكم قائمة أطفال؟",
        "هل الأكل حلال؟",
        "هل عندكم توصيل؟",
        "هل تقدرون تستقبلون مجموعات كبيرة؟",
        "هل عندكم خيارات نباتية؟",
        "ايش طرق الدفع المتاحة؟",
    ],
    "cafe": [
        "هل عندكم واي فاي؟",
        "هل في جلسات خارجية؟",
        "هل تقدمون أكل ولا مشروبات بس؟",
        "ايش أوقات العمل؟",
        "أقدر أشتغل من عندكم؟",
        "هل عندكم قهوة بدون كافيين؟",
        "هل في مواقف؟",
        "هل تقدمون كيترنق للمكاتب؟",
        "هل مسموح بالحيوانات الأليفة؟",
        "هل عندكم حليب نباتي؟",
    ],
    "salon": [
        "لازم حجز ولا أقدر أجي بدون موعد؟",
        "كم أسعار [الخدمة]؟",
        "هل عندكم كوادر نسائية فقط؟",
        "هل في مواقف سيارات؟",
        "هل عندكم باقات عرايس؟",
        "ايش الماركات اللي تستخدمونها؟",
        "هل عندكم برنامج ولاء؟",
        "أقدر أحجز أونلاين؟",
        "ايش أوقاتكم في العيد؟",
        "هل عندكم خدمة منزلية؟",
    ],
    "real_estate": [
        "ايش المناطق اللي تغطونها؟",
        "تتعاملون مع إيجار ولا بيع بس؟",
        "ايش الأوراق المطلوبة للإيجار أو الشراء؟",
        "هل تقدمون إدارة عقارات؟",
        "أقدر أحجز معاينة؟",
        "كم أسعار السوق الحالية في [المنطقة]؟",
        "هل تتعاملون مع عقارات على الخارطة؟",
        "كم نسبة العمولة؟",
        "هل تساعدون في التمويل العقاري؟",
        "هل الأجانب يقدرون يشترون عقار؟",
    ],
}


async def generate_faq_answers(
    client_id: str,
    questions: list | None = None,
) -> list:
    """Generate answers for common Google Q&A questions.

    If no questions provided, generates answers for the top 10 most likely
    questions for this business type. Answers are sourced from the knowledge
    base first, then generated by AI for gaps.

    Args:
        client_id: UUID of the tenant.
        questions: Optional list of question strings. If None, uses defaults.

    Returns:
        list of {question, question_ar, answer, answer_ar, source: 'kb'|'ai_generated'}.
    """
    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client_info.get("company_name", "")
    business_type = _detect_business_type(kb)
    location = _detect_location(kb, client_info)
    crawl = kb.get("crawl_data", {}) or {}
    faq_data = kb.get("faq_data", {}) or {}

    # Use provided questions or defaults
    if not questions:
        questions = _DEFAULT_QUESTIONS.get(business_type, _DEFAULT_QUESTIONS["restaurant"])
    questions_ar = _DEFAULT_QUESTIONS_AR.get(business_type, _DEFAULT_QUESTIONS_AR["restaurant"])

    # Build a context string from KB for answer sourcing
    kb_context_parts = []
    if faq_data and isinstance(faq_data, dict):
        for key, val in faq_data.items():
            if val and isinstance(val, str):
                kb_context_parts.append(f"{key}: {val}")
    services = kb.get("services", [])
    if services:
        kb_context_parts.append(f"Services: {', '.join(services[:10])}")
    hours = crawl.get("operating_hours", "") or kb.get("operating_hours", "")
    if hours:
        kb_context_parts.append(f"Hours: {hours}")
    address = crawl.get("address", "")
    if address:
        kb_context_parts.append(f"Address: {address}")
    for extra in ("parking", "wifi", "delivery", "payment_methods", "dietary_options", "seating"):
        val = crawl.get(extra)
        if val:
            kb_context_parts.append(f"{extra}: {val}")

    kb_context = "\n".join(kb_context_parts) if kb_context_parts else "No detailed info available."

    results: list[dict] = []

    for i, question in enumerate(questions[:10]):
        question_ar = questions_ar[i] if i < len(questions_ar) else ""

        # Try to answer from KB first
        answer_from_kb = _match_question_to_kb(question, faq_data, crawl)

        if answer_from_kb:
            results.append({
                "question": question,
                "question_ar": question_ar,
                "answer": answer_from_kb,
                "answer_ar": "",  # Will generate Arabic version below
                "source": "kb",
            })
        else:
            results.append({
                "question": question,
                "question_ar": question_ar,
                "answer": "",
                "answer_ar": "",
                "source": "ai_generated",
            })

    # Batch-generate AI answers for gaps and Arabic translations
    questions_needing_answers = [r for r in results if not r["answer"]]
    questions_needing_arabic = [r for r in results if r["answer"] and not r["answer_ar"]]

    if questions_needing_answers:
        q_list = "\n".join(f"{i+1}. {r['question']}" for i, r in enumerate(questions_needing_answers))

        system = f"""You are the manager of {company_name}, a {business_type} in {location}.
Answer each question concisely and helpfully (1-3 sentences).

Business info:
{kb_context}

Rules:
- Be specific, not generic. Use real info from the business.
- If you don't know, give the most reasonable answer for a {business_type} in {location}.
- Keep answers friendly and professional.
- Output a JSON array of objects: {{"question": "...", "answer": "...", "answer_ar": "..."}}
- answer_ar should be in Gulf Arabic (not formal MSA).
- No markdown, no explanation."""

        ai_answers = await _minimax_json(system, f"Answer these questions:\n{q_list}", max_tokens=3000)

        if isinstance(ai_answers, list):
            for i, r in enumerate(questions_needing_answers):
                if i < len(ai_answers) and isinstance(ai_answers[i], dict):
                    r["answer"] = ai_answers[i].get("answer", "Please contact us for more information.")
                    r["answer_ar"] = ai_answers[i].get("answer_ar", "")

    # Generate Arabic translations for KB-sourced answers
    if questions_needing_arabic:
        q_list = "\n".join(f'{i+1}. Q: "{r["question"]}"\nA: "{r["answer"]}"' for i, r in enumerate(questions_needing_arabic))

        arabic_system = f"""Translate these Q&A pairs into Gulf Arabic. Keep the same meaning but make it sound natural in Gulf dialect (not formal MSA).
Output a JSON array of objects: {{"answer_ar": "..."}}
One object per Q&A. No markdown, no explanation."""

        arabic_results = await _minimax_json(arabic_system, q_list, max_tokens=2000)

        if isinstance(arabic_results, list):
            for i, r in enumerate(questions_needing_arabic):
                if i < len(arabic_results) and isinstance(arabic_results[i], dict):
                    r["answer_ar"] = arabic_results[i].get("answer_ar", "")

    await _log_activity(
        client_id=client_id,
        event_type="gbp_faq_generated",
        summary=f"Generated {len(results)} FAQ answers for {company_name}",
        payload={
            "faq_count": len(results),
            "from_kb": sum(1 for r in results if r["source"] == "kb"),
            "ai_generated": sum(1 for r in results if r["source"] == "ai_generated"),
        },
    )

    return results


def _match_question_to_kb(question: str, faq_data: dict, crawl: dict) -> str:
    """Try to find an answer to a question in the knowledge base."""
    q_lower = question.lower()

    # Direct keyword matching against FAQ data
    keyword_map = {
        "reservation": ["booking", "reservation", "reserve", "table"],
        "parking": ["parking", "park", "car"],
        "outdoor": ["outdoor", "outside", "terrace", "garden", "patio"],
        "hours": ["hour", "opening", "closing", "time", "when", "ramadan"],
        "kids": ["kid", "child", "children", "family"],
        "halal": ["halal"],
        "deliver": ["deliver", "delivery", "order online"],
        "group": ["group", "large party", "big party", "accommodate"],
        "vegetarian": ["vegetarian", "vegan", "plant-based", "veggie"],
        "payment": ["payment", "pay", "credit card", "cash", "card"],
        "wifi": ["wifi", "wi-fi", "internet"],
        "pet": ["pet", "dog", "cat", "animal"],
        "appointment": ["appointment", "walk-in", "walk in", "book"],
        "price": ["price", "cost", "how much", "rate"],
        "brand": ["brand", "product", "use"],
    }

    for category, keywords in keyword_map.items():
        if any(kw in q_lower for kw in keywords):
            # Check FAQ data
            for faq_key, faq_val in faq_data.items():
                if isinstance(faq_val, str) and any(kw in faq_key.lower() for kw in keywords):
                    return faq_val
            # Check crawl data
            crawl_val = crawl.get(category, "")
            if crawl_val:
                if isinstance(crawl_val, list):
                    return ", ".join(str(v) for v in crawl_val[:5])
                return str(crawl_val)

    return ""


# ═══════════════════════════════════════════════════════
# 4. LOCAL SEO
# ═══════════════════════════════════════════════════════

# SEO keyword pools by business type and location
_SEO_BASES = {
    "restaurant": {
        "primary_en": ["restaurant", "dining", "food", "eat"],
        "primary_ar": ["مطعم", "اكل", "طعام", "مأكولات"],
        "secondary_en": ["best restaurant", "fine dining", "family restaurant", "business lunch", "dinner"],
        "secondary_ar": ["أفضل مطعم", "عشاء", "غداء", "مطعم عائلي"],
    },
    "cafe": {
        "primary_en": ["cafe", "coffee", "coffee shop", "bakery"],
        "primary_ar": ["كافيه", "قهوة", "كوفي شوب", "مخبز"],
        "secondary_en": ["best coffee", "specialty coffee", "brunch", "workspace cafe", "cozy cafe"],
        "secondary_ar": ["أفضل قهوة", "قهوة مختصة", "فطور", "كافيه هادي"],
    },
    "salon": {
        "primary_en": ["salon", "beauty salon", "hair salon", "spa"],
        "primary_ar": ["صالون", "صالون تجميل", "مشغل", "سبا"],
        "secondary_en": ["best salon", "bridal makeup", "hair color", "manicure", "facial", "keratin"],
        "secondary_ar": ["أفضل صالون", "مكياج عروس", "صبغة شعر", "عناية بالبشرة"],
    },
    "real_estate": {
        "primary_en": ["real estate", "property", "apartments", "villas"],
        "primary_ar": ["عقارات", "عقار", "شقق", "فلل"],
        "secondary_en": ["property for sale", "apartment for rent", "villa for sale", "off-plan", "commercial"],
        "secondary_ar": ["شقة للإيجار", "فيلا للبيع", "عقار للبيع", "شقق للبيع"],
    },
}


async def get_local_seo_keywords(client_id: str, location: str = "Dubai") -> dict:
    """Generate optimized local SEO keywords for the business.

    Combines business type, location, cuisine/specialty, and competitor
    analysis to produce a keyword strategy.

    Args:
        client_id: UUID of the tenant.
        location: Target city (default "Dubai").

    Returns:
        dict with primary, secondary, long_tail, arabic keyword lists.
    """
    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client_info.get("company_name", "")
    business_type = _detect_business_type(kb)
    crawl = kb.get("crawl_data", {}) or {}
    cuisine = crawl.get("cuisine_type", crawl.get("cuisine", ""))
    neighborhood = crawl.get("area", crawl.get("neighborhood", ""))

    if not location or location == "Dubai":
        location = _detect_location(kb, client_info)

    base_keywords = _SEO_BASES.get(business_type, _SEO_BASES["restaurant"])

    # Build location-specific primary keywords
    primary = [f"{kw} in {location}" for kw in base_keywords["primary_en"]]
    if neighborhood:
        primary.extend([f"{kw} {neighborhood}" for kw in base_keywords["primary_en"][:2]])
    if cuisine:
        primary.append(f"{cuisine} restaurant in {location}")
        primary.append(f"best {cuisine} food {location}")

    # Secondary keywords
    secondary = [f"{kw} in {location}" for kw in base_keywords["secondary_en"]]
    secondary.append(f"{company_name} {location}")
    secondary.append(f"near me {business_type}")

    # Long-tail keywords (AI-generated for specificity)
    long_tail_system = f"""Generate 8 long-tail SEO keywords for {company_name}, a {business_type} in {location}.
{"Cuisine: " + cuisine if cuisine else ""}
{"Area: " + neighborhood if neighborhood else ""}

Rules:
- Each keyword should be 4-7 words.
- Include local modifiers ({location}, {neighborhood or 'area'}).
- Target "near me" and question-based queries.
- Mix informational and transactional intent.
- Output ONLY a JSON array of strings. No explanation."""

    long_tail_result = await _minimax_json(long_tail_system, "Generate the keywords now.", max_tokens=500)
    long_tail = long_tail_result if isinstance(long_tail_result, list) else []
    # Ensure all items are strings
    long_tail = [str(kw) for kw in long_tail if isinstance(kw, str)]

    # Arabic keywords
    arabic = [f"{kw} {location}" for kw in base_keywords.get("primary_ar", [])]
    arabic.extend(base_keywords.get("secondary_ar", []))
    # Add location in Arabic
    location_ar_map = {
        "Dubai": "دبي", "Abu Dhabi": "ابوظبي", "Sharjah": "الشارقة",
        "Riyadh": "الرياض", "Jeddah": "جدة", "Doha": "الدوحة",
        "Ajman": "عجمان", "Muscat": "مسقط",
    }
    location_ar = location_ar_map.get(location, location)
    arabic.extend([f"{kw} {location_ar}" for kw in base_keywords.get("primary_ar", [])[:3]])

    result = {
        "client_id": client_id,
        "location": location,
        "business_type": business_type,
        "primary": primary,
        "secondary": secondary,
        "long_tail": long_tail[:8],
        "arabic": arabic,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    await _log_activity(
        client_id=client_id,
        event_type="gbp_seo_keywords",
        summary=f"Local SEO keywords for {company_name} in {location} ({len(primary)} primary, {len(long_tail)} long-tail)",
        payload=result,
    )

    return result


async def generate_seo_content_plan(client_id: str, weeks: int = 4) -> list:
    """Generate a content plan optimized for local SEO.

    Each entry targets a specific keyword cluster and is designed to improve
    local search visibility on Google Business Profile.

    Args:
        client_id: UUID of the tenant.
        weeks: Number of weeks to plan (default 4).

    Returns:
        list of weekly content entries with keyword targets and content ideas.
    """
    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client_info.get("company_name", "")
    business_type = _detect_business_type(kb)
    location = _detect_location(kb, client_info)

    # Get keywords for context
    keywords = await get_local_seo_keywords(client_id, location)

    primary_kw = ", ".join(keywords.get("primary", [])[:5])
    secondary_kw = ", ".join(keywords.get("secondary", [])[:5])
    long_tail_kw = ", ".join(keywords.get("long_tail", [])[:5])

    system = f"""You are an SEO content strategist for {company_name}, a {business_type} in {location}.

Create a {weeks}-week SEO content plan for Google Business Profile. Each week should have 2-3 content entries.

Target keywords:
Primary: {primary_kw}
Secondary: {secondary_kw}
Long-tail: {long_tail_kw}

For EACH content entry provide (as JSON):
- week: week number (1-{weeks})
- keyword_target: the specific keyword this content targets
- content_type: "gbp_post" | "q_and_a" | "photo_update" | "review_request" | "description_update"
- title: content title/headline
- description: what to create (2-3 sentences)
- seo_intent: "informational" | "transactional" | "navigational"
- expected_impact: "high" | "medium" | "low"
- bilingual: true if content should be in both English and Arabic

Rules:
- Week 1 should focus on foundational optimizations (description, photos, hours).
- Subsequent weeks build with posts, Q&A, and review campaigns.
- Vary content types across weeks.
- Target GCC-specific search patterns (e.g. "near me", "best in [area]").
- Consider Ramadan, Eid, National Day if within the planning window.
- Output ONLY a JSON array. No markdown, no explanation."""

    result = await _minimax_json(system, f"Create the {weeks}-week plan now.", max_tokens=4000)

    if isinstance(result, dict) and "error" in result:
        return [result]

    plan = result if isinstance(result, list) else [result]

    await _log_activity(
        client_id=client_id,
        event_type="gbp_seo_content_plan",
        summary=f"{weeks}-week SEO plan for {company_name} ({len(plan)} entries)",
        payload={"weeks": weeks, "plan": plan},
    )

    return plan


# ═══════════════════════════════════════════════════════
# 5. PERFORMANCE DASHBOARD
# ═══════════════════════════════════════════════════════

async def get_gbp_insights(client_id: str) -> dict:
    """Get Google Business Profile performance insights.

    Real data requires Composio/Google API connection. Falls back to estimates
    derived from conversation data and activity logs.

    Returns:
        dict with views, searches, calls, directions, website_clicks,
        photo_views, review_count, avg_rating, period, and data_source.
    """
    composio_ok = await _composio_available(client_id)

    # Try Composio / Google API first
    if composio_ok:
        result = await execute_composio_action("GOOGLEBUSINESS_GET_INSIGHTS", {"period": "LAST_7_DAYS"})
        if result["success"]:
            data = result["data"]
            return {
                "client_id": client_id,
                "views": data.get("businessProfileViews", data.get("views", 0)),
                "searches": data.get("searchViews", data.get("searches", 0)),
                "calls": data.get("callClicks", data.get("calls", 0)),
                "directions": data.get("directionRequests", data.get("directions", 0)),
                "website_clicks": data.get("websiteClicks", data.get("website_clicks", 0)),
                "photo_views": data.get("photoViews", data.get("photo_views", 0)),
                "review_count": data.get("reviewCount", data.get("review_count", 0)),
                "avg_rating": data.get("averageRating", data.get("avg_rating", 0.0)),
                "period": "last_7_days",
                "data_source": "google_api",
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            }

    # Fallback: estimate from local data
    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()

    # Count conversations as a proxy for engagement
    conversation_count = 0
    booking_count = 0
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            # Unique conversations
            r = await http.get(
                f"{_SUPA_URL}/rest/v1/conversation_messages"
                f"?client_id=eq.{client_id}"
                f"&direction=eq.inbound"
                f"&created_at=gte.{week_ago}"
                f"&select=customer_phone",
                headers=_SUPA_HEADERS,
            )
            msgs = r.json() if r.status_code == 200 else []
            conversation_count = len(set(m.get("customer_phone", "") for m in msgs if m.get("customer_phone")))

            # Bookings
            r2 = await http.get(
                f"{_SUPA_URL}/rest/v1/active_bookings"
                f"?client_id=eq.{client_id}"
                f"&created_at=gte.{week_ago}"
                f"&status=in.(confirmed,completed)"
                f"&select=id",
                headers=_SUPA_HEADERS,
            )
            bookings = r2.json() if r2.status_code == 200 else []
            booking_count = len(bookings)
    except Exception:
        pass

    # Fetch stored reviews for count + average
    reviews = await fetch_reviews(client_id, days=30)
    review_count = len(reviews)
    avg_rating = 0.0
    if reviews:
        ratings = [r.get("rating", 0) for r in reviews if r.get("rating")]
        avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0.0

    # Estimate GBP metrics from WhatsApp engagement (rough multiplier)
    estimated_views = conversation_count * 8  # ~8x more view than engage
    estimated_searches = conversation_count * 5
    estimated_calls = max(booking_count, conversation_count // 3)
    estimated_directions = booking_count * 2

    return {
        "client_id": client_id,
        "views": estimated_views,
        "searches": estimated_searches,
        "calls": estimated_calls,
        "directions": estimated_directions,
        "website_clicks": conversation_count,
        "photo_views": estimated_views * 2,
        "review_count": review_count,
        "avg_rating": avg_rating,
        "period": "last_7_days",
        "data_source": "estimated_from_conversations",
        "note": "Connect Google Business Profile via Composio for real metrics.",
        "conversation_count": conversation_count,
        "booking_count": booking_count,
        "fetched_at": now.isoformat(),
    }


async def get_gbp_brief(client_id: str, lang: str = "en") -> str:
    """WhatsApp-friendly Google Business Profile summary for the owner.

    Combines review performance, profile score, and actionable recommendations
    into a concise message suitable for WhatsApp delivery.

    Args:
        client_id: UUID of the tenant.
        lang: "en" or "ar".

    Returns:
        Formatted brief string ready for WhatsApp.
    """
    insights = await get_gbp_insights(client_id)
    audit = await audit_profile(client_id)
    reviews = await fetch_reviews(client_id, days=7)

    company_name = audit.get("company_name", "Your Business")
    score = audit.get("score", 0)
    grade = audit.get("grade", "?")

    # Count new reviews by rating
    positive = sum(1 for r in reviews if r.get("rating", 0) >= 4)
    negative = sum(1 for r in reviews if r.get("rating", 0) <= 3 and r.get("rating", 0) > 0)
    unreplied = sum(1 for r in reviews if not r.get("reply_exists"))

    if lang == "ar":
        lines = [
            f"📊 ملخص قوقل بزنس — {company_name}",
            f"",
            f"🏆 تقييم الملف: {score}/100 ({grade})",
            f"⭐ متوسط التقييم: {insights.get('avg_rating', 0)}/5 ({insights.get('review_count', 0)} تقييم)",
            f"",
            f"📈 أداء آخر 7 أيام:",
            f"  👁️ المشاهدات: ~{insights.get('views', 0)}",
            f"  🔍 البحث: ~{insights.get('searches', 0)}",
            f"  📞 المكالمات: ~{insights.get('calls', 0)}",
            f"  🗺️ الاتجاهات: ~{insights.get('directions', 0)}",
            f"  🌐 زيارات الموقع: ~{insights.get('website_clicks', 0)}",
        ]

        if reviews:
            lines.append(f"")
            lines.append(f"📝 التقييمات هذا الأسبوع:")
            lines.append(f"  ✅ إيجابي: {positive} | ⚠️ سلبي: {negative}")
            if unreplied:
                lines.append(f"  💬 بدون رد: {unreplied} — ردّ عليهم!")

        # Top recommendation
        recs = audit.get("recommendations_ar", [])
        if recs:
            lines.append(f"")
            lines.append(f"💡 أهم توصية:")
            lines.append(f"  {recs[0].get('recommendation', '')}")

        if insights.get("data_source") == "estimated_from_conversations":
            lines.append(f"")
            lines.append(f"📌 الأرقام تقريبية — اربط حسابك في قوقل للبيانات الدقيقة.")

    else:
        lines = [
            f"📊 Google Business Brief — {company_name}",
            f"",
            f"🏆 Profile Score: {score}/100 ({grade})",
            f"⭐ Avg Rating: {insights.get('avg_rating', 0)}/5 ({insights.get('review_count', 0)} reviews)",
            f"",
            f"📈 Last 7 Days Performance:",
            f"  👁️ Views: ~{insights.get('views', 0)}",
            f"  🔍 Searches: ~{insights.get('searches', 0)}",
            f"  📞 Calls: ~{insights.get('calls', 0)}",
            f"  🗺️ Directions: ~{insights.get('directions', 0)}",
            f"  🌐 Website Clicks: ~{insights.get('website_clicks', 0)}",
        ]

        if reviews:
            lines.append(f"")
            lines.append(f"📝 Reviews This Week:")
            lines.append(f"  ✅ Positive: {positive} | ⚠️ Negative: {negative}")
            if unreplied:
                lines.append(f"  💬 Unreplied: {unreplied} — respond to build trust!")

        # Top recommendation
        recs = audit.get("recommendations_en", [])
        if recs:
            lines.append(f"")
            lines.append(f"💡 Top Recommendation:")
            lines.append(f"  {recs[0].get('recommendation', '')}")

        if insights.get("data_source") == "estimated_from_conversations":
            lines.append(f"")
            lines.append(f"📌 Numbers are estimates — connect Google Business via Composio for real data.")

    return "\n".join(lines)


# ═══════════════════════════════════════════════════════
# 6. AUTO-FIX — Generate fixes for every failed check
# ═══════════════════════════════════════════════════════

async def auto_fix_profile(client_id: str, lang: str = "en") -> dict:
    """Run the audit and auto-generate fixes for EVERY failed check.

    For each issue found:
    - Missing description -> generate SEO-optimized description (750 chars max)
    - Missing/weak categories -> suggest primary + secondary categories
    - Missing hours -> generate from KB data or suggest standard hours
    - Low photos -> generate a shot list with exact compositions
    - Missing Q&A -> generate top 10 Q&A pairs from KB
    - Missing menu/services -> structure from KB products
    - Missing attributes -> suggest relevant ones (wifi, parking, outdoor seating, etc.)
    - Missing website -> suggest creating one

    Returns: {score_before, score_after, fixes_applied: [{field, action, content}]}
    """
    audit = await audit_profile(client_id)
    score_before = audit.get("score", 0)
    checks = audit.get("checks", {})
    company_name = audit.get("company_name", "")

    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    business_type = _detect_business_type(kb)
    location = _detect_location(kb, client_info)
    crawl = kb.get("crawl_data", {}) or {}

    fixes_applied: list[dict] = []
    score_after = score_before

    # --- FIX: Description ---
    if not checks.get("description", {}).get("passed"):
        description = await generate_profile_description(client_id, lang)
        fixes_applied.append({
            "field": "description",
            "action": "generated",
            "content": description,
            "label": "Business Description",
            "instruction": "Copy this description into your Google Business Profile > Info > Description.",
        })
        score_after += checks.get("description", {}).get("weight", 15)

    # --- FIX: Categories ---
    if not checks.get("categories", {}).get("passed"):
        category_map = {
            "restaurant": {
                "primary": "Restaurant",
                "secondary": [
                    "Middle Eastern Restaurant", "Fine Dining Restaurant",
                    "Family Restaurant", "Catering Service", "Lunch Restaurant",
                    "Dinner Restaurant", "Brunch Restaurant", "Takeout Restaurant",
                    "Delivery Restaurant",
                ],
            },
            "cafe": {
                "primary": "Coffee Shop",
                "secondary": [
                    "Cafe", "Bakery", "Breakfast Restaurant", "Brunch Restaurant",
                    "Dessert Shop", "Tea House", "Juice Bar", "Sandwich Shop",
                    "Coworking Space",
                ],
            },
            "salon": {
                "primary": "Beauty Salon",
                "secondary": [
                    "Hair Salon", "Nail Salon", "Spa", "Barber Shop",
                    "Makeup Artist", "Waxing Service", "Facial Treatment",
                    "Bridal Makeup Service", "Hair Removal Service",
                ],
            },
            "real_estate": {
                "primary": "Real Estate Agency",
                "secondary": [
                    "Real Estate Consultant", "Property Management Company",
                    "Real Estate Developer", "Commercial Real Estate Agency",
                    "Apartment Rental Agency", "Corporate Housing Provider",
                    "Vacation Rental Agency", "Real Estate Appraiser",
                    "Real Estate Investment Firm",
                ],
            },
        }

        cats = category_map.get(business_type, category_map["restaurant"])
        # Refine with AI if cuisine info is available
        cuisine = crawl.get("cuisine_type", crawl.get("cuisine", ""))
        if cuisine and business_type == "restaurant":
            cuisine_cats = {
                "indian": "Indian Restaurant",
                "italian": "Italian Restaurant",
                "japanese": "Japanese Restaurant",
                "chinese": "Chinese Restaurant",
                "lebanese": "Lebanese Restaurant",
                "thai": "Thai Restaurant",
                "mexican": "Mexican Restaurant",
                "turkish": "Turkish Restaurant",
                "korean": "Korean Restaurant",
                "american": "American Restaurant",
                "french": "French Restaurant",
                "seafood": "Seafood Restaurant",
                "sushi": "Sushi Restaurant",
                "pizza": "Pizza Restaurant",
                "burger": "Hamburger Restaurant",
                "arabic": "Middle Eastern Restaurant",
            }
            for key, cat_name in cuisine_cats.items():
                if key in cuisine.lower():
                    cats["primary"] = cat_name
                    break

        fixes_applied.append({
            "field": "categories",
            "action": "suggested",
            "content": {
                "primary": cats["primary"],
                "secondary": cats["secondary"][:9],  # Google allows up to 9 secondary
            },
            "label": "Business Categories",
            "instruction": f"Set '{cats['primary']}' as your primary category. Add these secondary categories one by one in Google Business Profile > Info > Category.",
        })
        score_after += checks.get("categories", {}).get("weight", 10)

    # --- FIX: Hours ---
    if not checks.get("hours", {}).get("passed"):
        # Try to get hours from KB
        kb_hours = crawl.get("operating_hours", "") or kb.get("operating_hours", "")

        if kb_hours:
            hours_content = kb_hours
        else:
            # Generate standard hours for business type in the region
            standard_hours = {
                "restaurant": {
                    "Sunday": "12:00 PM - 11:30 PM",
                    "Monday": "12:00 PM - 11:30 PM",
                    "Tuesday": "12:00 PM - 11:30 PM",
                    "Wednesday": "12:00 PM - 11:30 PM",
                    "Thursday": "12:00 PM - 12:00 AM",
                    "Friday": "1:00 PM - 12:00 AM",
                    "Saturday": "12:00 PM - 12:00 AM",
                },
                "cafe": {
                    "Sunday": "7:00 AM - 10:00 PM",
                    "Monday": "7:00 AM - 10:00 PM",
                    "Tuesday": "7:00 AM - 10:00 PM",
                    "Wednesday": "7:00 AM - 10:00 PM",
                    "Thursday": "7:00 AM - 11:00 PM",
                    "Friday": "8:00 AM - 11:00 PM",
                    "Saturday": "7:00 AM - 11:00 PM",
                },
                "salon": {
                    "Sunday": "10:00 AM - 9:00 PM",
                    "Monday": "10:00 AM - 9:00 PM",
                    "Tuesday": "10:00 AM - 9:00 PM",
                    "Wednesday": "10:00 AM - 9:00 PM",
                    "Thursday": "10:00 AM - 10:00 PM",
                    "Friday": "2:00 PM - 10:00 PM",
                    "Saturday": "10:00 AM - 10:00 PM",
                },
                "real_estate": {
                    "Sunday": "9:00 AM - 6:00 PM",
                    "Monday": "9:00 AM - 6:00 PM",
                    "Tuesday": "9:00 AM - 6:00 PM",
                    "Wednesday": "9:00 AM - 6:00 PM",
                    "Thursday": "9:00 AM - 6:00 PM",
                    "Friday": "Closed",
                    "Saturday": "10:00 AM - 4:00 PM",
                },
            }
            hours_content = standard_hours.get(business_type, standard_hours["restaurant"])

        fixes_applied.append({
            "field": "hours",
            "action": "generated",
            "content": hours_content,
            "label": "Business Hours",
            "instruction": "Add these hours to Google Business Profile > Info > Hours. Adjust for your actual schedule. Remember to set special hours for Ramadan, Eid, and National Day.",
        })
        score_after += checks.get("hours", {}).get("weight", 10)

    # --- FIX: Photos ---
    if not checks.get("photos", {}).get("passed"):
        shot_list = await generate_photo_shot_list(client_id, business_type, lang)
        fixes_applied.append({
            "field": "photos",
            "action": "shot_list_generated",
            "content": shot_list,
            "label": "Photo Shot List",
            "instruction": "Take these 10 photos and upload them to Google Business Profile > Photos. Use the suggested file names for SEO benefit.",
        })
        score_after += checks.get("photos", {}).get("weight", 12)

    # --- FIX: Q&A ---
    if not checks.get("qa_coverage", {}).get("passed"):
        faq = await generate_faq_answers(client_id)
        fixes_applied.append({
            "field": "qa_coverage",
            "action": "generated",
            "content": faq,
            "label": "Q&A Pairs",
            "instruction": "Post each question on your Google Business Profile and immediately answer it yourself. This pre-populates the Q&A section and prevents wrong answers from strangers.",
        })
        score_after += checks.get("qa_coverage", {}).get("weight", 4)

    # --- FIX: Menu / Services ---
    if not checks.get("menu_services", {}).get("passed"):
        services = kb.get("services", []) or crawl.get("services", [])
        menu = crawl.get("menu", []) or crawl.get("daily_specials", [])

        if services or menu:
            structured = []
            if isinstance(services, list):
                for svc in services[:15]:
                    if isinstance(svc, str):
                        structured.append({"name": svc, "price": "", "description": ""})
                    elif isinstance(svc, dict):
                        structured.append(svc)
            if isinstance(menu, list):
                for item in menu[:15]:
                    if isinstance(item, dict):
                        structured.append({
                            "name": item.get("name", item.get("title", "")),
                            "price": item.get("price", ""),
                            "description": item.get("description", ""),
                        })
            content = structured
        else:
            # Generate from AI
            system = f"""You are the manager of {company_name}, a {business_type} in {location}.
Generate a realistic menu/service list for Google Business Profile. Include 10-15 items.

For EACH item provide (as JSON):
- name: item name
- price: estimated price in AED (reasonable for {location})
- description: 1-sentence description
- category: grouping (e.g. "Starters", "Main Course", "Drinks", "Haircut", "Color", etc.)

Output ONLY a JSON array. No markdown."""

            content = await _minimax_json(system, "Generate the menu/service list now.", max_tokens=2000)
            if isinstance(content, dict) and "error" in content:
                content = [{"name": "Please add your menu items", "price": "", "description": ""}]

        fixes_applied.append({
            "field": "menu_services",
            "action": "structured",
            "content": content,
            "label": "Menu / Services",
            "instruction": "Add these items to Google Business Profile > Menu (restaurants) or Services (other businesses). Include photos for best results.",
        })
        score_after += checks.get("menu_services", {}).get("weight", 10)

    # --- FIX: Attributes ---
    if not checks.get("attributes", {}).get("passed"):
        attribute_map = {
            "restaurant": [
                {"id": "has_wifi", "name": "Free Wi-Fi", "likely": True},
                {"id": "has_parking", "name": "Parking available", "likely": True},
                {"id": "outdoor_seating", "name": "Outdoor seating", "likely": True},
                {"id": "serves_halal", "name": "Serves halal food", "likely": True},
                {"id": "good_for_kids", "name": "Good for kids", "likely": True},
                {"id": "good_for_groups", "name": "Good for groups", "likely": True},
                {"id": "accepts_reservations", "name": "Accepts reservations", "likely": True},
                {"id": "has_delivery", "name": "Delivery", "likely": True},
                {"id": "has_takeout", "name": "Takeout", "likely": True},
                {"id": "wheelchair_accessible", "name": "Wheelchair accessible", "likely": True},
                {"id": "accepts_credit_cards", "name": "Accepts credit cards", "likely": True},
                {"id": "serves_alcohol", "name": "Serves alcohol", "likely": False},
                {"id": "has_live_music", "name": "Live music", "likely": False},
                {"id": "has_private_dining", "name": "Private dining", "likely": False},
            ],
            "cafe": [
                {"id": "has_wifi", "name": "Free Wi-Fi", "likely": True},
                {"id": "has_parking", "name": "Parking available", "likely": True},
                {"id": "outdoor_seating", "name": "Outdoor seating", "likely": True},
                {"id": "good_for_work", "name": "Good for working", "likely": True},
                {"id": "has_takeout", "name": "Takeout", "likely": True},
                {"id": "has_delivery", "name": "Delivery", "likely": True},
                {"id": "wheelchair_accessible", "name": "Wheelchair accessible", "likely": True},
                {"id": "accepts_credit_cards", "name": "Accepts credit cards", "likely": True},
                {"id": "has_vegan_options", "name": "Vegan options", "likely": True},
                {"id": "pet_friendly", "name": "Pet friendly", "likely": False},
            ],
            "salon": [
                {"id": "has_parking", "name": "Parking available", "likely": True},
                {"id": "wheelchair_accessible", "name": "Wheelchair accessible", "likely": True},
                {"id": "accepts_credit_cards", "name": "Accepts credit cards", "likely": True},
                {"id": "by_appointment_only", "name": "By appointment only", "likely": False},
                {"id": "walk_ins_welcome", "name": "Walk-ins welcome", "likely": True},
                {"id": "women_only", "name": "Women-led/women-only", "likely": False},
                {"id": "has_bridal_services", "name": "Bridal services", "likely": True},
                {"id": "has_home_service", "name": "Home service available", "likely": False},
            ],
            "real_estate": [
                {"id": "has_parking", "name": "Parking available", "likely": True},
                {"id": "wheelchair_accessible", "name": "Wheelchair accessible", "likely": True},
                {"id": "by_appointment_only", "name": "By appointment only", "likely": False},
                {"id": "online_appointments", "name": "Online appointments", "likely": True},
                {"id": "accepts_credit_cards", "name": "Accepts credit cards", "likely": True},
                {"id": "has_virtual_tours", "name": "Virtual tours available", "likely": True},
            ],
        }

        attrs = attribute_map.get(business_type, attribute_map["restaurant"])
        fixes_applied.append({
            "field": "attributes",
            "action": "suggested",
            "content": attrs,
            "label": "Business Attributes",
            "instruction": "Enable each relevant attribute in Google Business Profile > Info > Attributes. Toggle ON the ones marked 'likely: true' and review the rest based on your actual offerings.",
        })
        score_after += checks.get("attributes", {}).get("weight", 5)

    # --- FIX: Phone ---
    if not checks.get("phone", {}).get("passed"):
        phone = client_info.get("contact_phone", "")
        fixes_applied.append({
            "field": "phone",
            "action": "reminder",
            "content": phone or "Add your primary business phone number.",
            "label": "Phone Number",
            "instruction": "Add your phone number in Google Business Profile > Info > Phone. Use the number customers should call for reservations or inquiries.",
        })
        score_after += checks.get("phone", {}).get("weight", 8)

    # --- FIX: Website ---
    if not checks.get("website", {}).get("passed"):
        website = crawl.get("website", "") or crawl.get("url", "")
        fixes_applied.append({
            "field": "website",
            "action": "reminder" if not website else "suggested",
            "content": website or "No website detected. Consider creating a simple landing page — even a free one from Google Sites, Carrd, or Linktree works for SEO.",
            "label": "Website Link",
            "instruction": "Add your website URL to Google Business Profile > Info > Website. Add UTM parameters for tracking: ?utm_source=google&utm_medium=gbp&utm_campaign=profile",
        })
        score_after += checks.get("website", {}).get("weight", 8)

    # --- FIX: Address ---
    if not checks.get("address", {}).get("passed"):
        address = crawl.get("address", "")
        fixes_applied.append({
            "field": "address",
            "action": "reminder",
            "content": address or "Add your full business address and verify it with Google.",
            "label": "Business Address",
            "instruction": "Verify your address in Google Business Profile > Info > Address. Request a verification postcard if you haven't already. This is critical for appearing in map results.",
        })
        score_after += checks.get("address", {}).get("weight", 8)

    # --- FIX: Business Name ---
    if not checks.get("business_name", {}).get("passed"):
        fixes_applied.append({
            "field": "business_name",
            "action": "reminder",
            "content": company_name or "Set your official business name.",
            "label": "Business Name",
            "instruction": "Your business name must match your real-world signage exactly. Do NOT stuff keywords — Google will suspend profiles that violate naming guidelines.",
        })
        score_after += checks.get("business_name", {}).get("weight", 10)

    # Cap at 100
    score_after = min(score_after, 100)

    await _log_activity(
        client_id=client_id,
        event_type="gbp_auto_fix",
        summary=f"Auto-fix: {score_before} -> {score_after} ({len(fixes_applied)} fixes) for {company_name}",
        payload={
            "score_before": score_before,
            "score_after": score_after,
            "fixes_count": len(fixes_applied),
            "fields_fixed": [f["field"] for f in fixes_applied],
        },
    )

    return {
        "client_id": client_id,
        "company_name": company_name,
        "score_before": score_before,
        "score_after": score_after,
        "improvement": score_after - score_before,
        "fixes_applied": fixes_applied,
        "fixes_count": len(fixes_applied),
        "grade_before": audit.get("grade", "?"),
        "grade_after": "A" if score_after >= 85 else "B" if score_after >= 70 else "C" if score_after >= 50 else "D",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ═══════════════════════════════════════════════════════
# 7. PHOTO SHOT LIST — Exact compositions for GBP
# ═══════════════════════════════════════════════════════

async def generate_photo_shot_list(
    client_id: str,
    business_type: str = "restaurant",
    lang: str = "en",
) -> list:
    """Generate a specific photo shot list for Google Business Profile.

    Google rewards 10+ photos across these categories:
    - Exterior (2): storefront day + night
    - Interior (3): main area, private area, bar/counter
    - Food/Product (3): best sellers, plated dishes, close-ups
    - Team (1): chef/staff group photo
    - Ambiance (1): customer experience shot

    Each photo spec includes:
    - What to photograph
    - Composition tips (angle, lighting, framing)
    - File naming convention for SEO (e.g., "saffron-kitchen-dubai-lamb-chops.jpg")
    - Alt text suggestion
    - Why this photo matters for ranking
    """
    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client_info.get("company_name", "")
    location = _detect_location(kb, client_info)
    crawl = kb.get("crawl_data", {}) or {}

    if not business_type or business_type not in ("restaurant", "cafe", "salon", "real_estate"):
        business_type = _detect_business_type(kb)

    # Slug for file naming
    name_slug = re.sub(r"[^a-z0-9]+", "-", company_name.lower()).strip("-") or "business"
    location_slug = re.sub(r"[^a-z0-9]+", "-", location.lower()).strip("-") or "dubai"

    # Base shot lists by business type
    shot_lists = {
        "restaurant": [
            {
                "category": "Exterior",
                "shot": "Storefront — Daytime",
                "subject": "Full storefront with signage clearly visible",
                "composition": "Stand directly across the street. Shoot at slight upward angle to capture the sign. Wait for no cars blocking the view. Golden hour (4-5 PM) gives warm light.",
                "file_name": f"{name_slug}-{location_slug}-storefront.jpg",
                "alt_text": f"{company_name} restaurant exterior in {location}",
                "why": "First photo customers see. Google uses it for the listing thumbnail. A clear, inviting storefront builds instant trust.",
            },
            {
                "category": "Exterior",
                "shot": "Storefront — Night / Lit Up",
                "subject": "Storefront with lights on, showing warmth and ambiance",
                "composition": "Tripod or steady hands. Shoot when sky is deep blue (30 min after sunset). Include warm interior light spilling out. No flash.",
                "file_name": f"{name_slug}-{location_slug}-evening.jpg",
                "alt_text": f"{company_name} restaurant at night in {location}",
                "why": "Evening diners search Google at 6-9 PM. A lit-up exterior converts browsers into walk-ins.",
            },
            {
                "category": "Interior",
                "shot": "Main Dining Area",
                "subject": "Wide shot of the main seating area, tables set, no customers",
                "composition": "Shoot from a corner to maximize depth. All lights on. Tables set with clean napkins and glasses. Remove clutter, bags, coats. Use wide-angle if available.",
                "file_name": f"{name_slug}-{location_slug}-dining-area.jpg",
                "alt_text": f"{company_name} main dining room in {location}",
                "why": "Customers want to know the vibe before visiting. Clean, well-lit interiors signal quality.",
            },
            {
                "category": "Interior",
                "shot": "Private / VIP Area",
                "subject": "Private dining room or VIP section",
                "composition": "Shoot through the entrance to create depth. Include decorative elements. If no private room, shoot the coziest corner with best decor.",
                "file_name": f"{name_slug}-{location_slug}-private-dining.jpg",
                "alt_text": f"Private dining at {company_name} {location}",
                "why": "Attracts corporate bookings and celebrations. High-value reservations come from this photo.",
            },
            {
                "category": "Interior",
                "shot": "Bar / Counter / Open Kitchen",
                "subject": "Bar area, reception counter, or open kitchen pass",
                "composition": "Shoot at counter height. Include bartender/chef if present (action shot). Bottles, equipment, and prep area should be clean and organized.",
                "file_name": f"{name_slug}-{location_slug}-bar-counter.jpg",
                "alt_text": f"Bar and counter area at {company_name} {location}",
                "why": "Shows the energy and craft behind the food. Open kitchens and bars are trending in GCC dining.",
            },
            {
                "category": "Food",
                "shot": "Signature Dish — Hero Shot",
                "subject": "Your #1 best-selling or most photogenic dish, plated beautifully",
                "composition": "45-degree overhead angle. Natural light from a window (no flash). Clean background (white plate on dark table works best). Garnish fresh. Steam if possible.",
                "file_name": f"{name_slug}-{location_slug}-signature-dish.jpg",
                "alt_text": f"Signature dish at {company_name} in {location}",
                "why": "THE most clicked photo type. Google shows food photos in local pack results. This single image drives more visits than any other.",
            },
            {
                "category": "Food",
                "shot": "Spread / Table Scene",
                "subject": "3-5 dishes arranged on a table as if ready for a group",
                "composition": "Shoot from directly above (flat lay) or 45 degrees. Include drinks and sides. Hands reaching for food adds life. Use the best tableware.",
                "file_name": f"{name_slug}-{location_slug}-food-spread.jpg",
                "alt_text": f"Food selection at {company_name} {location}",
                "why": "Shows variety and portion size. Groups searching for dining spots love seeing a full table.",
            },
            {
                "category": "Food",
                "shot": "Dessert / Drink Close-Up",
                "subject": "Best-looking dessert or signature drink in sharp focus",
                "composition": "Get close — fill 80% of the frame. Shallow depth of field (blurred background). Natural light. Include texture details. A hand holding the drink adds scale.",
                "file_name": f"{name_slug}-{location_slug}-dessert-drink.jpg",
                "alt_text": f"Dessert at {company_name} {location}",
                "why": "Desserts and drinks get the most saves and shares. Sweet cravings drive impulse visits.",
            },
            {
                "category": "Team",
                "shot": "Chef / Team Photo",
                "subject": "Head chef in kitchen or full team at the entrance",
                "composition": "Chef: in kitchen whites, holding a finished plate, looking at camera. Team: lined up at entrance in uniform, smiling. Clean uniforms, good posture.",
                "file_name": f"{name_slug}-{location_slug}-team.jpg",
                "alt_text": f"{company_name} team in {location}",
                "why": "People trust businesses with visible faces. Google rewards businesses that show real people — it signals authenticity.",
            },
            {
                "category": "Ambiance",
                "shot": "Customer Experience",
                "subject": "Happy customers dining, talking, laughing (with permission)",
                "composition": "Candid style from a distance. Include food on the table. Evening lighting with candles or warm bulbs is ideal. Ask permission, or show backs/profiles.",
                "file_name": f"{name_slug}-{location_slug}-ambiance.jpg",
                "alt_text": f"Dining experience at {company_name} {location}",
                "why": "Social proof in visual form. Potential customers imagine themselves in this photo. It answers 'What's the vibe like?'",
            },
        ],
        "cafe": [
            {
                "category": "Exterior",
                "shot": "Storefront — Daytime",
                "subject": "Full cafe storefront with signage, outdoor seating visible if available",
                "composition": "Stand across the street. Capture the full facade. Include any planters, A-frame signs, or outdoor tables. Morning light (8-10 AM) gives soft, warm tones.",
                "file_name": f"{name_slug}-{location_slug}-storefront.jpg",
                "alt_text": f"{company_name} cafe exterior in {location}",
                "why": "The listing thumbnail. A welcoming facade with outdoor seating signals a relaxing spot.",
            },
            {
                "category": "Exterior",
                "shot": "Outdoor Seating Area",
                "subject": "Patio or outdoor terrace with tables set",
                "composition": "Shoot from the corner to show depth. Include greenery and shade structure. Morning or late afternoon light. Set tables with coffee cups for warmth.",
                "file_name": f"{name_slug}-{location_slug}-outdoor-seating.jpg",
                "alt_text": f"Outdoor seating at {company_name} {location}",
                "why": "Outdoor seating is a top search filter in GCC — especially during cooler months. This photo directly answers a common query.",
            },
            {
                "category": "Interior",
                "shot": "Main Seating Area",
                "subject": "Wide shot of the main interior space",
                "composition": "Shoot from the entrance looking in. All lights on. Include decor details, bookshelves, plants. Remove personal items from tables.",
                "file_name": f"{name_slug}-{location_slug}-interior.jpg",
                "alt_text": f"{company_name} interior in {location}",
                "why": "Shows the vibe — essential for people choosing a workspace or hangout spot.",
            },
            {
                "category": "Interior",
                "shot": "Coffee Bar / Counter",
                "subject": "The espresso machine, grinder, and barista workspace",
                "composition": "Shoot at counter height. Include the barista in action (pouring, tamping). Equipment should be clean and gleaming. Bags of beans on display.",
                "file_name": f"{name_slug}-{location_slug}-coffee-bar.jpg",
                "alt_text": f"Coffee bar at {company_name} {location}",
                "why": "Coffee enthusiasts look for quality signals: the machine brand, grinder, pour technique. This photo screams 'we take coffee seriously'.",
            },
            {
                "category": "Interior",
                "shot": "Cozy Corner / Work Spot",
                "subject": "Best spot for working or reading — with laptop, coffee, good light",
                "composition": "Include a laptop (screen off or generic), coffee cup, and natural light from window. Shallow depth of field. Show power outlets nearby.",
                "file_name": f"{name_slug}-{location_slug}-work-spot.jpg",
                "alt_text": f"Workspace at {company_name} cafe {location}",
                "why": "Remote workers and students are a huge segment. This photo answers 'Can I work from there?'",
            },
            {
                "category": "Food",
                "shot": "Signature Coffee — Latte Art",
                "subject": "Your best latte art in a beautiful cup",
                "composition": "Shoot from directly above on a clean surface. The art should be sharp and centered. Include a saucer and small spoon. Natural light only.",
                "file_name": f"{name_slug}-{location_slug}-latte-art.jpg",
                "alt_text": f"Latte art at {company_name} {location}",
                "why": "THE hero shot for any cafe. Latte art photos get the highest engagement on Google and Instagram cross-posted.",
            },
            {
                "category": "Food",
                "shot": "Breakfast / Brunch Spread",
                "subject": "Full breakfast or brunch layout — avocado toast, eggs, pastries, juices",
                "composition": "Flat lay from above. Use a large wooden board or marble surface. Include 4-5 items, cutlery, and a coffee cup. Colorful items (berries, greens) for pop.",
                "file_name": f"{name_slug}-{location_slug}-brunch.jpg",
                "alt_text": f"Brunch at {company_name} {location}",
                "why": "Brunch is the highest-search meal for cafes. This single photo can drive weekend traffic.",
            },
            {
                "category": "Food",
                "shot": "Pastry / Dessert Display",
                "subject": "Glass case or counter with pastries, cakes, croissants",
                "composition": "Shoot through or slightly above the glass. Ensure items are fresh and full (no gaps). Backlighting or side lighting for golden pastry glow.",
                "file_name": f"{name_slug}-{location_slug}-pastries.jpg",
                "alt_text": f"Pastries and desserts at {company_name} {location}",
                "why": "Display cases trigger impulse visits. Sweet cravings + visual proof = walk-in conversions.",
            },
            {
                "category": "Team",
                "shot": "Barista Portrait",
                "subject": "Your barista behind the counter, smiling, with a coffee",
                "composition": "Half-body shot behind the counter. Include the espresso machine in background. Barista holding a cup toward camera. Clean apron, friendly expression.",
                "file_name": f"{name_slug}-{location_slug}-barista.jpg",
                "alt_text": f"Barista at {company_name} {location}",
                "why": "Humanizes your brand. Regular customers come for the barista as much as the coffee.",
            },
            {
                "category": "Ambiance",
                "shot": "Customer Enjoying Coffee",
                "subject": "Someone reading, chatting, or working with a coffee",
                "composition": "Candid, slightly blurred. Shot from a distance. Include warm lighting and the cafe interior in background. Morning light is ideal.",
                "file_name": f"{name_slug}-{location_slug}-ambiance.jpg",
                "alt_text": f"Enjoying coffee at {company_name} {location}",
                "why": "Lifestyle photo that makes people think 'I want to be there'. Emotional trigger for discovery searches.",
            },
        ],
        "salon": [
            {
                "category": "Exterior",
                "shot": "Storefront",
                "subject": "Salon entrance with signage and clean facade",
                "composition": "Straight-on shot. Include the door and any window displays. Clean glass, well-lit sign. Daytime with no shadows on the sign.",
                "file_name": f"{name_slug}-{location_slug}-storefront.jpg",
                "alt_text": f"{company_name} salon exterior in {location}",
                "why": "First impression. A clean, modern storefront signals professionalism and hygiene — critical for beauty businesses.",
            },
            {
                "category": "Exterior",
                "shot": "Reception / Waiting Area",
                "subject": "Welcoming reception desk and seating area",
                "composition": "Shoot from the entrance. Include flowers, magazines, product displays. Clean lines and no clutter. Show the reception screen or booking system.",
                "file_name": f"{name_slug}-{location_slug}-reception.jpg",
                "alt_text": f"Reception at {company_name} salon {location}",
                "why": "Calms anxiety for first-time visitors. They want to know what walking in feels like.",
            },
            {
                "category": "Interior",
                "shot": "Styling Stations",
                "subject": "Row of styling chairs with mirrors, tools organized",
                "composition": "Shoot along the row to show depth. All chairs clean and aligned. Tools neatly arranged. Good mirror lighting. No personal items.",
                "file_name": f"{name_slug}-{location_slug}-styling-stations.jpg",
                "alt_text": f"Styling stations at {company_name} {location}",
                "why": "Shows capacity and cleanliness. A well-organized salon looks professional.",
            },
            {
                "category": "Interior",
                "shot": "Treatment Room / Private Area",
                "subject": "Facial or massage room — bed, soft lighting, towels",
                "composition": "Show the full room from the doorway. Rolled towels, candles (or LED), clean bed with fresh sheets. Dim warm lighting for spa feel.",
                "file_name": f"{name_slug}-{location_slug}-treatment-room.jpg",
                "alt_text": f"Treatment room at {company_name} salon {location}",
                "why": "Spa and facial treatments are high-margin. This photo sells the relaxation promise.",
            },
            {
                "category": "Interior",
                "shot": "Nail Station / Specialty Area",
                "subject": "Nail bar, lash station, or specialty area",
                "composition": "Close shot of the workstation. Include the polish wall, UV lamps, or lash tools. Clean, organized, colorful. Hand model with fresh nails if possible.",
                "file_name": f"{name_slug}-{location_slug}-nail-station.jpg",
                "alt_text": f"Nail station at {company_name} {location}",
                "why": "Nail and lash services are the highest-searched salon services. Show the setup to build confidence.",
            },
            {
                "category": "Work",
                "shot": "Before & After — Hair",
                "subject": "Side-by-side or split image showing hair transformation",
                "composition": "Same lighting and angle for both shots. Natural light preferred. Include the back and side views. Professional background (no clutter).",
                "file_name": f"{name_slug}-{location_slug}-before-after-hair.jpg",
                "alt_text": f"Hair transformation at {company_name} {location}",
                "why": "THE most persuasive image type for salons. Before/after comparisons directly demonstrate skill level.",
            },
            {
                "category": "Work",
                "shot": "Bridal / Special Occasion Makeup",
                "subject": "Completed bridal or event makeup look",
                "composition": "Portrait of the finished look. Soft, even lighting. Include hair and accessories. Shoot from the chest up. Multiple angles if possible.",
                "file_name": f"{name_slug}-{location_slug}-bridal-makeup.jpg",
                "alt_text": f"Bridal makeup at {company_name} salon {location}",
                "why": "Bridal searches peak before wedding season. A stunning bridal photo attracts the highest-value bookings.",
            },
            {
                "category": "Work",
                "shot": "Nail Art Close-Up",
                "subject": "Detailed nail art or fresh manicure",
                "composition": "Macro shot of nails. Clean background (marble or solid color). Fingers naturally curved. Include 2-3 design styles across fingers.",
                "file_name": f"{name_slug}-{location_slug}-nail-art.jpg",
                "alt_text": f"Nail art at {company_name} {location}",
                "why": "Nail art photos get shared and saved. Shows your artistic capability and attention to detail.",
            },
            {
                "category": "Team",
                "shot": "Team Group Photo",
                "subject": "Full team in uniform at the salon entrance or inside",
                "composition": "Lined up, matching uniforms, professional posture. Smiling. Clean backdrop. Include name badges if you have them.",
                "file_name": f"{name_slug}-{location_slug}-team.jpg",
                "alt_text": f"{company_name} salon team in {location}",
                "why": "Builds trust. Customers want to see who will be touching their hair and skin.",
            },
            {
                "category": "Products",
                "shot": "Product Shelf / Brands Used",
                "subject": "Display of professional products and brands you use",
                "composition": "Neatly arranged shelf. Labels facing forward. Good lighting so brand names are readable. Include premium/recognized brands prominently.",
                "file_name": f"{name_slug}-{location_slug}-products.jpg",
                "alt_text": f"Professional products at {company_name} {location}",
                "why": "Product quality matters to salon clients. Showing known brands (Olaplex, Kerastase, OPI) signals premium service.",
            },
        ],
        "real_estate": [
            {
                "category": "Office",
                "shot": "Office Exterior",
                "subject": "Office building or storefront with company signage",
                "composition": "Clear signage visible. Include the building entrance. Clean, professional facade. Daytime with good lighting.",
                "file_name": f"{name_slug}-{location_slug}-office.jpg",
                "alt_text": f"{company_name} real estate office in {location}",
                "why": "Legitimacy signal. Clients want to know you have a real office they can visit.",
            },
            {
                "category": "Office",
                "shot": "Meeting / Consultation Room",
                "subject": "Professional meeting room where clients discuss deals",
                "composition": "Wide shot showing table, chairs, screens. Clean and organized. Include property brochures or a screen showing listings.",
                "file_name": f"{name_slug}-{location_slug}-meeting-room.jpg",
                "alt_text": f"Consultation room at {company_name} {location}",
                "why": "Shows professionalism. High-value transactions require trust — a proper meeting space builds it.",
            },
            {
                "category": "Properties",
                "shot": "Premium Property — Exterior",
                "subject": "Best property listing — exterior with landscaping",
                "composition": "Wide-angle, golden hour light. Include the full facade, garden, pool, or parking. Blue sky, no clutter. Drone shot if possible.",
                "file_name": f"{name_slug}-{location_slug}-premium-property.jpg",
                "alt_text": f"Premium property by {company_name} in {location}",
                "why": "Your best listing is your best ad. A stunning property photo attracts investors and buyers immediately.",
            },
            {
                "category": "Properties",
                "shot": "Premium Property — Interior",
                "subject": "Living room or master suite of your best listing",
                "composition": "Wide-angle from a corner. All lights on plus natural window light. Clean staging — minimal furniture, fresh flowers, no personal items.",
                "file_name": f"{name_slug}-{location_slug}-property-interior.jpg",
                "alt_text": f"Property interior by {company_name} {location}",
                "why": "Interior photos are the #1 factor in online property searches. Quality staging photos can reduce days-on-market by 30%.",
            },
            {
                "category": "Properties",
                "shot": "Community / Neighborhood View",
                "subject": "Skyline, community, or neighborhood aerial view",
                "composition": "Elevated or drone shot. Include landmarks and amenities. Golden hour or blue hour for best color. Show proximity to malls, schools, metro.",
                "file_name": f"{name_slug}-{location_slug}-community-view.jpg",
                "alt_text": f"Community in {location} by {company_name}",
                "why": "Location is everything in real estate. Showing the neighborhood context helps buyers visualize their life there.",
            },
            {
                "category": "Properties",
                "shot": "Amenities (Pool, Gym, Lobby)",
                "subject": "Building amenities — pool, gym, lobby, playground",
                "composition": "Shoot when empty for clean look. Include loungers by pool, equipment in gym. Wide-angle to show full space. Good lighting.",
                "file_name": f"{name_slug}-{location_slug}-amenities.jpg",
                "alt_text": f"Building amenities by {company_name} {location}",
                "why": "Amenities are a key differentiator, especially for apartment and villa communities in the GCC.",
            },
            {
                "category": "Properties",
                "shot": "Floor Plan / Layout",
                "subject": "Professional floor plan or 3D layout render",
                "composition": "Clean digital render. Label rooms and dimensions. Include furniture placement for scale. Use your brand colors in the design.",
                "file_name": f"{name_slug}-{location_slug}-floor-plan.jpg",
                "alt_text": f"Floor plan by {company_name} {location}",
                "why": "Floor plans are the most requested visual by serious buyers. Shows transparency and professionalism.",
            },
            {
                "category": "Team",
                "shot": "Team / Agents Photo",
                "subject": "Your team of agents in professional attire",
                "composition": "Group photo at the office or a premium property. Professional dress (suits). Smiling, confident posture. Include name badges or titles.",
                "file_name": f"{name_slug}-{location_slug}-team.jpg",
                "alt_text": f"{company_name} real estate team in {location}",
                "why": "Real estate is a trust business. Visible, professional agents build credibility immediately.",
            },
            {
                "category": "Work",
                "shot": "Property Viewing / Handover",
                "subject": "Agent showing property to clients or handing over keys",
                "composition": "Candid shot in a property. Agent pointing out features to interested clients. Or the classic key-handover moment. Natural, not posed.",
                "file_name": f"{name_slug}-{location_slug}-property-viewing.jpg",
                "alt_text": f"Property viewing with {company_name} {location}",
                "why": "Shows activity and success. Happy clients viewing or receiving keys is social proof in action.",
            },
            {
                "category": "Ambiance",
                "shot": "Branded Marketing Material",
                "subject": "Your brochures, business cards, branded materials at a property",
                "composition": "Lifestyle flat lay: brochure, keys, pen, coffee, on a clean surface. Include your logo prominently. Premium feel.",
                "file_name": f"{name_slug}-{location_slug}-branding.jpg",
                "alt_text": f"{company_name} branding materials {location}",
                "why": "Professional branding signals a serious operation. Sets you apart from freelance agents.",
            },
        ],
    }

    result = shot_lists.get(business_type, shot_lists["restaurant"])

    await _log_activity(
        client_id=client_id,
        event_type="gbp_photo_shot_list",
        summary=f"Generated {len(result)}-photo shot list for {company_name} ({business_type})",
        payload={"business_type": business_type, "photo_count": len(result)},
    )

    return result


# ═══════════════════════════════════════════════════════
# 8. POST CALENDAR — Month of GBP posts
# ═══════════════════════════════════════════════════════

async def generate_gbp_post_calendar(
    client_id: str,
    weeks: int = 4,
    lang: str = "en",
) -> list:
    """Generate a month of Google Business Profile posts.

    Google rewards consistent posting (1-2x per week minimum).
    Post types to rotate:
    - UPDATE: "New dish alert" / general news
    - OFFER: "20% off this weekend" with coupon code
    - EVENT: "Live music Friday" with date/time
    - PRODUCT: Individual menu item highlight

    Each post includes: title, body (max 1500 chars), CTA button type,
    image suggestion, optimal posting time.

    Strategy: front-load with offers (highest CTR), mix in updates (engagement),
    events for local visibility.
    """
    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client_info.get("company_name", "")
    location = _detect_location(kb, client_info)
    business_type = _detect_business_type(kb)
    crawl = kb.get("crawl_data", {}) or {}
    services = kb.get("services", []) or crawl.get("services", [])
    specials = crawl.get("daily_specials", [])
    website = crawl.get("website", "")

    services_text = ", ".join(services[:8]) if isinstance(services, list) else str(services)
    specials_text = ""
    if isinstance(specials, list):
        specials_text = ", ".join(s.get("name", str(s)) for s in specials[:4])

    lang_instruction = "Gulf Arabic (not formal MSA)" if lang == "ar" else "English"

    now = datetime.now(timezone.utc)
    start_date = now.strftime("%Y-%m-%d")

    system = f"""You are a Google Business Profile content strategist for {company_name}, a {business_type} in {location}.

Generate a {weeks}-week posting calendar. Create exactly 2 posts per week = {weeks * 2} posts total.

Starting from {start_date}. Schedule posts for Sundays and Wednesdays (peak engagement days in GCC).

Post type rotation strategy:
Week 1: OFFER (drive immediate traffic) + UPDATE (establish presence)
Week 2: PRODUCT (showcase offering) + EVENT (local visibility)
Week 3: OFFER (retarget) + UPDATE (behind-the-scenes)
Week 4: EVENT (upcoming) + PRODUCT (seasonal highlight)

For EACH post, output a JSON object:
- week: number (1-{weeks})
- scheduled_date: "YYYY-MM-DD"
- scheduled_time: "HH:MM" (use 10:00 for morning, 18:00 for evening)
- post_type: "UPDATE" | "OFFER" | "EVENT" | "PRODUCT"
- title: headline (max 60 chars)
- body: post content (max 300 words, engaging, local keywords)
- cta_type: "BOOK" | "ORDER" | "LEARN_MORE" | "CALL" | "SIGN_UP"
- cta_url: "{website or 'your-website.com'}"
- image_suggestion: exact description of what image to use
- hashtags: [] (Google posts don't use hashtags, leave empty)
- estimated_reach: "high" | "medium" | "low" based on post type

Business details:
- Services: {services_text or 'various'}
- Current specials: {specials_text or 'none listed'}
- Location: {location}

Language: {lang_instruction}

Rules:
- OFFERs should include a specific discount/deal (e.g. "15% off", "Free dessert with main", "AED 99 special")
- EVENTs must have realistic dates within the calendar range
- PRODUCTs should highlight ONE specific item with mouthwatering/compelling description
- UPDATEs can be behind-the-scenes, team spotlights, seasonal news
- Include location in every post body naturally
- No emojis in titles, minimal in body (max 2)
- Output ONLY a JSON array of {weeks * 2} objects. No markdown."""

    result = await _minimax_json(system, f"Create the {weeks}-week GBP posting calendar now.", max_tokens=4000)

    if isinstance(result, dict) and "error" in result:
        return [result]

    calendar = result if isinstance(result, list) else [result]

    # Validate and clean
    for post in calendar:
        if isinstance(post, dict):
            if post.get("cta_type") not in ("BOOK", "ORDER", "LEARN_MORE", "CALL", "SIGN_UP"):
                post["cta_type"] = "LEARN_MORE"
            post["cta_url"] = post.get("cta_url", website or "")
            body = post.get("body", "")
            if len(body) > 1500:
                last_sentence = body[:1500].rfind(".")
                post["body"] = body[:last_sentence + 1] if last_sentence > 1000 else body[:1500]

    await _log_activity(
        client_id=client_id,
        event_type="gbp_post_calendar",
        summary=f"{weeks}-week post calendar for {company_name} ({len(calendar)} posts, {lang})",
        payload={"weeks": weeks, "posts_count": len(calendar), "lang": lang},
    )

    return calendar


# ═══════════════════════════════════════════════════════
# 9. REVIEW REQUEST STRATEGY
# ═══════════════════════════════════════════════════════

async def generate_review_request_strategy(
    client_id: str,
    lang: str = "en",
) -> dict:
    """Generate a review acquisition strategy.

    Tactics:
    - Optimal timing: ask 2-4 hours after dining/service (via WhatsApp)
    - Message templates (gentle, not pushy)
    - QR code text for table tents / receipts
    - Response templates for 1-star through 5-star
    - Target: 5+ new reviews per week (Google rewards velocity)
    - Never incentivize reviews (Google policy violation)

    Returns: {
        ask_timing, whatsapp_templates, qr_code_text,
        response_templates, weekly_target, do_nots
    }
    """
    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    company_name = kb.get("company_name") or client_info.get("company_name", "")
    business_type = _detect_business_type(kb)
    location = _detect_location(kb, client_info)
    crawl = kb.get("crawl_data", {}) or {}

    # Generate a Google review link placeholder
    place_id = crawl.get("gbp", {}).get("place_id", "")
    review_link = f"https://search.google.com/local/writereview?placeid={place_id}" if place_id else f"https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID"

    strategy = {
        "client_id": client_id,
        "company_name": company_name,
        "review_link": review_link,
        "ask_timing": {
            "restaurant": "2-3 hours after dining — they're still feeling the experience but back home comfortably.",
            "cafe": "1-2 hours after visit — while the coffee memory is fresh.",
            "salon": "Same day, 3-4 hours after appointment — they've seen the results in the mirror and gotten compliments.",
            "real_estate": "Within 24 hours of property viewing or deal closing — while excitement is high.",
        }.get(business_type, "2-4 hours after the service/visit."),

        "weekly_target": 5,
        "monthly_target": 20,
        "velocity_note": "Google rewards review velocity. 5+ new reviews per week significantly improves local ranking. Consistency matters more than bursts.",

        "whatsapp_templates": {
            "en": [
                {
                    "name": "Warm Thank You",
                    "timing": "2-3 hours after visit",
                    "message": f"Hi {{name}}! Thank you for visiting {company_name} today. We hope you enjoyed your experience! If you have a moment, we'd really appreciate a quick Google review — it helps other customers find us. {review_link} Thank you so much!",
                    "note": "Best for positive interactions. Keep it personal.",
                },
                {
                    "name": "Follow-Up (If No Reply)",
                    "timing": "2 days after first message, only if no reply",
                    "message": f"Hi {{name}}, just a gentle reminder — if you enjoyed your visit to {company_name}, a Google review would mean the world to our team! {review_link} No worries if you're busy. Have a great week!",
                    "note": "ONE follow-up max. Never send a third message.",
                },
                {
                    "name": "Post-Booking Confirmation",
                    "timing": "After confirming a booking",
                    "message": f"Your reservation at {company_name} is confirmed! We look forward to seeing you. After your visit, we'd love to hear your feedback on Google — it helps us keep improving. See you soon!",
                    "note": "Plants the seed before the visit. Low pressure.",
                },
            ],
            "ar": [
                {
                    "name": "شكر بعد الزيارة",
                    "timing": "بعد 2-3 ساعات من الزيارة",
                    "message": f"هلا {{name}}! شكرا لزيارتك {company_name} اليوم. نتمنى عجبتك التجربة! لو عندك لحظة، نقدر تكتب لنا تقييم في قوقل — يساعد الناس يلقونا. {review_link} شكرا لك!",
                    "note": "للتفاعلات الإيجابية. خله شخصي وودي.",
                },
                {
                    "name": "تذكير لطيف",
                    "timing": "بعد يومين من أول رسالة فقط",
                    "message": f"هلا {{name}}، تذكير بسيط — لو عجبتك زيارتك ل {company_name}، تقييمك في قوقل يفرق معانا كثير! {review_link} ولا يهمك لو مشغول. أسبوع سعيد!",
                    "note": "تذكير واحد بس. لا ترسل ثالث.",
                },
            ],
        },

        "qr_code_text": {
            "en": f"Enjoyed your visit? Leave us a Google review!\n{review_link}",
            "ar": f"عجبتك الزيارة؟ قيّمنا في قوقل!\n{review_link}",
            "placement": [
                "Table tents / table cards (put on every table)",
                "At the cash register / checkout counter",
                "On the receipt / bill folder",
                "On a sticker near the exit door",
                "In the bathroom (surprising but effective — captive audience)",
            ],
        },

        "response_templates": {
            "5_star": {
                "en": f"Thank you so much, {{name}}! We're thrilled you had a wonderful experience at {company_name}. Your kind words mean the world to our team. We can't wait to welcome you back!",
                "ar": f"شكرا جزيلا {{name}}! سعيدين إنك استمتعت بتجربتك في {company_name}. كلامك الطيب يفرق معانا كثير. نتشوق نشوفك مرة ثانية!",
                "timing": "Reply within 24 hours",
                "auto_send": True,
            },
            "4_star": {
                "en": f"Thank you for the great feedback, {{name}}! We're glad you enjoyed your visit to {company_name}. We noticed there might be room for even better — we'd love to hear what could make it a 5-star next time!",
                "ar": f"شكرا على التقييم الحلو {{name}}! سعيدين إنك استمتعت بزيارتك ل {company_name}. نحب نعرف كيف نخلي التجربة أحلى المرة الجاية!",
                "timing": "Reply within 24 hours",
                "auto_send": True,
            },
            "3_star": {
                "en": f"Thank you for your honest feedback, {{name}}. We appreciate you taking the time to share your experience at {company_name}. We take all feedback seriously and would love to make your next visit better. Could you share more details at [email/phone]?",
                "ar": f"شكرا على صراحتك {{name}}. نقدر إنك أخذت وقتك تشاركنا تجربتك في {company_name}. نأخذ كل ملاحظة بجدية ونحب نحسن تجربتك الجاية. ممكن تشاركنا تفاصيل أكثر على [الإيميل/الهاتف]؟",
                "timing": "Reply within 12 hours — show urgency",
                "auto_send": False,
            },
            "2_star": {
                "en": f"{{name}}, we're sorry your experience at {company_name} didn't meet expectations. This isn't the standard we aim for. We'd like to understand what went wrong and make it right. Please reach out to us at [phone/email] so we can resolve this personally.",
                "ar": f"{{name}}، نأسف إن تجربتك في {company_name} ما كانت بالمستوى المطلوب. هذا مو مستوانا المعتاد. نحب نفهم إيش صار ونصلح الوضع. تواصل معانا على [الهاتف/الإيميل] عشان نحل الموضوع شخصيا.",
                "timing": "Reply within 6 hours — damage control",
                "auto_send": False,
            },
            "1_star": {
                "en": f"{{name}}, we sincerely apologize for your experience at {company_name}. This is not acceptable and we take it very seriously. Please contact us directly at [phone/email] — we want to make this right and ensure this never happens again.",
                "ar": f"{{name}}، نعتذر بشدة عن تجربتك في {company_name}. هذا غير مقبول ونأخذه بجدية كبيرة. تواصل معانا مباشرة على [الهاتف/الإيميل] — نبغى نصلح الوضع ونتأكد ما يتكرر.",
                "timing": "Reply within 2 hours — highest priority",
                "auto_send": False,
            },
        },

        "do_nots": [
            "NEVER offer incentives for reviews (discounts, freebies, gifts) — violates Google policy and can get your listing suspended.",
            "NEVER ask for '5 stars' specifically — ask for 'honest feedback' or 'a review'.",
            "NEVER argue with negative reviewers publicly — always take it offline.",
            "NEVER send more than 2 messages asking for a review (initial + one follow-up).",
            "NEVER buy fake reviews — Google's AI detects them and will penalize your listing.",
            "NEVER copy-paste the exact same reply to every review — personalize each one.",
            "NEVER ignore negative reviews — unanswered complaints hurt more than the review itself.",
            "NEVER delete customer questions from Q&A — answer them professionally instead.",
        ],

        "pro_tips": [
            "Train staff to mention Google reviews naturally at checkout: 'We'd love your feedback on Google!'",
            "Respond to ALL reviews within 24 hours — Google tracks response rate and it affects ranking.",
            "The best time to ask for a review is when the customer is happiest (just complimented the food, loved the haircut).",
            "Print the QR code on receipts — customers scan while waiting for change.",
            "Track review velocity weekly. If it drops, increase the ask frequency.",
        ],

        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    await _log_activity(
        client_id=client_id,
        event_type="gbp_review_strategy",
        summary=f"Review acquisition strategy for {company_name} ({business_type})",
        payload={"business_type": business_type, "weekly_target": 5},
    )

    return strategy


# ═══════════════════════════════════════════════════════
# 10. LOCAL SEO CHECKLIST — Comprehensive action plan
# ═══════════════════════════════════════════════════════

async def generate_local_seo_checklist(
    client_id: str,
    lang: str = "en",
) -> dict:
    """Generate a comprehensive local SEO action plan.

    Covers all ranking factors:
    1. NAP Consistency (Name, Address, Phone across all platforms)
    2. Category optimization (primary + 9 secondary categories)
    3. Attribute completeness (all relevant attributes enabled)
    4. Review velocity and response rate
    5. Photo optimization (quantity, quality, naming, alt text)
    6. Post frequency (1-2x/week minimum)
    7. Q&A coverage (pre-populate top questions)
    8. Website link with UTM tracking
    9. Booking/ordering link setup
    10. Citation sources for UAE/KSA (Zomato, TripAdvisor, Talabat, HungerStation, etc.)

    Each item: {action, status: 'done'|'needed'|'partial', priority, how_to}
    """
    audit = await audit_profile(client_id)
    checks = audit.get("checks", {})
    score = audit.get("score", 0)
    company_name = audit.get("company_name", "")

    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    business_type = _detect_business_type(kb)
    location = _detect_location(kb, client_info)
    crawl = kb.get("crawl_data", {}) or {}

    # Determine status for each check
    def _status(field: str) -> str:
        check = checks.get(field, {})
        if check.get("passed"):
            return "done"
        val = check.get("current_value", "")
        if val and val != "(missing)" and len(str(val)) > 5:
            return "partial"
        return "needed"

    # Citation sources by region
    citation_sources = {
        "UAE": [
            {"name": "Zomato", "url": "https://zomato.com", "priority": "high", "types": ["restaurant", "cafe"]},
            {"name": "TripAdvisor", "url": "https://tripadvisor.com", "priority": "high", "types": ["restaurant", "cafe", "salon"]},
            {"name": "Talabat", "url": "https://talabat.com", "priority": "high", "types": ["restaurant", "cafe"]},
            {"name": "Deliveroo", "url": "https://deliveroo.ae", "priority": "medium", "types": ["restaurant", "cafe"]},
            {"name": "Careem Food", "url": "https://food.careem.com", "priority": "medium", "types": ["restaurant", "cafe"]},
            {"name": "Noon Food", "url": "https://noon.com/food", "priority": "medium", "types": ["restaurant", "cafe"]},
            {"name": "Bayut", "url": "https://bayut.com", "priority": "high", "types": ["real_estate"]},
            {"name": "Dubizzle", "url": "https://dubizzle.com", "priority": "high", "types": ["real_estate"]},
            {"name": "Property Finder", "url": "https://propertyfinder.ae", "priority": "high", "types": ["real_estate"]},
            {"name": "Fresha", "url": "https://fresha.com", "priority": "high", "types": ["salon"]},
            {"name": "Yelp", "url": "https://yelp.com", "priority": "medium", "types": ["restaurant", "cafe", "salon"]},
            {"name": "Facebook Page", "url": "https://facebook.com", "priority": "high", "types": ["restaurant", "cafe", "salon", "real_estate"]},
            {"name": "Instagram Business", "url": "https://instagram.com", "priority": "high", "types": ["restaurant", "cafe", "salon", "real_estate"]},
        ],
        "KSA": [
            {"name": "HungerStation", "url": "https://hungerstation.com", "priority": "high", "types": ["restaurant", "cafe"]},
            {"name": "Jahez", "url": "https://jahez.net", "priority": "high", "types": ["restaurant", "cafe"]},
            {"name": "The Chefz", "url": "https://thechefz.co", "priority": "medium", "types": ["restaurant", "cafe"]},
            {"name": "TripAdvisor", "url": "https://tripadvisor.com", "priority": "high", "types": ["restaurant", "cafe", "salon"]},
            {"name": "Talabat", "url": "https://talabat.com", "priority": "high", "types": ["restaurant", "cafe"]},
            {"name": "Bayut KSA", "url": "https://bayut.sa", "priority": "high", "types": ["real_estate"]},
            {"name": "Aqar", "url": "https://sa.aqar.fm", "priority": "high", "types": ["real_estate"]},
            {"name": "Fresha", "url": "https://fresha.com", "priority": "high", "types": ["salon"]},
            {"name": "Facebook Page", "url": "https://facebook.com", "priority": "high", "types": ["restaurant", "cafe", "salon", "real_estate"]},
            {"name": "Instagram Business", "url": "https://instagram.com", "priority": "high", "types": ["restaurant", "cafe", "salon", "real_estate"]},
        ],
    }

    # Detect region
    ksa_cities = {"Riyadh", "Jeddah", "Dammam", "Mecca", "Medina", "Khobar"}
    region = "KSA" if location in ksa_cities else "UAE"

    # Filter citations for this business type
    relevant_citations = [
        c for c in citation_sources.get(region, citation_sources["UAE"])
        if business_type in c["types"]
    ]

    checklist = {
        "client_id": client_id,
        "company_name": company_name,
        "current_score": score,
        "business_type": business_type,
        "location": location,
        "region": region,

        "items": [
            {
                "id": 1,
                "category": "Foundation",
                "action": "NAP Consistency — Ensure Name, Address, and Phone are identical across Google, website, social media, and all directories.",
                "status": "done" if _status("business_name") == "done" and _status("address") == "done" and _status("phone") == "done" else "needed",
                "priority": "critical",
                "how_to": "Search your business name on Google. Check that the name, address, and phone on your GBP matches your website footer, Facebook page, and all directory listings. Even small differences (St. vs Street) hurt rankings.",
                "impact": "NAP consistency is the #1 local ranking factor after proximity. Inconsistent NAP confuses Google.",
            },
            {
                "id": 2,
                "category": "Foundation",
                "action": "Verify your Google Business Profile with Google (postcard, phone, or email verification).",
                "status": "partial",  # Can't verify programmatically
                "priority": "critical",
                "how_to": "Go to business.google.com > Your business > Verify. If not yet verified, request a postcard (takes 5-14 days to UAE/KSA) or try phone/email verification.",
                "impact": "Unverified profiles don't appear in local results. This is a prerequisite for everything else.",
            },
            {
                "id": 3,
                "category": "Profile Completeness",
                "action": "Write an SEO-optimized business description (750 chars max).",
                "status": _status("description"),
                "priority": "high",
                "how_to": "Use the auto-generated description from the Auto-Fix panel. Include your business type, location, cuisine/specialty, and a call-to-action.",
                "impact": "Descriptions with local keywords improve search match rates by 20-30%.",
            },
            {
                "id": 4,
                "category": "Profile Completeness",
                "action": f"Set primary category to match your business + add up to 9 secondary categories.",
                "status": _status("categories"),
                "priority": "high",
                "how_to": "Google Business Profile > Info > Category. Set the most specific primary category. Add secondaries that cover your services.",
                "impact": "Categories are the #2 ranking factor. Wrong categories = invisible for relevant searches.",
            },
            {
                "id": 5,
                "category": "Profile Completeness",
                "action": "Add complete business hours including special hours (Ramadan, Eid, National Day).",
                "status": _status("hours"),
                "priority": "high",
                "how_to": "Google Business Profile > Info > Hours. Set regular hours AND add special hours for GCC holidays. Mark Friday hours separately.",
                "impact": "Missing hours = Google shows 'Hours might differ' warning, which reduces clicks by ~15%.",
            },
            {
                "id": 6,
                "category": "Profile Completeness",
                "action": "Enable all relevant business attributes (Wi-Fi, parking, seating, payment methods, accessibility).",
                "status": _status("attributes"),
                "priority": "medium",
                "how_to": "Google Business Profile > Info > Attributes. Toggle ON everything that applies. These show as badges on your profile.",
                "impact": "Attributes appear in search filters. Users filtering for 'outdoor seating' or 'Wi-Fi' won't see you without these.",
            },
            {
                "id": 7,
                "category": "Visual Content",
                "action": "Upload 10+ high-quality photos: exterior (2), interior (3), food/products (3), team (1), ambiance (1).",
                "status": _status("photos"),
                "priority": "high",
                "how_to": "Follow the photo shot list from this dashboard. Name files with SEO keywords before uploading. Upload in Google Business Profile > Photos.",
                "impact": "Businesses with 10+ photos get 42% more direction requests and 35% more website clicks.",
            },
            {
                "id": 8,
                "category": "Visual Content",
                "action": "Add a cover photo and logo to your Google Business Profile.",
                "status": "needed",  # Can't check programmatically
                "priority": "high",
                "how_to": "Logo: square, high-res, your actual logo on white/transparent background. Cover: your best photo that represents the business (usually the hero food/product shot).",
                "impact": "The cover photo appears in the knowledge panel. A strong cover photo increases clicks by ~20%.",
            },
            {
                "id": 9,
                "category": "Engagement",
                "action": "Post on Google Business Profile 1-2 times per week (use the Post Calendar).",
                "status": "needed",
                "priority": "high",
                "how_to": "Use the generated post calendar. Schedule posts for Sundays and Wednesdays. Mix offers, updates, events, and product highlights.",
                "impact": "Active profiles rank higher. Google rewards consistent posting with better visibility in local pack.",
            },
            {
                "id": 10,
                "category": "Engagement",
                "action": "Pre-populate Q&A with the top 10 most common questions and answers.",
                "status": _status("qa_coverage"),
                "priority": "medium",
                "how_to": "Go to your Google Business listing > Questions & Answers. Post each question yourself and immediately answer it. This prevents strangers from posting wrong answers.",
                "impact": "Q&A coverage reduces phone calls for basic info and improves search relevance for question-based queries.",
            },
            {
                "id": 11,
                "category": "Reviews",
                "action": "Achieve 5+ new Google reviews per week with a systematic request strategy.",
                "status": "needed",
                "priority": "critical",
                "how_to": "Use the review request templates. Send WhatsApp messages 2-3 hours after visits. Place QR codes on tables and receipts. Train staff to ask at checkout.",
                "impact": "Review velocity is the #3 ranking factor. Businesses with 50+ reviews appear 2x more often in local pack.",
            },
            {
                "id": 12,
                "category": "Reviews",
                "action": "Respond to ALL reviews within 24 hours (positive and negative).",
                "status": "needed",
                "priority": "high",
                "how_to": "Use the response templates. Set up notifications in Google Business Profile. Positive reviews: warm thank you. Negative: empathetic, take offline.",
                "impact": "Google tracks response rate. 100% response rate signals an active, caring business. Boosts ranking.",
            },
            {
                "id": 13,
                "category": "Links & Tracking",
                "action": "Add website link with UTM parameters for tracking.",
                "status": _status("website"),
                "priority": "medium",
                "how_to": f"Add your website URL with tracking: yoursite.com?utm_source=google&utm_medium=gbp&utm_campaign=profile. This lets you track GBP traffic in Google Analytics.",
                "impact": "Tracks ROI of GBP efforts. Also, having a website link improves profile completeness score.",
            },
            {
                "id": 14,
                "category": "Links & Tracking",
                "action": "Add booking/ordering link (if applicable).",
                "status": "needed",
                "priority": "medium",
                "how_to": "Google Business Profile > Info > Booking/Ordering. Connect your booking system (SevenRooms, OpenTable, Fresha) or ordering platform (Talabat, website).",
                "impact": "Direct booking links reduce friction. Google shows a 'Book' or 'Order' button directly in search results.",
            },
            {
                "id": 15,
                "category": "Menu / Services",
                "action": f"Add complete {'menu' if business_type in ('restaurant', 'cafe') else 'service list'} with prices.",
                "status": _status("menu_services"),
                "priority": "medium",
                "how_to": f"Google Business Profile > {'Menu' if business_type in ('restaurant', 'cafe') else 'Services'}. Add all items with descriptions and prices. Include photos for top items.",
                "impact": "Menus/services appear directly in search. Customers can decide before calling, reducing no-shows.",
            },
            {
                "id": 16,
                "category": "Citations",
                "action": f"List your business on {len(relevant_citations)} relevant {region} directories and platforms.",
                "status": "needed",
                "priority": "medium",
                "how_to": "Create/claim your listing on each platform below. Ensure NAP matches your Google Business Profile exactly.",
                "impact": "Citations (directory listings) are a key ranking signal. More citations = more authority in Google's eyes.",
                "platforms": relevant_citations,
            },
        ],

        "summary": {
            "total_items": 16,
            "done": sum(1 for item in [_status(f) for f in checks] if item == "done"),
            "needed": sum(1 for item in [_status(f) for f in checks] if item == "needed"),
            "partial": sum(1 for item in [_status(f) for f in checks] if item == "partial"),
            "critical_count": 3,
            "estimated_time_hours": 8,
            "estimated_score_after": min(100, score + sum(
                c.get("weight", 0)
                for f, c in checks.items()
                if not c.get("passed")
            )),
        },

        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    await _log_activity(
        client_id=client_id,
        event_type="gbp_seo_checklist",
        summary=f"Local SEO checklist for {company_name}: {checklist['summary']['done']}/{checklist['summary']['total_items']} done",
        payload={
            "score": score,
            "done": checklist["summary"]["done"],
            "needed": checklist["summary"]["needed"],
        },
    )

    return checklist


# ═══════════════════════════════════════════════════════
# AI SEO + 7 SWEEPS REVIEW RESPONSE + SCHEMA MARKUP
# ═══════════════════════════════════════════════════════

# 7 Sweeps Framework for review response quality
SEVEN_SWEEPS = [
    {"name": "Clarity", "check": "Is the response clear and easy to understand?"},
    {"name": "Voice", "check": "Does it sound like the business owner, not a robot?"},
    {"name": "So What", "check": "Does every sentence earn its place?"},
    {"name": "Prove It", "check": "Are claims backed by specifics?"},
    {"name": "Specificity", "check": "Are there concrete details, not vague promises?"},
    {"name": "Emotion", "check": "Does it connect emotionally with the reviewer?"},
    {"name": "Zero Risk", "check": "Is there a clear next step or invitation?"},
]


async def generate_ai_optimized_content(
    client_id: str,
    content_type: str = "description",
    lang: str = "en",
) -> dict:
    """Generate content optimized for AI search engines (ChatGPT, Perplexity, Google AI Overviews).

    AI SEO principles:
    - Structure for extractability (clear sections, bullet points)
    - Include statistics (+40% citation rate)
    - Add authoritative claims with specifics
    - Use FAQ format (AI loves Q&A pairs)

    content_type: 'description', 'faq', 'about_page', 'menu_page'
    Returns: {content, ai_seo_score, optimization_notes}
    """
    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    company_name = client_info.get("company_name", "Business")
    crawl = kb.get("crawl_data", {}) or {}
    business_type = _detect_business_type(kb)
    location = _detect_location(kb, client_info)
    prompt_lang = "Respond in Arabic" if lang == "ar" else "Respond in English"

    # Gather business context
    menu = crawl.get("menu", [])
    services = crawl.get("services", [])
    hours = crawl.get("hours", {})
    specialties = crawl.get("specialties", [])
    gbp = crawl.get("gbp", {})
    rating = gbp.get("rating", 0)
    reviews_count = gbp.get("reviews_count", 0)

    context_parts = [f"Business: {company_name}", f"Type: {business_type}", f"Location: {location}"]
    if rating:
        context_parts.append(f"Rating: {rating}/5 ({reviews_count} reviews)")
    if menu:
        context_parts.append(f"Menu items: {', '.join(str(m) for m in menu[:10])}")
    if services:
        context_parts.append(f"Services: {', '.join(str(s) for s in services[:10])}")
    if specialties:
        context_parts.append(f"Specialties: {', '.join(str(s) for s in specialties[:5])}")

    business_context = "\n".join(context_parts)

    type_instructions = {
        "description": "Write a Google Business Profile description (750 chars max). Include: what makes this business unique, cuisine/service type, location, and a call to action.",
        "faq": "Generate 5-7 FAQ pairs that AI search engines love to cite. Cover: hours, reservations, parking, dietary options, pricing, specialties.",
        "about_page": "Write an About page (300-500 words). Include: founding story hook, what makes them different, specific numbers/stats, team expertise, location details.",
        "menu_page": "Write a menu/services page intro (200-300 words). Highlight signature items, price range, dietary accommodations, seasonal specials.",
    }

    instruction = type_instructions.get(content_type, type_instructions["description"])

    system_prompt = f"""You are an AI SEO specialist. Generate content optimized for AI search engines (ChatGPT, Perplexity, Google AI Overviews).

AI SEO principles:
1. STRUCTURE for extractability — use clear headings, bullet points, short paragraphs
2. STATISTICS — include specific numbers (e.g., "serving 200+ guests daily", "established in 2015")
3. AUTHORITATIVE claims — be specific ("award-winning biryani" not "great food")
4. FAQ FORMAT — AI search loves question-answer pairs
5. ENTITY MENTIONS — naturally include business name, location, cuisine type multiple times
6. FRESHNESS signals — mention current year, seasonal items, recent updates

{prompt_lang}. Do NOT use <think> tags."""

    content = await _minimax_chat(
        system=system_prompt,
        user=f"{instruction}\n\nBusiness context:\n{business_context}",
        max_tokens=2000,
        temperature=0.8,
    )

    # Calculate AI SEO score
    score = 0
    notes = []

    if any(char.isdigit() for char in content):
        score += 15
        notes.append("Contains statistics/numbers")
    if "?" in content and content_type in ("faq", "about_page"):
        score += 15
        notes.append("Includes Q&A format")
    if company_name.lower() in content.lower():
        name_count = content.lower().count(company_name.lower())
        score += min(name_count * 5, 15)
        notes.append(f"Business name mentioned {name_count}x")
    if location.lower() in content.lower():
        score += 10
        notes.append("Location mentioned")
    if len(content) > 200:
        score += 10
        notes.append("Sufficient content length")
    if any(w in content.lower() for w in ["best", "top", "award", "famous", "popular", "renowned"]):
        score += 10
        notes.append("Contains authority signals")
    if any(marker in content for marker in ["-", "•", "1.", "2.", "*"]):
        score += 10
        notes.append("Structured with lists/bullets")
    if any(w in content.lower() for w in ["book", "reserve", "visit", "call", "order", "try"]):
        score += 10
        notes.append("Contains call to action")

    # Cap at 100
    score = min(score, 100)
    if score < 50:
        notes.append("Consider adding more statistics, structure, and authority signals")

    await _log_activity(
        client_id=client_id,
        event_type="ai_seo_content",
        summary=f"Generated AI-optimized {content_type} for {company_name} (score: {score}/100)",
        payload={"content_type": content_type, "ai_seo_score": score, "lang": lang},
    )

    return {
        "content": content,
        "ai_seo_score": score,
        "optimization_notes": notes,
        "content_type": content_type,
        "lang": lang,
    }


async def generate_review_response_7sweeps(
    client_id: str,
    reviewer_name: str,
    rating: int,
    review_text: str,
    lang: str = "en",
) -> dict:
    """Generate a review response using the 7 Sweeps quality framework.

    Each response is checked against all 7 sweeps:
    1. Clarity — no jargon, easy to understand
    2. Voice — sounds like a real person, not corporate
    3. So What — every sentence matters
    4. Prove It — specific details, not vague
    5. Specificity — mention what they ordered, when they visited
    6. Emotion — genuine feeling, not template
    7. Zero Risk — clear invitation to return

    Also injects SEO keywords naturally (business name + location + cuisine type).
    Returns: {response, sweeps_applied, seo_keywords_used, word_count}
    """
    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    company_name = client_info.get("company_name", "our restaurant")
    crawl = kb.get("crawl_data", {}) or {}
    business_type = _detect_business_type(kb)
    location = _detect_location(kb, client_info)
    brand_voice = kb.get("brand_voice", "")
    prompt_lang = "Respond in Arabic" if lang == "ar" else "Respond in English"

    # SEO keywords to inject
    seo_keywords = [company_name, location, business_type]
    cuisine = crawl.get("cuisine_type", "") or crawl.get("gbp", {}).get("category", "")
    if cuisine:
        seo_keywords.append(cuisine)

    sentiment = "positive" if rating >= 4 else "negative" if rating <= 2 else "mixed"

    sweeps_instructions = "\n".join(
        f"{i+1}. {s['name']}: {s['check']}"
        for i, s in enumerate(SEVEN_SWEEPS)
    )

    system_prompt = f"""You are writing a review response for {company_name} ({business_type} in {location}).

Brand voice: {brand_voice or 'warm, professional, genuine'}

QUALITY FRAMEWORK — apply all 7 sweeps:
{sweeps_instructions}

SEO: Naturally include these keywords: {', '.join(seo_keywords)}

Guidelines:
- {"Positive review: warm thanks, mention specifics from their review, invite back" if sentiment == "positive" else "Negative review: empathize first, acknowledge the issue, offer to make it right, take offline" if sentiment == "negative" else "Mixed review: thank for positives, address concerns, show improvement"}
- Keep it 40-80 words
- Sound like a real person, NOT a template
- {prompt_lang}
- Do NOT use <think> tags."""

    response = await _minimax_chat(
        system=system_prompt,
        user=f"Reviewer: {reviewer_name}\nRating: {rating}/5\nReview: {review_text}\n\nWrite a response that passes all 7 sweeps.",
        max_tokens=400,
        temperature=0.8,
    )

    # Check which sweeps were applied
    sweeps_applied = []
    response_lower = response.lower()

    # Clarity — no jargon, short sentences
    if len(response.split()) < 100 and not any(w in response_lower for w in ["synergy", "leverage", "optimize", "utilize"]):
        sweeps_applied.append("Clarity")

    # Voice — personal, not corporate
    if any(w in response_lower for w in ["i", "we", "my", "our", "personally", "team"]):
        sweeps_applied.append("Voice")

    # So What — not too long, no filler
    word_count = len(response.split())
    if 20 <= word_count <= 100:
        sweeps_applied.append("So What")

    # Prove It — mentions specifics from the review
    review_words = set(w.lower() for w in review_text.split() if len(w) > 4)
    response_words = set(w.lower() for w in response.split() if len(w) > 4)
    if len(review_words & response_words) >= 2:
        sweeps_applied.append("Prove It")

    # Specificity — concrete details
    if any(char.isdigit() for char in response) or reviewer_name.lower() in response_lower:
        sweeps_applied.append("Specificity")

    # Emotion — feeling words
    emotion_words = ["thank", "grateful", "appreciate", "sorry", "love", "delighted", "happy", "enjoy", "wonderful", "glad", "شكر", "سعد", "نقدر"]
    if any(w in response_lower for w in emotion_words):
        sweeps_applied.append("Emotion")

    # Zero Risk — invitation to return
    cta_words = ["visit", "come back", "return", "welcome", "next time", "look forward", "see you", "join us", "نراكم", "نتشرف", "زيارة"]
    if any(w in response_lower for w in cta_words):
        sweeps_applied.append("Zero Risk")

    # Track which SEO keywords made it in
    seo_used = [kw for kw in seo_keywords if kw.lower() in response_lower]

    await _log_activity(
        client_id=client_id,
        event_type="review_response_7sweeps",
        summary=f"7-sweeps response for {reviewer_name} ({rating}/5): {len(sweeps_applied)}/7 sweeps",
        payload={
            "reviewer": reviewer_name,
            "rating": rating,
            "sweeps_passed": len(sweeps_applied),
            "seo_keywords_used": len(seo_used),
        },
    )

    return {
        "response": response,
        "sweeps_applied": sweeps_applied,
        "sweeps_missed": [s["name"] for s in SEVEN_SWEEPS if s["name"] not in sweeps_applied],
        "seo_keywords_used": seo_used,
        "word_count": word_count,
        "sentiment": sentiment,
    }


async def generate_schema_markup(client_id: str) -> dict:
    """Generate JSON-LD schema markup for the business website.

    Uses specific @type (Restaurant, CafeOrCoffeeShop, HairSalon, BeautySalon)
    instead of generic LocalBusiness.

    Includes: name, address, telephone, url, openingHoursSpecification,
    image, priceRange, servesCuisine, acceptsReservations, aggregateRating,
    geo (lat/lng), areaServed, hasMenu, paymentAccepted.

    Returns: {schema_json: str, type_used: str, fields_populated: int}
    """
    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    company_name = client_info.get("company_name", "")
    crawl = kb.get("crawl_data", {}) or {}
    business_type = _detect_business_type(kb)
    location = _detect_location(kb, client_info)
    gbp = crawl.get("gbp", {})

    # Map business type to schema.org @type
    type_map = {
        "restaurant": "Restaurant",
        "cafe": "CafeOrCoffeeShop",
        "salon": "HairSalon",
        "beauty": "BeautySalon",
        "spa": "DaySpa",
        "real_estate": "RealEstateAgent",
    }
    schema_type = type_map.get(business_type, "LocalBusiness")

    # Build schema object
    schema = {
        "@context": "https://schema.org",
        "@type": schema_type,
        "name": company_name,
    }

    fields_populated = 1  # name is always there

    # Address
    address = gbp.get("address", "") or crawl.get("address", "")
    if address:
        schema["address"] = {
            "@type": "PostalAddress",
            "streetAddress": address,
            "addressLocality": location,
            "addressCountry": client_info.get("country", "AE"),
        }
        fields_populated += 1

    # Telephone
    phone = gbp.get("phone", "") or client_info.get("contact_phone", "")
    if phone:
        schema["telephone"] = phone
        fields_populated += 1

    # Website
    website = gbp.get("website", "") or crawl.get("website", "")
    if website:
        schema["url"] = website
        fields_populated += 1

    # Opening hours
    hours = gbp.get("hours", {}) or crawl.get("hours", {})
    if hours and isinstance(hours, dict):
        hours_spec = []
        for day, times in hours.items():
            if isinstance(times, dict) and times.get("open") and times.get("close"):
                hours_spec.append({
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": day,
                    "opens": times["open"],
                    "closes": times["close"],
                })
            elif isinstance(times, str):
                hours_spec.append({
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": day,
                    "description": times,
                })
        if hours_spec:
            schema["openingHoursSpecification"] = hours_spec
            fields_populated += 1

    # Price range
    price_range = crawl.get("price_range", "")
    if price_range:
        schema["priceRange"] = price_range
        fields_populated += 1

    # Cuisine (restaurants/cafes)
    cuisine = crawl.get("cuisine_type", "")
    if cuisine and business_type in ("restaurant", "cafe"):
        schema["servesCuisine"] = cuisine
        fields_populated += 1

    # Reservations
    if business_type in ("restaurant", "cafe"):
        schema["acceptsReservations"] = "True"
        fields_populated += 1

    # Aggregate rating
    rating = gbp.get("rating", 0)
    reviews_count = gbp.get("reviews_count", 0)
    if rating and reviews_count:
        schema["aggregateRating"] = {
            "@type": "AggregateRating",
            "ratingValue": str(rating),
            "reviewCount": str(reviews_count),
            "bestRating": "5",
            "worstRating": "1",
        }
        fields_populated += 1

    # Geo coordinates
    lat = gbp.get("lat", "")
    lon = gbp.get("lon", "")
    if lat and lon:
        schema["geo"] = {
            "@type": "GeoCoordinates",
            "latitude": str(lat),
            "longitude": str(lon),
        }
        fields_populated += 1

    # Area served
    schema["areaServed"] = location
    fields_populated += 1

    # Menu link
    menu_url = crawl.get("menu_url", "")
    if menu_url:
        schema["hasMenu"] = menu_url
        fields_populated += 1

    # Payment
    payment = crawl.get("payment_methods", [])
    if payment:
        schema["paymentAccepted"] = ", ".join(payment) if isinstance(payment, list) else str(payment)
        fields_populated += 1

    # Image
    image = crawl.get("logo", "") or gbp.get("photo_url", "")
    if image:
        schema["image"] = image
        fields_populated += 1

    schema_json = json.dumps(schema, indent=2, ensure_ascii=False)

    await _log_activity(
        client_id=client_id,
        event_type="schema_markup_generated",
        summary=f"JSON-LD schema ({schema_type}) for {company_name}: {fields_populated} fields",
        payload={"type": schema_type, "fields_populated": fields_populated},
    )

    return {
        "schema_json": schema_json,
        "type_used": schema_type,
        "fields_populated": fields_populated,
    }


async def generate_citation_plan(client_id: str, country: str = "UAE") -> dict:
    """Generate a citation building plan with priority-ordered directories.

    UAE: Google, Apple, Facebook, Instagram, YellowPages UAE, TripAdvisor, Zomato, Talabat, Careem, Fresha
    KSA: Google, Apple, Facebook, Instagram, SaudiaYP, HungerStation, Jahez, Fresha

    Each citation: {platform, url, priority, nap_fields, status: 'needed'|'done', instructions}
    Returns: {citations: [], total_needed, estimated_impact}
    """
    kb = await _fetch_knowledge(client_id)
    client_info = await _fetch_client(client_id)
    company_name = client_info.get("company_name", "")
    business_type = _detect_business_type(kb)
    crawl = kb.get("crawl_data", {}) or {}
    location = _detect_location(kb, client_info)

    # Detect country from client data if not specified
    client_country = client_info.get("country", "")
    if client_country and "saudi" in client_country.lower():
        country = "KSA"
    elif client_country and any(w in client_country.lower() for w in ["uae", "emirates", "dubai", "abu dhabi"]):
        country = "UAE"

    # Directory definitions by country
    uae_directories = [
        {"platform": "Google Business Profile", "url": "https://business.google.com", "priority": "critical",
         "instructions": "Claim and verify your listing. Add all details, photos, and respond to reviews."},
        {"platform": "Apple Business Connect", "url": "https://businessconnect.apple.com", "priority": "critical",
         "instructions": "Claim your Apple Maps listing. Add photos, hours, and payment info."},
        {"platform": "Facebook Business Page", "url": "https://www.facebook.com/business", "priority": "critical",
         "instructions": "Create/claim page. Add NAP, category, hours, and link to website."},
        {"platform": "Instagram Business", "url": "https://business.instagram.com", "priority": "high",
         "instructions": "Switch to business account. Add contact button, address, and category."},
        {"platform": "YellowPages UAE", "url": "https://www.yellowpages-uae.com", "priority": "high",
         "instructions": "Submit your business listing with consistent NAP details."},
        {"platform": "TripAdvisor", "url": "https://www.tripadvisor.com/Owners", "priority": "high",
         "instructions": "Claim your listing. Respond to reviews. Add menu and photos."},
        {"platform": "Zomato", "url": "https://www.zomato.com/business", "priority": "high",
         "instructions": "Claim restaurant listing. Add full menu with prices and photos."},
        {"platform": "Talabat", "url": "https://www.talabat.com/partners", "priority": "medium",
         "instructions": "Register as a partner. Ensure menu and delivery area are accurate."},
        {"platform": "Careem", "url": "https://food.careem.com/partners", "priority": "medium",
         "instructions": "Register for Careem food delivery. Add menu and delivery zone."},
        {"platform": "Fresha", "url": "https://www.fresha.com/for-business", "priority": "medium",
         "instructions": "List salon/spa services. Add booking availability and pricing."},
    ]

    ksa_directories = [
        {"platform": "Google Business Profile", "url": "https://business.google.com", "priority": "critical",
         "instructions": "Claim and verify your listing. Add all details, photos, and respond to reviews."},
        {"platform": "Apple Business Connect", "url": "https://businessconnect.apple.com", "priority": "critical",
         "instructions": "Claim your Apple Maps listing. Add photos, hours, and payment info."},
        {"platform": "Facebook Business Page", "url": "https://www.facebook.com/business", "priority": "critical",
         "instructions": "Create/claim page. Add NAP, category, hours, and link to website."},
        {"platform": "Instagram Business", "url": "https://business.instagram.com", "priority": "high",
         "instructions": "Switch to business account. Add contact button, address, and category."},
        {"platform": "SaudiaYP", "url": "https://www.saudiayp.com", "priority": "high",
         "instructions": "Submit your business listing with consistent NAP details."},
        {"platform": "HungerStation", "url": "https://hungerstation.com/partners", "priority": "high",
         "instructions": "Register as a partner. Add full menu with accurate pricing."},
        {"platform": "Jahez", "url": "https://jahez.net/partners", "priority": "high",
         "instructions": "Register for delivery. Ensure menu and delivery coverage are complete."},
        {"platform": "Fresha", "url": "https://www.fresha.com/for-business", "priority": "medium",
         "instructions": "List salon/spa services. Add booking availability and pricing."},
    ]

    directories = uae_directories if country == "UAE" else ksa_directories

    # Filter by business type relevance
    if business_type in ("salon", "beauty", "spa"):
        # Remove food-specific platforms
        food_platforms = {"TripAdvisor", "Zomato", "Talabat", "Careem", "HungerStation", "Jahez"}
        directories = [d for d in directories if d["platform"] not in food_platforms]
    elif business_type in ("restaurant", "cafe"):
        # Remove salon-specific platforms
        salon_platforms = {"Fresha"}
        directories = [d for d in directories if d["platform"] not in salon_platforms]

    # Build citations with NAP fields and status
    citations = []
    for directory in directories:
        citations.append({
            "platform": directory["platform"],
            "url": directory["url"],
            "priority": directory["priority"],
            "nap_fields": {
                "name": company_name,
                "address": crawl.get("address", "") or crawl.get("gbp", {}).get("address", ""),
                "phone": client_info.get("contact_phone", "") or crawl.get("gbp", {}).get("phone", ""),
            },
            "status": "needed",
            "instructions": directory["instructions"],
        })

    total_needed = len(citations)
    critical_count = sum(1 for c in citations if c["priority"] == "critical")

    await _log_activity(
        client_id=client_id,
        event_type="citation_plan_generated",
        summary=f"Citation plan for {company_name} ({country}): {total_needed} directories, {critical_count} critical",
        payload={"country": country, "total": total_needed, "critical": critical_count},
    )

    return {
        "citations": citations,
        "total_needed": total_needed,
        "country": country,
        "business_type": business_type,
        "estimated_impact": f"Citations are a top-5 local ranking factor. Adding {total_needed} listings can improve local visibility by 20-40%.",
    }
