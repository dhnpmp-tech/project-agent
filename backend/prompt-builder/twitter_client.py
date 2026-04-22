"""Twitter Client — X/Twitter API v2 Integration

This is the ONLY module that publishes to X/Twitter.
It does NOT go through social_poster.py.

Used by the CEO Persona (Rami Mansour) feature: drafts tweets,
gets founder approval, then this module publishes them.

Authentication:
  - OAuth 1.0a (HMAC-SHA1) for write operations (post, delete, reply)
  - Bearer Token for read operations (search, lookup)

API Base: https://api.x.com/2
"""

from __future__ import annotations

import hashlib
import hmac
import os
import re
import time
import uuid
import urllib.parse
from typing import Optional

import httpx

# ─── Configuration ────────────────────────────────────

_BASE_URL = "https://api.x.com/2"

_API_KEY = os.environ.get("TWITTER_API_KEY", "")
_API_SECRET = os.environ.get("TWITTER_API_SECRET", "")
_ACCESS_TOKEN = os.environ.get("TWITTER_ACCESS_TOKEN", "")
_ACCESS_SECRET = os.environ.get("TWITTER_ACCESS_SECRET", "")
_BEARER_TOKEN = os.environ.get("TWITTER_BEARER_TOKEN", "")

_MAX_TWEET_LENGTH = 280


# ─── Length Helpers ───────────────────────────────────

def _check_tweet_length(text: str) -> bool:
    """Return True if text is within the 280-character limit, False otherwise."""
    return len(text) <= _MAX_TWEET_LENGTH


def split_into_thread(text: str) -> list[str]:
    """Split long text into a tweet thread at paragraph/sentence boundaries.

    Each tweet will be at most 280 characters. The function tries to split
    on paragraph breaks first, then sentence boundaries, then word boundaries
    as a last resort.

    Returns a list of tweet strings (each <= 280 chars).
    """
    if _check_tweet_length(text):
        return [text]

    tweets: list[str] = []

    # Split into paragraphs first (double newline)
    paragraphs = re.split(r"\n\n+", text.strip())

    current_chunk = ""
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # If this paragraph alone exceeds the limit, split it into sentences
        if len(para) > _MAX_TWEET_LENGTH:
            sentences = re.split(r"(?<=[.!?])\s+", para)
            for sentence in sentences:
                sentence = sentence.strip()
                if not sentence:
                    continue

                # If a single sentence is too long, split at word boundaries
                if len(sentence) > _MAX_TWEET_LENGTH:
                    words = sentence.split()
                    for word in words:
                        candidate = (current_chunk + " " + word).strip()
                        if len(candidate) <= _MAX_TWEET_LENGTH:
                            current_chunk = candidate
                        else:
                            if current_chunk:
                                tweets.append(current_chunk)
                            current_chunk = word
                else:
                    candidate = (current_chunk + " " + sentence).strip()
                    if len(candidate) <= _MAX_TWEET_LENGTH:
                        current_chunk = candidate
                    else:
                        if current_chunk:
                            tweets.append(current_chunk)
                        current_chunk = sentence
        else:
            # Try to append paragraph to current chunk with a newline
            separator = "\n\n" if current_chunk else ""
            candidate = (current_chunk + separator + para).strip()
            if len(candidate) <= _MAX_TWEET_LENGTH:
                current_chunk = candidate
            else:
                if current_chunk:
                    tweets.append(current_chunk)
                current_chunk = para

    if current_chunk:
        tweets.append(current_chunk)

    return tweets if tweets else [text[:_MAX_TWEET_LENGTH]]


# ─── OAuth 1.0a ───────────────────────────────────────

def _percent_encode(value: str) -> str:
    """RFC 3986 percent-encode a string."""
    return urllib.parse.quote(str(value), safe="")


def _oauth1_header(method: str, url: str, params: dict | None = None) -> str:
    """Generate OAuth 1.0a Authorization header (HMAC-SHA1 signature).

    Args:
        method: HTTP method, e.g. "POST"
        url: Full request URL without query string
        params: Additional query or body parameters to include in the signature base

    Returns:
        Value for the Authorization header, e.g. 'OAuth oauth_consumer_key="...",...'
    """
    oauth_params: dict[str, str] = {
        "oauth_consumer_key": _API_KEY,
        "oauth_nonce": uuid.uuid4().hex,
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_token": _ACCESS_TOKEN,
        "oauth_version": "1.0",
    }

    # Collect all parameters for signature base string
    all_params: dict[str, str] = {}
    if params:
        all_params.update({str(k): str(v) for k, v in params.items()})
    all_params.update(oauth_params)

    # Sort parameters and encode
    sorted_params = sorted(all_params.items())
    param_string = "&".join(
        f"{_percent_encode(k)}={_percent_encode(v)}" for k, v in sorted_params
    )

    # Build signature base string
    signature_base = "&".join([
        _percent_encode(method.upper()),
        _percent_encode(url),
        _percent_encode(param_string),
    ])

    # Build signing key
    signing_key = f"{_percent_encode(_API_SECRET)}&{_percent_encode(_ACCESS_SECRET)}"

    # Compute HMAC-SHA1
    hashed = hmac.new(
        signing_key.encode("utf-8"),
        signature_base.encode("utf-8"),
        hashlib.sha1,
    )
    import base64
    signature = base64.b64encode(hashed.digest()).decode("utf-8")

    oauth_params["oauth_signature"] = signature

    # Build Authorization header value
    auth_header = "OAuth " + ", ".join(
        f'{_percent_encode(k)}="{_percent_encode(v)}"'
        for k, v in sorted(oauth_params.items())
    )
    return auth_header


# ─── Core Request ─────────────────────────────────────

async def _twitter_request(
    method: str,
    endpoint: str,
    json_body: dict | None = None,
    params: dict | None = None,
    use_bearer: bool = False,
) -> dict:
    """Make an authenticated request to X API v2.

    Args:
        method: HTTP method ("GET", "POST", "DELETE")
        endpoint: API endpoint path, e.g. "/tweets"
        json_body: JSON body for POST/DELETE requests
        params: Query parameters
        use_bearer: If True, use Bearer token auth (for read-only endpoints).
                    If False, use OAuth 1.0a (for write endpoints).

    Returns:
        Parsed JSON response as a dict.

    Raises:
        httpx.HTTPStatusError: On non-2xx HTTP responses.
        ValueError: On unexpected response format.
    """
    url = f"{_BASE_URL}{endpoint}"

    if use_bearer:
        headers = {
            "Authorization": f"Bearer {_BEARER_TOKEN}",
            "Content-Type": "application/json",
        }
    else:
        # OAuth 1.0a: signature is built over query params (not JSON body)
        headers = {
            "Authorization": _oauth1_header(method, url, params),
            "Content-Type": "application/json",
        }

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.request(
            method=method.upper(),
            url=url,
            params=params,
            json=json_body,
            headers=headers,
        )
        response.raise_for_status()

    try:
        return response.json()
    except Exception:
        return {"raw": response.text}


# ─── Public API ───────────────────────────────────────

async def post_tweet(text: str, reply_to: str | None = None) -> dict:
    """Post a single tweet.

    Args:
        text: Tweet content (must be <= 280 characters).
        reply_to: Optional tweet ID to reply to.

    Returns:
        X API v2 response dict containing the created tweet data.

    Raises:
        ValueError: If text exceeds 280 characters.
    """
    if not _check_tweet_length(text):
        raise ValueError(
            f"Tweet exceeds 280 characters ({len(text)} chars). "
            "Use split_into_thread() to break it up."
        )

    body: dict = {"text": text}
    if reply_to:
        body["reply"] = {"in_reply_to_tweet_id": str(reply_to)}

    return await _twitter_request("POST", "/tweets", json_body=body)


async def post_thread(texts: list[str]) -> list[dict]:
    """Post a thread of tweets in sequence, each replying to the previous.

    Args:
        texts: List of tweet strings (each must be <= 280 chars).

    Returns:
        List of X API v2 response dicts, one per tweet.

    Raises:
        ValueError: If any tweet in the list exceeds 280 characters.
    """
    responses: list[dict] = []
    last_tweet_id: str | None = None

    for text in texts:
        response = await post_tweet(text, reply_to=last_tweet_id)
        responses.append(response)
        # Extract tweet ID from response for threading
        tweet_id = (
            response.get("data", {}).get("id")
            or response.get("id")
        )
        if tweet_id:
            last_tweet_id = str(tweet_id)

    return responses


async def delete_tweet(tweet_id: str) -> dict:
    """Delete a tweet by its ID.

    Args:
        tweet_id: The ID of the tweet to delete.

    Returns:
        X API v2 response dict, e.g. {"data": {"deleted": true}}.
    """
    return await _twitter_request("DELETE", f"/tweets/{tweet_id}")


async def search_mentions(
    username: str,
    since_id: str | None = None,
    max_results: int = 10,
) -> dict:
    """Search for tweets mentioning @username.

    Uses Bearer token authentication (read-only).

    Args:
        username: Twitter username without the @ prefix.
        since_id: Optional tweet ID — only return tweets newer than this.
        max_results: Number of results to return (1–100). Default 10.

    Returns:
        X API v2 search response dict.
    """
    query = f"@{username} -is:retweet"
    params: dict = {
        "query": query,
        "max_results": str(min(max(max_results, 1), 100)),
        "tweet.fields": "author_id,created_at,conversation_id",
    }
    if since_id:
        params["since_id"] = str(since_id)

    return await _twitter_request(
        "GET", "/tweets/search/recent", params=params, use_bearer=True
    )


async def search_prospects(
    query: str,
    max_results: int = 10,
) -> dict:
    """Search tweets by arbitrary query (for prospect finding).

    Uses Bearer token authentication (read-only).

    Args:
        query: Search query string (X API v2 query syntax).
        max_results: Number of results to return (1–100). Default 10.

    Returns:
        X API v2 search response dict.
    """
    params: dict = {
        "query": query,
        "max_results": str(min(max(max_results, 1), 100)),
        "tweet.fields": "author_id,created_at,public_metrics",
        "expansions": "author_id",
        "user.fields": "name,username,description,public_metrics",
    }
    return await _twitter_request(
        "GET", "/tweets/search/recent", params=params, use_bearer=True
    )


async def get_user_by_username(username: str) -> dict:
    """Fetch a user's profile by username.

    Uses Bearer token authentication (read-only).

    Args:
        username: Twitter username without the @ prefix.

    Returns:
        X API v2 user object dict.
    """
    params: dict = {
        "user.fields": "id,name,username,description,public_metrics,created_at,verified",
    }
    return await _twitter_request(
        "GET",
        f"/users/by/username/{username}",
        params=params,
        use_bearer=True,
    )


async def reply_to_tweet(tweet_id: str, text: str) -> dict:
    """Reply to a specific tweet.

    Args:
        tweet_id: The ID of the tweet to reply to.
        text: Reply content (must be <= 280 characters).

    Returns:
        X API v2 response dict containing the created reply.

    Raises:
        ValueError: If text exceeds 280 characters.
    """
    return await post_tweet(text, reply_to=tweet_id)
