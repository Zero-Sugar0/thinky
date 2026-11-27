import { taskCreateSchema } from "~~/server/schemas/tasks";
import { createTaskForUser } from "~~/server/utils/tasks";
import { requireInternalRequest } from "~~/server/utils/internal-api";

export default defineEventHandler(async (event) => {
  requireInternalRequest(event);
  const body = await readValidatedBody(event, taskCreateSchema.parse);
  const task = await createTaskForUser({
    userId: body.userId,
    title: body.title,
    notes: body.notes,
    dueAt: body.dueAt ?? null,
    source: body.source,
  });
  return { task };
});
