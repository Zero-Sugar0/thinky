import { and, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  const userId = await requireSessionUserId(event);
  const meetingId = getRouterParam(event, "id");
  if (!meetingId) {
    throw createError({ statusCode: 400, statusMessage: "Meeting ID required" });
  }

  const [meeting] = await db
    .select()
    .from(schema.meetings)
    .where(and(eq(schema.meetings.id, meetingId), eq(schema.meetings.userId, userId)));

  if (!meeting) {
    throw createError({ statusCode: 404, statusMessage: "Meeting not found" });
  }

  return { meeting };
});
