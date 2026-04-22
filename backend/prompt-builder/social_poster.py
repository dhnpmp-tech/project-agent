"""Social Poster — Multi-Platform Social Media Auto-Posting

Instead of Postiz (which requires 8+ containers: Temporal, Elasticsearch,
multiple Postgres instances), this module uses direct platform APIs:
- Instagram Graph API
- Facebook Graph API  
- TikTok Content Posting API
- Reddit API (via OAuth2 HTTP calls)

Integrates with the Content Engine output to auto-schedule posts.
Uses the existing Supabase 'scheduled_actions' table with action_type='social_post'.

Decision log: Postiz requires Temporal workflow engine + Elasticsearch +
2x PostgreSQL + Redis + the app itself = ~8 containers / ~4GB RAM.
VPS disk is at 87% (54GB free). Direct API approach uses zero extra
containers and is more reliable for our use case.
"""

from __future__ import annotations

import os
import json
import re
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from enum import Enum

# ─── Config ───────────────────────────────────────────

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Ynpxa3RpcGltYm11anRvd296Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwOTY5NCwiZXhwIjoyMDkwMDg1Njk0fQ.-DoNS5fZv3aUsFcugKg23yh9RqXXFIlgc5_9Hrk97bg")
_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# Platform API credentials (loaded from env or Supabase client_vault)
_INSTAGRAM_ACCESS_TOKEN = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "")
_FACEBOOK_ACCESS_TOKEN = os.environ.get("FACEBOOK_ACCESS_TOKEN", "")
_FACEBOOK_PAGE_ID = os.environ.get("FACEBOOK_PAGE_ID", "")
_TIKTOK_ACCESS_TOKEN = os.environ.get("TIKTOK_ACCESS_TOKEN", "")
_REDDIT_CLIENT_ID = os.environ.get("REDDIT_CLIENT_ID", "")
_REDDIT_CLIENT_SECRET = os.environ.get("REDDIT_CLIENT_SECRET", "")
_REDDIT_USERNAME = os.environ.get("REDDIT_USERNAME", "")
_REDDIT_PASSWORD = os.environ.get("REDDIT_PASSWORD", "")


class Platform(str, Enum):
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    TIKTOK = "tiktok"
    REDDIT = "reddit"
    GOOGLE_BUSINESS = "google_business"


# ─── Supabase Helpers ─────────────────────────────────

async def _fetch_client_social_config(client_id: str) -> dict:
    """Fetch social media credentials from client_vault or api_keys."""
    try:
        async with httpx.AsyncClient(timeout=8) as http:
            # Try api_keys table
            resp = await http.get(
                f"{_SUPA_URL}/rest/v1/api_keys?client_id=eq.{client_id}&select=*",
                headers=_SUPA_HEADERS,
            )
            rows = resp.json()
            if rows and isinstance(rows, list) and len(rows) > 0:
                # Flatten all key-value pairs
                config = {}
                for row in rows:
                    key_name = row.get("key_name", "")
                    key_value = row.get("key_value", "")
                    if key_name and key_value:
                        config[key_name] = key_value
                return config
    except Exception as e:
        print(f"[social_poster] Error fetching client config: {e}")
    return {}


async def _save_scheduled_post(post_data: dict) -> dict:
    """Save a scheduled post to Supabase scheduled_actions table."""
    try:
        record = {
            "client_id": post_data.get("client_id"),
            "customer_phone": "social_poster",
            "agent": "social_poster",
            "action_type": "social_post",
            "payload": json.dumps({
                "platform": post_data.get("platform"),
                "content": post_data.get("content"),
                "media_url": post_data.get("media_url"),
                "metadata": post_data.get("metadata", "{}"),
            }),
            "scheduled_for": post_data.get("scheduled_at", datetime.now(timezone.utc).isoformat()),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        async with httpx.AsyncClient(timeout=8) as http:
            resp = await http.post(
                f"{_SUPA_URL}/rest/v1/scheduled_actions",
                headers=_SUPA_HEADERS,
                json=record,
            )
            if resp.status_code in (200, 201):
                result = resp.json()
                return result[0] if isinstance(result, list) else result
            return {**record, "_note": f"save_failed_{resp.status_code}", "response": resp.text[:200]}
    except Exception as e:
        return {**post_data, "_error": str(e)}


async def _update_post_status(post_id: str, status: str, result_data: dict = None) -> None:
    """Update post status after publishing."""
    try:
        update = {
            "status": status,
            "executed_at": datetime.now(timezone.utc).isoformat(),
        }
        if result_data:
            # Merge result into existing payload
            update["payload"] = json.dumps(result_data)
        async with httpx.AsyncClient(timeout=8) as http:
            await http.patch(
                f"{_SUPA_URL}/rest/v1/scheduled_actions?id=eq.{post_id}",
                headers=_SUPA_HEADERS,
                json=update,
            )
    except Exception:
        pass


async def _log_activity(client_id: str, event_type: str, summary: str, payload: dict = None):
    """Log social posting activity."""
    try:
        async with httpx.AsyncClient(timeout=5) as http:
            await http.post(
                f"{_SUPA_URL}/rest/v1/activity_logs",
                headers=_SUPA_HEADERS,
                json={
                    "client_id": client_id,
                    "event_type": event_type,
                    "summary": summary,
                    "payload": json.dumps(payload or {}),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
            )
    except Exception:
        pass


# ─── Platform-Specific Posting ────────────────────────

async def _post_to_instagram(
    access_token: str,
    ig_user_id: str,
    caption: str,
    media_url: str = None,
    media_type: str = "IMAGE",
) -> dict:
    """Post to Instagram via Graph API.
    
    Flow: 1) Create media container  2) Publish the container
    Supports IMAGE, VIDEO, CAROUSEL, and REELS.
    """
    graph_url = "https://graph.facebook.com/v21.0"
    
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            # Step 1: Create media container
            container_params = {
                "access_token": access_token,
                "caption": caption,
            }
            
            if media_type == "VIDEO" or media_type == "REELS":
                container_params["media_type"] = "REELS"
                container_params["video_url"] = media_url
            elif media_url:
                container_params["image_url"] = media_url
            
            container_resp = await http.post(
                f"{graph_url}/{ig_user_id}/media",
                data=container_params,
            )
            container_data = container_resp.json()
            
            if "id" not in container_data:
                return {"error": "container_creation_failed", "details": container_data}
            
            container_id = container_data["id"]
            
            # Step 2: For video, wait for processing
            if media_type in ("VIDEO", "REELS"):
                import asyncio
                for _ in range(30):  # Wait up to 5 minutes
                    await asyncio.sleep(10)
                    status_resp = await http.get(
                        f"{graph_url}/{container_id}",
                        params={"fields": "status_code", "access_token": access_token},
                    )
                    status = status_resp.json().get("status_code")
                    if status == "FINISHED":
                        break
                    elif status == "ERROR":
                        return {"error": "video_processing_failed"}
            
            # Step 3: Publish
            publish_resp = await http.post(
                f"{graph_url}/{ig_user_id}/media_publish",
                data={
                    "creation_id": container_id,
                    "access_token": access_token,
                },
            )
            publish_data = publish_resp.json()
            
            if "id" in publish_data:
                return {
                    "success": True,
                    "platform": "instagram",
                    "post_id": publish_data["id"],
                    "container_id": container_id,
                }
            return {"error": "publish_failed", "details": publish_data}
    except Exception as e:
        return {"error": str(e), "platform": "instagram"}


async def _post_to_facebook(
    access_token: str,
    page_id: str,
    message: str,
    media_url: str = None,
    link: str = None,
) -> dict:
    """Post to Facebook Page via Graph API."""
    graph_url = "https://graph.facebook.com/v21.0"
    
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            if media_url and any(media_url.lower().endswith(ext) for ext in [".mp4", ".mov", ".avi"]):
                # Video post
                resp = await http.post(
                    f"{graph_url}/{page_id}/videos",
                    data={
                        "access_token": access_token,
                        "file_url": media_url,
                        "description": message,
                    },
                )
            elif media_url:
                # Photo post
                resp = await http.post(
                    f"{graph_url}/{page_id}/photos",
                    data={
                        "access_token": access_token,
                        "url": media_url,
                        "message": message,
                    },
                )
            else:
                # Text post (optionally with link)
                data = {
                    "access_token": access_token,
                    "message": message,
                }
                if link:
                    data["link"] = link
                resp = await http.post(
                    f"{graph_url}/{page_id}/feed",
                    data=data,
                )
            
            result = resp.json()
            if "id" in result or "post_id" in result:
                return {
                    "success": True,
                    "platform": "facebook",
                    "post_id": result.get("id") or result.get("post_id"),
                }
            return {"error": "post_failed", "details": result}
    except Exception as e:
        return {"error": str(e), "platform": "facebook"}


async def _post_to_tiktok(
    access_token: str,
    video_url: str,
    title: str,
    privacy_level: str = "PUBLIC_TO_EVERYONE",
) -> dict:
    """Post to TikTok via Content Posting API (v2).
    
    Note: TikTok requires video content. Text-only posts are not supported.
    The video must be publicly accessible via URL.
    """
    try:
        async with httpx.AsyncClient(timeout=60) as http:
            # Initialize upload via pull-from-URL
            init_resp = await http.post(
                "https://open.tiktokapis.com/v2/post/publish/video/init/",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "post_info": {
                        "title": title[:150],
                        "privacy_level": privacy_level,
                    },
                    "source_info": {
                        "source": "PULL_FROM_URL",
                        "video_url": video_url,
                    },
                },
            )
            init_data = init_resp.json()
            
            if init_data.get("error", {}).get("code") == "ok":
                publish_id = init_data.get("data", {}).get("publish_id")
                return {
                    "success": True,
                    "platform": "tiktok",
                    "publish_id": publish_id,
                    "status": "processing",
                }
            return {"error": "tiktok_init_failed", "details": init_data}
    except Exception as e:
        return {"error": str(e), "platform": "tiktok"}


async def _post_to_reddit(
    client_id: str,
    client_secret: str,
    username: str,
    password: str,
    subreddit: str,
    title: str,
    text: str = None,
    url: str = None,
) -> dict:
    """Post to Reddit using OAuth2 script auth."""
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            # Step 1: Get access token
            auth_resp = await http.post(
                "https://www.reddit.com/api/v1/access_token",
                auth=(client_id, client_secret),
                data={
                    "grant_type": "password",
                    "username": username,
                    "password": password,
                },
                headers={"User-Agent": "KapsoBot/1.0"},
            )
            token = auth_resp.json().get("access_token")
            if not token:
                return {"error": "reddit_auth_failed", "details": auth_resp.json()}
            
            # Step 2: Submit post
            post_data = {
                "sr": subreddit,
                "title": title,
                "kind": "link" if url else "self",
            }
            if url:
                post_data["url"] = url
            if text:
                post_data["text"] = text
            
            submit_resp = await http.post(
                "https://oauth.reddit.com/api/submit",
                headers={
                    "Authorization": f"Bearer {token}",
                    "User-Agent": "KapsoBot/1.0",
                },
                data=post_data,
            )
            result = submit_resp.json()
            
            post_url = None
            if "json" in result and "data" in result["json"]:
                post_url = result["json"]["data"].get("url")
            
            return {
                "success": True,
                "platform": "reddit",
                "post_url": post_url,
                "details": result,
            }
    except Exception as e:
        return {"error": str(e), "platform": "reddit"}


# ─── Core Public API ──────────────────────────────────

async def schedule_post(
    client_id: str,
    platform: str,
    content: str,
    media_url: str = None,
    scheduled_at: str = None,
    metadata: dict = None,
) -> dict:
    """Schedule a single post for a specific platform.
    
    Args:
        client_id: Tenant UUID.
        platform: One of 'instagram', 'facebook', 'tiktok', 'reddit', 'google_business'.
        content: Post text/caption (supports Arabic).
        media_url: URL to image or video to attach.
        scheduled_at: ISO datetime for when to publish. None = publish now.
        metadata: Extra data (hashtags, subreddit, etc.).
    
    Returns:
        dict with post_id, status, and platform details.
    """
    now = datetime.now(timezone.utc)
    schedule_time = None
    
    if scheduled_at:
        try:
            schedule_time = datetime.fromisoformat(scheduled_at.replace("Z", "+00:00"))
        except ValueError:
            schedule_time = now + timedelta(hours=1)
    
    post_record = {
        "client_id": client_id,
        "platform": platform,
        "content": content,
        "media_url": media_url,
        "scheduled_at": (schedule_time or now).isoformat(),
        "status": "pending" if schedule_time and schedule_time > now else "publishing",
        "metadata": json.dumps(metadata or {}),
    }
    
    saved = await _save_scheduled_post(post_record)
    
    # If scheduled for later, just save and return
    if schedule_time and schedule_time > now:
        await _log_activity(
            client_id, "post_scheduled",
            f"Post scheduled for {platform} at {schedule_time.isoformat()}",
            {"platform": platform, "scheduled_at": schedule_time.isoformat()},
        )
        return {
            "post_id": saved.get("id"),
            "status": "pending",
            "platform": platform,
            "scheduled_at": schedule_time.isoformat(),
            "content_preview": content[:100],
        }
    
    # Publish immediately
    result = await _publish_post(client_id, platform, content, media_url, metadata or {})
    
    if saved.get("id"):
        status = "cancelled" if result.get("success") else "failed"  # cancelled = published (db constraint)
        await _update_post_status(saved["id"], status, result)
    
    await _log_activity(
        client_id, "post_published",
        f"Post {'published' if result.get('success') else 'failed'} on {platform}",
        {"platform": platform, "result": result},
    )
    
    return {
        "post_id": saved.get("id"),
        "status": "published" if result.get("success") else "failed",
        "platform": platform,
        "platform_post_id": result.get("post_id") or result.get("publish_id"),
        "content_preview": content[:100],
        "result": result,
    }


async def _publish_post(
    client_id: str,
    platform: str,
    content: str,
    media_url: str = None,
    metadata: dict = None,
) -> dict:
    """Route to the correct platform API."""
    config = await _fetch_client_social_config(client_id)
    meta = metadata or {}
    
    if platform == "instagram":
        token = config.get("instagram_access_token") or _INSTAGRAM_ACCESS_TOKEN
        ig_user_id = config.get("instagram_user_id", "")
        if not token or not ig_user_id:
            return {"error": "instagram_not_configured", "hint": "Set instagram_access_token and instagram_user_id in api_keys table"}
        media_type = "IMAGE"
        if media_url and any(media_url.lower().endswith(ext) for ext in [".mp4", ".mov"]):
            media_type = "REELS"
        return await _post_to_instagram(token, ig_user_id, content, media_url, media_type)
    
    elif platform == "facebook":
        token = config.get("facebook_access_token") or _FACEBOOK_ACCESS_TOKEN
        page_id = config.get("facebook_page_id") or _FACEBOOK_PAGE_ID
        if not token or not page_id:
            return {"error": "facebook_not_configured", "hint": "Set facebook_access_token and facebook_page_id in api_keys table"}
        return await _post_to_facebook(token, page_id, content, media_url)
    
    elif platform == "tiktok":
        token = config.get("tiktok_access_token") or _TIKTOK_ACCESS_TOKEN
        if not token:
            return {"error": "tiktok_not_configured", "hint": "Set tiktok_access_token in api_keys table"}
        if not media_url:
            return {"error": "tiktok_requires_video", "hint": "TikTok only supports video posts. Provide a media_url."}
        return await _post_to_tiktok(token, media_url, content)
    
    elif platform == "reddit":
        r_client_id = config.get("reddit_client_id") or _REDDIT_CLIENT_ID
        r_secret = config.get("reddit_client_secret") or _REDDIT_CLIENT_SECRET
        r_user = config.get("reddit_username") or _REDDIT_USERNAME
        r_pass = config.get("reddit_password") or _REDDIT_PASSWORD
        subreddit = meta.get("subreddit", "test")
        title = meta.get("title", content[:300])
        if not all([r_client_id, r_secret, r_user, r_pass]):
            return {"error": "reddit_not_configured", "hint": "Set reddit_client_id/secret/username/password in api_keys table"}
        return await _post_to_reddit(
            r_client_id, r_secret, r_user, r_pass,
            subreddit, title, content, media_url,
        )
    
    elif platform == "google_business":
        return {"error": "use_gbp_module", "hint": "Use the /gbp/posts endpoint via google_business module"}
    
    else:
        return {"error": f"unsupported_platform: {platform}"}


async def schedule_batch(client_id: str, posts: list) -> list:
    """Schedule multiple posts at once.
    
    Args:
        client_id: Tenant UUID.
        posts: List of dicts with keys: platform, content, media_url, scheduled_at, metadata.
    
    Returns:
        List of schedule results.
    """
    results = []
    for post in posts:
        result = await schedule_post(
            client_id=client_id,
            platform=post.get("platform", "instagram"),
            content=post.get("content", ""),
            media_url=post.get("media_url"),
            scheduled_at=post.get("scheduled_at"),
            metadata=post.get("metadata"),
        )
        results.append(result)
    
    await _log_activity(
        client_id, "batch_scheduled",
        f"Batch of {len(posts)} posts scheduled across platforms",
        {"count": len(posts), "platforms": list({p.get('platform') for p in posts})},
    )
    
    return results


async def get_scheduled_posts(client_id: str, days: int = 7) -> list:
    """Get all scheduled posts for a client within the next N days.
    
    Args:
        client_id: Tenant UUID.
        days: Look-ahead window in days (default 7).
    
    Returns:
        List of scheduled post records with parsed payload.
    """
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=days)
    
    try:
        async with httpx.AsyncClient(timeout=8) as http:
            resp = await http.get(
                f"{_SUPA_URL}/rest/v1/scheduled_actions",
                headers=_SUPA_HEADERS,
                params={
                    "client_id": f"eq.{client_id}",
                    "action_type": "eq.social_post",
                    "and": f"(scheduled_for.gte.{now.isoformat()},scheduled_for.lte.{end.isoformat()})",
                    "order": "scheduled_for.asc",
                },
            )
            if resp.status_code == 200:
                rows = resp.json()
                # Parse payload for each row
                for row in rows:
                    try:
                        row["_parsed_payload"] = json.loads(row.get("payload", "{}"))
                    except (json.JSONDecodeError, TypeError):
                        row["_parsed_payload"] = {}
                return rows
            return []
    except Exception:
        return []


async def auto_post_from_calendar(client_id: str) -> dict:
    """Take the content calendar from Content Engine and schedule all posts.
    
    Fetches the latest content calendar, generates captions for each entry,
    and schedules them across platforms with optimal timing.
    
    Args:
        client_id: Tenant UUID.
    
    Returns:
        dict with scheduled_count, platforms, and individual results.
    """
    from content_engine import generate_content_calendar, generate_caption
    
    calendar_result = await generate_content_calendar(client_id)
    calendar = calendar_result.get("calendar", [])
    
    if not calendar:
        return {"error": "no_calendar_entries", "client_id": client_id}
    
    posts_to_schedule = []
    now = datetime.now(timezone.utc)
    
    for entry in calendar:
        if not isinstance(entry, dict):
            continue
        
        platform = entry.get("platform", "instagram")
        hook = entry.get("hook", "")
        concept = entry.get("concept", "")
        day_offset = entry.get("date_offset", 0)
        best_time = entry.get("best_time", "12:00 PM")
        language = entry.get("language", "en")
        
        # Generate full caption
        caption_result = await generate_caption(
            client_id=client_id,
            topic=concept,
            platform=platform,
            language=language,
        )
        caption = caption_result.get("caption", f"{hook}\n\n{concept}")
        
        # Calculate schedule time (UAE = UTC+4)
        try:
            time_parts = datetime.strptime(best_time.strip(), "%I:%M %p")
            schedule_dt = now + timedelta(days=day_offset)
            schedule_dt = schedule_dt.replace(
                hour=time_parts.hour, minute=time_parts.minute,
                second=0, microsecond=0,
            )
            schedule_dt = schedule_dt - timedelta(hours=4)  # UAE offset
        except (ValueError, AttributeError):
            schedule_dt = now + timedelta(days=day_offset, hours=12)
        
        posts_to_schedule.append({
            "platform": platform,
            "content": caption,
            "scheduled_at": schedule_dt.isoformat(),
            "metadata": {
                "hook": hook,
                "concept": concept,
                "pillar": entry.get("pillar", ""),
                "visual_idea": entry.get("visual_idea", ""),
                "language": language,
                "auto_generated": True,
            },
        })
    
    results = await schedule_batch(client_id, posts_to_schedule)
    
    platforms_used = list({p["platform"] for p in posts_to_schedule})
    scheduled_count = sum(1 for r in results if r.get("status") in ("pending", "cancelled"))
    
    await _log_activity(
        client_id, "auto_calendar_scheduled",
        f"Auto-scheduled {scheduled_count}/{len(posts_to_schedule)} posts from content calendar",
        {"total": len(posts_to_schedule), "scheduled": scheduled_count, "platforms": platforms_used},
    )
    
    return {
        "client_id": client_id,
        "total_posts": len(posts_to_schedule),
        "scheduled_count": scheduled_count,
        "platforms": platforms_used,
        "results": results,
        "calendar_source": calendar_result.get("generated_at"),
    }


# ─── Haraj (Saudi Marketplace) ───────────────────────
# Haraj does NOT have a public posting API.

async def prepare_haraj_listing(
    client_id: str,
    title: str,
    description: str,
    price: float,
    category: str = "other",
    city: str = "Riyadh",
    images: list = None,
) -> dict:
    """Prepare a Haraj listing for manual posting.
    
    Haraj (haraj.com.sa) has no public API. This formats the listing
    and stores it for manual publishing.
    """
    listing = {
        "client_id": client_id,
        "platform": "haraj",
        "title": title,
        "description": description,
        "price": price,
        "currency": "SAR",
        "category": category,
        "city": city,
        "images": images or [],
        "status": "ready_for_manual_posting",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "instructions": (
            "Haraj does not have a public API. To post:\n"
            "1. Open the Haraj app or visit haraj.com.sa\n"
            "2. Tap 'Add New Listing'\n"
            "3. Select category and city\n"
            "4. Copy the title and description\n"
            "5. Upload images and set price\n"
            "6. Submit"
        ),
    }
    
    await _save_scheduled_post({
        "client_id": client_id,
        "platform": "haraj",
        "content": f"{title}\n\n{description}\n\nPrice: {price} SAR",
        "status": "pending",
        "metadata": json.dumps(listing),
    })
    
    return listing


# ─── Publish Pending Posts (cron-friendly) ────────────

async def publish_pending_posts() -> dict:
    """Check for scheduled social posts that are due and publish them.
    
    Should be called periodically (every 5 minutes via cron or background task).
    """
    now = datetime.now(timezone.utc)
    
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.get(
                f"{_SUPA_URL}/rest/v1/scheduled_actions",
                headers=_SUPA_HEADERS,
                params={
                    "action_type": "eq.social_post",
                    "status": "eq.pending",
                    "scheduled_for": f"lte.{now.isoformat()}",
                    "order": "scheduled_for.asc",
                    "limit": "10",
                },
            )
            if resp.status_code != 200:
                return {"error": "fetch_failed", "status_code": resp.status_code}
            
            posts = resp.json()
            if not posts:
                return {"published_count": 0, "message": "no_posts_due"}
            
            results = []
            for post in posts:
                payload = {}
                try:
                    payload = json.loads(post.get("payload", "{}")) if isinstance(post.get("payload"), str) else (post.get("payload") or {})
                except (json.JSONDecodeError, TypeError):
                    pass
                
                metadata = {}
                try:
                    metadata = json.loads(payload.get("metadata", "{}")) if isinstance(payload.get("metadata"), str) else (payload.get("metadata") or {})
                except (json.JSONDecodeError, TypeError):
                    pass
                
                result = await _publish_post(
                    client_id=post["client_id"],
                    platform=payload.get("platform", "instagram"),
                    content=payload.get("content", ""),
                    media_url=payload.get("media_url"),
                    metadata=metadata,
                )
                
                status = "cancelled" if result.get("success") else "failed"  # cancelled = published (db constraint)
                await _update_post_status(post["id"], status, result)
                results.append({"post_id": post["id"], "status": status, "result": result})
            
            return {
                "published_count": sum(1 for r in results if r["status"] == "cancelled"),
                "failed_count": sum(1 for r in results if r["status"] == "failed"),
                "results": results,
            }
    except Exception as e:
        return {"error": str(e)}
