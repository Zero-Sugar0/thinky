import { defineTool } from "eve/tools";
import { z } from "zod";
import { downloadAndFormatTranscript, getMeetingBot } from "../lib/recall.js";

export default defineTool({
  description:
    "Retrieve the full speaker-attributed readable transcript for a meeting bot that has recorded a meeting.",
  inputSchema: z.object({
    botId: z.string().describe("The ID of the meeting bot instance."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    botId: z.string(),
    fullText: z.string().optional(),
    readable: z
      .array(
        z.object({
          speaker: z.string(),
          paragraph: z.string(),
          durationSeconds: z.number().nullable().optional(),
        }),
      )
      .optional(),
    downloadUrl: z.string().optional(),
    error: z.string().optional(),
  }),
  async execute({ botId }, ctx) {
    try {
      const bot = await getMeetingBot(botId);
      const recordings = bot.recordings || [];
      const transcriptShortcut = recordings.find((r) => !!r.media_shortcuts?.transcript?.data?.download_url);

      const downloadUrl = transcriptShortcut?.media_shortcuts?.transcript?.data?.download_url;
      if (!downloadUrl) {
        return {
          success: false,
          botId,
          error: "Transcript is not ready yet or was not requested. Please ensure the meeting has completed.",
        };
      }

      const formatted = await downloadAndFormatTranscript(downloadUrl);

      return {
        success: true,
        botId,
        fullText: formatted.fullText,
        readable: formatted.readable.map((r) => ({
          speaker: r.speaker,
          paragraph: r.paragraph,
          durationSeconds: r.duration_seconds,
        })),
        downloadUrl,
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        botId,
        error: error instanceof Error ? error.message : "Failed to fetch meeting transcript",
      };
    }
  },
});
