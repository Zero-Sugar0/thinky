import { requireSessionUserId } from "~~/server/utils/session";
import { SpeechError, MAX_AUDIO_BYTES, transcribeAudio  } from "~~/server/utils/speech";

function toHttpError(error: unknown) {
  if (error instanceof SpeechError) {
    return createError({ statusCode: error.statusCode, statusMessage: error.message });
  }
  return error;
}

// Accepts raw audio (the recorded blob) and returns the transcript for the chat composer.
export default defineEventHandler(async (event) => {
  await requireSessionUserId(event);

  const contentType = getRequestHeader(event, "content-type") ?? "";
  if (!contentType.startsWith("audio/")) {
    throw createError({ statusCode: 415, statusMessage: "Send recorded audio with an audio/* content type" });
  }

  const audio = new Uint8Array(await readRawBody(event, false) ?? new Uint8Array());
  if (audio.byteLength > MAX_AUDIO_BYTES) {
    throw createError({ statusCode: 413, statusMessage: "Audio is too large" });
  }

  try {
    const text = await transcribeAudio(audio, contentType.split(";")[0] ?? contentType);
    return { text };
  }
  catch (error) {
    throw toHttpError(error);
  }
});
