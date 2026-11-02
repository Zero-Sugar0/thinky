import { defineTool } from "eve/tools";
import { z } from "zod";
import { getAgentComposioClient, requireComposioUserId } from "../lib/composio-session.js";

export default defineTool({
  description:
    "Generate an authorization connection URL so the user can easily connect their account for an app (e.g. Gmail, Google Calendar, Slack, Notion, GitHub). Provide this connection link directly to the user when an app is not connected or when they ask to connect an app.",
  inputSchema: z.object({
    toolkit: z.string().describe("The slug of the app/toolkit to connect, e.g. 'gmail', 'googlecalendar', 'slack', 'notion', 'github', 'jira'."),
  }),
  async execute({ toolkit }, ctx) {
    try {
      const userId = requireComposioUserId(ctx.session.auth.current?.principalId);
      const composio = getAgentComposioClient();
      if (!composio) {
        throw new Error("COMPOSIO_API_KEY is not configured in the environment.");
      }

      const connectionRequest = await composio.toolkits.authorize(userId, toolkit);

      return {
        success: true,
        toolkit,
        connectUrl: connectionRequest.redirectUrl,
        connectionId: connectionRequest.id,
        message: `Please connect your ${toolkit} account using this link: ${connectionRequest.redirectUrl}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to initiate connection for ${toolkit}`;
      return {
        success: false,
        error: message,
      };
    }
  },
});
