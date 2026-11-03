import { defineTool } from "eve/tools";
import { z } from "zod";
import { getMeetingBot } from "../lib/recall.js";

export default defineTool({
  description:
    "Check the status, current lifecycle state (e.g. in_waiting_room, in_call_recording, done), and recording info for a meeting bot.",
  inputSchema: z.object({
    botId: z.string().describe("The ID of the meeting bot instance."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    botId: z.string(),
    currentState: z.string().optional(),
    meetingUrl: z.string().optional(),
    hasRecording: z.boolean().optional(),
    hasTranscript: z.boolean().optional(),
    history: z
      .array(
        z.object({
          code: z.string(),
          createdAt: z.string(),
          message: z.string().optional(),
        }),
      )
      .optional(),
    raw: z.unknown().optional(),
    error: z.string().optional(),
  }),
  async execute({ botId }, ctx) {
    try {
      const bot = await getMeetingBot(botId);
      const changes = bot.status_changes || [];
      const latest = changes[changes.length - 1];

      const recordings = bot.recordings || [];
      const hasRecording = recordings.length > 0;
      const hasTranscript = recordings.some((r) => !!r.media_shortcuts?.transcript?.data?.download_url);

      return {
        success: true,
        botId,
        currentState: latest?.code || "unknown",
        meetingUrl: bot.meeting_url,
        hasRecording,
        hasTranscript,
        history: changes.map((c) => ({
          code: c.code,
          createdAt: c.created_at,
          message: c.message,
        })),
        raw: bot,
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        botId,
        error: error instanceof Error ? error.message : "Failed to retrieve meeting bot status",
      };
    }
  },
});
