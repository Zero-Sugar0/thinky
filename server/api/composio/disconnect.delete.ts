import { getComposioClient, isComposioConfigured } from "~~/server/utils/composio";
import { requireSessionUserId } from "~~/server/utils/session";
import { z } from "zod";

const disconnectSchema = z.object({
  connectedAccountId: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  await requireSessionUserId(event);

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

  const body = await readValidatedBody(event, disconnectSchema.parse);

  try {
    await composio.connectedAccounts.delete(body.connectedAccountId);

    return {
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disconnect account";
    throw createError({
      statusCode: 500,
      statusMessage: message,
    });
  }
});
