import { z } from "zod";
import { db, schema } from "@nuxthub/db";
import { createMeetingBot } from "~~/agent/lib/recall";
import { requireSessionUserId } from "~~/server/utils/session";

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

  const botName = body.botName || "Thinky AI Facilitator";
  const bot = await createMeetingBot({
    meetingUrl: body.meetingUrl,
    botName,
    joinAt: body.joinAt,
    joinMessage: body.joinMessage,
    enableRealtimeTranscript: true,
  });

  const meetingId = crypto.randomUUID();

  const [record] = await db
    .insert(schema.meetings)
    .values({
      id: meetingId,
      userId,
      botId: bot.id,
      meetingUrl: body.meetingUrl,
      title: body.title || `Meeting on ${new Date().toLocaleDateString()}`,
      botName,
      status: "scheduled",
      joinAt: body.joinAt ? new Date(body.joinAt) : new Date(),
    })
    .returning();

  return { meeting: record };
});
