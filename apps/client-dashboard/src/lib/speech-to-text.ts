/**
 * Speech-to-Text utility for processing WhatsApp voice messages.
 *
 * Uses Groq's free Whisper API (whisper-large-v3-turbo) for transcription.
 * Supports Arabic, English, and 50+ languages.
 * Free tier: 28,800 audio-seconds/day (~8 hours).
 *
 * Flow:
 *   1. WhatsApp voice message → Kapso webhook includes audio URL
 *   2. Download the audio file from the URL
 *   3. Send to Groq Whisper for transcription
 *   4. Return the text → pass to AI for response
 */

const GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export async function transcribeAudio(
  audioUrl: string,
  language?: string
): Promise<{ text: string; language: string; duration: number }> {
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    throw new Error("GROQ_API_KEY not configured for speech-to-text");
  }

  // 1. Download audio from the URL (Kapso provides OGG/OPUS format)
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status}`);
  }

  const audioBlob = await audioResponse.blob();

  // 2. Build multipart form data
  const formData = new FormData();
  formData.append("file", audioBlob, "voice.ogg");
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("response_format", "verbose_json");

  // Auto-detect language, or hint if provided
  if (language) {
    formData.append("language", language);
  }

  // 3. Send to Groq Whisper
  const sttResponse = await fetch(GROQ_STT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
    },
    body: formData,
  });

  if (!sttResponse.ok) {
    const errText = await sttResponse.text().catch(() => "Unknown error");
    throw new Error(`Groq STT error ${sttResponse.status}: ${errText}`);
  }

  const result = await sttResponse.json();

  return {
    text: result.text || "",
    language: result.language || "unknown",
    duration: result.duration || 0,
  };
}

/**
 * Check if a WhatsApp message is a voice/audio message
 * and extract the audio URL from the Kapso webhook payload.
 */
export function extractAudioUrl(webhookPayload: Record<string, unknown>): string | null {
  const entry = (webhookPayload as { entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ type?: string; audio?: { url?: string; id?: string } }> } }> }> })?.entry?.[0];
  const message = entry?.changes?.[0]?.value?.messages?.[0];

  if (!message) return null;

  // WhatsApp audio message types: audio, voice (voice notes)
  if (message.type === "audio" || message.type === "voice") {
    return message.audio?.url || null;
  }

  return null;
}
