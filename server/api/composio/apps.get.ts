import { getComposioClient, COMPOSIO_APP_ICONS, isComposioConfigured, type ComposioAppSummary } from "~~/server/utils/composio";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  const userId = await requireSessionUserId(event);
  const limit = 50;

  if (!isComposioConfigured()) {
    return {
      configured: false,
      apps: [] as ComposioAppSummary[],
      totalCount: 0,
    };
  }

  const composio = getComposioClient();
  if (!composio) {
    return {
      configured: false,
      apps: [] as ComposioAppSummary[],
      totalCount: 0,
    };
  }

  try {
    // Fetch connected accounts for this specific user
    const connectedAccountsResponse = await composio.connectedAccounts.list({
      userIds: [userId],
    });

    const activeConnectionsMap = new Map<string, string>();
    for (const acc of connectedAccountsResponse.items) {
      if (acc.status === "ACTIVE" && !acc.isDisabled && acc.toolkit?.slug) {
        activeConnectionsMap.set(acc.toolkit.slug.toLowerCase(), acc.id);
      }
    }

    const toolkits = new Map<string, ComposioAppSummary>();
    const seenCursors = new Set<string>();
    let cursor: string | undefined;

    do {
      const toolkitsRes = await composio.getClient().toolkits.list({
        limit,
        cursor,
      });

      for (const toolkit of toolkitsRes.items) {
        const slug = toolkit.slug;
        const slugLower = slug.toLowerCase();
        const connectedAccountId = activeConnectionsMap.get(slugLower);

        toolkits.set(slugLower, {
          slug,
          name: toolkit.name || slug,
          description: toolkit.meta?.description || "",
          logo: toolkit.meta?.logo || undefined,
          icon: COMPOSIO_APP_ICONS[slugLower],
          categories: toolkit.meta?.categories?.map(category => category.name) ?? [],
          isConnected: Boolean(connectedAccountId),
          connectedAccountId,
        });
      }

      const nextCursor = toolkitsRes.next_cursor ?? undefined;
      if (nextCursor && seenCursors.has(nextCursor)) {
        throw new Error("Composio returned a repeated toolkit catalog cursor");
      }
      if (nextCursor) {
        seenCursors.add(nextCursor);
      }
      cursor = nextCursor;
    } while (cursor);

    const apps = [...toolkits.values()];

    return {
      configured: true,
      apps,
      totalCount: apps.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Composio apps";
    throw createError({
      statusCode: 500,
      statusMessage: message,
    });
  }
});
