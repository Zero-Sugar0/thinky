import { getComposioClient, isComposioConfigured } from "~~/server/utils/composio";

export default defineEventHandler(async (event) => {
  if (!isComposioConfigured()) throw createError({ statusCode: 503, statusMessage: "Composio is not configured" });
  const composio = getComposioClient();
  if (!composio) throw createError({ statusCode: 503, statusMessage: "Composio is not configured" });

  try {
    const parsed = await composio.triggers.parse(toWebRequest(event), {
      verifySecret: process.env.COMPOSIO_WEBHOOK_SECRET,
    });
    const payload = parsed.payload as { triggerSlug?: string; triggerId?: string; userId?: string; payload?: unknown };
    console.info("[composio] trigger received", {
      triggerSlug: payload.triggerSlug,
      triggerId: payload.triggerId,
      userId: payload.userId,
    });
    return { received: true };
  } catch (error) {
    throw createError({ statusCode: 401, statusMessage: error instanceof Error ? error.message : "Invalid Composio webhook" });
  }
});
