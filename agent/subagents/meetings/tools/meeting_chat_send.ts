import { defineTool } from "eve/tools";
import { z } from "zod";
import { sendChatMessage } from "../../../lib/recall.js";

export default defineTool({
  description:
    "Send a message to the live meeting's chat as Thinky. Use it for links, summaries, or acknowledgements that are easier to read than to hear.",
  inputSchema: z.object({
    botId: z.string().describe("The Recall bot ID of the meeting Thinky is in."),
    message: z.string().trim().min(1).max(1000),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    error: z.string().optional(),
  }),
  async execute({ botId, message }) {
    try {
      await sendChatMessage(botId, message);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to send chat message." };
    }
  },
});
