import { defineTool } from "eve/tools";
import { z } from "zod";
import { startScreenshare } from "../../../lib/recall.js";

export default defineTool({
  description:
    "Start sharing a webpage in the live meeting as Thinky's screenshare, for example a document, dashboard, or article a participant asked to see. Shares rendered page content only, never a participant's desktop.",
  inputSchema: z.object({
    botId: z.string().describe("The Recall bot ID of the meeting Thinky is in."),
    url: z.string().url().describe("A public https:// page to share."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    error: z.string().optional(),
  }),
  async execute({ botId, url }) {
    if (!url.startsWith("https://")) {
      return { success: false, error: "Only https:// pages can be shared." };
    }
    try {
      await startScreenshare(botId, url);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to start screenshare." };
    }
  },
});
