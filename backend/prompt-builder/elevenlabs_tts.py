"""ElevenLabs TTS — per-business premium voice for customer agents.

Why this module exists separately from voice.py: voice.py is already
the routing/sending layer (MP3 → OGG, Kapso upload, inbound transcription).
This module owns ONE thing — turning text into MP3 bytes via ElevenLabs.
voice.py picks the provider based on the tenant's voice_id prefix.

Provider prefix convention used across the codebase:
    el:<voice_id>   → this module (ElevenLabs)
    mm:<voice_id>   → MiniMax (voice.generate_speech)
    default_*       → MiniMax fallback voices baked into VOICE_MAP
    <bare voice_id> → MiniMax (legacy behavior preserved)

Cost note: eleven_multilingual_v2 is ~$0.30/1k chars; eleven_flash_v2_5
is ~$0.18/1k chars and ~3× faster. We default to flash for daily traffic
and let tenants override per-business via `voice_settings.model_id`.
"""

from __future__ import annotations

import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger("elevenlabs_tts")

_ELEVENLABS_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
_ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"

# Sensible defaults — overridable per-tenant via crawl_data.persona.voice_settings.
DEFAULT_MODEL = "eleven_flash_v2_5"          # speed + multilingual, cheaper than v2_multilingual
DEFAULT_STABILITY = 0.5                       # 0=expressive, 1=monotone — 0.5 is the docs' sweet spot
DEFAULT_SIMILARITY_BOOST = 0.75               # how strongly to match the source-voice timbre
DEFAULT_STYLE = 0.0                           # 0 to stay close to base voice
DEFAULT_USE_SPEAKER_BOOST = True


def is_configured() -> bool:
    """True when the API key is set. Callers should check this before
    constructing an el: voice_id, so they can fall back gracefully."""
    return bool(_ELEVENLABS_KEY)


async def generate_speech(
    text: str,
    voice_id: str,
    model_id: str = DEFAULT_MODEL,
    stability: float = DEFAULT_STABILITY,
    similarity_boost: float = DEFAULT_SIMILARITY_BOOST,
    style: float = DEFAULT_STYLE,
    use_speaker_boost: bool = DEFAULT_USE_SPEAKER_BOOST,
    output_format: str = "mp3_44100_128",
) -> bytes:
    """Synthesize speech via ElevenLabs.

    Returns raw audio bytes in the requested format. voice.py converts
    the resulting MP3 to OGG/Opus for WhatsApp. Returns b"" on failure
    so the caller can fall back to a cheaper provider rather than crash.

    Args:
        text: input text (caller is responsible for any sanitization)
        voice_id: ElevenLabs voice ID (e.g. "EXAVITQu4vr4xnSDxMaL"),
            without the "el:" prefix — that prefix is for the routing
            layer only, not the API call
        model_id: ElevenLabs model — eleven_flash_v2_5 (default) is
            multilingual + fast; eleven_multilingual_v2 is higher
            quality + 2× cost
        output_format: "mp3_44100_128" is WhatsApp-compatible after ffmpeg;
            see ElevenLabs docs for other formats
    """
    if not _ELEVENLABS_KEY:
        logger.warning("ELEVENLABS_API_KEY not set — cannot synthesize")
        return b""
    if not voice_id:
        logger.warning("voice_id missing — cannot synthesize")
        return b""
    if not text:
        return b""

    try:
        async with httpx.AsyncClient(timeout=30) as http:
            r = await http.post(
                f"{_ELEVENLABS_BASE}/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": _ELEVENLABS_KEY,
                    "Accept": "audio/mpeg",
                    "Content-Type": "application/json",
                },
                params={"output_format": output_format},
                json={
                    "text": text,
                    "model_id": model_id,
                    "voice_settings": {
                        "stability": stability,
                        "similarity_boost": similarity_boost,
                        "style": style,
                        "use_speaker_boost": use_speaker_boost,
                    },
                },
            )
            if r.status_code == 200:
                logger.info(
                    "[elevenlabs] synth ok: voice=%s model=%s bytes=%d",
                    voice_id, model_id, len(r.content),
                )
                return r.content
            logger.warning(
                "[elevenlabs] synth failed: %d %s",
                r.status_code, r.text[:200],
            )
            return b""
    except Exception as e:
        logger.warning("[elevenlabs] synth exception: %s", e)
        return b""


async def list_voices() -> list[dict]:
    """List voices available to this account (for admin UI / debugging)."""
    if not _ELEVENLABS_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(
                f"{_ELEVENLABS_BASE}/voices",
                headers={"xi-api-key": _ELEVENLABS_KEY},
            )
            if r.status_code == 200:
                return (r.json() or {}).get("voices", [])
            return []
    except Exception as e:
        logger.warning("[elevenlabs] list_voices failed: %s", e)
        return []


def parse_provider_voice(voice_id: str) -> tuple[str, str]:
    """Split a routing-prefixed voice_id into (provider, raw_voice_id).

    Examples:
        parse_provider_voice("el:EXAVITQu4vr4xnSDxMaL") -> ("elevenlabs", "EXAVITQu4vr4xnSDxMaL")
        parse_provider_voice("mm:female-shaonv")       -> ("minimax", "female-shaonv")
        parse_provider_voice("default_female_en")      -> ("minimax", "default_female_en")
        parse_provider_voice("")                       -> ("minimax", "")
    """
    if not voice_id:
        return ("minimax", "")
    if voice_id.startswith("el:"):
        return ("elevenlabs", voice_id[3:])
    if voice_id.startswith("mm:"):
        return ("minimax", voice_id[3:])
    return ("minimax", voice_id)
