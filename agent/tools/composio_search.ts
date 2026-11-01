import { defineTool } from "eve/tools";
import { z } from "zod";
import { getOrCreateComposioSession } from "../lib/composio-session.js";

export default defineTool({
  description:
    "Search across Composio's 1700+ tools for actions that match a user's intent or use case (e.g., 'send email with Gmail', 'create Google Calendar event', 'post message to Slack', 'read Notion page'). Returns matching tools and their required parameters.",
  inputSchema: z.object({
    useCase: z.string().describe("The user's goal or intent, e.g. 'schedule a meeting in Google Calendar' or 'fetch recent emails from Gmail'."),
    toolkit: z.string().optional().describe("Optional toolkit slug to narrow search, e.g. 'gmail', 'googlecalendar', 'slack', 'notion'."),
  }),
  async execute({ useCase, toolkit }, ctx) {
    const userId = ctx.session.auth.current?.principalId || "default_user";

    try {
      const session = await getOrCreateComposioSession(userId);
      const searchParams = {
        query: useCase,
        ...(toolkit ? { toolkits: [toolkit] } : {}),
      };

      const searchResult = await session.search(searchParams);
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
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to search tools via Composio";
      return {
        success: false,
        error: message,
      };
    }
  },
});
