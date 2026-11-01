import { getComposioClient, POPULAR_COMPOSIO_APPS, COMPOSIO_APP_ICONS, isComposioConfigured, type ComposioAppSummary } from "~~/server/utils/composio";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  const userId = await requireSessionUserId(event);
  const query = getQuery(event);
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const category = typeof query.category === "string" && query.category !== "all" ? query.category : undefined;

  if (!isComposioConfigured()) {
    return {
      configured: false,
      apps: [] as ComposioAppSummary[],
      page: 1,
      totalPages: 1,
      totalCount: 0,
      nextCursor: undefined as string | undefined,
    };
  }

  const composio = getComposioClient();
  if (!composio) {
    return {
      configured: false,
      apps: [] as ComposioAppSummary[],
      page: 1,
      totalPages: 1,
      totalCount: 0,
      nextCursor: undefined as string | undefined,
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

    // Try fetching toolkits from Composio API catalog with pagination
    let rawToolkits: Array<Record<string, unknown>> = [];
    let nextCursor: string | undefined;

    try {
      const toolkitsRes = await composio.toolkits.get({
        limit,
        cursor: typeof query.cursor === "string" ? query.cursor : undefined,
        category,
      } as Record<string, unknown>);

      if (toolkitsRes && typeof toolkitsRes === "object" && "items" in toolkitsRes && Array.isArray(toolkitsRes.items)) {
        rawToolkits = toolkitsRes.items as unknown as Array<Record<string, unknown>>;
        if ("nextCursor" in toolkitsRes && typeof toolkitsRes.nextCursor === "string") {
          nextCursor = toolkitsRes.nextCursor;
        }
      } else if (Array.isArray(toolkitsRes)) {
        rawToolkits = toolkitsRes as unknown as Array<Record<string, unknown>>;
      }
    } catch {
      // Fallback to getMany popular apps if full catalog query is restricted or failing
      const fallbackList = await composio.toolkits.getMany(POPULAR_COMPOSIO_APPS);
      rawToolkits = fallbackList as unknown as Array<Record<string, unknown>>;
    }

    if (rawToolkits.length === 0) {
      try {
        const fallbackList = await composio.toolkits.getMany(POPULAR_COMPOSIO_APPS);
        rawToolkits = fallbackList as unknown as Array<Record<string, unknown>>;
      } catch {
        // preserve empty if neither succeeded
      }
    }

    const apps: ComposioAppSummary[] = rawToolkits.map((toolkit) => {
      const slug = String(toolkit.slug || "");
      const slugLower = slug.toLowerCase();
      const connectedAccountId = activeConnectionsMap.get(slugLower);

      const meta = (toolkit.meta as Record<string, unknown> | undefined) || {};
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
        slug,
        name: String(toolkit.name || slug),
        description: (typeof meta.description === "string" ? meta.description : "")
          || (typeof toolkit.description === "string" ? toolkit.description : ""),
        logo: (typeof meta.logo === "string" ? meta.logo : undefined)
          || (typeof toolkit.logo === "string" ? toolkit.logo : undefined),
        icon: COMPOSIO_APP_ICONS[slugLower],
        categories,
        isConnected: Boolean(connectedAccountId),
        connectedAccountId,
      };
    });

    return {
      configured: true,
      apps,
      page,
      totalPages: nextCursor ? page + 1 : page,
      totalCount: apps.length,
      nextCursor,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Composio apps";
    throw createError({
      statusCode: 500,
      statusMessage: message,
    });
  }
});
