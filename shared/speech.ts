// Deepgram speech-to-text and text-to-speech for voice input and spoken replies.
// Keys stay on the server; clients only ever receive transcripts or audio bytes.

const DEEPGRAM_BASE = "https://api.deepgram.com/v1";
const STT_MODEL = "nova-3";
const TTS_MODEL = "aura-2-thalia-en";

/** Largest audio clip accepted for transcription (about 10 minutes of compressed speech). */
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_SPEAK_CHARS = 2000;

/** Failure with an HTTP-style status. Routes convert it to a response; the agent channel logs it. */
export class SpeechError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message);
    this.name = "SpeechError";
  }
}

export function isSpeechConfigured(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY);
}

function apiKey(): string {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    throw new SpeechError(400, "Voice is not configured with DEEPGRAM_API_KEY");
  }
  return key;
}

/** Transcribe a recorded clip. Returns the best transcript, or an empty string when no speech was found. */
export async function transcribeAudio(audio: Uint8Array, contentType: string): Promise<string> {
  if (audio.byteLength === 0) {
    throw new SpeechError(400, "Audio is empty");
  }
  if (audio.byteLength > MAX_AUDIO_BYTES) {
    throw new SpeechError(413, "Audio is too large");
  }

  const url = `${DEEPGRAM_BASE}/listen?model=${STT_MODEL}&smart_format=true&punctuate=true`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey()}`,
      "Content-Type": contentType || "application/octet-stream",
    },
    body: new Blob([new Uint8Array(audio)], { type: contentType || "application/octet-stream" }),
  });

  if (!response.ok) {
    throw new SpeechError(502, `Transcription failed (${response.status})`);
  }

  const body = await response.json() as {
    results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
  };
  return body.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
}

/** Synthesize a reply to speech. Returns MP3 bytes. */
export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const trimmed = text.trim().slice(0, MAX_SPEAK_CHARS);
  if (!trimmed) {
    throw new SpeechError(400, "Nothing to speak");
  }

  const response = await fetch(`${DEEPGRAM_BASE}/speak?model=${TTS_MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: trimmed }),
  });

  if (!response.ok) {
    throw new SpeechError(502, `Speech synthesis failed (${response.status})`);
  }

  return response.arrayBuffer();
}
