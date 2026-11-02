import { defineTool } from "eve/tools";
import { z } from "zod";
import { createComposioSession, requireComposioUserId } from "../lib/composio-session.js";

export default defineTool({
  description:
    "Search across Composio's 1700+ tools for actions that match a user's intent or use case (e.g., 'send email with Gmail', 'create Google Calendar event', 'post message to Slack', 'read Notion page'). Returns matching tools and their required parameters.",
  inputSchema: z.object({
    useCase: z.string().describe("The user's goal or intent, e.g. 'schedule a meeting in Google Calendar' or 'fetch recent emails from Gmail'."),
    toolkit: z.string().optional().describe("Optional toolkit slug to narrow search, e.g. 'gmail', 'googlecalendar', 'slack', 'notion'."),
  }),
  async execute({ useCase, toolkit }, ctx) {
    try {
      const userId = requireComposioUserId(ctx.session.auth.current?.principalId);
      const session = await createComposioSession(userId, ctx.abortSignal);
      const searchParams = {
        query: useCase,
        ...(toolkit ? { toolkits: [toolkit] } : {}),
      };

      const searchResult = await session.search(searchParams, { signal: ctx.abortSignal });
      const items = searchResult.results || [];
      return {
        success: searchResult.success,
        useCase,
        results: items.map((r: {
          useCase: string;
          toolkits: string[];
          primaryToolSlugs: string[];
          relatedToolSlugs: string[];
          executionGuidance?: string;
          knownPitfalls?: string[];
        }) => ({
          useCase: r.useCase,
          toolkits: r.toolkits,
          primaryToolSlugs: r.primaryToolSlugs,
          relatedToolSlugs: r.relatedToolSlugs,
          executionGuidance: r.executionGuidance,
          knownPitfalls: r.knownPitfalls,
        })),
        connectionStatuses: searchResult.toolkitConnectionStatuses.map(status => ({
          toolkit: status.toolkit,
          hasActiveConnection: status.hasActiveConnection,
          statusMessage: status.statusMessage,
        })),
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      const message = error instanceof Error ? error.message : "Failed to search tools via Composio";
      return {
        success: false,
        error: message,
      };
    }
  },
});
