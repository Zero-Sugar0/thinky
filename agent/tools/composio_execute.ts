import { defineTool } from "eve/tools";
import { z } from "zod";
import { getOrCreateComposioSession, requireComposioUserId } from "../lib/composio-session.js";

export default defineTool({
  description:
    "Execute a discovered Composio tool action for the current user's session (e.g. 'GMAIL_SEND_EMAIL', 'GOOGLECALENDAR_CREATE_EVENT', 'SLACK_SEND_MESSAGE'). If the app is not connected yet, use composio_connect to give the user the connection URL.",
  inputSchema: z.object({
    toolSlug: z.string().describe("The exact tool slug discovered via composio_search, e.g. 'GMAIL_SEND_EMAIL' or 'GOOGLECALENDAR_CREATE_EVENT'."),
    arguments: z.record(z.string(), z.unknown()).describe("Arguments object required by the tool."),
  }),
  async execute({ toolSlug, arguments: toolArgs }, ctx) {
    try {
      const userId = requireComposioUserId(ctx.session.auth.current?.principalId);
      const session = await getOrCreateComposioSession(userId);
      const executionResult = await session.execute(toolSlug, toolArgs);

      return {
        success: executionResult.resultType === "completed",
        resultType: executionResult.resultType,
        data: executionResult.data,
        error: executionResult.error,
        logId: executionResult.logId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to execute tool ${toolSlug}`;
      return {
        success: false,
        error: message,
      };
    }
  },
});
