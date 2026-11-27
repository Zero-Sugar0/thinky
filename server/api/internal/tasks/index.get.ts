import { listTasksForUser } from "~~/server/utils/tasks";
import { taskListQuerySchema } from "~~/server/schemas/tasks";
import { requireInternalRequest } from "~~/server/utils/internal-api";

export default defineEventHandler(async (event) => {
  requireInternalRequest(event);
  const query = await getValidatedQuery(event, taskListQuerySchema.parse);
  const tasks = await listTasksForUser(query.userId, query.status, query.limit);
  return { tasks };
});
