import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { requireSessionUserId } from "~~/server/utils/session";

/**
 * Activity for one meeting the signed-in user owns, oldest first. Live meetings
 * keep updating while the page polls this route.
 */
export default defineEventHandler(async (event) => {
  const userId = await requireSessionUserId(event);
  const meetingId = getRouterParam(event, "id");
  if (!meetingId) {
    throw createError({ statusCode: 400, statusMessage: "Meeting ID required" });
  }

  const [meeting] = await db
    .select({ id: schema.meetings.id })
    .from(schema.meetings)
    .where(and(eq(schema.meetings.id, meetingId), eq(schema.meetings.userId, userId)));

  if (!meeting) {
    throw createError({ statusCode: 404, statusMessage: "Meeting not found" });
  }

  const activity = await db
    .select()
    .from(schema.meetingActivity)
    .where(eq(schema.meetingActivity.meetingId, meetingId))
    .orderBy(asc(schema.meetingActivity.createdAt))
    .limit(300);

  return { activity };
});
