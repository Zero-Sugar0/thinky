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
    let connectedAccountIds: string[] = [];
    try {
      const accounts = await composio.connectedAccounts.list({ userIds: [userId] });
      connectedAccountIds = (accounts?.items ?? [])
        .filter((account) => account.status === "ACTIVE" && !account.isDisabled)
        .map((account) => account.id);
    } catch (e) {
      console.warn("[composio/triggers] failed to list connected accounts", e);
    }

    let activeTriggers: unknown[] = [];
    if (connectedAccountIds.length > 0) {
      try {
        const active = await composio.triggers.listActive({ connectedAccountIds, showDisabled: true, limit: 50 });
        activeTriggers = active?.items ?? [];
      } catch (e) {
        console.warn("[composio/triggers] failed to list active triggers", e);
      }
    }

    let types: unknown[] = [];
    if (typeof toolkit === "string" && toolkit.trim().length > 0) {
      const toolkitSlug = toolkit.trim();
      let cursor: string | undefined;
      do {
        try {
          const response = await composio.triggers.listTypes({ toolkits: [toolkitSlug], limit: 50, cursor });
          types = types.concat(response?.items ?? []);
          cursor = response?.nextCursor ?? undefined;
        } catch (e) {
          console.warn("[composio/triggers] failed to fetch trigger types for", toolkitSlug, e);
          break;
        }
      } while (cursor && types.length < 500);
    }

    return {
      configured: true,
      triggers: activeTriggers,
      types,
    };
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: error instanceof Error ? error.message : "Failed to load Composio triggers",
    });
  }
});
