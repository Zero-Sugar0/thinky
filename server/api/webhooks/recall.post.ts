import { eq } from "drizzle-orm";
import {
  createAsyncTranscript,
  downloadAndFormatTranscript,
  verifyRequestFromRecall,
} from "~~/agent/lib/recall";

/**
 * Recall.ai Webhook Handler
 *
 * Rules:
 * 1. Verify every incoming request using verifyRequestFromRecall using raw body.
 * 2. Immediately acknowledge with a 2xx response so Recall doesn't timeout.
 * 3. Process the event payload asynchronously in the background.
 */
export default defineEventHandler(async (event) => {
  const secret = process.env.RECALL_WORKSPACE_VERIFICATION_SECRET || process.env.RECALL_SVIX_WEBHOOK_SECRET;
  if (!secret) {
    throw createError({
      statusCode: 503,
      statusMessage: "Recall webhook verification is not configured",
    });
  }

  const rawBody = await readRawBody(event);
  const headers = getHeaders(event) as Record<string, string>;

  try {
    verifyRequestFromRecall({
      secret,
      headers,
      payload: rawBody || null,
    });
  } catch (err) {
    console.error("[recall-webhook] Verification failed:", err);
    throw createError({
      statusCode: 401,
      statusMessage: "Recall signature verification failed",
    });
  }

  let payload: Record<string, unknown> | null = null;
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody.toString()) as Record<string, unknown>;
    } catch {
      payload = null;
    }
  }

  const eventType = String(payload?.event || "");
  console.info(`[recall-webhook] Verified event received: ${eventType}`);

  // Process asynchronously without blocking response (using event.waitUntil for serverless execution)
  if (payload) {
    const backgroundTask = async () => {
      try {
        const { db, schema } = await import("@nuxthub/db");

        if (eventType === "recording.done") {
          const data = payload?.data as Record<string, unknown> | undefined;
          const recording = data?.recording as Record<string, unknown> | undefined;
          const bot = data?.bot as Record<string, unknown> | undefined;
          const recordingId = recording?.id as string | undefined;
          const botId = bot?.id as string | undefined;

          if (botId) {
            await db
              .update(schema.meetings)
              .set({
                status: "recording_done",
                recordingId,
              })
              .where(eq(schema.meetings.botId, botId))
              .catch((err: unknown) => console.error("[recall-webhook] DB update failed:", err));
          }

          if (recordingId) {
            console.info(`[recall-webhook] Requesting post-meeting transcript for recording: ${recordingId}`);
            await createAsyncTranscript(recordingId);
          }
        } else if (eventType === "transcript.done") {
          const data = payload?.data as Record<string, unknown> | undefined;
          const transcript = data?.transcript as Record<string, unknown> | undefined;
          const bot = data?.bot as Record<string, unknown> | undefined;
          const botId = bot?.id as string | undefined;
          const transcriptId = transcript?.id as string | undefined;

          console.info(`[recall-webhook] Transcript ready: ${transcriptId} for bot: ${botId}`);

          if (botId) {
            const dataObj = data?.data as Record<string, unknown> | undefined;
            const downloadUrl = (dataObj?.download_url || transcript?.download_url) as string | undefined;

            if (downloadUrl) {
              const formatted = await downloadAndFormatTranscript(downloadUrl).catch(() => null);
              if (formatted) {
                await db
                  .update(schema.meetings)
                  .set({
                    status: "done",
                    transcriptId,
                    transcriptText: formatted.fullText,
                    transcriptData: formatted.readable,
                  })
                  .where(eq(schema.meetings.botId, botId))
                  .catch((err: unknown) => console.error("[recall-webhook] DB transcript update failed:", err));
              }
            } else {
              await db
                .update(schema.meetings)
                .set({
                  status: "done",
                  transcriptId,
                })
                .where(eq(schema.meetings.botId, botId))
                .catch((err: unknown) => console.error("[recall-webhook] DB status update failed:", err));
            }
          }
        } else if (eventType.startsWith("bot.")) {
          const data = payload?.data as Record<string, unknown> | undefined;
          const bot = data?.bot as Record<string, unknown> | undefined;
          const botId = (bot?.id || data?.bot_id) as string | undefined;
          const status = eventType.replace("bot.", "");

          if (botId) {
            await db
              .update(schema.meetings)
              .set({ status })
              .where(eq(schema.meetings.botId, botId))
              .catch(() => null);
          }
        }
      } catch (bgError) {
        console.error("[recall-webhook] Background processing error:", bgError);
      }
    };

    if (typeof event.waitUntil === "function") {
      event.waitUntil(backgroundTask());
    } else {
      setImmediate(backgroundTask);
    }
  }

  // Acknowledge immediately
  return { received: true };
});
