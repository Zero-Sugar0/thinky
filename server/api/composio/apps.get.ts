import { getComposioClient, COMPOSIO_APP_ICONS, isComposioConfigured, type ComposioAppSummary } from "~~/server/utils/composio";
import { COMPOSIO_TRIGGER_CATALOG, normalizeToolkitKey } from "~~/server/utils/composio-trigger-catalog";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  const userId = await requireSessionUserId(event);
  const { eventsOnly } = getQuery(event);
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

    if (eventsOnly === "true") {
      // Events come only from the supported trigger catalog. Connection state is
      // shown per toolkit so people can see what is set up and what is missing.
      const connectedByKey = new Map<string, string>();
      for (const acc of connectedAccountsResponse.items) {
        if (acc.status === "ACTIVE" && !acc.isDisabled && acc.toolkit?.slug) {
          connectedByKey.set(normalizeToolkitKey(acc.toolkit.slug), acc.id);
        }
      }

      const toolkitMetadata = await composio.toolkits
        .getMany(COMPOSIO_TRIGGER_CATALOG.map(entry => entry.toolkit.toLowerCase()))
        .catch(() => []);
      const metadataBySlug = new Map(
        toolkitMetadata.map(toolkit => [toolkit.slug.toLowerCase(), toolkit]),
      );

      const apps = COMPOSIO_TRIGGER_CATALOG.map((entry) => {
        const slug = entry.toolkit.toLowerCase();
        const toolkit = metadataBySlug.get(slug);
        const connectedAccountId = connectedByKey.get(normalizeToolkitKey(entry.toolkit));
        return {
          slug,
          name: toolkit?.name || entry.toolkit.replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()),
          description: toolkit?.meta?.description || "",
          logo: toolkit?.meta?.logo || undefined,
          icon: COMPOSIO_APP_ICONS[slug],
          categories: toolkit?.meta?.categories?.map(category => category.name) ?? [],
          isConnected: Boolean(connectedAccountId),
          connectedAccountId,
          eventCount: entry.triggers.length,
        };
      }).sort((x, y) => Number(y.isConnected) - Number(x.isConnected) || x.name.localeCompare(y.name));

      return {
        configured: true,
        apps,
        totalCount: apps.length,
      };
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
