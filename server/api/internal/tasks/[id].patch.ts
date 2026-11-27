import { z } from "zod";
import { taskUpdateSchema } from "~~/server/schemas/tasks";
import { updateTaskForUser } from "~~/server/utils/tasks";
import { requireInternalRequest } from "~~/server/utils/internal-api";

const paramsSchema = z.object({ id: z.string().trim().min(1) });

export default defineEventHandler(async (event) => {
  requireInternalRequest(event);
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);
  const body = await readValidatedBody(event, taskUpdateSchema.parse);
  const { userId, ...patch } = body;
  const task = await updateTaskForUser(userId, id, patch);
  if (!task) {
    throw createError({ statusCode: 404, statusMessage: "Task not found" });
  }
  return { task };
});
