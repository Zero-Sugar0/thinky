import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  createComposioSession,
  getAgentComposioClient,
  requireComposioUserId,
} from "../lib/composio-session.js";

export default defineTool({
  description:
    "Check the current user's live Composio connections. Use this whenever asked which apps or toolkits are connected; tool search results are not connection status.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    try {
      const userId = requireComposioUserId(ctx.session.auth.current?.principalId);
      const composio = getAgentComposioClient();
      if (!composio) {
        throw new Error("COMPOSIO_API_KEY is not configured in the environment.");
      }

      const accounts = new Map<string, { id: string; slug: string; status: string }>();
      const seenAccountCursors = new Set<string>();
      let accountCursor: string | undefined;

      do {
        const page = await composio.connectedAccounts.list({
          userIds: [userId],
          statuses: ["ACTIVE"],
          limit: 100,
          cursor: accountCursor,
        }, { signal: ctx.abortSignal });

        for (const account of page.items) {
          if (account.status === "ACTIVE" && !account.isDisabled && account.toolkit?.slug) {
            const key = account.toolkit.slug.toLowerCase();
            if (!accounts.has(key)) {
              accounts.set(key, {
                id: account.id,
                slug: account.toolkit.slug,
                status: account.status,
              });
            }
          }
        }

        const nextCursor = page.nextCursor ?? undefined;
        if (nextCursor && seenAccountCursors.has(nextCursor)) {
          throw new Error("Composio returned a repeated connected-account cursor.");
        }
        if (nextCursor) {
          seenAccountCursors.add(nextCursor);
        }
        accountCursor = nextCursor;
      } while (accountCursor);

      const connectedAccounts = [...accounts.values()];
      if (connectedAccounts.length === 0) {
        return {
          success: true,
          checkedAt: new Date().toISOString(),
          connectedAccounts,
          sessionAccess: { checked: true },
        };
      }

      try {
        const session = await createComposioSession(
          userId,
          ctx.abortSignal,
          Object.fromEntries(
            [...accounts.values()].map(account => [account.slug, account.id]),
          ),
        );
        const toolkitSlugs = connectedAccounts.map(account => account.slug);
        const sessionToolkits = new Map<string, { name: string; isActive: boolean }>();
        const seenToolkitCursors = new Set<string>();
        let toolkitCursor: string | undefined;

        do {
          const page = await session.toolkits({
            toolkits: toolkitSlugs,
            limit: 100,
            cursor: toolkitCursor,
          }, { signal: ctx.abortSignal });

          for (const toolkit of page.items) {
            sessionToolkits.set(toolkit.slug.toLowerCase(), {
              name: toolkit.name,
              isActive: toolkit.connection?.isActive ?? false,
            });
          }

          const nextCursor = page.cursor;
          if (nextCursor && seenToolkitCursors.has(nextCursor)) {
            throw new Error("Composio returned a repeated session-toolkit cursor.");
          }
          if (nextCursor) {
            seenToolkitCursors.add(nextCursor);
          }
          toolkitCursor = nextCursor;
        } while (toolkitCursor);

        return {
          success: true,
          checkedAt: new Date().toISOString(),
          connectedAccounts: connectedAccounts.map(account => {
            const toolkit = sessionToolkits.get(account.slug.toLowerCase());
            return {
              ...account,
              name: toolkit?.name ?? account.slug,
              sessionAvailable: toolkit?.isActive ?? false,
            };
          }),
          sessionAccess: { checked: true },
        };
      } catch (error) {
        if (ctx.abortSignal.aborted) throw error;
        return {
          success: true,
          checkedAt: new Date().toISOString(),
          connectedAccounts: connectedAccounts.map(account => ({
            ...account,
            name: account.slug,
            sessionAvailable: null,
          })),
          sessionAccess: {
            checked: false,
            error: error instanceof Error ? error.message : "Failed to verify session access.",
          },
        };
      }
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check Composio connections.",
      };
    }
  },
});
