import { getComposioClient, isComposioConfigured } from "~~/server/utils/composio";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  const userId = await requireSessionUserId(event);
  const toolkit = getQuery(event).toolkit;

  if (!isComposioConfigured()) {
    return { configured: false, triggers: [], types: [] };
  }

  const composio = getComposioClient();
  if (!composio) {
    return { configured: false, triggers: [], types: [] };
  }

  try {
    const accounts = await composio.connectedAccounts.list({ userIds: [userId] });
    const connectedAccountIds = accounts.items
      .filter((account) => account.status === "ACTIVE" && !account.isDisabled)
      .map((account) => account.id);

    const active = connectedAccountIds.length
      ? await composio.triggers.listActive({ connectedAccountIds, showDisabled: true, limit: 50 })
      : { items: [] };

    let types: unknown[] = [];
    if (typeof toolkit === "string" && toolkit.length > 0) {
      const response = await composio.triggers.listTypes({ toolkits: [toolkit], limit: 50 });
      types = response.items;
    }

    return {
      configured: true,
      triggers: active.items,
      types,
    };
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: error instanceof Error ? error.message : "Failed to load Composio triggers",
    });
  }
});
