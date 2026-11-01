import { getComposioClient, isComposioConfigured } from "~~/server/utils/composio";
import { requireSessionUserId } from "~~/server/utils/session";
import { z } from "zod";

const connectSchema = z.object({
  toolkitSlug: z.string().min(1),
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
    const authConfigs = await composio.authConfigs.list({ toolkit: body.toolkitSlug });
    let authConfigId = authConfigs.items[0]?.id;

    if (!authConfigId) {
      const toolkit = await composio.toolkits.get(body.toolkitSlug);
      if (!toolkit.authConfigDetails?.length) {
        throw new Error(`No auth configuration is available for ${body.toolkitSlug}`);
      }

      const authConfig = await composio.authConfigs.create(body.toolkitSlug, {
        type: "use_composio_managed_auth",
        name: `${toolkit.name} Auth Config`,
      });
      authConfigId = authConfig.id;
    }

    const callbackUrl = new URL("/settings/apps", getRequestURL(event).origin);
    callbackUrl.searchParams.set("app", body.toolkitSlug);

    const connectionRequest = await composio.connectedAccounts.link(userId, authConfigId, {
      allowMultiple: true,
      callbackUrl: callbackUrl.toString(),
    });

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
