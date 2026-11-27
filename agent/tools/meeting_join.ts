import { defineTool } from "eve/tools";
import { z } from "zod";
import { createMeetingBot } from "../lib/recall.js";
import { meetingBriefing } from "../identity/documents.js";

export default defineTool({
  description:
    "Join a Zoom, Google Meet, Microsoft Teams, or Webex call transparently as Thinky, an AI participant. Thinky listens to the live conversation and can respond in a natural voice when addressed or when a brief proactive contribution would help; it does not impersonate a human. The call is recorded for a speaker-attributed transcript and follow-up. Add only concise, non-sensitive meeting goals or user priorities explicitly shared for this call in `meetingContext`; never infer opinions or include secrets.",
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
      .default("Thinky")
      .describe("The display name of the bot visible to meeting attendees (default: 'Thinky')."),
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
    meetingContext: z
      .string()
      .trim()
      .max(900)
      .optional()
      .describe("Optional brief with relevant, non-sensitive meeting goals and user priorities explicitly shared for this call. Never include secrets, unrelated profile details, or inferred opinions; leave empty when there is no useful context."),
    enableRealtimeTranscript: z
      .boolean()
      .optional()
      .default(true)
      .describe("Enable Deepgram real-time transcript events delivered to Thinky's Recall webhook."),
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
  async execute({ meetingUrl, botName, joinAt, joinMessage, meetingContext, enableRealtimeTranscript }, ctx) {
    try {
      const bot = await createMeetingBot({
        briefing: meetingBriefing(),
        meetingUrl,
        botName,
        joinAt,
        joinMessage,
        meetingContext,
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
