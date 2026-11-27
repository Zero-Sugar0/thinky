import { z } from "zod";
import { db, schema } from "@nuxthub/db";
import { createMeetingBot } from "~~/agent/lib/recall";
import { requireSessionUserId } from "~~/server/utils/session";
import { loadMeetingBriefing } from "~~/server/utils/meeting-briefing";

const CreateMeetingSchema = z.object({
  meetingUrl: z.string().url(),
  title: z.string().optional(),
  botName: z.string().optional(),
  joinAt: z.string().optional(),
  joinMessage: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const userId = await requireSessionUserId(event);
  const body = await readValidatedBody(event, (b) => CreateMeetingSchema.parse(b));

  const botName = body.botName || "Thinky";
  // Per-meeting secret that authenticates the voice agent's tool calls back to us.
  const bridgeToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");

  const briefing = await loadMeetingBriefing();
  const bot = await createMeetingBot({
    briefing,
    meetingUrl: body.meetingUrl,
    botName,
    joinAt: body.joinAt,
    joinMessage: body.joinMessage,
    enableRealtimeTranscript: true,
    bridgeToken,
  });

  const meetingId = crypto.randomUUID();

  const [record] = await db
    .insert(schema.meetings)
    .values({
      id: meetingId,
      userId,
      botId: bot.id,
      bridgeToken,
      meetingUrl: body.meetingUrl,
      title: body.title || `Meeting on ${new Date().toLocaleDateString()}`,
      botName,
      status: "scheduled",
      joinAt: body.joinAt ? new Date(body.joinAt) : new Date(),
    })
    .returning();

  return { meeting: record };
});
