import { getRecentProactiveSuggestionsForThread } from "~~/server/utils/proactive";
import { getThreadForUser } from "~~/server/utils/threads";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  const userId = await requireSessionUserId(event);
  const threadId = getRouterParam(event, "id");

  if (!threadId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing thread id",
    });
  }

  const thread = await getThreadForUser(userId, threadId);
  if (!thread) {
    throw createError({
      statusCode: 404,
      statusMessage: "Thread not found",
    });
  }

  const suggestions = await getRecentProactiveSuggestionsForThread(threadId);
  return { suggestions };
});
