import { defineTool } from "eve/tools";
import { z } from "zod";
import { leaveMeetingBot } from "../lib/recall.js";

export default defineTool({
  description:
    "Instruct a meeting bot to immediately leave an active call.",
  inputSchema: z.object({
    botId: z.string().describe("The ID of the meeting bot instance to remove from the call."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    botId: z.string(),
    message: z.string().optional(),
    error: z.string().optional(),
  }),
  async execute({ botId }, ctx) {
    try {
      await leaveMeetingBot(botId);
      return {
        success: true,
        botId,
        message: "Bot successfully requested to leave the meeting.",
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        botId,
        error: error instanceof Error ? error.message : "Failed to remove bot from meeting",
      };
    }
  },
});
