"""Voice Note Processing — STT (Groq Whisper) + TTS (MiniMax Speech)

Handles:
1. Transcribing incoming voice notes (ogg/opus -> text via Groq Whisper)
2. Generating voice replies (text -> ogg/opus via MiniMax TTS + ffmpeg)
3. Downloading/uploading media via Kapso
"""

import os
import json
import re
import base64
import httpx
import tempfile
import subprocess
from datetime import datetime, timezone

_GROQ_KEY = os.environ.get("GROQ_API_KEY", "")
_MINIMAX_KEY = os.environ.get("MINIMAX_API_KEY", "")
_KAPSO_KEY = os.environ.get("KAPSO_PLATFORM_API_KEY", "")

# MiniMax TTS voice IDs — configurable per client persona
# See https://platform.minimax.io/docs/api-reference/speech-t2a-intro
VOICE_MAP = {
    "nadia": "female-shaanxi",       # placeholder — configured per client
    "default_female_en": "Wise_Woman",
    "default_female_ar": "female-shaanxi",
    "default_male_en": "male-qn-qingse",
    "default_male_ar": "male-qn-qingse",
}


async def download_voice_note(media_id: str, phone_number_id: str = "") -> bytes:
    """Download a voice note from WhatsApp via Kapso.

    Two-step process:
    1. GET media URL from Kapso using media_id
    2. Download the binary audio data

    Returns: raw ogg/opus bytes
    """
    if not _KAPSO_KEY:
        return b""

    try:
        async with httpx.AsyncClient(timeout=15) as http:
            print(f"[voice] Downloading media_id={media_id}, phone_number_id={phone_number_id}")

            # Step 1: Get media info + download URL from Kapso
            r = await http.get(
                f"https://api.kapso.ai/meta/whatsapp/v24.0/{media_id}?phone_number_id={phone_number_id}",
                headers={"X-API-Key": _KAPSO_KEY},
            )
            if r.status_code != 200:
                print(f"[voice] Media info fetch failed: {r.status_code} {r.text[:100]}")
                return b""

            media_info = r.json()
            # Kapso returns a download_url (signed token URL) — use that first
            download_url = media_info.get("download_url", "") or media_info.get("url", "")
            if not download_url:
                print(f"[voice] No download URL in response: {list(media_info.keys())}")
                return b""

            print(f"[voice] Downloading from: {download_url[:80]}...")

            # Step 2: Download binary audio
            r2 = await http.get(download_url)
            if r2.status_code == 200 and len(r2.content) > 100:
                print(f"[voice] Downloaded {len(r2.content)} bytes ({media_info.get('mime_type', '?')})")
                return r2.content
            else:
                print(f"[voice] Download failed: {r2.status_code}, size={len(r2.content)}")
                return b""
    except Exception as e:
        print(f"[voice] Download error: {e}")
        return b""


async def transcribe_audio(audio_bytes: bytes, language: str = "") -> str:
    """Transcribe audio using faster-whisper (local) or Groq API (cloud).

    Tries local faster-whisper first (free, no API key needed).
    Falls back to Groq Whisper if local fails.

    Args:
        audio_bytes: Raw audio data (ogg/opus)
        language: Optional language hint ("ar" or "en"). Empty = auto-detect.

    Returns: Transcribed text
    """
    if not audio_bytes:
        return ""

    temp_path = ""
    try:
        with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name

        # Method 1: Local faster-whisper (free, no API key)
        try:
            from faster_whisper import WhisperModel
            print("[voice] Using local faster-whisper...")
            model = WhisperModel("base", device="cpu", compute_type="int8")
            segments, info = model.transcribe(
                temp_path,
                language=language if language else None,
                beam_size=3,
            )
            transcript = " ".join(seg.text for seg in segments).strip()
            if transcript:
                print(f"[voice] Local transcribed ({info.language}): {transcript[:80]}")
                return transcript
            print("[voice] Local transcription returned empty, trying cloud...")
        except ImportError:
            print("[voice] faster-whisper not installed, trying cloud...")
        except Exception as e:
            print(f"[voice] Local STT error: {e}, trying cloud...")

        # Method 2: Groq Whisper API (cloud, needs key)
        if not _GROQ_KEY:
            print("[voice] No GROQ_API_KEY, no cloud fallback available")
            return ""

        async with httpx.AsyncClient(timeout=30) as http:
            with open(temp_path, "rb") as f:
                files = {"file": ("voice.ogg", f, "audio/ogg")}
                data = {
                    "model": "whisper-large-v3-turbo",
                    "response_format": "text",
                }
                if language:
                    data["language"] = language

                r = await http.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {_GROQ_KEY}"},
                    files=files,
                    data=data,
                )

                if r.status_code == 200:
                    transcript = r.text.strip()
                    print(f"[voice] Cloud transcribed: {transcript[:80]}")
                    return transcript
                else:
                    print(f"[voice] Transcription failed: {r.status_code} {r.text[:100]}")
                    return ""
    except Exception as e:
        print(f"[voice] Transcription error: {e}")
        return ""
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


async def generate_speech(text: str, voice_id: str = "default_female_en", speed: float = 1.0) -> bytes:
    """Generate speech audio from text using MiniMax TTS.

    Args:
        text: The text to convert to speech
        voice_id: MiniMax voice ID or key from VOICE_MAP
        speed: Speech speed (0.5 = slow, 1.0 = normal, 2.0 = fast)

    Returns: Raw MP3 audio bytes (needs conversion to ogg/opus for WhatsApp)
    """
    if not _MINIMAX_KEY:
        print("[voice] MINIMAX_API_KEY not set")
        return b""

    # Resolve voice ID from map
    actual_voice = VOICE_MAP.get(voice_id, voice_id)

    try:
        async with httpx.AsyncClient(timeout=30) as http:
            r = await http.post(
                "https://api.minimax.io/v1/t2a_v2",
                headers={
                    "Authorization": f"Bearer {_MINIMAX_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "speech-2.8-hd",
                    "text": text,
                    "stream": False,
                    "voice_setting": {
                        "voice_id": actual_voice,
                        "speed": speed,
                    },
                    "audio_setting": {
                        "sample_rate": 32000,
                        "bitrate": 128000,
                        "format": "mp3",
                        "channel": 1,
                    },
                },
            )

            if r.status_code == 200:
                result = r.json()
                # MiniMax returns base64 audio in the response
                audio_raw = result.get("data", {}).get("audio", "")
                if audio_raw:
                    # MiniMax returns hex-encoded audio, not base64
                    try:
                        audio_bytes = bytes.fromhex(audio_raw)
                        print(f"[voice] Decoded hex audio: {len(audio_bytes)} bytes")
                    except ValueError:
                        # Fallback to base64
                        padding = len(audio_raw) % 4
                        if padding:
                            audio_raw += "=" * (4 - padding)
                        audio_bytes = base64.b64decode(audio_raw)
                        print(f"[voice] Decoded base64 audio: {len(audio_bytes)} bytes")
                    print(f"[voice] Generated {len(audio_bytes)} bytes of speech")
                    return audio_bytes

                # Or it might return a URL
                audio_url = result.get("data", {}).get("audio_url", "")
                if audio_url:
                    r2 = await http.get(audio_url)
                    return r2.content if r2.status_code == 200 else b""

                print(f"[voice] TTS response: {json.dumps(result)[:200]}")
                return b""
            else:
                print(f"[voice] TTS failed: {r.status_code} {r.text[:200]}")
                return b""
    except Exception as e:
        print(f"[voice] TTS error: {e}")
        return b""


def convert_to_ogg_opus(mp3_bytes: bytes) -> bytes:
    """Convert MP3 audio to OGG/Opus format required by WhatsApp.
    Uses ffmpeg subprocess.
    """
    if not mp3_bytes:
        return b""

    input_path = ""
    output_path = ""
    try:
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as fin:
            fin.write(mp3_bytes)
            input_path = fin.name

        output_path = input_path.replace(".mp3", ".ogg")

        result = subprocess.run(
            [
                "ffmpeg", "-y", "-i", input_path,
                "-c:a", "libopus", "-b:a", "32k", "-ar", "48000",
                output_path,
            ],
            capture_output=True,
            timeout=10,
        )

        if result.returncode == 0 and os.path.exists(output_path):
            with open(output_path, "rb") as f:
                ogg_bytes = f.read()
            print(f"[voice] Converted to OGG: {len(ogg_bytes)} bytes")
            return ogg_bytes
        else:
            print(f"[voice] ffmpeg error: {result.stderr.decode()[:200]}")
            return b""
    except Exception as e:
        print(f"[voice] Conversion error: {e}")
        return b""
    finally:
        if input_path and os.path.exists(input_path):
            os.unlink(input_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)


async def send_voice_note(phone_number_id: str, to_phone: str, audio_bytes: bytes) -> bool:
    """Upload audio and send as a WhatsApp voice note via Kapso.

    The audio must be in ogg/opus format.
    """
    if not _KAPSO_KEY or not audio_bytes:
        return False

    try:
        # Upload the audio file to get a media_id
        async with httpx.AsyncClient(timeout=15) as http:
            files = {"file": ("voice.ogg", audio_bytes, "audio/ogg")}
            r = await http.post(
                f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/media",
                headers={"X-API-Key": _KAPSO_KEY},
                files=files,
                data={"messaging_product": "whatsapp", "type": "audio/ogg"},
            )

            if r.status_code not in (200, 201):
                print(f"[voice] Media upload failed: {r.status_code} {r.text[:100]}")
                return False

            media_id = r.json().get("id", "")
            if not media_id:
                print("[voice] No media_id returned from upload")
                return False

        # Send the voice note
        async with httpx.AsyncClient(timeout=15) as http:
            r2 = await http.post(
                f"https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages",
                headers={"X-API-Key": _KAPSO_KEY, "Content-Type": "application/json"},
                json={
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": to_phone,
                    "type": "audio",
                    "audio": {
                        "id": media_id,
                    },
                },
            )

            success = r2.status_code in (200, 201)
            if success:
                print(f"[voice] Voice note sent to {to_phone}")
            else:
                print(f"[voice] Send failed: {r2.status_code} {r2.text[:100]}")
            return success
    except Exception as e:
        print(f"[voice] Send error: {e}")
        return False


async def process_inbound_voice(
    media_id: str,
    phone_number_id: str,
) -> dict:
    """Download and transcribe an incoming voice note.

    Returns: {transcript: str, language_detected: str, duration_estimate: float, error: str}
    """
    # Download
    audio_bytes = await download_voice_note(media_id, phone_number_id)
    if not audio_bytes:
        return {"transcript": "", "language_detected": "", "duration_estimate": 0, "error": "download_failed"}

    # Estimate duration (ogg/opus is roughly 4KB per second)
    duration_estimate = len(audio_bytes) / 4000

    # Transcribe
    transcript = await transcribe_audio(audio_bytes)
    if not transcript:
        return {"transcript": "", "language_detected": "", "duration_estimate": round(duration_estimate, 1), "error": "transcription_failed"}

    # Detect language from transcript
    arabic_chars = len(re.findall(r'[\u0600-\u06FF]', transcript))
    total_chars = len(transcript.replace(" ", "")) or 1
    language = "ar" if arabic_chars > total_chars * 0.3 else "en"

    return {
        "transcript": transcript,
        "language_detected": language,
        "duration_estimate": round(duration_estimate, 1),
        "error": "",
    }


async def generate_and_send_voice_reply(
    reply_text: str,
    phone: str,
    phone_number_id: str,
    voice_id: str = "default_female_en",
    lang: str = "en",
) -> bool:
    """Generate a voice reply from text and send it as a WhatsApp voice note.

    Called AFTER the text pipeline generates a reply.
    The text reply is sent separately by the main pipeline.
    This adds a voice note as a follow-up.
    """
    # Pick voice based on language
    if lang == "ar" and voice_id.startswith("default_"):
        voice = "default_female_ar"
    else:
        voice = voice_id

    # Generate speech
    mp3_bytes = await generate_speech(reply_text, voice)
    if not mp3_bytes:
        print("[voice] TTS failed, text-only reply")
        return False

    # Convert to ogg/opus
    ogg_bytes = convert_to_ogg_opus(mp3_bytes)
    if not ogg_bytes:
        print("[voice] Conversion failed, text-only reply")
        return False

    # Send voice note
    return await send_voice_note(phone_number_id, phone, ogg_bytes)


def get_voice_for_client(crawl_data: dict) -> str:
    """Get the configured voice ID for a client's AI persona.
    Stored in crawl_data.persona.voice_id
    Falls back to defaults based on language.
    """
    persona = crawl_data.get("persona", {})
    voice_id = persona.get("voice_id", "")
    if voice_id:
        return voice_id

    # Detect language from persona voice_prompt
    voice_prompt = persona.get("voice_prompt", "")
    arabic = len(re.findall(r'[\u0600-\u06FF]', voice_prompt))
    if arabic > len(voice_prompt) * 0.3:
        return "default_female_ar"
    return "default_female_en"
