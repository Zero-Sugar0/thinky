import { getComposioClient, isComposioConfigured } from "~~/server/utils/composio";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  const userId = await requireSessionUserId(event);
  const query = getQuery(event);
  const toolkit = typeof query.toolkit === "string" && query.toolkit.trim() ? query.toolkit.trim() : undefined;
  const typeSlug = typeof query.type === "string" && query.type.trim() ? query.type.trim() : undefined;

  if (!isComposioConfigured()) {
    return { configured: false, triggers: [], types: [], selectedTypeDetail: null };
  }

  const composio = getComposioClient();
  if (!composio) {
    return { configured: false, triggers: [], types: [], selectedTypeDetail: null };
  }

  try {
    const accounts = await composio.connectedAccounts.list({ userIds: [userId] });
    const connectedAccountIds = accounts.items
      .filter((account) => account.status === "ACTIVE" && !account.isDisabled)
      .map((account) => account.id);

    let activeTriggers: unknown[] = [];
    if (connectedAccountIds.length > 0) {
      let cursor: string | undefined;
      const seenCursors = new Set<string>();
      do {
        const response = await composio.triggers.listActive({
          connectedAccountIds,
          showDisabled: true,
          limit: 50,
          cursor,
        });
        activeTriggers = activeTriggers.concat(response.items ?? []);
        const nextCursor = response.nextCursor ?? undefined;
        if (nextCursor && seenCursors.has(nextCursor)) break;
        if (nextCursor) seenCursors.add(nextCursor);
        cursor = nextCursor;
      } while (cursor && activeTriggers.length < 500);
    }

    let types: unknown[] = [];
    if (toolkit) {
      let cursor: string | undefined;
      const seenCursors = new Set<string>();
      do {
        const response = await composio.triggers.listTypes({
          toolkits: [toolkit],
          limit: 50,
          cursor,
        });
        types = types.concat(response.items ?? []);
        const nextCursor = response.nextCursor ?? undefined;
        if (nextCursor && seenCursors.has(nextCursor)) break;
        if (nextCursor) seenCursors.add(nextCursor);
        cursor = nextCursor;
      } while (cursor && types.length < 1000);
    }

    let selectedTypeDetail: unknown = null;
    if (typeSlug) {
      try {
        selectedTypeDetail = await composio.triggers.getType(typeSlug);
      } catch {
        selectedTypeDetail = null;
      }
    }

    return {
      configured: true,
      triggers: activeTriggers,
      types,
      selectedTypeDetail,
    };
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: error instanceof Error ? error.message : "Failed to load Composio triggers",
    });
  }
});
