import { desc, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  const userId = await requireSessionUserId(event);

  const userMeetings = await db
    .select()
    .from(schema.meetings)
    .where(eq(schema.meetings.userId, userId))
    .orderBy(desc(schema.meetings.createdAt));

  return { meetings: userMeetings };
});
