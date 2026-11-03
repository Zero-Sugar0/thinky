import { getComposioClient, isComposioConfigured } from "~~/server/utils/composio";

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

    // Handle trigger event dispatch or processing here
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
