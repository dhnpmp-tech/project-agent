"""On-device TTS via Supertonic v3.

Single FastAPI-callable surface, used by:
  - Outbound WhatsApp voice notes (Kapso accepts OGG opus)
  - Owner brief audio version (future)
  - Demo/preview surfaces

Design notes
------------
- TTS model is initialized once at import time (lazy singleton via _get_tts()).
  First call downloads ~hundreds of MB of ONNX assets from Hugging Face into
  the model cache; subsequent calls are instant.
- Generates 16-bit mono WAV at 24kHz. WhatsApp requires OGG opus, so we
  pipe the WAV through ffmpeg.
- Synthesis is CPU-bound (no GPU dependency). On the current VPS we get
  ~6x real-time, so a 10s voice note takes ~1.6s wall-clock.
- Arabic dialect is whatever the v3 model defaults to (MSA-leaning).
  For Saudi/Gulf dialect quality, the existing `arabic_tts.py` chain
  (Habibi/NAMAA) is the dedicated path — wire that as a fallback later.
"""

from __future__ import annotations

import asyncio
import io
import logging
import os
import subprocess
import tempfile
import time
from typing import Optional

import numpy as np

logger = logging.getLogger("tts")

# Default sample rate from supertonic v3 ONNX models
SAMPLE_RATE = 24_000
DEFAULT_VOICE = os.getenv("TTS_DEFAULT_VOICE", "M1")
DEFAULT_LANG = "en"

# Singleton — first access triggers HF model download.
_tts_instance = None


def _get_tts():
    """Lazy import + initialization of the Supertonic TTS pipeline."""
    global _tts_instance
    if _tts_instance is None:
        from supertonic import TTS  # heavy import; defer until first use
        logger.info("Initializing Supertonic TTS (will download model on first run)")
        _tts_instance = TTS(auto_download=True)
        logger.info("Supertonic TTS ready")
    return _tts_instance


def _wav_bytes_from_array(wav: np.ndarray) -> bytes:
    """Convert a (channels, samples) float ndarray to 16-bit PCM WAV bytes."""
    import wave

    # Supertonic returns shape (1, N) — flatten to mono.
    if wav.ndim == 2:
        wav = wav[0]
    # Clip and convert to int16
    samples = np.clip(wav, -1.0, 1.0)
    samples_i16 = (samples * 32767.0).astype(np.int16)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(samples_i16.tobytes())
    return buf.getvalue()


def _wav_to_ogg_opus(wav_bytes: bytes) -> bytes:
    """Pipe WAV bytes through ffmpeg → OGG opus mono 24kbps.

    Format chosen to match what Kapso/WhatsApp expect for voice notes
    (audio/ogg; codecs=opus).
    """
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as fin:
        fin.write(wav_bytes)
        fin_path = fin.name
    fout_path = fin_path.replace(".wav", ".ogg")
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", fin_path,
                "-c:a", "libopus", "-b:a", "24k", "-vbr", "on",
                "-ac", "1", "-ar", "24000",
                fout_path,
            ],
            capture_output=True,
            timeout=30,
        )
        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg failed: {result.stderr.decode()[:200]}")
        with open(fout_path, "rb") as f:
            return f.read()
    finally:
        for p in (fin_path, fout_path):
            try:
                os.unlink(p)
            except OSError:
                pass


def _synthesize_sync(text: str, lang: str = DEFAULT_LANG, voice: str = DEFAULT_VOICE) -> tuple[bytes, float, float]:
    """Synchronous synthesis. Returns (wav_bytes, audio_duration_s, wall_s)."""
    tts = _get_tts()
    style = tts.get_voice_style(voice_name=voice)

    t0 = time.time()
    result = tts.synthesize(text, voice_style=style, lang=lang)
    wall_s = time.time() - t0

    wav = result[0] if isinstance(result, tuple) else result
    audio_s = (wav.shape[-1] if hasattr(wav, "shape") else len(wav)) / SAMPLE_RATE
    wav_bytes = _wav_bytes_from_array(wav)
    return wav_bytes, audio_s, wall_s


async def synthesize(
    text: str,
    lang: str = DEFAULT_LANG,
    voice: str = DEFAULT_VOICE,
    format: str = "ogg",
) -> dict:
    """Async wrapper. Returns {audio_bytes, mime, duration_s, wall_s}.

    `format` is "wav" or "ogg" (default — WhatsApp-ready).
    """
    if not text or not text.strip():
        raise ValueError("text is empty")
    if len(text) > 2_000:
        raise ValueError(f"text too long ({len(text)} > 2000)")

    loop = asyncio.get_running_loop()
    wav_bytes, audio_s, wall_s = await loop.run_in_executor(
        None, _synthesize_sync, text, lang, voice
    )

    if format == "wav":
        return {
            "audio_bytes": wav_bytes,
            "mime": "audio/wav",
            "duration_s": audio_s,
            "wall_s": wall_s,
        }
    # Default OGG opus
    t0 = time.time()
    ogg_bytes = await loop.run_in_executor(None, _wav_to_ogg_opus, wav_bytes)
    convert_s = time.time() - t0
    return {
        "audio_bytes": ogg_bytes,
        "mime": "audio/ogg; codecs=opus",
        "duration_s": audio_s,
        "wall_s": wall_s + convert_s,
    }
