import { actionLogCreateSchema } from "~~/server/schemas/tasks";
import { recordAgentAction } from "~~/server/utils/action-log";
import { requireInternalRequest } from "~~/server/utils/internal-api";

export default defineEventHandler(async (event) => {
  requireInternalRequest(event);
  const body = await readValidatedBody(event, actionLogCreateSchema.parse);
  await recordAgentAction(body);
  return { ok: true };
});
