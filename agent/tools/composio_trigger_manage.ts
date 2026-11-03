import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getAgentComposioClient,
  listActiveComposioAccounts,
  requireComposioUserId,
} from "../lib/composio-session.js";

export default defineTool({
  description:
    "Manage Composio triggers for the current user: create a new trigger, enable/resume an existing one, disable/pause an existing one, or permanently delete one.",
  inputSchema: z.object({
    action: z
      .enum(["create", "enable", "disable", "delete"])
      .describe("Action to perform on the trigger."),
    triggerSlug: z
      .string()
      .optional()
      .describe("Trigger event slug (required for 'create', e.g. 'GITHUB_COMMIT_EVENT', 'GMAIL_NEW_GMAIL_MESSAGE')."),
    triggerId: z
      .string()
      .optional()
      .describe("Trigger instance ID (required for 'enable', 'disable', 'delete')."),
    triggerConfig: z
      .record(z.string(), z.unknown())
      .optional()
      .default({})
      .describe("Configuration parameters for creating the trigger (e.g. { owner: 'repo-owner', repo: 'repo-name' })."),
    toolkit: z
      .string()
      .optional()
      .describe("Optional toolkit name to target specific connected account if multiple exist."),
  }),
  async execute({ action, triggerSlug, triggerId, triggerConfig, toolkit }, ctx) {
    try {
      const userId = requireComposioUserId(ctx.session.auth.current?.principalId);
      const composio = getAgentComposioClient();
      if (!composio) {
        throw new Error("COMPOSIO_API_KEY is not configured in the environment.");
      }

      if (action === "create") {
        if (!triggerSlug) {
          return { success: false, error: "triggerSlug is required to create a trigger." };
        }
        let connectedAccountId: string | undefined;
        if (toolkit) {
          const accounts = await listActiveComposioAccounts(userId, ctx.abortSignal);
          const matched = accounts.find(a => a.toolkit.slug.toLowerCase() === toolkit.toLowerCase());
          if (matched) connectedAccountId = matched.id;
        }

        const created = await composio.triggers.create(userId, triggerSlug, {
          connectedAccountId,
          triggerConfig: triggerConfig || {},
        }, { signal: ctx.abortSignal });

        return {
          success: true,
          action: "create",
          triggerId: created.triggerId,
          triggerSlug,
          message: `Trigger ${triggerSlug} created with ID ${created.triggerId}.`,
        };
      }

      if (!triggerId) {
        return { success: false, error: `triggerId is required for action '${action}'.` };
      }

      if (action === "enable") {
        await composio.triggers.enable(triggerId, { signal: ctx.abortSignal });
        return {
          success: true,
          action: "enable",
          triggerId,
          message: `Trigger ${triggerId} is now enabled and receiving events.`,
        };
      }

      if (action === "disable") {
        await composio.triggers.disable(triggerId, { signal: ctx.abortSignal });
        return {
          success: true,
          action: "disable",
          triggerId,
          message: `Trigger ${triggerId} is now paused.`,
        };
      }

      if (action === "delete") {
        await composio.triggers.delete(triggerId, { signal: ctx.abortSignal });
        return {
          success: true,
          action: "delete",
          triggerId,
          message: `Trigger ${triggerId} has been permanently deleted.`,
        };
      }

      return { success: false, error: `Unknown action: ${action}` };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        action,
        error: error instanceof Error ? error.message : "Failed to execute trigger action.",
      };
    }
  },
});
