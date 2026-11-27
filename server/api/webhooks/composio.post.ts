import { getComposioClient, isComposioConfigured } from "~~/server/utils/composio";
import { recordComposioSignal } from "~~/server/utils/signals";

export default defineEventHandler(async (event) => {
  if (!isComposioConfigured()) throw createError({ statusCode: 503, statusMessage: "Composio is not configured" });
  const composio = getComposioClient();
  if (!composio) throw createError({ statusCode: 503, statusMessage: "Composio is not configured" });

  try {
    const webRequest = toWebRequest(event);
    const parsed = await composio.triggers.parse(webRequest, {
      verifySecret: process.env.COMPOSIO_WEBHOOK_SECRET,
    });

    const version = parsed.version;
    const normalizedPayload = parsed.payload;
    const rawPayload = parsed.rawPayload;

    console.info("[composio] trigger received", {
      version,
      triggerSlug: normalizedPayload.triggerSlug,
      triggerId: normalizedPayload.id,
      userId: normalizedPayload.userId,
      toolkitSlug: normalizedPayload.toolkitSlug,
      timestamp: (rawPayload as { timestamp?: string })?.timestamp,
    });

    // Keep a sanitized record (toolkit, trigger, time) so check-ins can mention real activity.
    // Message content is never stored. A failure here must not reject the webhook.
    if (normalizedPayload.userId && normalizedPayload.toolkitSlug) {
      await recordComposioSignal({
        userId: normalizedPayload.userId,
        toolkit: normalizedPayload.toolkitSlug,
        triggerSlug: normalizedPayload.triggerSlug,
      }).catch(error => console.warn("[composio] could not record signal", error instanceof Error ? error.message : error));
    }

    return {
      received: true,
      triggerSlug: normalizedPayload.triggerSlug,
      triggerId: normalizedPayload.id,
    };
  } catch (error) {
    throw createError({
      statusCode: 401,
      statusMessage: error instanceof Error ? error.message : "Invalid Composio webhook",
    });
  }
});
