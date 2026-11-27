import { actionLogListQuerySchema } from "~~/server/schemas/tasks";
import { listAgentActionsForUser } from "~~/server/utils/action-log";
import { requireInternalRequest } from "~~/server/utils/internal-api";

export default defineEventHandler(async (event) => {
  requireInternalRequest(event);
  const query = await getValidatedQuery(event, actionLogListQuerySchema.parse);
  const actions = await listAgentActionsForUser(query.userId, query.limit);
  return { actions };
});
