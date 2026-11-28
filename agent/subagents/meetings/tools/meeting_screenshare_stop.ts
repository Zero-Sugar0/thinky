import { defineTool } from "eve/tools";
import { z } from "zod";
import { stopScreenshare } from "../../../lib/recall.js";

export default defineTool({
  description: "Stop Thinky's screenshare in the live meeting. The camera avatar keeps running.",
  inputSchema: z.object({
    botId: z.string().describe("The Recall bot ID of the meeting Thinky is in."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    error: z.string().optional(),
  }),
  async execute({ botId }) {
    try {
      await stopScreenshare(botId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to stop screenshare." };
    }
  },
});
