import { getComposioClient, isComposioConfigured } from "~~/server/utils/composio";
import { requireSessionUserId } from "~~/server/utils/session";
import { z } from "zod";

const connectSchema = z.object({
  toolkitSlug: z.string().min(1),
  callbackUrl: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const userId = await requireSessionUserId(event);

  if (!isComposioConfigured()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Composio is not configured with COMPOSIO_API_KEY",
    });
  }

  const composio = getComposioClient();
  if (!composio) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to initialize Composio client",
    });
  }

  const body = await readValidatedBody(event, connectSchema.parse);

  try {
    const connectionRequest = await composio.toolkits.authorize(userId, body.toolkitSlug);

    return {
      redirectUrl: connectionRequest.redirectUrl,
      connectionRequestId: connectionRequest.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to initiate connection";
    throw createError({
      statusCode: 500,
      statusMessage: message,
    });
  }
});
