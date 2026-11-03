import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getAgentComposioClient,
  listActiveComposioAccounts,
  requireComposioUserId,
} from "../lib/composio-session.js";

export default defineTool({
  description:
    "List configured Composio event triggers and discover available event trigger types for a toolkit (e.g. 'github', 'slack', 'gmail'). Use this to see what triggers are active, paused, or supported.",
  inputSchema: z.object({
    toolkit: z
      .string()
      .optional()
      .describe("Optional toolkit slug to list available trigger types for, e.g. 'github', 'gmail', 'slack'."),
    showDisabled: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to include paused/disabled trigger instances. Defaults to true."),
  }),
  async execute({ toolkit, showDisabled }, ctx) {
    try {
      const userId = requireComposioUserId(ctx.session.auth.current?.principalId);
      const composio = getAgentComposioClient();
      if (!composio) {
        throw new Error("COMPOSIO_API_KEY is not configured in the environment.");
      }

      const accounts = await listActiveComposioAccounts(userId, ctx.abortSignal);
      const connectedAccountIds = accounts.map(a => a.id);

      let activeTriggers: Array<{
        id: string;
        triggerName?: string;
        triggerSlug?: string;
        disabledAt?: string | null;
        createdAt?: string;
      }> = [];

      if (connectedAccountIds.length > 0) {
        const activeRes = await composio.triggers.listActive({
          connectedAccountIds,
          showDisabled: showDisabled ?? true,
          limit: 50,
        }, { signal: ctx.abortSignal });

        activeTriggers = (activeRes.items || []).map(item => ({
          id: item.id,
          triggerName: item.triggerName,
          triggerSlug: (item as { triggerSlug?: string }).triggerSlug,
          disabledAt: item.disabledAt,
          createdAt: (item as { createdAt?: string }).createdAt,
        }));
      }

      let availableTypes: Array<{
        slug: string;
        name: string;
        description: string;
        config?: Record<string, unknown>;
      }> = [];

      if (toolkit) {
        const typesRes = await composio.triggers.listTypes({
          toolkits: [toolkit],
          limit: 50,
        }, { signal: ctx.abortSignal });

        availableTypes = (typesRes.items || []).map(t => ({
          slug: t.slug,
          name: t.name,
          description: t.description,
          config: t.config,
        }));
      }

      return {
        success: true,
        activeTriggersCount: activeTriggers.length,
        activeTriggers,
        availableTypesCount: availableTypes.length,
        availableTypes,
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list triggers.",
      };
    }
  },
});
