import { gateway } from "ai";
import { z } from "zod";
import { verifyMeetingVoiceToken } from "~~/agent/lib/recall";

const VoiceSessionQuerySchema = z.object({
  token: z.string().min(1).max(2048),
});

export default defineEventHandler(async (event) => {
  const query = VoiceSessionQuerySchema.safeParse(getQuery(event));
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: "Meeting voice session token is required" });
  }

  let validToken: boolean;
  try {
    validToken = verifyMeetingVoiceToken(query.data.token);
  } catch (error) {
    console.error("[meeting-voice] Token verification is unavailable:", error);
    throw createError({
      statusCode: 503,
      statusMessage: "Meeting voice authentication is not configured",
    });
  }
  if (!validToken) {
    throw createError({
      statusCode: 401,
      statusMessage: "Meeting voice session token is invalid or expired",
    });
  }

  let session: Awaited<ReturnType<typeof gateway.experimental_realtime.getToken>>;
  try {
    session = await gateway.experimental_realtime.getToken({
      model: "google/gemini-3.8-live",
    });
  } catch (error) {
    console.error("[meeting-voice] AI Gateway realtime token request failed:", error);
    throw createError({
      statusCode: 502,
      statusMessage: "Could not create the meeting voice session",
    });
  }

  setHeader(event, "Cache-Control", "no-store");
  return session;
});
