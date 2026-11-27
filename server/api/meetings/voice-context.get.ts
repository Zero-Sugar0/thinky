import { z } from "zod";
import { getMeetingVoiceContext, verifyMeetingVoiceToken } from "~~/agent/lib/recall";

const VoiceContextQuerySchema = z.object({
  token: z.string().min(1).max(2048),
});

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");

  const query = VoiceContextQuerySchema.safeParse(getQuery(event));
  if (!query.success) {
    throw createError({ statusCode: 400, statusMessage: "Meeting voice session token is required" });
  }

  let validToken: boolean;
  let meetingContext: string | undefined;
  try {
    validToken = verifyMeetingVoiceToken(query.data.token);
    meetingContext = validToken ? getMeetingVoiceContext(query.data.token) : undefined;
  } catch (error) {
    console.error("[meeting-voice] Context token verification is unavailable:", error);
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

  return { meetingContext: meetingContext ?? null };
});
