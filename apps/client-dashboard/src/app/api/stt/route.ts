import { NextResponse } from "next/server";

/**
 * POST /api/stt — Speech-to-Text endpoint
 *
 * Called by n8n workflows when a WhatsApp voice message is received.
 * Downloads the audio from the provided URL and transcribes it using
 * Groq's free Whisper API.
 *
 * Request: { audioUrl: string, language?: string }
 * Response: { text: string, language: string, duration: number }
 *
 * Auth: Requires SUPABASE_SERVICE_ROLE_KEY in Authorization header.
 */
export async function POST(request: Request) {
  // Auth check — only n8n / service role can call this
  const authHeader = request.headers.get("authorization");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.audioUrl) {
    return NextResponse.json({ error: "audioUrl is required" }, { status: 400 });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured. Get a free key at console.groq.com" },
      { status: 503 }
    );
  }

  try {
    // Download audio from the provided URL
    const audioResponse = await fetch(body.audioUrl);
    if (!audioResponse.ok) {
      return NextResponse.json(
        { error: `Failed to download audio: ${audioResponse.status}` },
        { status: 502 }
      );
    }

    const audioBlob = await audioResponse.blob();

    // Send to Groq Whisper for transcription
    const formData = new FormData();
    formData.append("file", audioBlob, "voice.ogg");
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("response_format", "verbose_json");
    if (body.language) {
      formData.append("language", body.language);
    }

    const sttResponse = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}` },
        body: formData,
      }
    );

    if (!sttResponse.ok) {
      const errText = await sttResponse.text().catch(() => "Unknown");
      console.error("[stt] Groq Whisper error:", sttResponse.status, errText);
      return NextResponse.json(
        { error: `Transcription failed: ${sttResponse.status}` },
        { status: 502 }
      );
    }

    const result = await sttResponse.json();

    return NextResponse.json({
      text: result.text || "",
      language: result.language || "unknown",
      duration: result.duration || 0,
    });
  } catch (err) {
    console.error("[stt] Error:", err);
    return NextResponse.json(
      { error: "Speech-to-text processing failed" },
      { status: 500 }
    );
  }
}
