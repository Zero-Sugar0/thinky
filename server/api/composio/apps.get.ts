import { getComposioClient, POPULAR_COMPOSIO_APPS, COMPOSIO_APP_ICONS, isComposioConfigured, type ComposioAppSummary } from "~~/server/utils/composio";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  const userId = await requireSessionUserId(event);

  if (!isComposioConfigured()) {
    return {
      configured: false,
      apps: [] as ComposioAppSummary[],
    };
  }

  const composio = getComposioClient();
  if (!composio) {
    return {
      configured: false,
      apps: [] as ComposioAppSummary[],
    };
  }

  try {
    // Fetch connected accounts for this specific user
    const connectedAccountsResponse = await composio.connectedAccounts.list({
      userIds: [userId],
    });

    const activeConnectionsMap = new Map<string, string>();
    for (const acc of connectedAccountsResponse.items) {
      if (acc.status === "ACTIVE" && acc.toolkit?.slug) {
        activeConnectionsMap.set(acc.toolkit.slug.toLowerCase(), acc.id);
      }
    }

    // Fetch popular toolkits
    const toolkits = await composio.toolkits.getMany(POPULAR_COMPOSIO_APPS);

    const apps: ComposioAppSummary[] = toolkits.map((toolkit) => {
      const slugLower = toolkit.slug.toLowerCase();
      const connectedAccountId = activeConnectionsMap.get(slugLower);

      const toolkitRecord = toolkit as Record<string, unknown>;
      const meta = (toolkitRecord.meta as Record<string, unknown> | undefined) || {};
      const rawCategories = (meta.categories as unknown[] | undefined) || [];
      const categories = rawCategories
        .map((c) => {
          if (typeof c === "string") return c;
          if (c && typeof c === "object") {
            const catObj = c as Record<string, unknown>;
            return typeof catObj.name === "string" ? catObj.name : typeof catObj.id === "string" ? catObj.id : "";
          }
          return "";
        })
        .filter(Boolean);

      return {
        slug: toolkit.slug,
        name: toolkit.name,
        description: (typeof meta.description === "string" ? meta.description : "")
          || (typeof toolkitRecord.description === "string" ? toolkitRecord.description : ""),
        logo: (typeof meta.logo === "string" ? meta.logo : undefined)
          || (typeof toolkitRecord.logo === "string" ? toolkitRecord.logo : undefined),
        icon: COMPOSIO_APP_ICONS[slugLower],
        categories,
        isConnected: Boolean(connectedAccountId),
        connectedAccountId,
      };
    });

    return {
      configured: true,
      apps,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Composio apps";
    throw createError({
      statusCode: 500,
      statusMessage: message,
    });
  }
});
