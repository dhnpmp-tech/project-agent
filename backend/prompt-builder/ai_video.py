"""AI Video — UGC-Style Video Generation with AI Actors

Wrapper for OpenShorts (https://github.com/mutonby/openshorts)
running on the VPS at port 8001 (backend), 5175 (frontend), 3101 (renderer).

Generates marketing videos with:
- AI-generated UGC actors (via fal.ai)
- Text-to-speech voiceover (via ElevenLabs)
- Product showcases with b-roll
- Automated subtitles

API: POST /api/saasshorts/generate with {script, voice_id, actor_description, video_mode}
Status: GET /api/saasshorts/status/{job_id}
Voices: GET /api/saasshorts/voices

Cost: ~$0.50-1.50 per video (fal.ai + ElevenLabs API fees).
"""

from __future__ import annotations

import os
import json
import re
import httpx
import asyncio
from datetime import datetime, timezone
from typing import Optional, List

# ─── Config ───────────────────────────────────────────

_OPENSHORTS_URL = os.environ.get("OPENSHORTS_URL", "http://localhost:8001")

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
    """Check if OpenShorts backend is running."""
    try:
        async with httpx.AsyncClient(timeout=5) as http:
            resp = await http.get(f"{_OPENSHORTS_URL}/openapi.json")
            return resp.status_code == 200
    except Exception:
        return False


async def _log_activity(client_id: str, event_type: str, summary: str, payload: dict = None):
    """Log AI video generation activity."""
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


async def _generate_ugc_script(
    product_description: str,
    target_platform: str = "tiktok",
    lang: str = "en",
) -> dict:
    """Generate a UGC-style video script using MiniMax AI.
    
    Returns dict with hook, body, cta sections for OpenShorts.
    """
    if not _MINIMAX_KEY:
        return {
            "hook": {"text": "You NEED to try this!", "b_roll": "product close-up shot"},
            "body": {"text": product_description, "b_roll": "product in use"},
            "cta": {"text": "Link in bio!", "b_roll": "brand logo"},
        }
    
    lang_str = "Arabic (Gulf dialect)" if lang == "ar" else "English"
    system = f"""You are a UGC (User Generated Content) video scriptwriter for {target_platform}.
Language: {lang_str}

Write a script for a UGC-style marketing video. The actor will speak directly
to the camera like a real customer review.

Output a JSON object with THREE sections (hook, body, cta). Each section has:
- text: The spoken narration
- b_roll: A short description of what visual to show behind the speaker

Example format:
{{"hook": {{"text": "Stop scrolling! This changed my life", "b_roll": "product close-up"}},
 "body": {{"text": "I've been using this for 2 weeks and...", "b_roll": "product demo"}},
 "cta": {{"text": "Get yours before they sell out!", "b_roll": "brand logo with price"}}}}

Output ONLY valid JSON. No markdown."""

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
                        {"role": "user", "content": f"Create a UGC video script for: {product_description}"},
                    ],
                    "max_tokens": 800,
                },
            )
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            content = re.sub(r"<think>[\s\S]*?</think>\s*", "", content).strip()
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                parsed = json.loads(json_match.group())
                # Ensure correct format
                if "hook" in parsed and isinstance(parsed["hook"], dict):
                    return parsed
                # Maybe flat format, convert
                return {
                    "hook": {"text": parsed.get("hook", "Check this out!"), "b_roll": "product shot"},
                    "body": {"text": parsed.get("body", product_description), "b_roll": "product demo"},
                    "cta": {"text": parsed.get("cta", "Link in bio!"), "b_roll": "brand logo"},
                }
    except Exception as e:
        print(f"[ai_video] Script generation error: {e}")
    
    return {
        "hook": {"text": "You NEED to try this!", "b_roll": "product close-up"},
        "body": {"text": product_description, "b_roll": "product in use"},
        "cta": {"text": "Link in bio!", "b_roll": "brand logo"},
    }


async def _wait_for_ugc_video(job_id: str, timeout_seconds: int = 600) -> dict:
    """Poll OpenShorts /api/saasshorts/status/{job_id} until complete."""
    start = datetime.now(timezone.utc)
    
    while True:
        elapsed = (datetime.now(timezone.utc) - start).total_seconds()
        if elapsed > timeout_seconds:
            return {"error": "ugc_render_timeout", "job_id": job_id, "elapsed": elapsed}
        
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                resp = await http.get(f"{_OPENSHORTS_URL}/api/saasshorts/status/{job_id}")
                if resp.status_code == 200:
                    data = resp.json()
                    status = data.get("status", "")
                    if status in ("completed", "done", "finished"):
                        return {
                            "success": True,
                            "job_id": job_id,
                            "video_url": data.get("output_url") or data.get("video_url") or data.get("url", ""),
                            "duration": data.get("duration"),
                            "format": "mp4",
                            "status": "completed",
                            "details": data,
                        }
                    elif status in ("failed", "error"):
                        return {"error": "ugc_render_failed", "job_id": job_id, "details": data}
        except Exception:
            pass
        
        await asyncio.sleep(10)


# ─── Core Public API ──────────────────────────────────

async def generate_ugc_video(
    client_id: str,
    product_description: str,
    target_platform: str = "tiktok",
    lang: str = "en",
    actor_style: str = "casual",
    voice_id: str = None,
) -> dict:
    """Generate a UGC-style marketing video with AI actor.
    
    Uses OpenShorts /api/saasshorts/generate endpoint.
    
    Args:
        client_id: Tenant UUID.
        product_description: What the product/service is.
        target_platform: 'tiktok', 'instagram', 'youtube_shorts'.
        lang: Language code ('en', 'ar').
        actor_style: Description of the actor style (e.g., 'casual young woman', 'professional man').
        voice_id: ElevenLabs voice ID (optional, use /api/saasshorts/voices to list).
    
    Returns:
        dict with video_url, duration, format, cost_estimate.
    """
    is_healthy = await _check_service_health()
    
    # Generate script (works even if service is down)
    script = await _generate_ugc_script(product_description, target_platform, lang)
    
    if not is_healthy:
        return {
            "error": "openshorts_service_unavailable",
            "hint": "OpenShorts is not responding. Check: docker logs openshorts-backend",
            "script": script,
            "client_id": client_id,
            "_note": "Script generated successfully. Service not reachable for rendering.",
        }
    
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            # Build request matching SaaSGenerateRequest schema
            payload = {
                "script": script,
                "video_mode": "lowcost",
            }
            
            if voice_id:
                payload["voice_id"] = voice_id
            
            if actor_style:
                payload["actor_description"] = actor_style
            
            resp = await http.post(
                f"{_OPENSHORTS_URL}/api/saasshorts/generate",
                json=payload,
            )
            
            if resp.status_code not in (200, 201, 202):
                return {
                    "error": "ugc_submission_failed",
                    "status_code": resp.status_code,
                    "details": resp.text[:500],
                    "script": script,
                }
            
            data = resp.json()
            job_id = data.get("job_id") or data.get("id", "")
            
            await _log_activity(
                client_id, "ugc_video_started",
                f"UGC video generation started for {target_platform} (lang={lang})",
                {"job_id": job_id, "product": product_description[:100]},
            )
            
            # Wait for completion (2-5 minutes typically)
            result = await _wait_for_ugc_video(job_id)
            
            if result.get("success"):
                await _log_activity(
                    client_id, "ugc_video_completed",
                    f"UGC video completed: {result.get('video_url', '')}",
                    result,
                )
            
            return {
                **result,
                "client_id": client_id,
                "platform": target_platform,
                "lang": lang,
                "script": script,
            }
    
    except Exception as e:
        return {"error": str(e), "client_id": client_id, "script": script}


async def generate_product_showcase(
    client_id: str,
    product_name: str,
    features: list,
    lang: str = "en",
    include_price: str = None,
    target_platform: str = "tiktok",
) -> dict:
    """Generate a product showcase video.
    
    Builds a description from product details and generates a UGC-style
    showcase video. Falls back to short-video-maker if OpenShorts is down.
    
    Args:
        client_id: Tenant UUID.
        product_name: Name of the product/service.
        features: List of key features/benefits.
        lang: Language code.
        include_price: Optional price string.
        target_platform: Target social platform.
    
    Returns:
        dict with video_url, duration, format.
    """
    features_text = ", ".join(features[:6])
    description = f"{product_name} — {features_text}"
    if include_price:
        description += f" (Only {include_price})"
    
    is_healthy = await _check_service_health()
    
    if not is_healthy:
        # Fall back to short-video-maker
        try:
            from video_maker import create_product_video
            return await create_product_video(
                client_id=client_id,
                product_name=product_name,
                description=description,
                price=include_price,
                lang=lang,
            )
        except (ImportError, Exception) as e:
            script = await _generate_ugc_script(description, target_platform, lang)
            return {
                "error": "video_services_unavailable",
                "script": script,
                "client_id": client_id,
                "fallback_error": str(e),
            }
    
    return await generate_ugc_video(
        client_id=client_id,
        product_description=description,
        target_platform=target_platform,
        lang=lang,
        actor_style="professional, product reviewer",
    )


async def get_ugc_job_status(job_id: str) -> dict:
    """Check the status of a UGC video generation job."""
    try:
        async with httpx.AsyncClient(timeout=5) as http:
            resp = await http.get(f"{_OPENSHORTS_URL}/api/saasshorts/status/{job_id}")
            if resp.status_code == 200:
                return resp.json()
            return {"error": "job_not_found", "job_id": job_id, "status_code": resp.status_code}
    except Exception as e:
        return {"error": str(e), "job_id": job_id}


async def get_available_voices() -> dict:
    """Get available TTS voices from OpenShorts."""
    try:
        async with httpx.AsyncClient(timeout=5) as http:
            resp = await http.get(f"{_OPENSHORTS_URL}/api/saasshorts/voices")
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return {"voices": [], "_note": "openshorts_not_reachable"}


async def get_actor_options(
    actor_description: str,
    product_description: str = None,
    num_options: int = 3,
) -> dict:
    """Get AI-generated actor image options based on description.
    
    Args:
        actor_description: Description of desired actor (e.g., 'young woman, casual style').
        product_description: Optional product context.
        num_options: Number of actor options to generate (default 3).
    """
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            payload = {
                "actor_description": actor_description,
                "num_options": num_options,
            }
            if product_description:
                payload["product_description"] = product_description
            
            resp = await http.post(
                f"{_OPENSHORTS_URL}/api/saasshorts/actor-options",
                json=payload,
            )
            if resp.status_code == 200:
                return resp.json()
            return {"error": "actor_generation_failed", "status_code": resp.status_code}
    except Exception as e:
        return {"error": str(e)}


async def get_service_status() -> dict:
    """Get the status of all video generation services."""
    openshorts_healthy = await _check_service_health()
    
    svm_healthy = False
    try:
        from video_maker import _check_service_health as svm_check
        svm_healthy = await svm_check()
    except ImportError:
        pass
    
    # Get available voices if healthy
    voices = []
    if openshorts_healthy:
        v = await get_available_voices()
        voices = v.get("voices", [])
    
    return {
        "openshorts": {
            "status": "running" if openshorts_healthy else "stopped",
            "url": _OPENSHORTS_URL,
            "dashboard": "http://76.13.179.86:5175",
            "capabilities": [
                "ugc_videos", "product_showcases", "ai_actors",
                "lip_sync", "subtitles", "b_roll",
            ] if openshorts_healthy else [],
            "available_voices": len(voices),
            "api_docs": f"{_OPENSHORTS_URL}/docs" if openshorts_healthy else None,
        },
        "short_video_maker": {
            "status": "running" if svm_healthy else "stopped",
            "url": os.environ.get("VIDEO_MAKER_URL", "http://localhost:3123"),
            "ui": "http://76.13.179.86:3123",
            "capabilities": [
                "text_to_video", "captioned_shorts", "product_videos",
                "background_music", "pexels_footage",
            ] if svm_healthy else [],
        },
        "cost_estimates": {
            "ugc_video": "$0.50-1.50 per video (fal.ai + ElevenLabs)",
            "product_showcase": "$0.50-1.50 per video",
            "short_video": "free (local rendering via Remotion)",
        },
    }
