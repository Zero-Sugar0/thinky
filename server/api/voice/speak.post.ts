import { z } from "zod";
import { requireSessionUserId } from "~~/server/utils/session";
import { SpeechError, synthesizeSpeech  } from "#shared/speech";

function toHttpError(error: unknown) {
  if (error instanceof SpeechError) {
    return createError({ statusCode: error.statusCode, statusMessage: error.message });
  }
  return error;
}

const speakSchema = z.object({ text: z.string().min(1).max(2000) });

// Turns an assistant reply into MP3 audio for playback in the chat.
export default defineEventHandler(async (event) => {
  await requireSessionUserId(event);
  const body = await readValidatedBody(event, speakSchema.parse);

  let audio: ArrayBuffer;
  try {
    audio = await synthesizeSpeech(body.text);
  }
  catch (error) {
    throw toHttpError(error);
  }
  setHeader(event, "content-type", "audio/mpeg");
  setHeader(event, "cache-control", "no-store");
  return new Uint8Array(audio);
});
