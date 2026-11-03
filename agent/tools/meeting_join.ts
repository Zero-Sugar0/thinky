import { defineTool } from "eve/tools";
import { z } from "zod";
import { createMeetingBot } from "../lib/recall.js";

export default defineTool({
  description:
    "Send an AI meeting bot to a Zoom, Google Meet, Microsoft Teams, or Webex meeting to record and transcribe it immediately or at a scheduled time.",
  inputSchema: z.object({
    meetingUrl: z
      .string()
      .url()
      .describe(
        "The meeting URL link to join (e.g. 'https://meet.google.com/abc-defg-hij', 'https://zoom.us/j/123456789', or Microsoft Teams meeting link).",
      ),
    botName: z
      .string()
      .optional()
      .default("Thinky Assistant")
      .describe("The display name of the bot visible to meeting attendees (default: 'Thinky Assistant')."),
    joinAt: z
      .string()
      .optional()
      .describe(
        "ISO 8601 timestamp for when the bot should join (e.g. '2026-03-31T14:00:00Z'). Defaults to immediately.",
      ),
    joinMessage: z
      .string()
      .optional()
      .describe("Custom announcement message sent to meeting chat when the bot joins."),
    enableRealtimeTranscript: z
      .boolean()
      .optional()
      .default(false)
      .describe("If true, streams real-time transcript utterances during the call."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    botId: z.string().optional(),
    meetingUrl: z.string(),
    joinAt: z.string().optional(),
    botName: z.string().optional(),
    status: z.string().optional(),
    raw: z.unknown().optional(),
    error: z.string().optional(),
  }),
  async execute({ meetingUrl, botName, joinAt, joinMessage, enableRealtimeTranscript }, ctx) {
    try {
      const bot = await createMeetingBot({
        meetingUrl,
        botName,
        joinAt,
        joinMessage,
        enableRealtimeTranscript,
      });

      return {
        success: true,
        botId: bot.id,
        meetingUrl: bot.meeting_url || meetingUrl,
        joinAt: bot.join_at,
        botName: bot.bot_name || botName,
        status: "scheduled",
        raw: bot,
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        meetingUrl,
        error: error instanceof Error ? error.message : "Failed to create meeting bot",
      };
    }
  },
});
