import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  createComposioSession,
  findComposioAccountForTool,
  listActiveComposioAccounts,
  requireComposioUserId,
} from "../lib/composio-session.js";

export default defineTool({
  description:
    "Execute a discovered Composio tool action for the current user's session (e.g. 'GMAIL_SEND_EMAIL', 'GOOGLECALENDAR_CREATE_EVENT', 'SLACK_SEND_MESSAGE'). If no active connection is available, check composio_status before offering a new connection link; do not suggest reconnecting when the account is already active.",
  inputSchema: z.object({
    toolSlug: z.string().describe("The exact tool slug discovered via composio_search, e.g. 'GMAIL_SEND_EMAIL' or 'GOOGLECALENDAR_CREATE_EVENT'."),
    arguments: z.record(z.string(), z.unknown()).describe("Arguments object required by the tool."),
  }),
  async execute({ toolSlug, arguments: toolArgs }, ctx) {
    try {
      const userId = requireComposioUserId(ctx.session.auth.current?.principalId);
      const accounts = await listActiveComposioAccounts(userId, ctx.abortSignal);
      const account = findComposioAccountForTool(toolSlug, accounts);
      if (!account) {
        return {
          success: false,
          error:
            `No active Composio connection for the toolkit required by ${toolSlug} is available to this Eve user. ` +
            "Check that the web and Eve services use the same Composio project API key and that the account is connected to this user before generating another connection link.",
        };
      }

      const session = await createComposioSession(userId, ctx.abortSignal, {
        [account.toolkit.slug]: account.id,
      });
      const executionResult = await session.execute(toolSlug, toolArgs, undefined, { signal: ctx.abortSignal });

      return {
        success: executionResult.resultType === "completed",
        resultType: executionResult.resultType,
        data: executionResult.data,
        error: executionResult.error,
        logId: executionResult.logId,
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      const message = error instanceof Error ? error.message : `Failed to execute tool ${toolSlug}`;
      return {
        success: false,
        error: message,
      };
    }
  },
});
