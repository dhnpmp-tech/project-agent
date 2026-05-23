"""Arabic TTS — Multi-provider Arabic dialect voice synthesis.

Provider priority:
  1. Habibi-TTS via HuggingFace Space (chenxie95/Habibi-TTS) — Gradio API, GPU-backed, free
  2. NAMAA-Saudi-TTS via HuggingFace Space (omarelshehy/NAMAA-Saudi-Voice) — Saudi dialect
  3. SILMA TTS API — commercial, Saudi + MSA
  4. MiniMax TTS — fallback for any language

Supports 12 Arabic dialects: MSA, SAU, UAE, ALG, IRQ, EGY, MAR, OMN, TUN, LEV, SDN, LBY.
Voice cloning via reference audio (Habibi-TTS supports zero-shot cloning from F5-TTS).
"""

import os
import io
import asyncio
import httpx
import base64
import logging
import tempfile
from pathlib import Path
from typing import Optional

logger = logging.getLogger("arabic_tts")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

HF_TOKEN = os.getenv("HF_TOKEN", "")

# Habibi-TTS Gradio Space (GPU-backed on HF, free tier)
HABIBI_SPACE_URL = "https://chenxie95-habibi-tts.hf.space"

# NAMAA-Saudi-TTS Gradio Space
NAMAA_SPACE_URL = "https://omarelshehy-namaa-saudi-voice.hf.space"

# SILMA TTS API (commercial)
SILMA_API_URL = os.getenv("SILMA_API_URL", "")
SILMA_API_KEY = os.getenv("SILMA_API_KEY", "")

# MiniMax fallback
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY", "")
MINIMAX_GROUP_ID = os.getenv("MINIMAX_GROUP_ID", "")

# Dialect → provider routing
DIALECT_NAMES = {
    "MSA": "Modern Standard Arabic",
    "SAU": "Saudi",
    "UAE": "Emirati / Gulf",
    "GLF": "Gulf",
    "ALG": "Algerian",
    "IRQ": "Iraqi",
    "EGY": "Egyptian",
    "MAR": "Moroccan",
    "OMN": "Omani",
    "TUN": "Tunisian",
    "LEV": "Levantine",
    "SDN": "Sudanese",
    "LBY": "Libyan",
}

# Dialects that NAMAA handles better than generic Habibi
NAMAA_PREFERRED_DIALECTS = {"SAU"}

# Reference audio assets (shipped with the project)
DEFAULT_REF_DIR = Path(__file__).parent / "assets" / "arabic_ref_audio"


# ---------------------------------------------------------------------------
# Habibi-TTS via Gradio Client (HuggingFace Space)
# ---------------------------------------------------------------------------

async def _habibi_tts(
    text: str,
    dialect: str = "SAU",
    ref_audio_path: Optional[str] = None,
    ref_text: Optional[str] = None,
    speed: float = 1.0,
) -> Optional[bytes]:
    """Call Habibi-TTS via the Gradio Space API.

    The Space at chenxie95/Habibi-TTS runs on a HuggingFace GPU backend.
    We use the gradio_client library for proper Gradio API calls.
    Falls back to HTTP POST if gradio_client is unavailable.
    """
    try:
        from gradio_client import Client, handle_file

        client = Client(
            "chenxie95/Habibi-TTS",
            hf_token=HF_TOKEN or None,
        )

        # Prepare reference audio — use dialect default if none provided
        if not ref_audio_path:
            default_ref = DEFAULT_REF_DIR / f"{dialect}.mp3"
            if default_ref.exists():
                ref_audio_path = str(default_ref)

        # Build kwargs for the predict call
        kwargs = {
            "gen_text": text,
        }
        if dialect:
            kwargs["dialect"] = dialect
        if ref_audio_path:
            kwargs["ref_audio"] = handle_file(ref_audio_path)
        if ref_text:
            kwargs["ref_text"] = ref_text

        # Run prediction (blocking in thread to stay async)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, lambda: client.predict(**kwargs))

        # Result is typically a file path to generated audio
        if isinstance(result, str) and Path(result).exists():
            return Path(result).read_bytes()
        elif isinstance(result, (tuple, list)):
            # Some Gradio apps return (filepath, ...)
            for item in result:
                if isinstance(item, str) and Path(item).exists():
                    return Path(item).read_bytes()
        elif isinstance(result, bytes):
            return result

        logger.warning("Habibi-TTS returned unexpected result type: %s", type(result))
        return None

    except ImportError:
        logger.warning("gradio_client not installed, trying HTTP fallback")
        return await _habibi_tts_http(text, dialect, ref_audio_path, speed)
    except Exception as e:
        logger.error("Habibi-TTS Gradio call failed: %s", e)
        return None


async def _habibi_tts_http(
    text: str,
    dialect: str = "SAU",
    ref_audio_path: Optional[str] = None,
    speed: float = 1.0,
) -> Optional[bytes]:
    """Fallback: call Habibi-TTS Space via raw HTTP POST to Gradio API."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Step 1: Submit prediction
            payload = {
                "data": [
                    text,       # gen_text
                    dialect,    # dialect
                    None,       # ref_audio (skip if no path)
                    "",         # ref_text
                ],
            }

            resp = await client.post(
                f"{HABIBI_SPACE_URL}/api/predict",
                json=payload,
                headers={"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {},
            )

            if resp.status_code != 200:
                logger.error("Habibi HTTP API returned %d: %s", resp.status_code, resp.text[:200])
                return None

            result = resp.json()
            # Gradio returns {"data": [{"path": "...", ...}]} or similar
            data = result.get("data", [])
            if data and isinstance(data[0], dict) and "path" in data[0]:
                file_url = data[0]["path"]
                if not file_url.startswith("http"):
                    file_url = f"{HABIBI_SPACE_URL}/file={file_url}"
                audio_resp = await client.get(file_url)
                if audio_resp.status_code == 200:
                    return audio_resp.content

            return None
    except Exception as e:
        logger.error("Habibi HTTP fallback failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# NAMAA-Saudi-TTS via Gradio Space
# ---------------------------------------------------------------------------

async def _namaa_tts(
    text: str,
    ref_audio_path: Optional[str] = None,
    speed: float = 1.0,
) -> Optional[bytes]:
    """Call NAMAA-Saudi-TTS via its HuggingFace Space.

    Best for Saudi dialect (SAU). Uses Chatterbox architecture.
    """
    try:
        from gradio_client import Client, handle_file

        client = Client(
            "omarelshehy/NAMAA-Saudi-Voice",
            hf_token=HF_TOKEN or None,
        )

        kwargs = {"text": text}
        if ref_audio_path:
            kwargs["audio_prompt"] = handle_file(ref_audio_path)

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, lambda: client.predict(**kwargs))

        if isinstance(result, str) and Path(result).exists():
            return Path(result).read_bytes()
        elif isinstance(result, (tuple, list)):
            for item in result:
                if isinstance(item, str) and Path(item).exists():
                    return Path(item).read_bytes()
        elif isinstance(result, bytes):
            return result

        return None
    except ImportError:
        logger.warning("gradio_client not installed, cannot call NAMAA Space")
        return None
    except Exception as e:
        logger.error("NAMAA-TTS failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# SILMA TTS (commercial API)
# ---------------------------------------------------------------------------

async def _silma_tts(
    text: str,
    dialect: str = "SAU",
    speed: float = 1.0,
) -> Optional[bytes]:
    """Call SILMA TTS commercial API. Supports MSA and Saudi."""
    if not SILMA_API_URL or not SILMA_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                SILMA_API_URL,
                json={
                    "text": text,
                    "dialect": dialect.lower(),
                    "speed": speed,
                },
                headers={
                    "Authorization": f"Bearer {SILMA_API_KEY}",
                    "Content-Type": "application/json",
                },
            )
            if resp.status_code == 200:
                return resp.content
            logger.error("SILMA TTS returned %d", resp.status_code)
            return None
    except Exception as e:
        logger.error("SILMA TTS failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# MiniMax TTS (fallback — generic Arabic)
# ---------------------------------------------------------------------------

async def _minimax_tts(text: str, voice_id: str = "Arabic_Female_1") -> Optional[bytes]:
    """MiniMax TTS fallback. Produces generic Arabic without dialect nuance."""
    if not MINIMAX_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"https://api.minimax.chat/v1/t2a_v2?GroupId={MINIMAX_GROUP_ID}",
                json={
                    "model": "speech-01-turbo",
                    "text": text,
                    "voice_setting": {
                        "voice_id": voice_id,
                        "speed": 1.0,
                        "vol": 1.0,
                        "pitch": 0,
                    },
                    "audio_setting": {
                        "sample_rate": 32000,
                        "bitrate": 128000,
                        "format": "mp3",
                    },
                },
                headers={
                    "Authorization": f"Bearer {MINIMAX_API_KEY}",
                    "Content-Type": "application/json",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                if "data" in data and "audio" in data["data"]:
                    audio_hex = data["data"]["audio"]
                    return bytes.fromhex(audio_hex)
            logger.error("MiniMax TTS returned %d", resp.status_code)
            return None
    except Exception as e:
        logger.error("MiniMax TTS failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_arabic_speech(
    text: str,
    dialect: str = "SAU",
    voice_ref: str = "",
    speed: float = 1.0,
) -> bytes:
    """Generate Arabic speech with dialect-aware provider routing.

    Provider priority:
      1. NAMAA-Saudi-TTS for SAU dialect (best Saudi quality)
      2. Habibi-TTS for all 12 dialects (zero-shot, F5-TTS based)
      3. SILMA TTS commercial API
      4. MiniMax TTS fallback (generic Arabic)

    Args:
        text: Arabic text to synthesize
        dialect: SAU, UAE/GLF, EGY, MSA, ALG, IRQ, MAR, OMN, TUN, LEV, SDN, LBY
        voice_ref: Path or URL to reference audio for voice cloning (optional)
        speed: Speech speed multiplier (0.5 - 2.0)

    Returns:
        Raw audio bytes (wav or mp3 depending on provider)

    Raises:
        RuntimeError: If all providers fail
    """
    # Normalize dialect code
    dialect = dialect.upper().strip()
    if dialect == "GLF":
        dialect = "UAE"  # Map Gulf → UAE for Habibi

    ref_path = voice_ref if voice_ref else None

    errors = []

    # --- Route 1: NAMAA for Saudi dialect ---
    if dialect in NAMAA_PREFERRED_DIALECTS:
        logger.info("Trying NAMAA-Saudi-TTS for dialect=%s", dialect)
        audio = await _namaa_tts(text, ref_audio_path=ref_path, speed=speed)
        if audio:
            logger.info("NAMAA-Saudi-TTS succeeded (%d bytes)", len(audio))
            return audio
        errors.append("NAMAA-Saudi-TTS failed")

    # --- Route 2: Habibi-TTS (all dialects) ---
    logger.info("Trying Habibi-TTS for dialect=%s", dialect)
    audio = await _habibi_tts(text, dialect=dialect, ref_audio_path=ref_path, speed=speed)
    if audio:
        logger.info("Habibi-TTS succeeded (%d bytes)", len(audio))
        return audio
    errors.append("Habibi-TTS failed")

    # --- Route 3: SILMA TTS ---
    if SILMA_API_KEY:
        logger.info("Trying SILMA TTS")
        audio = await _silma_tts(text, dialect=dialect, speed=speed)
        if audio:
            logger.info("SILMA TTS succeeded (%d bytes)", len(audio))
            return audio
        errors.append("SILMA TTS failed")

    # --- Route 4: MiniMax fallback ---
    logger.info("Falling back to MiniMax TTS (generic Arabic)")
    audio = await _minimax_tts(text)
    if audio:
        logger.info("MiniMax TTS fallback succeeded (%d bytes)", len(audio))
        return audio
    errors.append("MiniMax TTS failed")

    raise RuntimeError(
        f"All Arabic TTS providers failed for dialect={dialect}. "
        f"Errors: {'; '.join(errors)}. "
        f"Text: {text[:80]}..."
    )


async def clone_voice(reference_audio: bytes, name: str) -> str:
    """Clone a voice from a short audio sample for later use.

    Saves the reference audio locally and returns a voice_id (file path)
    that can be passed as voice_ref to generate_arabic_speech().

    Habibi-TTS (F5-TTS based) does zero-shot voice cloning — it doesn't need
    pre-registration. The reference audio IS the voice ID.

    Args:
        reference_audio: Raw audio bytes (wav/mp3, 5-30 seconds recommended)
        name: Human-readable name for this voice (e.g., "nadia_gulf")

    Returns:
        voice_id string (path to saved reference audio)
    """
    voice_dir = Path(__file__).parent / "voices" / "arabic"
    voice_dir.mkdir(parents=True, exist_ok=True)

    # Determine format from magic bytes
    ext = "wav"
    if reference_audio[:3] == b"ID3" or reference_audio[:2] == b"\xff\xfb":
        ext = "mp3"
    elif reference_audio[:4] == b"fLaC":
        ext = "flac"

    safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in name)
    voice_path = voice_dir / f"{safe_name}.{ext}"
    voice_path.write_bytes(reference_audio)

    logger.info("Voice cloned and saved: %s (%d bytes)", voice_path, len(reference_audio))
    return str(voice_path)


async def list_dialects() -> dict:
    """Return available dialects with provider availability."""
    return {
        code: {
            "name": name,
            "providers": _get_providers_for_dialect(code),
        }
        for code, name in DIALECT_NAMES.items()
    }


def _get_providers_for_dialect(dialect: str) -> list[str]:
    """Return which providers support a given dialect."""
    providers = []
    if dialect in NAMAA_PREFERRED_DIALECTS:
        providers.append("NAMAA-Saudi-TTS")
    # Habibi supports all 12 dialects
    providers.append("Habibi-TTS")
    if SILMA_API_KEY and dialect in ("MSA", "SAU"):
        providers.append("SILMA")
    if MINIMAX_API_KEY:
        providers.append("MiniMax (fallback)")
    return providers


# ---------------------------------------------------------------------------
# CLI test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    text = sys.argv[1] if len(sys.argv) > 1 else "مرحبا، كيف حالك اليوم؟"
    dialect = sys.argv[2] if len(sys.argv) > 2 else "SAU"

    async def _main():
        print(f"Generating Arabic speech: dialect={dialect}")
        print(f"Text: {text}")
        try:
            audio = await generate_arabic_speech(text, dialect=dialect)
            out_path = f"/tmp/arabic_tts_test_{dialect}.wav"
            Path(out_path).write_bytes(audio)
            print(f"Audio saved to {out_path} ({len(audio)} bytes)")
        except RuntimeError as e:
            print(f"Error: {e}")

        print("\nAvailable dialects:")
        dialects = await list_dialects()
        for code, info in dialects.items():
            print(f"  {code}: {info['name']} — providers: {', '.join(info['providers'])}")

    asyncio.run(_main())
