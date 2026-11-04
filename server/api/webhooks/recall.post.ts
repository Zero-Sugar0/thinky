import { eq } from "drizzle-orm";
import {
  createAsyncTranscript,
  downloadAndFormatTranscript,
  getTranscriptDownloadUrl,
  verifyRequestFromRecall,
} from "~~/agent/lib/recall";

const TRANSIENT_DATABASE_CODES = new Set(["CONNECT_TIMEOUT", "ECONNRESET", "ETIMEDOUT", "EPIPE"]);

function isTransientDatabaseError(error: unknown): boolean {
  let current = error;
  while (current && typeof current === "object") {
    const cause = current as { cause?: unknown; code?: unknown };
    if (typeof cause.code === "string" && TRANSIENT_DATABASE_CODES.has(cause.code)) return true;
    current = cause.cause;
  }
  return false;
}

async function updateMeetingWithRetry(
  operation: string,
  update: () => Promise<unknown>,
): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await update();
      return true;
    } catch (error) {
      if (attempt === 3 || !isTransientDatabaseError(error)) {
        console.error(`[recall-webhook] ${operation} failed after ${attempt} attempt(s):`, error);
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  return false;
}

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
            await updateMeetingWithRetry("Recording status update", () =>
              db
                .update(schema.meetings)
                .set({
                  status: "recording_done",
                  recordingId,
                })
                .where(eq(schema.meetings.botId, botId)),
            );
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

          if (!botId || !transcriptId) {
            throw new Error("Recall transcript.done event is missing the bot or transcript ID.");
          }

          console.info(`[recall-webhook] Retrieving transcript ${transcriptId} for bot: ${botId}`);
          const dataObj = data?.data as Record<string, unknown> | undefined;
          const eventDownloadUrl = dataObj?.download_url || transcript?.download_url;
          const downloadUrl =
            typeof eventDownloadUrl === "string" && eventDownloadUrl
              ? eventDownloadUrl
              : await getTranscriptDownloadUrl(transcriptId);
          const formatted = await downloadAndFormatTranscript(downloadUrl);
          const saved = await updateMeetingWithRetry("Transcript database update", () =>
            db
              .update(schema.meetings)
              .set({
                status: "done",
                transcriptId,
                transcriptText: formatted.fullText,
                transcriptData: formatted.readable,
              })
              .where(eq(schema.meetings.botId, botId)),
          );
          if (saved) {
            console.info(
              `[recall-webhook] Saved transcript ${transcriptId} for bot ${botId} (${formatted.readable.length} entries)`,
            );
          }
        } else if (eventType.startsWith("bot.")) {
          const data = payload?.data as Record<string, unknown> | undefined;
          const bot = data?.bot as Record<string, unknown> | undefined;
          const botId = (bot?.id || data?.bot_id) as string | undefined;
          const status = eventType.replace("bot.", "");

          if (botId) {
            await updateMeetingWithRetry("Bot status update", () =>
              db.update(schema.meetings).set({ status }).where(eq(schema.meetings.botId, botId)),
            );
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
