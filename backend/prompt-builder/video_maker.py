"""Video Maker — Template-Based Short Video Creation

Wrapper for short-video-maker (https://github.com/gyoridavid/short-video-maker)
which runs as a Docker container on port 3123.

The service converts text scripts into short videos by:
1. Text-to-speech via Kokoro TTS
2. Caption generation via Whisper
3. Background video search via Pexels API
4. Composition + rendering via Remotion

Supports product showcases, promotional clips, and social media reels.
"""

from __future__ import annotations

import os
import json
import httpx
import asyncio
from datetime import datetime, timezone
from typing import Optional, List

# ─── Config ───────────────────────────────────────────

_VIDEO_MAKER_URL = os.environ.get("VIDEO_MAKER_URL", "http://localhost:3123")
_PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY", "")

_SUPA_URL = os.environ.get("SUPABASE_URL", "https://sybzqktipimbmujtowoz.supabase.co")
_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
_SUPA_HEADERS = {
    "apikey": _SUPA_KEY,
    "Authorization": f"Bearer {_SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

_MINIMAX_KEY = os.environ.get("MINIMAX_API_KEY", "")


# ─── Helpers ──────────────────────────────────────────

async def _check_service_health() -> bool:
    """Check if short-video-maker service is running."""
    try:
        async with httpx.AsyncClient(timeout=5) as http:
            resp = await http.get(f"{_VIDEO_MAKER_URL}/health")
            return resp.status_code == 200
    except Exception:
        return False


async def _log_activity(client_id: str, event_type: str, summary: str, payload: dict = None):
    """Log video generation activity."""
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


async def _generate_script_with_ai(
    topic: str,
    style: str = "product",
    lang: str = "en",
    duration_seconds: int = 30,
) -> str:
    """Use MiniMax to generate a video script from a topic."""
    if not _MINIMAX_KEY:
        # Fallback to simple script
        return topic
    
    system = f"""You are a short-form video scriptwriter for social media (TikTok/Reels/Shorts).
Write a script that will be converted to speech for a {duration_seconds}-second video.
Style: {style}
Language: {'Arabic' if lang == 'ar' else 'English'}

Rules:
- Write ONLY the spoken narration text, no stage directions
- Keep it punchy, engaging, hook-first
- For product videos: highlight benefits, create urgency
- Max ~{duration_seconds * 2} words for a {duration_seconds}s video
- If Arabic: use Gulf dialect, modern casual tone"""

    try:
        async with httpx.AsyncClient(timeout=30) as http:
            resp = await http.post(
                "https://api.minimaxi.chat/v1/text/chatcompletion_v2",
                headers={
                    "Authorization": f"Bearer {_MINIMAX_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "MiniMax-M1",
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": f"Write a {style} video script about: {topic}"},
                    ],
                    "max_tokens": 500,
                },
            )
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            if content:
                import re
                content = re.sub(r"<think>[\s\S]*?</think>\s*", "", content).strip()
                return content
    except Exception as e:
        print(f"[video_maker] AI script generation failed: {e}")
    
    return topic


async def _wait_for_video(render_id: str, timeout_seconds: int = 300) -> dict:
    """Poll the video maker service until rendering is complete."""
    start = datetime.now(timezone.utc)
    
    while True:
        elapsed = (datetime.now(timezone.utc) - start).total_seconds()
        if elapsed > timeout_seconds:
            return {"error": "render_timeout", "render_id": render_id, "elapsed": elapsed}
        
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                resp = await http.get(f"{_VIDEO_MAKER_URL}/api/renders/{render_id}")
                if resp.status_code == 200:
                    data = resp.json()
                    status = data.get("status", "")
                    if status == "completed" or status == "done":
                        return {
                            "success": True,
                            "render_id": render_id,
                            "video_url": data.get("outputUrl") or data.get("output_url") or data.get("url", ""),
                            "duration": data.get("duration"),
                            "format": data.get("format", "mp4"),
                            "status": "completed",
                        }
                    elif status in ("failed", "error"):
                        return {"error": "render_failed", "render_id": render_id, "details": data}
        except Exception:
            pass
        
        await asyncio.sleep(5)


# ─── Core Public API ──────────────────────────────────

async def create_short_video(
    client_id: str,
    script: str,
    style: str = "product",
    lang: str = "en",
    music_mood: str = "upbeat",
) -> dict:
    """Create a short video from a script.
    
    Uses the short-video-maker service to convert text into a
    professionally captioned video with background footage.
    
    Args:
        client_id: Tenant UUID.
        script: The narration script (text that will be spoken).
        style: Video style - 'product', 'promo', 'story', 'educational'.
        lang: Language code - 'en' or 'ar'.
        music_mood: Background music mood - 'upbeat', 'calm', 'dramatic', 'corporate'.
    
    Returns:
        dict with video_url, duration, format, and render details.
    """
    is_healthy = await _check_service_health()
    if not is_healthy:
        return {
            "error": "video_service_unavailable",
            "hint": "short-video-maker container is not running. Start it with: docker run -d -p 3123:3123 -e PEXELS_API_KEY=xxx gyoridavid/short-video-maker:latest-tiny",
            "client_id": client_id,
        }
    
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            # Submit render job
            payload = {
                "text": script,
                "language": lang,
            }
            
            # Add music mood if the API supports it
            if music_mood:
                payload["musicMood"] = music_mood
            
            resp = await http.post(
                f"{_VIDEO_MAKER_URL}/api/renders",
                json=payload,
            )
            
            if resp.status_code not in (200, 201, 202):
                return {
                    "error": "render_submission_failed",
                    "status_code": resp.status_code,
                    "details": resp.text[:500],
                }
            
            data = resp.json()
            render_id = data.get("id") or data.get("renderId") or data.get("render_id", "")
            
            if not render_id:
                return {"error": "no_render_id", "response": data}
            
            await _log_activity(
                client_id, "video_render_started",
                f"Short video render started (style={style}, lang={lang})",
                {"render_id": render_id, "script_preview": script[:100]},
            )
            
            # Wait for completion
            result = await _wait_for_video(render_id)
            
            if result.get("success"):
                await _log_activity(
                    client_id, "video_render_completed",
                    f"Video rendered successfully: {result.get('video_url', '')}",
                    result,
                )
            
            return {
                **result,
                "client_id": client_id,
                "style": style,
                "lang": lang,
            }
    
    except Exception as e:
        return {"error": str(e), "client_id": client_id}


async def create_product_video(
    client_id: str,
    product_name: str,
    description: str,
    price: str = None,
    lang: str = "en",
) -> dict:
    """Create a product showcase video for TikTok/Reels.
    
    Auto-generates a compelling script from product details and
    renders it as a short-form video with captions.
    
    Args:
        client_id: Tenant UUID.
        product_name: Name of the product/dish/service.
        description: Product description and key features.
        price: Price string (e.g., "AED 49", "SAR 199").
        lang: Language code.
    
    Returns:
        dict with video_url, duration, format.
    """
    topic = f"{product_name}: {description}"
    if price:
        topic += f" — Only {price}"
    
    script = await _generate_script_with_ai(
        topic=topic,
        style="product",
        lang=lang,
        duration_seconds=30,
    )
    
    return await create_short_video(
        client_id=client_id,
        script=script,
        style="product",
        lang=lang,
        music_mood="upbeat",
    )


async def create_batch_videos(
    client_id: str,
    scripts: list,
) -> list:
    """Create multiple videos for a week's content.
    
    Processes scripts sequentially to avoid overloading the render service.
    
    Args:
        client_id: Tenant UUID.
        scripts: List of dicts with keys:
            - script: str (the narration text)
            - style: str (optional, default 'product')
            - lang: str (optional, default 'en')
            - music_mood: str (optional, default 'upbeat')
    
    Returns:
        List of render results.
    """
    results = []
    
    for i, item in enumerate(scripts):
        if isinstance(item, str):
            item = {"script": item}
        
        result = await create_short_video(
            client_id=client_id,
            script=item.get("script", ""),
            style=item.get("style", "product"),
            lang=item.get("lang", "en"),
            music_mood=item.get("music_mood", "upbeat"),
        )
        result["batch_index"] = i
        results.append(result)
        
        # Brief pause between renders to avoid overloading
        if i < len(scripts) - 1:
            await asyncio.sleep(2)
    
    await _log_activity(
        client_id, "batch_video_completed",
        f"Batch of {len(scripts)} videos: {sum(1 for r in results if r.get('success'))} succeeded",
        {"total": len(scripts), "results_summary": [
            {"index": r.get("batch_index"), "success": r.get("success", False)}
            for r in results
        ]},
    )
    
    return results


async def get_available_music() -> dict:
    """Get available background music moods from the service.
    
    Returns:
        dict with available music tags/moods.
    """
    try:
        async with httpx.AsyncClient(timeout=5) as http:
            resp = await http.get(f"{_VIDEO_MAKER_URL}/api/music-tags")
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return {
        "tags": ["upbeat", "calm", "dramatic", "corporate", "inspiring", "playful"],
        "_note": "fallback_defaults",
    }


async def get_render_status(render_id: str) -> dict:
    """Check the status of a specific render job.
    
    Args:
        render_id: The render job ID.
    
    Returns:
        dict with current status and details.
    """
    try:
        async with httpx.AsyncClient(timeout=5) as http:
            resp = await http.get(f"{_VIDEO_MAKER_URL}/api/renders/{render_id}")
            if resp.status_code == 200:
                return resp.json()
            return {"error": "render_not_found", "render_id": render_id}
    except Exception as e:
        return {"error": str(e), "render_id": render_id}
